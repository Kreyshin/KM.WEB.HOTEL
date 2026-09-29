import type { Departamento, Distrito, Provincia, Ubigeo } from '@/types'
import { db, latencia } from './mock/db'

/**
 * El padrón de ubigeos, en cascada.
 *
 * Es un catálogo del núcleo y de solo lectura: nadie da de alta un distrito
 * desde el backoffice. Lo que sí hace falta es recorrerlo en el orden en que
 * lo recorre una persona —departamento, después provincia, después distrito—,
 * porque preguntar por el distrito de golpe obliga a elegir entre mil
 * ochocientas opciones y hay distritos homónimos en departamentos distintos.
 *
 * Cada nivel se pide por el **id** del de arriba, no por su nombre: «Lima» es
 * departamento, provincia y distrito a la vez, así que filtrar por nombre
 * devolvería cosas de tres sitios.
 */

const porNombre = <T extends { nombre: string }>(a: T, b: T) =>
  a.nombre.localeCompare(b.nombre, 'es')

export const ubigeosService = {
  async departamentos(): Promise<Departamento[]> {
    return latencia([...db.departamentos].sort(porNombre))
  },

  async provincias(departamentoId: string): Promise<Provincia[]> {
    if (!departamentoId) return latencia([])
    const items = db.provincias.filter((p) => p.departamentoId === departamentoId).sort(porNombre)
    return latencia(items)
  },

  async distritos(provinciaId: string): Promise<Distrito[]> {
    if (!provinciaId) return latencia([])
    const items = db.distritos.filter((d) => d.provinciaId === provinciaId).sort(porNombre)
    return latencia(items)
  },

  /**
   * Une las tres tablas para un código de distrito. Síncrono porque se usa al
   * resolver filas, donde la latencia ya la pone la consulta que las trae.
   */
  obtener(id?: string): Ubigeo | undefined {
    const distrito = id ? db.distritos.find((d) => d.id === id) : undefined
    if (!distrito) return undefined
    const provincia = db.provincias.find((p) => p.id === distrito.provinciaId)
    const departamento = db.departamentos.find((d) => d.id === provincia?.departamentoId)
    return {
      id: distrito.id,
      departamento: departamento?.nombre ?? '',
      provincia: provincia?.nombre ?? '',
      distrito: distrito.nombre,
    }
  },
}
