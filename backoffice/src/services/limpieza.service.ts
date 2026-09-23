import type {
  Consulta,
  EstadoTarea,
  NuevaTareaLimpieza,
  Paginado,
  TareaLimpieza,
  TareaResuelta,
} from '@/types'
import { minutosPorTipo } from '@/utils/habitaciones'
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

  async crear(datos: NuevaTareaLimpieza): Promise<TareaLimpieza> {
    return repo.crear({
      ...datos,
      minutosEstimados: datos.minutosEstimados || minutosPorTipo[datos.tipo],
      creada: new Date().toISOString(),
    } as Omit<TareaLimpieza, 'id'>)
  },

  /**
   * Avanza la tarea y arrastra el estado de limpieza de la habitación.
   * Cerrar una tarea NO libera la habitación: la ocupación es asunto de
   * recepción, aunque la habitación quede impecable.
   */
  async cambiarEstado(id: string, estado: EstadoTarea): Promise<TareaLimpieza> {
    const tarea = db.tareas.find((t) => t.id === id)
    if (!tarea) throw { mensaje: 'Tarea no encontrada.' }

    const habitacion = db.habitaciones.find((h) => h.id === tarea.habitacionId)
    if (habitacion && habitacion.limpieza !== 'fueraServicio') {
      habitacion.limpieza = limpiezaSegunTarea[estado]
      habitacion.actualizada = new Date().toISOString()
    }
    persistir()

    return repo.actualizar(id, {
      estado,
      terminada: estado === 'terminada' ? new Date().toISOString() : undefined,
    })
  },

  async asignar(id: string, usuarioId?: string): Promise<TareaLimpieza> {
    const tarea = db.tareas.find((t) => t.id === id)
    if (tarea) {
      const habitacion = db.habitaciones.find((h) => h.id === tarea.habitacionId)
      if (habitacion) habitacion.asignadaAId = usuarioId
      persistir()
    }
    return repo.actualizar(id, { asignadaAId: usuarioId })
  },

  /** Carga del turno por camarera: minutos pendientes y tareas a su nombre. */
  async cargaPorCamarera(localId: string) {
    const tareas = await this.tablero(localId)
    const camareras = db.usuarios.filter((u) => u.rol === 'gobernanta')
    return camareras.map((u) => {
      const suyas = tareas.filter((t) => t.asignadaAId === u.id && t.estado !== 'terminada')
      return {
        usuario: u,
        tareas: suyas.length,
        minutos: suyas.reduce((total, t) => total + t.minutosEstimados, 0),
      }
    })
  },
}
