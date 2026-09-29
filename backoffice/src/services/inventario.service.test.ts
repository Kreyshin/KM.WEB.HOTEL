import { beforeEach, describe, expect, it } from 'vitest'
import { inventarioService } from './inventario.service'
import { db, reiniciarMock } from './mock/db'

/**
 * Kardex del piso.
 *
 * Lo que se prueba es que la línea y el almacén se muevan juntos: un kardex
 * que no baja el stock, o un stock que cambia sin dejar línea, son las dos
 * maneras de que el papel y la estantería dejen de parecerse.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

const primerInsumo = () => db.insumos.find((i) => i.activo && i.stock > 5)!

describe('inventarioService', () => {
  it('una salida baja el stock y deja su línea', async () => {
    const insumo = primerInsumo()
    const antes = insumo.stock

    const movimiento = await inventarioService.registrarMovimiento({
      insumoId: insumo.id,
      tipo: 'salida',
      cantidad: 3,
      usuarioId: 'u1',
    })

    expect(db.insumos.find((i) => i.id === insumo.id)?.stock).toBe(antes - 3)
    expect(db.movimientos.some((m) => m.id === movimiento.id)).toBe(true)
  })

  it('un ingreso lo sube', async () => {
    const insumo = primerInsumo()
    const antes = insumo.stock

    await inventarioService.registrarMovimiento({
      insumoId: insumo.id,
      tipo: 'ingreso',
      cantidad: 10,
      usuarioId: 'u1',
    })

    expect(db.insumos.find((i) => i.id === insumo.id)?.stock).toBe(antes + 10)
  })

  it('no deja sacar más de lo que hay', async () => {
    const insumo = primerInsumo()

    await expect(
      inventarioService.registrarMovimiento({
        insumoId: insumo.id,
        tipo: 'salida',
        cantidad: insumo.stock + 1,
        usuarioId: 'u1',
      }),
    ).rejects.toMatchObject({ campos: { cantidad: 'Sin stock' } })
  })

  /* En un ajuste, la cantidad es lo contado. La diferencia la saca el sistema. */
  it('el ajuste fija el stock al conteo', async () => {
    const insumo = primerInsumo()

    await inventarioService.registrarMovimiento({
      insumoId: insumo.id,
      tipo: 'ajuste',
      cantidad: 2,
      motivo: 'Conteo físico del lunes',
      usuarioId: 'u1',
    })

    expect(db.insumos.find((i) => i.id === insumo.id)?.stock).toBe(2)
  })

  it('un ajuste que no cambia nada se rechaza', async () => {
    const insumo = primerInsumo()

    await expect(
      inventarioService.registrarMovimiento({
        insumoId: insumo.id,
        tipo: 'ajuste',
        cantidad: insumo.stock,
        motivo: 'Conteo',
        usuarioId: 'u1',
      }),
    ).rejects.toMatchObject({ campos: { cantidad: 'Sin diferencia' } })
  })

  it('una merma sin motivo no pasa', async () => {
    const insumo = primerInsumo()

    await expect(
      inventarioService.registrarMovimiento({
        insumoId: insumo.id,
        tipo: 'merma',
        cantidad: 1,
        usuarioId: 'u1',
      }),
    ).rejects.toMatchObject({ campos: { motivo: 'Falta el motivo' } })
  })

  it('cuenta el día en el resumen', async () => {
    const insumo = primerInsumo()
    const antes = await inventarioService.resumenDelDia()

    await inventarioService.registrarMovimiento({
      insumoId: insumo.id,
      tipo: 'merma',
      cantidad: 2,
      motivo: 'Toalla manchada',
      usuarioId: 'u1',
    })

    const despues = await inventarioService.resumenDelDia()
    expect(despues.movimientos).toBe(antes.movimientos + 1)
    expect(despues.mermas).toBe(antes.mermas + 2)
  })
})
