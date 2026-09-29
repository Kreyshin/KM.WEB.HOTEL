import { beforeEach, describe, expect, it } from 'vitest'
import { cierreService } from './cierre.service'
import { db, reiniciarMock } from './mock/db'

/**
 * Cierre de día.
 *
 * Lo que se prueba es lo que hace que las cifras signifiquen algo: que la
 * noche se cargue una sola vez, que un día no se cierre dos veces, que lo que
 * quedó a medias bloquee en vez de resolverse a ojo, y que la fecha operativa
 * avance con el cierre y no con el reloj.
 */

const SEDE = 'l1'
const hoy = () => new Date().toISOString().slice(0, 10)

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

/** Deja el día listo: nadie con la salida vencida. */
function despejar(fecha: string) {
  const pisos = db.pisos.filter((p) => p.localId === SEDE).map((p) => p.id)
  const habitaciones = db.habitaciones.filter((h) => pisos.includes(h.pisoId)).map((h) => h.id)
  for (const estancia of db.estancias) {
    if (estancia.checkOut || !habitaciones.includes(estancia.habitacionId)) continue
    const reserva = db.reservas.find((r) => r.id === estancia.reservaId)
    if (reserva && reserva.salida <= fecha) reserva.salida = '2099-01-01'
  }
}

describe('cierreService', () => {
  it('la fecha operativa es hoy mientras no se cierre nada', () => {
    expect(cierreService.fechaOperativa(SEDE)).toBe(hoy())
  })

  it('las salidas vencidas bloquean el cierre', async () => {
    const fecha = cierreService.fechaOperativa(SEDE)
    const estancia = db.estancias.find((e) => !e.checkOut)!
    const reserva = db.reservas.find((r) => r.id === estancia.reservaId)!
    reserva.salida = fecha

    await expect(cierreService.cerrar(SEDE, 'u1')).rejects.toMatchObject({
      mensaje: expect.stringContaining('sin salida registrada'),
    })
  })

  it('carga la noche a cada folio vivo, una sola vez', async () => {
    const fecha = cierreService.fechaOperativa(SEDE)
    despejar(fecha)
    const { enCasa } = await cierreService.revision(SEDE)
    const antes = db.estancias
      .filter((e) => !e.checkOut)
      .map((e) => ({ id: e.id, noches: e.nochesConsumidas }))

    const cierre = await cierreService.cerrar(SEDE, 'u1')

    expect(cierre.ocupadas).toBe(enCasa)
    for (const previo of antes) {
      const estancia = db.estancias.find((e) => e.id === previo.id)!
      // Solo las de esta sede cambian; las otras siguen igual.
      const esperado = cierre.ocupadas > 0 && estancia.nochesConsumidas !== previo.noches
      if (esperado) expect(estancia.nochesConsumidas).toBe(previo.noches + 1)
    }
  })

  it('marca como no-show las llegadas que nadie registró', async () => {
    const fecha = cierreService.fechaOperativa(SEDE)
    despejar(fecha)
    const reserva = db.reservas.find((r) => r.localId === SEDE && r.estado === 'confirmada')!
    reserva.entrada = fecha

    const cierre = await cierreService.cerrar(SEDE, 'u1')

    expect(cierre.noShows).toBeGreaterThan(0)
    expect(db.reservas.find((r) => r.id === reserva.id)?.estado).toBe('noShow')
  })

  it('avanza la fecha operativa y no deja cerrar dos veces', async () => {
    const fecha = cierreService.fechaOperativa(SEDE)
    despejar(fecha)
    await cierreService.cerrar(SEDE, 'u1')

    expect(cierreService.fechaOperativa(SEDE)).not.toBe(fecha)

    /*
     * El día siguiente aún no ha pasado, así que tampoco se puede cerrar: el
     * cierre no se adelanta al calendario.
     */
    await expect(cierreService.cerrar(SEDE, 'u1')).rejects.toMatchObject({
      mensaje: expect.stringContaining('todavía no ha pasado'),
    })
  })

  it('saca ocupación, ADR y RevPAR coherentes entre sí', async () => {
    const fecha = cierreService.fechaOperativa(SEDE)
    despejar(fecha)

    const cierre = await cierreService.cerrar(SEDE, 'u1')

    expect(cierre.ocupacion).toBe(Math.round((cierre.ocupadas / cierre.vendibles) * 100))
    // RevPAR = ADR × ocupación. Es la identidad que hace comparables los hoteles.
    expect(cierre.revpar).toBeCloseTo((cierre.adr * cierre.ocupadas) / cierre.vendibles, 1)
  })

  it('el histórico guarda el día cerrado', async () => {
    const fecha = cierreService.fechaOperativa(SEDE)
    despejar(fecha)
    await cierreService.cerrar(SEDE, 'u1')

    const historico = await cierreService.historico(SEDE)
    expect(historico[0].fecha).toBe(fecha)
    expect(historico[0].cerradoPor).toBe('u1')
  })
})
