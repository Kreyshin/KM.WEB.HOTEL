import type { Huesped, NuevoHuesped } from '@/types'
import { db } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('huespedes', {
  prefijo: 'g',
  entidad: 'Huésped',
  camposBusqueda: ['nombres', 'apellidos', 'documento', 'email', 'telefono'],
})

function validar(datos: Partial<NuevoHuesped>, id?: string) {
  if (datos.nombres !== undefined && !datos.nombres.trim()) {
    throw errorCampo('nombres', 'El nombre es obligatorio.')
  }
  if (datos.documento !== undefined) {
    if (!datos.documento.trim()) throw errorCampo('documento', 'El documento es obligatorio.')
    if (datos.tipoDocumento === 'dni' && !/^\d{8}$/.test(datos.documento)) {
      throw errorCampo('documento', 'El DNI tiene 8 dígitos.', 'Usa 8 dígitos')
    }
    if (datos.tipoDocumento === 'ruc' && !/^\d{11}$/.test(datos.documento)) {
      throw errorCampo('documento', 'El RUC tiene 11 dígitos.', 'Usa 11 dígitos')
    }
    if (existeOtro(db.huespedes, (h) => h.documento, datos.documento, id)) {
      throw errorCampo('documento', 'Ya hay un huésped con ese documento.', 'Documento duplicado')
    }
  }
}

/** Ficha de hospedaje. El maestro comercial sigue viviendo en el ERP. */
export const huespedesService = {
  ...repo,

  async crear(datos: NuevoHuesped): Promise<Huesped> {
    validar(datos)
    return repo.crear({
      ...datos,
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
    })
  },

  async actualizar(id: string, datos: Partial<NuevoHuesped>): Promise<Huesped> {
    validar(datos, id)
    return repo.actualizar(id, datos)
  },

  async eliminar(id: string): Promise<void> {
    if (db.reservas.some((r) => r.huespedId === id)) {
      throw { mensaje: 'No se puede eliminar: el huésped tiene reservas en el histórico.' }
    }
    return repo.eliminar(id)
  },

  /** Historial de estancias del huésped, de la más reciente a la más antigua. */
  async historial(id: string) {
    return db.reservas
      .filter((r) => r.huespedId === id)
      .sort((a, b) => b.entrada.localeCompare(a.entrada))
  },
}
