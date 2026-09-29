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
    expect(departamentos.map((d) => d.nombre)).toEqual(['Callao', 'Cusco', 'Lima'])

    const provincias = await ubigeosService.provincias('08')
    expect(provincias.map((p) => p.nombre)).toContain('Urubamba')
    expect(provincias.every((p) => p.id.startsWith('08'))).toBe(true)

    const distritos = await ubigeosService.distritos('0813')
    expect(distritos.map((d) => d.nombre)).toContain('Machupicchu')
    expect(distritos.every((d) => d.id.startsWith('0813'))).toBe(true)
  })

  /*
   * «Lima» es departamento, provincia y distrito. Si la cascada filtrara por
   * nombre en vez de por id, la provincia de Lima traería distritos de tres
   * sitios distintos; este es el caso que lo destapa.
   */
  it('no confunde los homónimos entre niveles', async () => {
    const provinciasDeLima = await ubigeosService.provincias('15')
    expect(provinciasDeLima.map((p) => p.nombre).sort()).toEqual(['Huaral', 'Lima'])

    const distritosDeHuaral = await ubigeosService.distritos('1510')
    expect(distritosDeHuaral.map((d) => d.nombre)).toEqual(['Chancay'])
  })

  it('no devuelve nada si falta el nivel de arriba', async () => {
    expect(await ubigeosService.provincias('')).toEqual([])
    expect(await ubigeosService.distritos('')).toEqual([])
  })

  it('une las tres tablas a partir del código del distrito', () => {
    expect(ubigeosService.obtener('150122')).toEqual({
      id: '150122',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Miraflores',
    })
    expect(ubigeosService.obtener('999999')).toBeUndefined()
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
