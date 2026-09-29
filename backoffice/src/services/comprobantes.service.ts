import type {
  ConfigImpuestos,
  Consulta,
  Paginado,
  SerieComprobante,
  TipoComprobante,
} from '@/types'
import { db, latencia, persistir } from './mock/db'
import { errorCampo } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('series', {
  prefijo: 'sc',
  entidad: 'Serie',
  camposBusqueda: ['serie'],
})

/**
 * Con qué letra empieza la serie de cada comprobante.
 *
 * No es una convención de la casa: lo fija SUNAT. Una boleta va en una serie
 * que empieza por B y una factura por F, y una nota se emite en la serie del
 * documento que corrige —de ahí BC y FC—. Escribir «X001» en una factura es un
 * comprobante rechazado, y eso se descubre el día que el huésped se va.
 */
const PREFIJO: Record<TipoComprobante, RegExp> = {
  boleta: /^B[0-9A-Z]{3}$/,
  factura: /^F[0-9A-Z]{3}$/,
  notaCredito: /^[BF]C[0-9A-Z]{2}$/,
  notaVenta: /^NV[0-9A-Z]{2}$/,
}

const EJEMPLO: Record<TipoComprobante, string> = {
  boleta: 'B001',
  factura: 'F001',
  notaCredito: 'BC01 o FC01',
  notaVenta: 'NV01',
}

function validar(datos: Partial<Omit<SerieComprobante, 'id'>>, id?: string) {
  const actual = id ? db.series.find((s) => s.id === id) : undefined
  const tipo = datos.tipo ?? actual?.tipo
  const localId = datos.localId ?? actual?.localId

  if (datos.serie !== undefined) {
    const serie = datos.serie.trim().toUpperCase()
    if (tipo && !PREFIJO[tipo].test(serie)) {
      throw errorCampo(
        'serie',
        `Una serie de ${tipo === 'notaVenta' ? 'nota de venta' : tipo} se escribe como ${EJEMPLO[tipo]}.`,
        'Formato no válido',
      )
    }
    const repetida = db.series.some(
      (s) => s.id !== id && s.localId === localId && s.serie === serie,
    )
    if (repetida) {
      throw errorCampo('serie', 'Esa serie ya existe en la sede.', 'Serie duplicada')
    }
  }

  /*
   * El correlativo no retrocede. Bajarlo significaría volver a emitir números
   * ya entregados: dos comprobantes distintos con el mismo número, que es una
   * contingencia tributaria y no un error de pantalla.
   */
  if (datos.correlativo !== undefined) {
    if (datos.correlativo < 0) {
      throw errorCampo('correlativo', 'El correlativo no puede ser negativo.')
    }
    if (actual && datos.correlativo < actual.correlativo) {
      throw errorCampo(
        'correlativo',
        `Ya se emitió el ${actual.correlativo}. El correlativo no puede retroceder.`,
        'No puede bajar',
      )
    }
  }
}

export const comprobantesService = {
  ...repo,

  async consultar(consulta?: Consulta): Promise<Paginado<SerieComprobante>> {
    return repo.consultar({ orden: { campo: 'serie', direccion: 'asc' }, ...consulta })
  },

  async crear(datos: Omit<SerieComprobante, 'id'>): Promise<SerieComprobante> {
    validar(datos)
    return repo.crear({ ...datos, serie: datos.serie.trim().toUpperCase() })
  },

  async actualizar(
    id: string,
    datos: Partial<Omit<SerieComprobante, 'id'>>,
  ): Promise<SerieComprobante> {
    validar(datos, id)
    const serie = datos.serie !== undefined ? datos.serie.trim().toUpperCase() : undefined
    return repo.actualizar(id, serie !== undefined ? { ...datos, serie } : datos)
  },

  async eliminar(id: string): Promise<void> {
    const serie = db.series.find((s) => s.id === id)
    if (serie && serie.correlativo > 0) {
      throw {
        mensaje: `No se puede eliminar: la serie ${serie.serie} ya emitió ${serie.correlativo} comprobantes. Desactívala en su lugar.`,
      }
    }
    return repo.eliminar(id)
  },

  /**
   * El número que le toca al siguiente comprobante de ese tipo en esa sede.
   *
   * Lo consume el check-out. Devuelve `undefined` cuando no hay serie activa,
   * y ese caso no es un detalle: sin serie no se puede facturar, así que el
   * hotel no puede cobrar aunque el huésped ya se vaya.
   */
  siguiente(localId: string, tipo: TipoComprobante) {
    const serie = db.series.find((s) => s.localId === localId && s.tipo === tipo && s.activo)
    if (!serie) return undefined
    return { serie: serie.serie, numero: serie.correlativo + 1 }
  },

  /** Consume un número. Solo lo llama quien acaba de emitir de verdad. */
  async emitir(localId: string, tipo: TipoComprobante) {
    const serie = db.series.find((s) => s.localId === localId && s.tipo === tipo && s.activo)
    if (!serie) {
      throw {
        mensaje: `La sede no tiene una serie activa de ${tipo}. Créala en Comprobantes antes de facturar.`,
      }
    }
    serie.correlativo += 1
    persistir()
    return latencia({ serie: serie.serie, numero: serie.correlativo })
  },
}

/**
 * Los impuestos de la cadena. Es un registro único, no un catálogo: el IGV no
 * se da de alta, se cambia el día que el Estado lo cambia.
 */
export const impuestosService = {
  async obtener(): Promise<ConfigImpuestos> {
    return latencia({ ...db.impuestos })
  },

  async guardar(datos: ConfigImpuestos): Promise<ConfigImpuestos> {
    if (datos.igv < 0 || datos.igv > 50) {
      throw errorCampo('igv', 'El IGV va de 0 a 50 %.')
    }
    Object.assign(db.impuestos, datos)
    persistir()
    return latencia({ ...db.impuestos })
  },
}
