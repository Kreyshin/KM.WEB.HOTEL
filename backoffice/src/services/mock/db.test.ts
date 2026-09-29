import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * La foto que guarda el navegador.
 *
 * Una sesión abierta antes de que existiera una tabla se quedaba con la foto
 * de entonces: la colección nueva llegaba como `undefined` y la pantalla que
 * la usa salía vacía sin ningún error. Se carga completando con la semilla.
 */

const CLAVE = 'km.hotel.mock.v1'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('carga del mock', () => {
  it('completa con la semilla las colecciones que el snapshot no tiene', async () => {
    localStorage.setItem(
      CLAVE,
      JSON.stringify({ locales: [{ id: 'l9', nombre: 'Sede de ayer', activo: true }] }),
    )

    const { db } = await import('./db')

    // Lo guardado manda...
    expect(db.locales.map((l) => l.nombre)).toEqual(['Sede de ayer'])
    // ...y lo que no estaba en la foto llega de la semilla.
    expect(db.distritos.length).toBeGreaterThan(0)
    expect(db.habitaciones.length).toBeGreaterThan(0)
  })

  it('rehace siempre los catálogos del núcleo, aunque el snapshot los traiga', async () => {
    localStorage.setItem(CLAVE, JSON.stringify({ departamentos: [], distritos: [] }))

    const { db } = await import('./db')

    expect(db.departamentos.map((d) => d.nombre)).toContain('Lima')
    expect(db.distritos.length).toBeGreaterThan(0)
  })
})
