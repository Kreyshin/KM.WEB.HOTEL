import type {
  Consulta,
  EstadoTarea,
  NuevaTareaLimpieza,
  Paginado,
  TareaLimpieza,
  TareaResuelta,
} from '@/types'
import { minutosPorTipo } from '@/utils/habitaciones'
import { errorCampo } from './mock/reglas'
import { db, latencia, persistir } from './mock/db'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('tareas', {
  prefijo: 'k',
  entidad: 'Tarea de limpieza',
  camposBusqueda: ['notas'],
})

function resolver(t: TareaLimpieza): TareaResuelta {
  return {
    ...t,
    habitacion: db.habitaciones.find((h) => h.id === t.habitacionId),
    responsable: db.usuarios.find((u) => u.id === t.asignadaAId),
  }
}

/**
 * Estado de limpieza que corresponde a cada fase de la tarea. Mover la tarea
 * mueve la habitación: son la misma realidad vista desde dos oficios.
 */
const limpiezaSegunTarea = {
  pendiente: 'sucia',
  enCurso: 'enLimpieza',
  revisar: 'inspeccion',
  terminada: 'limpia',
} as const

export const limpiezaService = {
  ...repo,

  async consultarResueltas(consulta?: Consulta): Promise<Paginado<TareaResuelta>> {
    const { items, ...resto } = await repo.consultar(consulta)
    return { ...resto, items: items.map(resolver) }
  },

  /** Tareas vivas de la sede, ordenadas por prioridad y antigüedad. */
  async tablero(localId: string): Promise<TareaResuelta[]> {
    const pisos = db.pisos.filter((p) => p.localId === localId).map((p) => p.id)
    const peso = { urgente: 0, alta: 1, normal: 2 }
    const items = db.tareas
      .filter((t) => {
        const habitacion = db.habitaciones.find((h) => h.id === t.habitacionId)
        return habitacion && pisos.includes(habitacion.pisoId)
      })
      .sort((a, b) => peso[a.prioridad] - peso[b.prioridad] || a.creada.localeCompare(b.creada))
      .map(resolver)
    return latencia(items)
  },

  /**
   * Abre una tarea a mano.
   *
   * La mayoría nacen solas —al hacer check-out, al cerrar el turno—, pero la
   * gobernanta necesita poder abrir una por su cuenta: un cliente que pide
   * toallas, un baño que se revisa antes de enseñar la habitación, una
   * profunda que se decide en el momento.
   *
   * Dos tareas abiertas para la misma habitación son dos camareras subiendo a
   * la misma puerta, así que se rechaza con el número delante.
   */
  async crear(datos: NuevaTareaLimpieza): Promise<TareaResuelta> {
    const habitacion = db.habitaciones.find((h) => h.id === datos.habitacionId)
    if (!habitacion) throw errorCampo('habitacionId', 'Elige una habitación.')

    const abierta = db.tareas.find(
      (t) => t.habitacionId === datos.habitacionId && t.estado !== 'terminada',
    )
    if (abierta) {
      throw errorCampo(
        'habitacionId',
        `La habitación ${habitacion.numero} ya tiene una tarea abierta. Trabájala en el tablero.`,
      )
    }

    const creada = await repo.crear({
      ...datos,
      minutosEstimados: datos.minutosEstimados || minutosPorTipo[datos.tipo],
      creada: new Date().toISOString(),
    } as Omit<TareaLimpieza, 'id'>)
    return resolver(creada)
  },

  /**
   * Abre de golpe las tareas del turno.
   *
   * El gesto de todas las mañanas: mirar qué habitaciones quedaron sucias y
   * repartirlas. Hacerlo tarjeta a tarjeta es el trabajo de una gobernanta
   * durante diez minutos; aquí es un botón. Salta las que ya tienen tarea
   * abierta y las que están fuera de servicio, que no se limpian: se arreglan.
   *
   * El tipo lo dice la habitación: si está ocupada es una limpieza **en
   * estancia** —la huésped vuelve esta noche, sus cosas siguen dentro—; si
   * está libre es una **salida**, que es más larga y deja la habitación
   * vendible.
   */
  async generarDelTurno(localId: string): Promise<TareaResuelta[]> {
    const pisos = db.pisos.filter((p) => p.localId === localId).map((p) => p.id)
    const candidatas = db.habitaciones.filter(
      (h) =>
        pisos.includes(h.pisoId) &&
        h.limpieza === 'sucia' &&
        !db.tareas.some((t) => t.habitacionId === h.id && t.estado !== 'terminada'),
    )

    const nuevas: TareaResuelta[] = []
    for (const h of candidatas) {
      const tipo = h.ocupacion === 'ocupada' ? 'estancia' : 'salida'
      const creada = await repo.crear({
        habitacionId: h.id,
        tipo,
        estado: 'pendiente',
        // Una salida con reserva entrando hoy corre más que las demás.
        prioridad: h.ocupacion === 'reservada' ? 'alta' : 'normal',
        minutosEstimados: minutosPorTipo[tipo],
        creada: new Date().toISOString(),
      } as Omit<TareaLimpieza, 'id'>)
      nuevas.push(resolver(creada))
    }
    return nuevas
  },

  /** Cuántas tareas abriría «generar el turno» ahora mismo. */
  pendientesDeGenerar(localId: string): number {
    const pisos = db.pisos.filter((p) => p.localId === localId).map((p) => p.id)
    return db.habitaciones.filter(
      (h) =>
        pisos.includes(h.pisoId) &&
        h.limpieza === 'sucia' &&
        !db.tareas.some((t) => t.habitacionId === h.id && t.estado !== 'terminada'),
    ).length
  },

  /**
   * Mueve la tarea de fase y arrastra el estado de limpieza de la habitación.
   *
   * Va en los dos sentidos: la gobernanta que inspecciona y encuentra el baño
   * a medias devuelve la tarea a «en curso», y eso vuelve a poner la
   * habitación en limpieza. Sin marcha atrás, el único camino sería cerrarla
   * mintiendo y abrir otra.
   *
   * Cerrar una tarea NO libera la habitación: la ocupación es asunto de
   * recepción, aunque la habitación quede impecable.
   */
  async cambiarEstado(id: string, estado: EstadoTarea): Promise<TareaResuelta> {
    const tarea = db.tareas.find((t) => t.id === id)
    if (!tarea) throw { mensaje: 'Tarea no encontrada.' }

    const habitacion = db.habitaciones.find((h) => h.id === tarea.habitacionId)
    if (habitacion && habitacion.limpieza !== 'fueraServicio') {
      habitacion.limpieza = limpiezaSegunTarea[estado]
      habitacion.actualizada = new Date().toISOString()
    }
    persistir()

    return resolver(
      await repo.actualizar(id, {
        estado,
        terminada: estado === 'terminada' ? new Date().toISOString() : undefined,
      }),
    )
  },

  /**
   * Reparte el trabajo del turno.
   *
   * El responsable vive **solo** en la tarea. Antes esto escribía también en la
   * habitación, para mantener las dos copias de acuerdo; ahora no hay segunda
   * copia que mantener.
   */
  async asignar(id: string, usuarioId?: string): Promise<TareaResuelta> {
    return resolver(await repo.actualizar(id, { asignadaAId: usuarioId }))
  },

  /** Cambia lo que se decide sobre la marcha: prisa, minutos y recado. */
  async editar(
    id: string,
    cambios: Partial<Pick<TareaLimpieza, 'prioridad' | 'minutosEstimados' | 'notas' | 'tipo'>>,
  ): Promise<TareaResuelta> {
    return resolver(await repo.actualizar(id, cambios))
  },
}
