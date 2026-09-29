import { beforeEach, describe, expect, it } from 'vitest'
import { canalesService } from './canales.service'
import { db, reiniciarMock } from './mock/db'
import { resolverTarifa } from './tarifas.service'

/**
 * Canales de venta.
 *
 * Lo que se prueba es lo que protege el dinero ya vendido: el código es lo que
 * guarda la reserva, así que no se repite, no se cambia al editar y un canal
 * con ventas no se borra.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

describe('canalesService', () => {
  it('da de alta un canal con su código', async () => {
    const canal = await canalesService.crear({
      codigo: 'agencia-sur',
      nombre: 'Agencia del Sur',
      tipo: 'agencia',
      comision: 10,
      ajuste: 8,
      automatico: false,
      activo: true,
    })

    expect(canal.codigo).toBe('agencia-sur')
    expect(canalesService.porCodigo('agencia-sur')?.nombre).toBe('Agencia del Sur')
  })

  it('rechaza un código con formato de nombre', async () => {
    await expect(
      canalesService.crear({
        codigo: 'Agencia del Sur',
        nombre: 'Agencia del Sur',
        tipo: 'agencia',
        comision: 0,
        ajuste: 0,
        automatico: false,
        activo: true,
      }),
    ).rejects.toMatchObject({
      mensaje: expect.stringContaining('minúsculas'),
      campos: { codigo: 'Código no válido' },
    })
  })

  it('rechaza un código repetido', async () => {
    await expect(
      canalesService.crear({
        codigo: 'booking',
        nombre: 'Booking otra vez',
        tipo: 'ota',
        comision: 15,
        ajuste: 15,
        automatico: true,
        activo: true,
      }),
    ).rejects.toMatchObject({
      mensaje: expect.stringContaining('Ya existe'),
      campos: { codigo: 'Código duplicado' },
    })
  })

  /* Cambiar el código dejaría huérfanas las reservas que lo guardaron. */
  it('ignora el código al editar', async () => {
    const booking = canalesService.porCodigo('booking')!
    const editado = await canalesService.actualizar(booking.id, {
      codigo: 'otro',
      comision: 17,
    })

    expect(editado.codigo).toBe('booking')
    expect(editado.comision).toBe(17)
  })

  it('no borra un canal que ya vendió', async () => {
    const reserva = db.reservas[0]
    const canal = canalesService.porCodigo(reserva.canal)!

    await expect(canalesService.eliminar(canal.id)).rejects.toMatchObject({
      mensaje: expect.stringContaining('Desactívalo'),
    })
  })
})

describe('el ajuste del canal llega a la tarifa', () => {
  /*
   * Antes, un tipo sin fila propia para Booking se vendía al precio del
   * mostrador: la comisión se la comía el hotel sin que se viera en ninguna
   * pantalla. Ahora el ajuste del canal es el suelo.
   */
  it('usa el ajuste del canal cuando el tipo no tiene uno propio', () => {
    const tipo = db.tiposHabitacion.find(
      (t) => !db.tarifasCanal.some((x) => x.tipoId === t.id && x.canal === 'booking'),
    )!
    const hoy = new Date().toISOString().slice(0, 10)

    const { ajuste, origenAjuste } = resolverTarifa(tipo.id, hoy, 'booking')

    expect(ajuste).toBe(15)
    expect(origenAjuste).toBe('canal')
  })

  it('el ajuste propio del tipo pisa al del canal', () => {
    const propia = db.tarifasCanal.find((t) => t.canal === 'expedia')!
    const hoy = new Date().toISOString().slice(0, 10)

    const { ajuste, origenAjuste } = resolverTarifa(propia.tipoId, hoy, 'expedia')

    expect(ajuste).toBe(propia.ajuste)
    expect(origenAjuste).toBe('tipo')
  })
})
