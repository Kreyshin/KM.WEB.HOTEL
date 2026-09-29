import type { CanalReserva, NuevaTemporada, TarifaCanal, Temporada } from '@/types'
import { db, latencia } from './mock/db'
import { errorCampo } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const temporadas = crearRepositorio('temporadas', {
  prefijo: 's',
  entidad: 'Temporada',
  camposBusqueda: ['nombre'],
})

const tarifasCanal = crearRepositorio('tarifasCanal', {
  prefijo: 'tc',
  entidad: 'Tarifa de canal',
})

function validarTemporada(datos: Partial<NuevaTemporada>, id?: string) {
  if (datos.nombre !== undefined && !datos.nombre.trim()) {
    throw errorCampo('nombre', 'El nombre es obligatorio.')
  }
  if (datos.desde && datos.hasta && datos.hasta < datos.desde) {
    throw errorCampo('hasta', 'El fin de la temporada no puede ser anterior al inicio.')
  }
  if (datos.factor !== undefined && (datos.factor < 0.1 || datos.factor > 5)) {
    throw errorCampo('factor', 'El factor va de 0,1 a 5.', 'Ej. 1,25 para +25 %')
  }
  // Dos temporadas activas que solapan dejarían el precio indeterminado.
  if (datos.desde && datos.hasta) {
    const choque = db.temporadas.find(
      (t) =>
        t.id !== id && t.activo && t.desde <= (datos.hasta ?? '') && t.hasta >= (datos.desde ?? ''),
    )
    if (choque) {
      throw errorCampo('desde', `Se solapa con «${choque.nombre}».`, 'Fechas ocupadas')
    }
  }
}

/**
 * Precio resuelto de un tipo de habitación para una fecha y un canal.
 *
 * Orden de aplicación: tarifa base del tipo → factor de temporada → ajuste del
 * canal → redondeo configurado. Es el mismo orden que usará el backend, así que
 * la vista ya muestra el número definitivo.
 *
 * El ajuste sale del canal, y solo se pisa si ese tipo tiene una fila propia
 * para ese canal. Antes, un tipo sin fila se vendía en Booking al mismo precio
 * que en el mostrador: la comisión se la comía el hotel entero sin que nadie lo
 * viera en ninguna pantalla.
 */
export function resolverTarifa(tipoId: string, fecha: string, canal: CanalReserva = 'directo') {
  const tipo = db.tiposHabitacion.find((t) => t.id === tipoId)
  if (!tipo) return { base: 0, factor: 1, ajuste: 0, precio: 0 }

  const temporada = db.temporadas.find((t) => t.activo && t.desde <= fecha && t.hasta >= fecha)
  const propia = db.tarifasCanal.find((t) => t.tipoId === tipoId && t.canal === canal && t.activo)
  const canalVenta = db.canales.find((c) => c.codigo === canal)

  const factor = temporada?.factor ?? 1
  const ajuste = propia?.ajuste ?? canalVenta?.ajuste ?? 0
  const bruto = tipo.tarifaBase * factor * (1 + ajuste / 100)

  const paso = Number(db.configuracion.vertical['tarifa.redondearA'] ?? 1) || 1
  return {
    base: tipo.tarifaBase,
    factor,
    ajuste,
    /** De dónde salió el ajuste: ayuda a entender el número en la rejilla. */
    origenAjuste: propia
      ? ('tipo' as const)
      : canalVenta
        ? ('canal' as const)
        : ('ninguno' as const),
    temporada,
    canal: canalVenta,
    precio: Math.round(bruto / paso) * paso,
  }
}

export const tarifasService = {
  temporadas: {
    ...temporadas,
    async listar(): Promise<Temporada[]> {
      const { items } = await temporadas.consultar({
        orden: { campo: 'desde', direccion: 'asc' },
        porPagina: 100,
      })
      return items
    },
    async crear(datos: NuevaTemporada) {
      validarTemporada(datos)
      return temporadas.crear(datos)
    },
    async actualizar(id: string, datos: Partial<NuevaTemporada>) {
      validarTemporada(datos, id)
      return temporadas.actualizar(id, datos)
    },
  },

  tarifasCanal: {
    ...tarifasCanal,
    async listar(): Promise<TarifaCanal[]> {
      const { items } = await tarifasCanal.consultar({ porPagina: 200 })
      return items
    },
  },

  resolverTarifa,

  /** Rejilla de precios: un tipo por fila, los próximos `dias` por columna. */
  async rejilla(dias = 14, canal: CanalReserva = 'directo') {
    const fechas = Array.from({ length: dias }, (_, i) => {
      const f = new Date()
      f.setDate(f.getDate() + i)
      return f.toISOString().slice(0, 10)
    })
    const filas = db.tiposHabitacion
      .filter((t) => t.activo)
      .map((tipo) => ({
        tipo,
        celdas: fechas.map((fecha) => ({ fecha, ...resolverTarifa(tipo.id, fecha, canal) })),
      }))
    return latencia({ fechas, filas })
  },
}
