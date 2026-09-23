import type { Incidencia } from '@/types'
import { db, latencia, persistir } from './mock/db'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('incidencias', {
  prefijo: 'i',
  entidad: 'Incidencia',
  camposBusqueda: ['titulo', 'descripcion'],
})

/**
 * Partes de mantenimiento. Una incidencia que bloquea deja la habitación fuera
 * de servicio, y resolverla la devuelve al circuito como sucia: nadie entrega
 * una habitación recién reparada sin pasar por housekeeping.
 */
export const incidenciasService = {
  ...repo,

  async abiertas(): Promise<Incidencia[]> {
    return latencia(db.incidencias.filter((i) => i.estado !== 'resuelta'))
  },

  async crear(datos: Omit<Incidencia, 'id' | 'creada'>): Promise<Incidencia> {
    const incidencia = await repo.crear({
      ...datos,
      creada: new Date().toISOString(),
    } as Omit<Incidencia, 'id'>)

    if (datos.bloqueaHabitacion && datos.habitacionId) {
      const habitacion = db.habitaciones.find((h) => h.id === datos.habitacionId)
      if (habitacion) {
        habitacion.ocupacion = 'bloqueada'
        habitacion.limpieza = 'fueraServicio'
        habitacion.nota = datos.titulo
        habitacion.actualizada = new Date().toISOString()
        persistir()
      }
    }
    return incidencia
  },

  async resolver(id: string): Promise<Incidencia> {
    const incidencia = db.incidencias.find((i) => i.id === id)
    if (!incidencia) throw { mensaje: 'Incidencia no encontrada.' }

    if (incidencia.bloqueaHabitacion && incidencia.habitacionId) {
      const habitacion = db.habitaciones.find((h) => h.id === incidencia.habitacionId)
      const otrasAbiertas = db.incidencias.some(
        (i) =>
          i.id !== id &&
          i.habitacionId === incidencia.habitacionId &&
          i.bloqueaHabitacion &&
          i.estado !== 'resuelta',
      )
      if (habitacion && !otrasAbiertas) {
        habitacion.ocupacion = 'libre'
        habitacion.limpieza = 'sucia'
        habitacion.nota = undefined
        habitacion.actualizada = new Date().toISOString()
        persistir()
      }
    }

    return repo.actualizar(id, { estado: 'resuelta', resuelta: new Date().toISOString() })
  },
}
