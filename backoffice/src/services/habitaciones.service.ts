import type {
  Consulta,
  EstadoLimpieza,
  EstadoOcupacion,
  Habitacion,
  HabitacionResuelta,
  NuevaHabitacion,
  Paginado,
  PisoConHabitaciones,
} from '@/types'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia, persistir } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('habitaciones', {
  prefijo: 'h',
  entidad: 'Habitación',
  camposBusqueda: ['numero', 'vista', 'nota'],
})

function resolver(h: Habitacion): HabitacionResuelta {
  return {
    ...h,
    tipo: db.tiposHabitacion.find((t) => t.id === h.tipoId),
    piso: db.pisos.find((p) => p.id === h.pisoId),
    estancia: h.estanciaId ? db.estancias.find((e) => e.id === h.estanciaId) : undefined,
  }
}

function validar(datos: Partial<NuevaHabitacion>, id?: string) {
  if (datos.numero !== undefined) {
    if (!datos.numero.trim()) throw errorCampo('numero', 'El número es obligatorio.')
    const piso = datos.pisoId ?? db.habitaciones.find((h) => h.id === id)?.pisoId
    const local = db.pisos.find((p) => p.id === piso)?.localId
    const hermanas = db.habitaciones.filter(
      (h) => db.pisos.find((p) => p.id === h.pisoId)?.localId === local,
    )
    if (existeOtro(hermanas, (h) => h.numero, datos.numero, id)) {
      throw errorCampo('numero', 'Ya hay una habitación con ese número en la sede.', 'Duplicado')
    }
  }
}

/**
 * Habitaciones y sus dos estados vivos.
 *
 * `cambiarOcupacion` y `cambiarLimpieza` son deliberadamente dos operaciones:
 * quien vende no limpia, y una habitación libre puede estar sucia. La única
 * regla cruzada es que una habitación fuera de servicio no se puede vender.
 */
