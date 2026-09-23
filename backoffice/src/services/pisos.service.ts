import type { NuevoPiso, Piso } from '@/types'
import { db } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('pisos', {
  prefijo: 'p',
  entidad: 'Piso',
  camposBusqueda: ['nombre', 'descripcion'],
})

function validar(datos: Partial<NuevoPiso>, id?: string) {
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    const mismosLocal = db.pisos.filter(
      (p) => p.localId === (datos.localId ?? db.pisos.find((x) => x.id === id)?.localId),
    )
    if (existeOtro(mismosLocal, (p) => p.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya hay un piso con ese nombre en la sede.', 'Nombre duplicado')
    }
  }
}

/** Plantas del hotel. Ordenan el plano y reparten el trabajo de housekeeping. */
export const pisosService = {
  ...repo,

  async listar(localId?: string): Promise<Piso[]> {
    const { items } = await repo.consultar({
      filtros: localId ? { localId } : undefined,
      orden: { campo: 'orden', direccion: 'asc' },
      porPagina: 200,
    })
    return items
  },

  async crear(datos: NuevoPiso): Promise<Piso> {
    validar(datos)
    return repo.crear({ ...datos, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoPiso>): Promise<Piso> {
    validar(datos, id)
    return repo.actualizar(id, datos)
  },

  async eliminar(id: string): Promise<void> {
    if (db.habitaciones.some((h) => h.pisoId === id)) {
      throw { mensaje: 'No se puede eliminar: el piso tiene habitaciones. Desactívalo.' }
    }
    return repo.eliminar(id)
  },
}
