import type { NuevoTipoHabitacion, TipoHabitacion } from '@/types'
import { db } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('tiposHabitacion', {
  prefijo: 't',
  entidad: 'Tipo de habitación',
  camposBusqueda: ['codigo', 'nombre', 'descripcion', 'camas'],
})

function validar(datos: Partial<NuevoTipoHabitacion>, id?: string) {
  if (datos.codigo !== undefined) {
    if (!/^[A-Z]{2,4}$/.test(datos.codigo)) {
      throw errorCampo('codigo', 'El código son 2 a 4 letras mayúsculas.', 'Ej. DBL, SUI')
    }
    if (existeOtro(db.tiposHabitacion, (t) => t.codigo, datos.codigo, id)) {
      throw errorCampo('codigo', 'Ya existe un tipo con ese código.', 'Código duplicado')
    }
  }
  if (datos.nombre !== undefined && !datos.nombre.trim()) {
    throw errorCampo('nombre', 'El nombre es obligatorio.')
  }
  if (datos.tarifaBase !== undefined && datos.tarifaBase <= 0) {
    throw errorCampo('tarifaBase', 'La tarifa base debe ser mayor que cero.')
  }
  const capacidad = datos.capacidad ?? db.tiposHabitacion.find((t) => t.id === id)?.capacidad ?? 1
  if (datos.capacidadMaxima !== undefined && datos.capacidadMaxima < capacidad) {
    throw errorCampo(
      'capacidadMaxima',
      'La capacidad máxima no puede ser menor que la capacidad.',
      'Revisa el aforo',
    )
  }
}

/** Catálogo de tipos de habitación: la unidad que se vende, no la habitación. */
export const tiposService = {
  ...repo,

  async listar(): Promise<TipoHabitacion[]> {
    const { items } = await repo.consultar({
      orden: { campo: 'tarifaBase', direccion: 'asc' },
      porPagina: 100,
    })
    return items
  },

  async crear(datos: NuevoTipoHabitacion): Promise<TipoHabitacion> {
    validar(datos)
    return repo.crear({ ...datos, codigo: datos.codigo.toUpperCase().trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoTipoHabitacion>): Promise<TipoHabitacion> {
    validar(datos, id)
    return repo.actualizar(id, datos)
  },

  async eliminar(id: string): Promise<void> {
    if (db.habitaciones.some((h) => h.tipoId === id)) {
      throw { mensaje: 'No se puede eliminar: hay habitaciones de este tipo. Desactívalo.' }
    }
    if (
      db.reservas.some((r) => r.tipoId === id && ['pendiente', 'confirmada'].includes(r.estado))
    ) {
      throw { mensaje: 'No se puede eliminar: hay reservas futuras con este tipo.' }
    }
    return repo.eliminar(id)
  },
}
