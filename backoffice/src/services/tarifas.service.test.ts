import { beforeEach, describe, expect, it } from 'vitest'
import { resolverTarifa, tarifasService } from './tarifas.service'
import { db, reiniciarMock } from './mock/db'

/**
 * El precio se resuelve en un orden fijo —base del tipo, factor de temporada,
 * ajuste de canal y redondeo—, el mismo que aplicará el backend.
 */
describe('resolución de tarifa', () => {
  beforeEach(() => reiniciarMock())

  const enTemporadaMedia = () => db.temporadas.find((t) => t.id === 's2')!.desde

  it('aplica la tarifa base del tipo cuando no hay ajuste ni temporada', () => {
    const { precio } = resolverTarifa('t2', enTemporadaMedia(), 'directo')
    // Doble a 260 con factor 1 y sin ajuste de canal.
    expect(precio).toBe(260)
  })

  it('suma la comisión del canal sobre la tarifa resuelta', () => {
    const directo = resolverTarifa('t2', enTemporadaMedia(), 'directo').precio
    const booking = resolverTarifa('t2', enTemporadaMedia(), 'booking').precio
    expect(booking).toBeGreaterThan(directo)
    // +15 % sobre 260 = 299, redondeado al múltiplo de 5 configurado.
    expect(booking).toBe(300)
  })

  it('el factor de temporada multiplica antes del redondeo', () => {
    const fiestas = db.temporadas.find((t) => t.id === 's3')!
    const { precio, factor } = resolverTarifa('t1', fiestas.desde, 'directo')
    expect(factor).toBe(1.4)
    // 180 × 1,4 = 252 → 250 con redondeo a 5.
    expect(precio).toBe(250)
  })

  it('rechaza una temporada que solapa con otra activa', async () => {
    const media = db.temporadas.find((t) => t.id === 's2')!
    await expect(
      tarifasService.temporadas.crear({
        nombre: 'Puente',
        desde: media.desde,
        hasta: media.hasta,
        factor: 1.2,
        color: 'coral',
        activa: true,
      }),
    ).rejects.toMatchObject({ campos: { desde: expect.stringContaining('Fechas ocupadas') } })
  })

  it('la rejilla devuelve una celda por tipo activo y día', async () => {
    const { fechas, filas } = await tarifasService.rejilla(7, 'directo')
    expect(fechas).toHaveLength(7)
    expect(filas).toHaveLength(db.tiposHabitacion.filter((t) => t.activo).length)
    expect(filas[0]!.celdas).toHaveLength(7)
  })
})