export const habitacionesService = {
  ...repo,

  /**
   * Consulta de catálogo, resuelta y con sede.
   *
   * Dos diferencias con la del repositorio, y las dos importan. La primera es
   * que devuelve la habitación **resuelta**: sin su tipo y su piso, un listado
   * de habitaciones es una columna de números que no dice nada. La segunda es
   * que entiende el filtro `localId`, que la habitación no lleva encima: una
   * habitación pertenece a una sede **a través de su piso**, y esa regla vive
   * aquí y no en la pantalla.
   */
  async consultar(consulta?: Consulta): Promise<Paginado<HabitacionResuelta>> {
    const { localId, ...filtros } = consulta?.filtros ?? {}
    const base = { ...consulta, filtros }

    if (!localId) {
      const { items, ...resto } = await repo.consultar(base)
      return { ...resto, items: items.map(resolver) }
    }

    const dePiso = new Set(db.pisos.filter((p) => p.localId === localId).map((p) => p.id))
    const { items, ...resto } = aplicarConsulta(
      db.habitaciones.filter((h) => dePiso.has(h.pisoId)),
      base,
      ['numero', 'vista', 'nota'],
    )
    return latencia({ ...resto, items: items.map(resolver) })
  },

  async consultarResueltas(consulta?: Consulta): Promise<Paginado<HabitacionResuelta>> {
    return this.consultar(consulta)
  },

  /** Todas las habitaciones de una sede, resueltas y ordenadas por número. */
  async listarPorLocal(localId: string): Promise<HabitacionResuelta[]> {
    const pisos = db.pisos.filter((p) => p.localId === localId).map((p) => p.id)
    const items = db.habitaciones
      .filter((h) => pisos.includes(h.pisoId))
      .sort((a, b) => a.numero.localeCompare(b.numero, 'es', { numeric: true }))
      .map(resolver)
    return latencia(items)
  },

  /** Plano por piso: lo que pinta el tablero y la vista de plano. */
  async planoPorPiso(localId: string): Promise<PisoConHabitaciones[]> {
    const habitaciones = await this.listarPorLocal(localId)
    const pisos = db.pisos
      .filter((p) => p.localId === localId)
      .sort((a, b) => a.orden - b.orden)
      .map((p) => ({ ...p, habitaciones: habitaciones.filter((h) => h.pisoId === p.id) }))
    return latencia(pisos)
  },

  /*
   * El alta y la edición devuelven la habitación **resuelta**, con su tipo y
   * su piso dentro. Quien acaba de guardar necesita enseñarla, y devolver solo
   * los ids le obligaría a pedir la lista otra vez para pintar una fila.
   */
  async crear(datos: NuevaHabitacion): Promise<HabitacionResuelta> {
    validar(datos)
    return resolver(
      await repo.crear({
        ...datos,
        numero: datos.numero.trim(),
        actualizada: new Date().toISOString(),
      }),
    )
  },

  async actualizar(id: string, datos: Partial<NuevaHabitacion>): Promise<HabitacionResuelta> {
    validar(datos, id)
    return resolver(await repo.actualizar(id, { ...datos, actualizada: new Date().toISOString() }))
  },

  /**
   * Una habitación con historia no se borra.
   *
   * Si alguien durmió ahí, el número aparece en su factura, en el Registro de
   * Huéspedes y en la producción del mes. Borrarla dejaría esos documentos
   * apuntando al vacío. Para sacarla del inventario está `bloqueada`, que es
   * reversible y deja rastro del motivo.
   */
  async eliminar(id: string): Promise<void> {
    const habitacion = db.habitaciones.find((h) => h.id === id)
    if (!habitacion) throw { mensaje: 'Habitación no encontrada.' }

    if (db.estancias.some((e) => e.habitacionId === id)) {
      throw {
        mensaje: `La habitación ${habitacion.numero} tiene estancias en el histórico. Bloquéala en vez de borrarla.`,
      }
    }
    if (db.reservas.some((r) => r.habitacionId === id)) {
      throw {
        mensaje: `La habitación ${habitacion.numero} está asignada a una reserva. Reasígnala antes de borrarla.`,
      }
    }

    // Las comunicadas dejan de apuntar a una habitación que ya no existe.
    for (const otra of db.habitaciones) {
      if (otra.comunicaCon?.includes(id)) {
        otra.comunicaCon = otra.comunicaCon.filter((x) => x !== id)
      }
    }

    return repo.eliminar(id)
  },

  /**
   * Cambia el estado de ocupación. No toca el de limpieza: son ejes distintos
   * y mezclarlos es el error clásico del dominio.
   */
  async cambiarOcupacion(id: string, ocupacion: EstadoOcupacion, nota?: string) {
    const habitacion = db.habitaciones.find((h) => h.id === id)
    if (!habitacion) throw { mensaje: 'Habitación no encontrada.' }
    if (habitacion.limpieza === 'fueraServicio' && ocupacion !== 'bloqueada') {
      throw {
        mensaje: 'La habitación está fuera de servicio. Cierra la incidencia antes de venderla.',
      }
    }
    if (ocupacion === 'ocupada' && habitacion.limpieza === 'sucia') {
      throw { mensaje: 'La habitación está sucia. Pide el repaso antes de entregar la llave.' }
    }
    return repo.actualizar(id, { ocupacion, nota, actualizada: new Date().toISOString() })
  },

  /**
   * Cambia el estado de limpieza y mantiene en fase la tarea abierta, que es
   * lo que ve la gobernanta en su tablero.
   */
  async cambiarLimpieza(id: string, limpieza: EstadoLimpieza) {
    const habitacion = db.habitaciones.find((h) => h.id === id)
    if (!habitacion) throw { mensaje: 'Habitación no encontrada.' }

    const tarea = db.tareas.find((t) => t.habitacionId === id && t.estado !== 'terminada')
    if (tarea) {
      if (limpieza === 'enLimpieza') tarea.estado = 'enCurso'
      if (limpieza === 'inspeccion') tarea.estado = 'revisar'
      if (limpieza === 'limpia') {
        tarea.estado = 'terminada'
        tarea.terminada = new Date().toISOString()
      }
      persistir()
    }
    return repo.actualizar(id, { limpieza, actualizada: new Date().toISOString() })
  },

  /** Asigna la camarera del turno a la habitación. */
  async asignarCamarera(id: string, usuarioId?: string) {
    return repo.actualizar(id, { asignadaAId: usuarioId, actualizada: new Date().toISOString() })
  },

  /**
   * Habitaciones vendibles de un tipo para un rango: ni ocupadas, ni fuera de
   * servicio, ni comprometidas por otra reserva que solape.
   */
  async disponibles(localId: string, tipoId: string, entrada: string, salida: string) {
    const pisos = db.pisos.filter((p) => p.localId === localId).map((p) => p.id)
    const ocupadasPorReserva = new Set(
      db.reservas
        .filter(
          (r) =>
            r.habitacionId &&
            ['confirmada', 'enCasa'].includes(r.estado) &&
            r.entrada < salida &&
            r.salida > entrada,
        )
        .map((r) => r.habitacionId as string),
    )
    const items = db.habitaciones
      .filter(
        (h) =>
          pisos.includes(h.pisoId) &&
          h.tipoId === tipoId &&
          h.limpieza !== 'fueraServicio' &&
          h.ocupacion !== 'bloqueada' &&
          !ocupadasPorReserva.has(h.id),
      )
      .map(resolver)
    return latencia(items)
  },

  /**
   * Resumen del tablero: cuántas habitaciones hay en cada estado de ocupación
   * y de limpieza, más el porcentaje de ocupación de la sede.
   */
  async resumen(localId: string) {
    const habitaciones = db.habitaciones.filter((h) =>
      db.pisos.some((p) => p.id === h.pisoId && p.localId === localId),
    )
    const vendibles = habitaciones.filter((h) => h.ocupacion !== 'bloqueada')
    const ocupadas = habitaciones.filter((h) => h.ocupacion === 'ocupada').length
    return latencia({
      total: habitaciones.length,
      vendibles: vendibles.length,
      ocupadas,
      ocupacion: vendibles.length ? Math.round((ocupadas / vendibles.length) * 100) : 0,
      porOcupacion: agrupar(habitaciones, (h) => h.ocupacion),
      porLimpieza: agrupar(habitaciones, (h) => h.limpieza),
    })
  },

  /** Consulta cruda sin resolver, por si una vista solo necesita los ids. */
  consultarPlanas(consulta?: Consulta) {
    return latencia(aplicarConsulta(db.habitaciones, consulta, ['numero']))
  },
}

function agrupar<T, K extends string>(items: T[], clave: (item: T) => K): Record<K, number> {
  return items.reduce(
    (acc, item) => {
      const k = clave(item)
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    },
    {} as Record<K, number>,
  )
}
