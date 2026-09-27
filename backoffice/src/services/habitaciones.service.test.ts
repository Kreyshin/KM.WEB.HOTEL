import { beforeEach, describe, expect, it } from 'vitest'
import { habitacionesService } from './habitaciones.service'
import { db, reiniciarMock } from './mock/db'

/**
 * El inventario físico.
 *
 * Lo que se prueba es que la habitación se pueda dar de alta y retirar sin
 * romper lo que cuelga de ella: una habitación con estancias aparece en
 * facturas y en el Registro de Huéspedes, así que borrarla dejaría esos
 * documentos apuntando al vacío.
 */

const LOCAL = 'l1'

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

describe('consultar', () => {
  it('filtra por sede a través del piso, que es donde vive la relación', async () => {
    const { items } = await habitacionesService.consultar({ filtros: { localId: LOCAL } })
    expect(items.length).toBeGreaterThan(0)
    for (const h of items) {
      expect(db.pisos.find((p) => p.id === h.pisoId)?.localId).toBe(LOCAL)
    }
  })

  it('devuelve la habitación resuelta: sin tipo y piso el listado no dice nada', async () => {
    const { items } = await habitacionesService.consultar({ filtros: { localId: LOCAL } })
    expect(items[0].tipo).toBeDefined()
    expect(items[0].piso).toBeDefined()
  })
})

describe('alta y edición', () => {
  it('da de alta una habitación y la devuelve ya resuelta', async () => {
    const piso = db.pisos.find((p) => p.localId === LOCAL)!
    const tipo = db.tiposHabitacion[0]

    const creada = await habitacionesService.crear({
      numero: '999',
      pisoId: piso.id,
      tipoId: tipo.id,
      ocupacion: 'libre',
      limpieza: 'limpia',
      posX: 50,
      posY: 50,
    })

    expect(creada.numero).toBe('999')
    expect(creada.tipo?.id).toBe(tipo.id)
    expect(creada.piso?.id).toBe(piso.id)
    expect(creada.actualizada).toBeTruthy()
  })

  it('no admite dos habitaciones con el mismo número en la sede', async () => {
    const existente = db.habitaciones.find(
      (h) => db.pisos.find((p) => p.id === h.pisoId)?.localId === LOCAL,
    )!
    await expect(
      habitacionesService.crear({
        numero: existente.numero,
        pisoId: existente.pisoId,
        tipoId: existente.tipoId,
        ocupacion: 'libre',
        limpieza: 'limpia',
        posX: 10,
        posY: 10,
      }),
    ).rejects.toMatchObject({ campos: { numero: expect.any(String) } })
  })
})

describe('eliminar', () => {
  it('se niega a borrar una habitación con estancias en el histórico', async () => {
    const conHistoria = db.estancias[0]
    expect(conHistoria).toBeDefined()
    await expect(habitacionesService.eliminar(conHistoria.habitacionId)).rejects.toMatchObject({
      mensaje: expect.stringContaining('estancias'),
    })
  })

  it('borra una recién creada y la quita de las comunicadas de las demás', async () => {
    const piso = db.pisos.find((p) => p.localId === LOCAL)!
    const vecina = db.habitaciones.find((h) => h.pisoId === piso.id)!

    const creada = await habitacionesService.crear({
      numero: '998',
      pisoId: piso.id,
      tipoId: db.tiposHabitacion[0].id,
      ocupacion: 'libre',
      limpieza: 'limpia',
      posX: 20,
      posY: 20,
    })

    vecina.comunicaCon = [creada.id]
    await habitacionesService.eliminar(creada.id)

    expect(db.habitaciones.some((h) => h.id === creada.id)).toBe(false)
    expect(db.habitaciones.find((h) => h.id === vecina.id)?.comunicaCon).not.toContain(creada.id)
  })
})
