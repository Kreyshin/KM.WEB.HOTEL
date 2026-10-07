import { beforeEach, describe, expect, it } from 'vitest'
import { motivosService } from './motivos.service'
import { db, reiniciarMock } from './mock/db'

/**
 * Catálogo de motivos.
 *
 * Lo que se prueba es lo que protege los informes: que el ámbito no se mueva
 * —un motivo ya usado quedó escrito en registros cerrados— y que el mismo
 * nombre no se repita dentro de un ámbito, porque dos filas para el mismo
 * hecho es exactamente lo que el catálogo existe para evitar. La unicidad, en
 * cambio, no cruza ámbitos: «Mantenimiento programado» vale para bloquear y
 * para dejar fuera de servicio.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

describe('motivosService', () => {
  it('no admite dos motivos iguales en el mismo ámbito, ni con tildes de por medio', async () => {
    await motivosService.crear({
      nombre: 'Tarifa negociada',
      ambito: 'descuento',
      requiereNota: false,
      activo: true,
    })
    await expect(
      motivosService.crear({
        nombre: '  tarifa negociáda ',
        ambito: 'descuento',
        requiereNota: false,
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { nombre: 'Motivo duplicado' } })
  })

  it('el mismo nombre sí vale en dos ámbitos distintos', async () => {
    const uno = await motivosService.crear({
      nombre: 'Obra en el piso',
      ambito: 'bloqueo',
      requiereNota: true,
      activo: true,
    })
    const otro = await motivosService.crear({
      nombre: 'Obra en el piso',
      ambito: 'fueraServicio',
      requiereNota: true,
      activo: true,
    })
    expect(uno.id).not.toBe(otro.id)
  })

  it('no mueve un motivo de ámbito', async () => {
    const motivo = db.motivos[0]!
    await expect(
      motivosService.actualizar(motivo.id, { ambito: 'cortesia' }),
    ).rejects.toMatchObject({ campos: { ambito: 'No se puede mover' } })

    // Reenviar el mismo ámbito no es moverlo: editar el nombre debe seguir funcionando.
    const editado = await motivosService.actualizar(motivo.id, {
      ambito: motivo.ambito,
      nombre: 'Cambio de planes',
    })
    expect(editado.nombre).toBe('Cambio de planes')
  })

  it('exige un nombre que signifique algo', async () => {
    await expect(
      motivosService.crear({ nombre: 'ok', ambito: 'bloqueo', requiereNota: false, activo: true }),
    ).rejects.toMatchObject({ campos: { nombre: expect.any(String) } })
  })

  it('solo ofrece los motivos vivos de su ámbito', async () => {
    const creado = await motivosService.crear({
      nombre: 'Motivo retirado',
      ambito: 'cortesia',
      requiereNota: false,
      activo: true,
    })
    expect(motivosService.porAmbito('cortesia').map((m) => m.id)).toContain(creado.id)

    await motivosService.actualizar(creado.id, { activo: false })
    expect(motivosService.porAmbito('cortesia').map((m) => m.id)).not.toContain(creado.id)
  })

  it('avisa del ámbito que se quedó sin motivos activos', async () => {
    for (const m of db.motivos.filter((m) => m.ambito === 'descuento')) {
      await motivosService.actualizar(m.id, { activo: false })
    }
    expect(motivosService.ambitosVacios()).toContain('descuento')
  })

  it('quien usa un motivo con nota obligatoria tiene que escribirla', async () => {
    const conNota = await motivosService.crear({
      nombre: 'Cortesía de dirección',
      ambito: 'cortesia',
      requiereNota: true,
      activo: true,
    })
    expect(() => motivosService.validarUso(conNota.id)).toThrow()
    expect(() => motivosService.validarUso(conNota.id, '   ')).toThrow()
    expect(motivosService.validarUso(conNota.id, 'Queja de ruido en la 203').id).toBe(conNota.id)

    // Un motivo retirado no se puede seguir usando aunque se conozca su id.
    await motivosService.actualizar(conNota.id, { activo: false })
    expect(() => motivosService.validarUso(conNota.id, 'con nota')).toThrow()
  })
})
