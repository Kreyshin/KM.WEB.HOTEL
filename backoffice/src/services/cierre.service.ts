import type { CierreDia, Estancia, Reserva } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'

/**
 * Cierre de día · night audit.
 *
 * Es el proceso que convierte un hotel en una empresa auditable, y hace tres
 * cosas que ningún otro hace:
 *
 * 1. **Cobra la noche** a quien duerme. El huésped no paga al entrar ni al
 *    salir: paga cada noche que pasa, y alguien tiene que cargarla.
 * 2. **Cierra el día** para que nadie lo modifique después. Sin esto, la
 *    ocupación del martes cambia según la hora a la que se pregunte.
 * 3. **Produce las cifras** —ocupación, ADR, RevPAR— que son el idioma del
 *    negocio y la materia prima del cierre de mes.
 *
 * Se ejecuta de madrugada, con el hotel parado, porque necesita que nadie esté
 * entrando ni saliendo mientras cuenta.
 */

const dia = (fecha: string, saltos: number) => {
  const f = new Date(`${fecha}T12:00:00`)
  f.setDate(f.getDate() + saltos)
  return f.toISOString().slice(0, 10)
}

const hoy = () => new Date().toISOString().slice(0, 10)

/** Habitaciones de la sede, a través de sus pisos. */
function habitacionesDe(localId: string) {
  const pisos = db.pisos.filter((p) => p.localId === localId).map((p) => p.id)
  return db.habitaciones.filter((h) => pisos.includes(h.pisoId))
}

function estanciasVivas(localId: string): Estancia[] {
  const habitaciones = habitacionesDe(localId).map((h) => h.id)
  return db.estancias.filter((e) => !e.checkOut && habitaciones.includes(e.habitacionId))
}

export const cierreService = {
  /**
   * La fecha que el hotel está operando.
   *
   * No es «hoy» del calendario: es el día siguiente al último cerrado. Un
   * hotel que no cerró el domingo sigue operando el domingo el lunes por la
   * mañana, y esa diferencia es justamente lo que el cierre obliga a resolver.
   */
  fechaOperativa(localId: string): string {
    const cerrados = db.cierres
      .filter((c) => c.localId === localId)
      .map((c) => c.fecha)
      .sort()
    const ultimo = cerrados.at(-1)
    return ultimo ? dia(ultimo, 1) : hoy()
  },

  /**
   * Qué hay que resolver antes de poder cerrar.
   *
   * Las salidas sin check-out **bloquean**: o el huésped se fue o extendió, y
   * el cierre no puede adivinar cuál de las dos. Las llegadas sin check-in no
   * bloquean —son justo lo que el cierre resuelve marcándolas no-show—, pero
   * se cuentan aparte para que nadie lo haga sin darse cuenta.
   */
  async revision(localId: string) {
    const fecha = this.fechaOperativa(localId)
    const habitaciones = habitacionesDe(localId).map((h) => h.id)

    const llegadasSinCheckIn = db.reservas.filter(
      (r) => r.localId === localId && r.estado === 'confirmada' && r.entrada === fecha,
    )

    const salidasSinCheckOut = db.estancias.filter((e) => {
      if (e.checkOut || !habitaciones.includes(e.habitacionId)) return false
      const reserva = db.reservas.find((r) => r.id === e.reservaId)
      return !!reserva && reserva.salida <= fecha
    })

    const vivas = estanciasVivas(localId)

    return latencia({
      fecha,
      yaCerrado: db.cierres.some((c) => c.localId === localId && c.fecha === fecha),
      esFutura: fecha > hoy(),
      llegadasSinCheckIn,
      salidasSinCheckOut,
      enCasa: vivas.length,
      vendibles: habitacionesDe(localId).filter((h) => h.ocupacion !== 'bloqueada').length,
    })
  },

  /**
   * Ejecuta el cierre: marca los no-show, carga la noche, saca las cifras y
   * avanza la fecha. Todo o nada — si algo bloquea, no se cierra a medias.
   */
  async cerrar(localId: string, usuarioId: string): Promise<CierreDia> {
    const fecha = this.fechaOperativa(localId)

    if (db.cierres.some((c) => c.localId === localId && c.fecha === fecha)) {
      throw { mensaje: `El ${fecha} ya está cerrado. Un día no se cierra dos veces.` }
    }
    if (fecha > hoy()) {
      throw { mensaje: 'No se puede cerrar un día que todavía no ha pasado.' }
    }

    const habitaciones = habitacionesDe(localId)
    const idsHabitacion = habitaciones.map((h) => h.id)

    const pendientes = db.estancias.filter((e) => {
      if (e.checkOut || !idsHabitacion.includes(e.habitacionId)) return false
      const reserva = db.reservas.find((r) => r.id === e.reservaId)
      return !!reserva && reserva.salida <= fecha
    })
    if (pendientes.length) {
      const numeros = pendientes
        .map((e) => habitaciones.find((h) => h.id === e.habitacionId)?.numero)
        .filter(Boolean)
        .join(', ')
      throw {
        mensaje: `No se puede cerrar: ${pendientes.length} estancia${pendientes.length === 1 ? '' : 's'} sin salida registrada (${numeros}). O se fueron o extendieron; el cierre no lo puede adivinar.`,
      }
    }

    // 1 · Las que no llegaron. Se marcan y, si estaban garantizadas, se cobran.
    const noShows: Reserva[] = db.reservas.filter(
      (r) => r.localId === localId && r.estado === 'confirmada' && r.entrada === fecha,
    )
    for (const reserva of noShows) reserva.estado = 'noShow'

    // 2 · La noche se carga a cada folio vivo.
    const vivas = estanciasVivas(localId)
    let produccionAlojamiento = 0
    let produccionConsumos = 0
    for (const estancia of vivas) {
      const reserva = db.reservas.find((r) => r.id === estancia.reservaId)
      estancia.nochesConsumidas += 1
      produccionAlojamiento += reserva?.tarifaNoche ?? 0
      produccionConsumos += estancia.consumos
    }

    // 3 · Las cifras del día. Redondeadas a céntimo, que es como se comparan.
    const vendibles = habitaciones.filter((h) => h.ocupacion !== 'bloqueada').length
    const ocupadas = vivas.length
    const centimos = (n: number) => Math.round(n * 100) / 100

    const cierre: CierreDia = {
      id: nuevoId('cd'),
      localId,
      fecha,
      vendibles,
      ocupadas,
      ocupacion: vendibles ? Math.round((ocupadas / vendibles) * 100) : 0,
      adr: ocupadas ? centimos(produccionAlojamiento / ocupadas) : 0,
      revpar: vendibles ? centimos(produccionAlojamiento / vendibles) : 0,
      produccionAlojamiento: centimos(produccionAlojamiento),
      produccionConsumos: centimos(produccionConsumos),
      noShows: noShows.length,
      cerradoPor: usuarioId,
      cerradoEn: new Date().toISOString(),
    }

    db.cierres.push(cierre)
    persistir()
    return latencia(cierre)
  },

  /** Los días ya cerrados, del más reciente al más antiguo. */
  async historico(localId: string, limite = 30): Promise<CierreDia[]> {
    const items = db.cierres
      .filter((c) => c.localId === localId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, limite)
    return latencia(items)
  },
}
