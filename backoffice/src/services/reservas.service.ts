import type { Consulta, Estancia, NuevaReserva, Paginado, Reserva, ReservaResuelta } from '@/types'
import { noches } from '@/utils/formato'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { errorCampo } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('reservas', {
  prefijo: 'r',
  entidad: 'Reserva',
  camposBusqueda: ['codigo', 'notas'],
})

function resolver(r: Reserva): ReservaResuelta {
  return {
    ...r,
    huesped: db.huespedes.find((h) => h.id === r.huespedId),
    tipo: db.tiposHabitacion.find((t) => t.id === r.tipoId),
    habitacion: db.habitaciones.find((h) => h.id === r.habitacionId),
    noches: noches(r.entrada, r.salida),
  }
}

/** Localizador legible para el huésped. El correlativo vive en el ERP. */
function nuevoCodigo() {
  const numero = 2400 + db.reservas.length + 1
  return `KMH-${numero}`
}

function validar(datos: Partial<NuevaReserva>) {
  if (datos.entrada && datos.salida) {
    if (datos.salida <= datos.entrada) {
      throw errorCampo('salida', 'La salida debe ser posterior a la entrada.', 'Revisa las fechas')
    }
    if (noches(datos.entrada, datos.salida) > 90) {
      throw errorCampo('salida', 'Una estancia de más de 90 noches se contrata aparte.')
    }
  }
  if (datos.adultos !== undefined && datos.adultos < 1) {
    throw errorCampo('adultos', 'Debe viajar al menos un adulto.')
  }
  if (datos.tarifaNoche !== undefined && datos.tarifaNoche <= 0) {
    throw errorCampo('tarifaNoche', 'La tarifa por noche debe ser mayor que cero.')
  }
  const tipo = db.tiposHabitacion.find((t) => t.id === datos.tipoId)
  const huespedes = (datos.adultos ?? 0) + (datos.ninos ?? 0)
  if (tipo && huespedes > tipo.capacidadMaxima) {
    throw errorCampo(
      'adultos',
      `El tipo ${tipo.nombre} admite como máximo ${tipo.capacidadMaxima} huéspedes.`,
      'Aforo superado',
    )
  }
}

/**
 * Reservas y estancias.
 *
 * El check-in es el punto donde la reserva deja de ser un contrato y pasa a
 * ocupar una habitación real: crea la estancia, marca la habitación ocupada y
 * deja la reserva `enCasa`. El check-out hace el camino inverso y, sobre todo,
 * genera la tarea de limpieza de salida: sin eso, housekeeping trabaja a ciegas.
 */
