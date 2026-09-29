import { beforeEach, describe, expect, it } from 'vitest'
import { localesService } from './locales.service'
import { db, reiniciarMock } from './mock/db'
import { ubigeosService } from './ubigeos.service'

/**
 * El padrón de ubigeos y la sede que lo usa.
 *
 * Lo que se prueba es que la cascada acote de verdad —una provincia de Lima no
 * puede ofrecer distritos de Cusco— y que la sede guarde el código, no el
 * nombre: los tres nombres se derivan al leer.
 */

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

describe('ubigeosService', () => {
  it('acota cada nivel al anterior', async () => {
    const departamentos = await ubigeosService.departamentos()
    expect(departamentos).toContain('Lima')
    expect(departamentos).toContain('Cusco')

    const provincias = await ubigeosService.provincias('Cusco')
    expect(provincias).toContain('Urubamba')
    expect(provincias).not.toContain('Lima')

    const distritos = await ubigeosService.distritos('Cusco', 'Urubamba')
    expect(distritos.map((d) => d.distrito)).toContain('Machupicchu')
    expect(distritos.every((d) => d.id.startsWith('0813'))).toBe(true)
  })

  it('no devuelve nada si falta el nivel de arriba', async () => {
    expect(await ubigeosService.provincias('')).toEqual([])
    expect(await ubigeosService.distritos('Lima', '')).toEqual([])
  })
})

describe('localesService con ubigeo', () => {
  it('guarda el código y devuelve los tres nombres', async () => {
    const sede = await localesService.crear({
      nombre: 'Alba Cusco',
      direccion: 'Calle Garcilaso 210',
      ubigeoId: '080101',
      codigoEstablecimiento: '0009',
      horaCheckIn: '15:00',
      horaCheckOut: '12:00',
      activo: true,
    })

    expect(db.locales.find((l) => l.id === sede.id)?.ubigeoId).toBe('080101')
    expect(sede.departamento).toBe('Cusco')
    expect(sede.provincia).toBe('Cusco')
    expect(sede.distrito).toBe('Cusco')
  })

  it('rechaza un ubigeo que no está en el padrón', async () => {
    await expect(
      localesService.crear({
        nombre: 'Alba Fantasma',
        direccion: 'Calle inventada 1',
        ubigeoId: '999999',
        codigoEstablecimiento: '0008',
        horaCheckIn: '15:00',
        horaCheckOut: '12:00',
        activo: true,
      }),
    ).rejects.toMatchObject({ campos: { ubigeoId: expect.stringContaining('padrón') } })
  })

  it('encuentra la sede buscando por el nombre del distrito', async () => {
    const { items } = await localesService.consultar({ buscar: 'Barranco' })
    expect(items.map((l) => l.nombre)).toContain('Alba Barranco')
  })
})
