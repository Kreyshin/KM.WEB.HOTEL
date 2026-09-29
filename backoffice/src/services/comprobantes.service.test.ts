import { beforeEach, describe, expect, it } from 'vitest'
import { comprobantesService, impuestosService } from './comprobantes.service'
import { db, reiniciarMock } from './mock/db'

/**
 * Series de comprobante.
 *
 * Lo que se prueba es lo que tiene consecuencias fuera del programa: la letra
 * de la serie la manda SUNAT, el correlativo no retrocede —dos comprobantes
 * con el mismo número es una contingencia, no un error de pantalla— y una
 * serie que ya emitió no se borra.
 */

const SEDE = 'l1'

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

describe('comprobantesService', () => {
  it('exige la letra que corresponde al tipo', async () => {
    await expect(
      comprobantesService.crear({
        localId: SEDE,
        tipo: 'factura',
        serie: 'B009',
        correlativo: 0,
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { serie: 'Formato no válido' } })

    const buena = await comprobantesService.crear({
      localId: SEDE,
      tipo: 'factura',
      serie: 'f009',
      correlativo: 0,
      activo: true,
    })
    // Se guarda en mayúsculas aunque se escriba de otra manera.
    expect(buena.serie).toBe('F009')
  })

  it('no admite dos veces la misma serie en la sede', async () => {
    await expect(
      comprobantesService.crear({
        localId: SEDE,
        tipo: 'boleta',
        serie: 'B001',
        correlativo: 0,
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { serie: 'Serie duplicada' } })
  })

  it('deja repetir la serie en otra sede', async () => {
    const otra = await comprobantesService.crear({
      localId: 'l2',
      tipo: 'factura',
      serie: 'F001',
      correlativo: 0,
      activo: true,
    })
    expect(otra.serie).toBe('F001')
  })

  it('no deja retroceder el correlativo', async () => {
    const serie = db.series.find((s) => s.serie === 'B001')!
    // La fila es la viva del mock: se anota el número antes de tocarla.
    const emitido = serie.correlativo

    await expect(
      comprobantesService.actualizar(serie.id, { correlativo: emitido - 1 }),
    ).rejects.toMatchObject({ campos: { correlativo: 'No puede bajar' } })

    const subida = await comprobantesService.actualizar(serie.id, { correlativo: emitido + 10 })
    expect(subida.correlativo).toBe(emitido + 10)
  })

  it('no borra una serie que ya emitió', async () => {
    const serie = db.series.find((s) => s.correlativo > 0)!

    await expect(comprobantesService.eliminar(serie.id)).rejects.toMatchObject({
      mensaje: expect.stringContaining('Desactívala'),
    })
  })

  it('emite el siguiente número y lo consume', async () => {
    const antes = db.series.find((s) => s.localId === SEDE && s.tipo === 'boleta')!.correlativo

    expect(comprobantesService.siguiente(SEDE, 'boleta')).toEqual({
      serie: 'B001',
      numero: antes + 1,
    })

    const emitido = await comprobantesService.emitir(SEDE, 'boleta')

    expect(emitido).toEqual({ serie: 'B001', numero: antes + 1 })
    // El siguiente ya es otro: un número no se entrega dos veces.
    expect(comprobantesService.siguiente(SEDE, 'boleta')?.numero).toBe(antes + 2)
  })

  /*
   * Sin serie activa no se puede cobrar, y eso tiene que doler aquí y no con
   * el huésped delante.
   */
  it('avisa cuando la sede no tiene serie de ese tipo', async () => {
    expect(comprobantesService.siguiente('l2', 'factura')).toBeUndefined()

    await expect(comprobantesService.emitir('l2', 'factura')).rejects.toMatchObject({
      mensaje: expect.stringContaining('no tiene una serie activa'),
    })
  })
})

describe('impuestosService', () => {
  it('guarda el IGV y rechaza un disparate', async () => {
    const guardado = await impuestosService.guardar({
      igv: 10,
      preciosIncluyenIgv: false,
      exoneracionNoDomiciliados: true,
    })
    expect(guardado.igv).toBe(10)
    expect((await impuestosService.obtener()).preciosIncluyenIgv).toBe(false)

    await expect(
      impuestosService.guardar({
        igv: 80,
        preciosIncluyenIgv: true,
        exoneracionNoDomiciliados: true,
      }),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('0 a 50') })
  })
})
