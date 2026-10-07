import { beforeEach, describe, expect, it } from 'vitest'
import {
  PARAMETROS,
  configuracionService,
  flag,
  numero,
  valorParametro,
} from './configuracion.service'
import { db, reiniciarMock } from './mock/db'

/**
 * Configuración de la vertical y de la sede.
 *
 * Lo que se prueba es la herencia, que es donde están las consecuencias: un
 * valor resuelto al revés hace que el hotel se comporte distinto de lo que
 * alguien decidió. Y la regla que sostiene todo lo demás: un valor igual al de
 * la cadena no se guarda como propio, porque un registro así ancla a la sede
 * en silencio el día que la cadena se mueva.
 */

const SEDE = 'l1'
/** En la semilla, l2 es la sede que no inspecciona la limpieza. */
const SEDE_SIN_INSPECCION = 'l2'

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

describe('resolución del valor', () => {
  it('va de la sede a la cadena y de la cadena al valor de serie', () => {
    // La cadena inspecciona; l2 se apartó.
    expect(valorParametro('limpieza.requiereInspeccion')).toBe(true)
    expect(valorParametro('limpieza.requiereInspeccion', SEDE)).toBe(true)
    expect(valorParametro('limpieza.requiereInspeccion', SEDE_SIN_INSPECCION)).toBe(false)

    // Una clave que nadie ha guardado cae en el valor de serie de su definición.
    delete db.configuracion.vertical['checkout.salidaTardiaPorcentaje']
    expect(numero('checkout.salidaTardiaPorcentaje')).toBe(50)
  })

  it('no se inventa un parámetro que no existe', () => {
    expect(() => valorParametro('loquesea.noExiste')).toThrow()
  })

  it('cada parámetro declara dónde manda', () => {
    // Un parámetro sin efecto escrito es un interruptor que nadie sabe para qué
    // es, y eso es justo lo que esta pantalla existe para evitar.
    for (const p of PARAMETROS) expect(p.efecto.length).toBeGreaterThan(20)
  })
})

describe('guardar en la cadena', () => {
  it('rechaza lo que se sale del rango de su definición', async () => {
    await expect(
      configuracionService.guardarVertical({ 'reserva.garantiaHoras': 500 }),
    ).rejects.toMatchObject({ campos: { 'reserva.garantiaHoras': 'Fuera de rango' } })
    // El valor anterior sigue intacto: una validación que falla no deja a medias.
    expect(numero('reserva.garantiaHoras')).toBe(24)
  })

  it('rechaza un parámetro inexistente', async () => {
    await expect(configuracionService.guardarVertical({ 'no.existe': 1 })).rejects.toMatchObject({
      campos: { 'no.existe': expect.any(String) },
    })
  })

  it('suelta a las sedes que ya tenían ese mismo valor', async () => {
    // l2 tiene false propio. Si la cadena pasa a false, l2 ya no sobrescribe nada.
    expect(configuracionService.esPropio(SEDE_SIN_INSPECCION, 'limpieza.requiereInspeccion')).toBe(
      true,
    )
    await configuracionService.guardarVertical({ 'limpieza.requiereInspeccion': false })
    expect(configuracionService.esPropio(SEDE_SIN_INSPECCION, 'limpieza.requiereInspeccion')).toBe(
      false,
    )
    // Y vuelve a moverse con la cadena.
    await configuracionService.guardarVertical({ 'limpieza.requiereInspeccion': true })
    expect(flag('limpieza.requiereInspeccion', SEDE_SIN_INSPECCION)).toBe(true)
  })
})

describe('guardar en la sede', () => {
  it('no deja ajustar por sede lo que vale para toda la cadena', async () => {
    await expect(
      configuracionService.guardarLocal(SEDE, { 'reserva.permitirSobreventa': true }),
    ).rejects.toMatchObject({
      campos: { 'reserva.permitirSobreventa': 'No se ajusta por sede' },
    })
    expect(flag('reserva.permitirSobreventa', SEDE)).toBe(false)
  })

  it('guarda lo que se aparta y descarta lo que coincide', async () => {
    await configuracionService.guardarLocal(SEDE, { 'checkout.toleranciaSalidaMinutos': 60 })
    expect(configuracionService.esPropio(SEDE, 'checkout.toleranciaSalidaMinutos')).toBe(true)
    expect(numero('checkout.toleranciaSalidaMinutos', SEDE)).toBe(60)

    // Volver al valor de la cadena no se guarda como decisión propia.
    await configuracionService.guardarLocal(SEDE, { 'checkout.toleranciaSalidaMinutos': 30 })
    expect(configuracionService.esPropio(SEDE, 'checkout.toleranciaSalidaMinutos')).toBe(false)
    expect(numero('checkout.toleranciaSalidaMinutos', SEDE)).toBe(30)
  })

  it('restablecer devuelve la clave a la cadena', async () => {
    await configuracionService.restablecer(SEDE_SIN_INSPECCION, 'limpieza.requiereInspeccion')
    expect(flag('limpieza.requiereInspeccion', SEDE_SIN_INSPECCION)).toBe(true)
  })

  it('no guarda nada en una sede que no existe', async () => {
    await expect(
      configuracionService.guardarLocal('l-fantasma', { 'checkout.cobrarSalidaTardia': false }),
    ).rejects.toMatchObject({ mensaje: 'Sede no encontrada.' })
  })

  it('las sedes que difieren son las que se apartan de verdad', async () => {
    expect(configuracionService.sedesQueDifieren('limpieza.requiereInspeccion')).toEqual([
      SEDE_SIN_INSPECCION,
    ])
    await configuracionService.restablecer(SEDE_SIN_INSPECCION, 'limpieza.requiereInspeccion')
    expect(configuracionService.sedesQueDifieren('limpieza.requiereInspeccion')).toEqual([])
  })
})
