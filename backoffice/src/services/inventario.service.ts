import type { Insumo, Movimiento } from '@/types'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { errorCampo } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('insumos', {
  prefijo: 'n',
  entidad: 'Insumo',
  camposBusqueda: ['codigo', 'nombre'],
})

/** Amenities, lencería y minibar: el consumible que gestiona el piso. */
export const inventarioService = {
  ...repo,

  /** Insumos por debajo de su mínimo: lo que hay que reponer hoy. */
  async bajoMinimo(): Promise<Insumo[]> {
    return latencia(db.insumos.filter((i) => i.activo && i.stock < i.stockMinimo))
  },

  async movimientos(insumoId?: string): Promise<Movimiento[]> {
    const items = db.movimientos
      .filter((m) => !insumoId || m.insumoId === insumoId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
    return latencia(items)
  },

  /** Registra un movimiento y deja el stock cuadrado en la misma operación. */
  async registrarMovimiento(datos: Omit<Movimiento, 'id' | 'fecha'>): Promise<Movimiento> {
    const insumo = db.insumos.find((i) => i.id === datos.insumoId)
    if (!insumo) throw { mensaje: 'Insumo no encontrado.' }
    if (datos.cantidad <= 0) throw errorCampo('cantidad', 'La cantidad debe ser mayor que cero.')

    const signo = datos.tipo === 'ingreso' ? 1 : -1
    if (datos.tipo !== 'ajuste' && signo < 0 && insumo.stock < datos.cantidad) {
      throw errorCampo('cantidad', `Solo quedan ${insumo.stock} de ${insumo.nombre}.`, 'Sin stock')
    }

    const movimiento: Movimiento = { ...datos, id: nuevoId('m'), fecha: new Date().toISOString() }
    insumo.stock = datos.tipo === 'ajuste' ? datos.cantidad : insumo.stock + signo * datos.cantidad
    db.movimientos.push(movimiento)
    persistir()
    return latencia(movimiento)
  },
}
