import type { Canal, Consulta, NuevoCanal, Paginado } from '@/types'
import { db, latencia } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('canales', {
  prefijo: 'c',
  entidad: 'Canal',
  camposBusqueda: ['nombre', 'codigo'],
})

const CODIGO = /^[a-z][a-z0-9-]{1,19}$/

function validar(datos: Partial<NuevoCanal>, id?: string) {
  if (datos.codigo !== undefined) {
    const codigo = datos.codigo.trim().toLowerCase()
    if (!CODIGO.test(codigo)) {
      throw errorCampo(
        'codigo',
        'El código va en minúsculas, sin espacios ni tildes: «booking», «agencia-viajes».',
        'Código no válido',
      )
    }
    if (db.canales.some((c) => c.id !== id && c.codigo === codigo)) {
      throw errorCampo('codigo', 'Ya existe un canal con ese código.', 'Código duplicado')
    }
  }
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    if (existeOtro(db.canales, (c) => c.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya existe un canal con ese nombre.', 'Nombre duplicado')
    }
  }
  for (const campo of ['comision', 'ajuste'] as const) {
    const valor = datos[campo]
    if (valor !== undefined && (valor < -100 || valor > 100)) {
      throw errorCampo(campo, 'El porcentaje va de -100 a 100.')
    }
  }
  if (datos.comision !== undefined && datos.comision < 0) {
    throw errorCampo('comision', 'Una comisión no puede ser negativa.', 'Debe ser 0 o más')
  }
}

/**
 * Canales de venta.
 *
 * El **código** —no el id— es lo que las reservas guardan (`booking`,
 * `directo`), así que se escribe al dar de alta y después no se toca:
 * cambiarlo dejaría huérfano todo lo vendido por ese canal.
 */
export const canalesService = {
  ...repo,

  async consultar(consulta?: Consulta): Promise<Paginado<Canal>> {
    return repo.consultar({ orden: { campo: 'nombre', direccion: 'asc' }, ...consulta })
  },

  async listar(): Promise<Canal[]> {
    return latencia([...db.canales].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
  },

  /** Los que se pueden elegir al tomar una reserva a mano. */
  async listarVendibles(): Promise<Canal[]> {
    const items = await this.listar()
    return items.filter((c) => c.activo)
  },

  /** El canal al que apunta un código guardado en una reserva. */
  porCodigo(codigo: string): Canal | undefined {
    return db.canales.find((c) => c.codigo === codigo)
  },

  async crear(datos: NuevoCanal): Promise<Canal> {
    validar(datos)
    return repo.crear({
      ...datos,
      codigo: datos.codigo.trim().toLowerCase(),
      nombre: datos.nombre.trim(),
    })
  },

  async actualizar(id: string, datos: Partial<NuevoCanal>): Promise<Canal> {
    validar(datos, id)
    // El código no se cambia: lo guardan las reservas ya vendidas.
    const { codigo: _ignorado, ...resto } = datos
    return repo.actualizar(id, resto)
  },

  async eliminar(id: string): Promise<void> {
    const canal = db.canales.find((c) => c.id === id)
    const vendidas = db.reservas.filter((r) => r.canal === canal?.codigo).length
    if (vendidas) {
      throw {
        mensaje: `No se puede eliminar: hay ${vendidas} reserva${vendidas === 1 ? '' : 's'} vendida${vendidas === 1 ? '' : 's'} por este canal. Desactívalo en su lugar.`,
      }
    }
    return repo.eliminar(id)
  },
}
