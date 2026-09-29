import type { Ubigeo } from '@/types'
import { db, latencia } from './mock/db'

/**
 * El padrón de ubigeos, en cascada.
 *
 * Es un catálogo del núcleo y de solo lectura: nadie da de alta un distrito
 * desde el backoffice. Lo que sí hace falta es recorrerlo en el orden en que
 * lo recorre una persona —departamento, después provincia, después distrito—,
 * porque preguntar por el distrito de golpe obliga a elegir entre mil ochocientas
 * opciones y hay distritos con el mismo nombre en dos departamentos.
 */

const porNombre = (a: string, b: string) => a.localeCompare(b, 'es')

export const ubigeosService = {
  async departamentos(): Promise<string[]> {
    const nombres = [...new Set(db.ubigeos.map((u) => u.departamento))].sort(porNombre)
    return latencia(nombres)
  },

  async provincias(departamento: string): Promise<string[]> {
    if (!departamento) return latencia([])
    const nombres = [
      ...new Set(db.ubigeos.filter((u) => u.departamento === departamento).map((u) => u.provincia)),
    ].sort(porNombre)
    return latencia(nombres)
  },

  async distritos(departamento: string, provincia: string): Promise<Ubigeo[]> {
    if (!departamento || !provincia) return latencia([])
    const items = db.ubigeos
      .filter((u) => u.departamento === departamento && u.provincia === provincia)
      .sort((a, b) => porNombre(a.distrito, b.distrito))
    return latencia(items)
  },

  /** El ubigeo completo a partir del código guardado. Síncrono: se usa al resolver filas. */
  obtener(id?: string): Ubigeo | undefined {
    return id ? db.ubigeos.find((u) => u.id === id) : undefined
  },
}