export const reservasService = {
  ...repo,

  async consultarResueltas(consulta?: Consulta): Promise<Paginado<ReservaResuelta>> {
    const { items, ...resto } = await repo.consultar(consulta)
    return { ...resto, items: items.map(resolver) }
  },

  async obtenerResuelta(id: string): Promise<ReservaResuelta> {
    return resolver(await repo.obtener(id))
  },

  /** Llegadas previstas para una fecha (`YYYY-MM-DD`). */
  async llegadas(localId: string, fecha: string): Promise<ReservaResuelta[]> {
    const items = db.reservas
      .filter(
        (r) =>
          r.localId === localId &&
          r.entrada === fecha &&
          ['pendiente', 'confirmada'].includes(r.estado),
      )
      .map(resolver)
    return latencia(items)
  },

  /** Salidas previstas para una fecha: quien tiene la salida ese día y sigue en casa. */
  async salidas(localId: string, fecha: string): Promise<ReservaResuelta[]> {
    const items = db.reservas
      .filter((r) => r.localId === localId && r.salida === fecha && r.estado === 'enCasa')
      .map(resolver)
    return latencia(items)
  },

  /** Quién está alojado ahora mismo. */
  async enCasa(localId: string): Promise<ReservaResuelta[]> {
    const items = db.reservas.filter((r) => r.localId === localId && r.estado === 'enCasa')
    return latencia(items.map(resolver))
  },

  async crear(datos: NuevaReserva): Promise<Reserva> {
    validar(datos)
    const reserva = await repo.crear({
      ...datos,
      codigo: nuevoCodigo(),
      creada: new Date().toISOString(),
    } as Omit<Reserva, 'id'>)
    if (datos.habitacionId && datos.estado === 'confirmada') {
      const habitacion = db.habitaciones.find((h) => h.id === datos.habitacionId)
      if (habitacion && habitacion.ocupacion === 'libre') habitacion.ocupacion = 'reservada'
      persistir()
    }
    return reserva
  },

  async actualizar(id: string, datos: Partial<NuevaReserva>): Promise<Reserva> {
    const actual = db.reservas.find((r) => r.id === id)
    validar({ ...actual, ...datos })
    return repo.actualizar(id, datos)
  },

  /**
   * Check-in: la reserva ocupa una habitación concreta.
   * Se exige habitación limpia porque entregar una llave de una habitación
   * sucia es el fallo de servicio más caro de un hotel.
   */
  async checkIn(reservaId: string, habitacionId: string): Promise<Estancia> {
    const reserva = db.reservas.find((r) => r.id === reservaId)
    if (!reserva) throw { mensaje: 'Reserva no encontrada.' }
    if (reserva.estado === 'enCasa') throw { mensaje: 'La reserva ya tiene el check-in hecho.' }
    if (!['pendiente', 'confirmada'].includes(reserva.estado)) {
      throw { mensaje: 'Solo se puede hacer check-in de una reserva pendiente o confirmada.' }
    }

    const habitacion = db.habitaciones.find((h) => h.id === habitacionId)
    if (!habitacion) throw { mensaje: 'Habitación no encontrada.' }
    if (habitacion.ocupacion === 'ocupada') throw { mensaje: 'La habitación ya está ocupada.' }
    if (habitacion.limpieza !== 'limpia') {
      throw { mensaje: 'La habitación no está lista. Pide el repaso a housekeeping.' }
    }

    const estancia: Estancia = {
      id: nuevoId('e'),
      reservaId,
      habitacionId,
      huespedId: reserva.huespedId,
      checkIn: new Date().toISOString(),
      adultos: reserva.adultos,
      ninos: reserva.ninos,
      consumos: 0,
      nochesConsumidas: 0,
    }

    db.estancias.push(estancia)
    reserva.estado = 'enCasa'
    reserva.habitacionId = habitacionId
    habitacion.ocupacion = 'ocupada'
    habitacion.estanciaId = estancia.id
    habitacion.actualizada = new Date().toISOString()
    persistir()

    return latencia(estancia)
  },

  /**
   * Check-out: libera la habitación, la deja sucia y abre la tarea de salida.
   * Esa tarea es el enlace real entre recepción y housekeeping.
   */
  async checkOut(reservaId: string): Promise<void> {
    const reserva = db.reservas.find((r) => r.id === reservaId)
    if (!reserva) throw { mensaje: 'Reserva no encontrada.' }
    if (reserva.estado !== 'enCasa') throw { mensaje: 'La reserva no tiene una estancia en curso.' }

    const estancia = db.estancias.find((e) => e.reservaId === reservaId && !e.checkOut)
    const habitacion = db.habitaciones.find((h) => h.id === reserva.habitacionId)

    if (estancia) {
      estancia.checkOut = new Date().toISOString()
      estancia.nochesConsumidas = noches(reserva.entrada, reserva.salida)
    }
    reserva.estado = 'salida'

    if (habitacion) {
      habitacion.ocupacion = 'libre'
      habitacion.limpieza = 'sucia'
      habitacion.estanciaId = undefined
      habitacion.actualizada = new Date().toISOString()
      db.tareas.push({
        id: nuevoId('k'),
        habitacionId: habitacion.id,
        tipo: 'salida',
        estado: 'pendiente',
        prioridad: db.reservas.some(
          (r) => r.habitacionId === habitacion.id && r.entrada === reserva.salida,
        )
          ? 'alta'
          : 'normal',
        minutosEstimados: 45,
        creada: new Date().toISOString(),
      })
    }

    persistir()
    await latencia(null)
  },

  /** Cancelación y no-show liberan la habitación comprometida, si la había. */
  async cancelar(reservaId: string, motivo: string, noShow = false): Promise<Reserva> {
    const reserva = db.reservas.find((r) => r.id === reservaId)
    if (!reserva) throw { mensaje: 'Reserva no encontrada.' }
    if (reserva.estado === 'enCasa') {
      throw { mensaje: 'No se cancela una reserva con el huésped dentro. Haz el check-out.' }
    }
    const habitacion = db.habitaciones.find((h) => h.id === reserva.habitacionId)
    if (habitacion?.ocupacion === 'reservada') habitacion.ocupacion = 'libre'

    return repo.actualizar(reservaId, {
      estado: noShow ? 'noShow' : 'cancelada',
      notas: [reserva.notas, motivo].filter(Boolean).join(' · '),
    })
  },

  /** Carga un consumo a la habitación (minibar, lavandería, restaurante). */
  async cargarConsumo(estanciaId: string, monto: number): Promise<Estancia> {
    const estancia = db.estancias.find((e) => e.id === estanciaId)
    if (!estancia) throw { mensaje: 'Estancia no encontrada.' }
    if (estancia.checkOut) throw { mensaje: 'La estancia ya está cerrada.' }
    if (monto <= 0) throw errorCampo('monto', 'El consumo debe ser mayor que cero.')
    estancia.consumos += monto
    persistir()
    return latencia(estancia)
  },
}
