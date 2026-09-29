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

  /**
   * Registra un movimiento y deja el stock cuadrado en la misma operación.
   *
   * Las dos cosas van juntas a propósito: un kardex que no mueve el stock, o
   * un stock que cambia sin dejar línea, son las dos maneras de que el papel y
   * el almacén dejen de parecerse.
   *
   * En un **ajuste**, `cantidad` no es la diferencia: es el stock **contado**.
   * Así lo escribe quien cuenta —«hay 18»—, y la diferencia la calcula el
   * sistema, que es donde no se equivoca.
   */
  async registrarMovimiento(datos: Omit<Movimiento, 'id' | 'fecha'>): Promise<Movimiento> {
    const insumo = db.insumos.find((i) => i.id === datos.insumoId)
    if (!insumo) throw errorCampo('insumoId', 'Elige un insumo.')
    if (datos.tipo === 'ajuste') {
      if (datos.cantidad < 0) throw errorCampo('cantidad', 'El conteo no puede ser negativo.')
      if (datos.cantidad === insumo.stock) {
        throw errorCampo(
          'cantidad',
          `El sistema ya dice ${insumo.stock}. Un ajuste que no cambia nada no deja constancia de nada.`,
          'Sin diferencia',
        )
      }
    } else if (datos.cantidad <= 0) {
      throw errorCampo('cantidad', 'La cantidad debe ser mayor que cero.')
    }

    /*
     * Una merma o un ajuste sin motivo es una pérdida que nadie explica: al
     * mes siguiente nadie recuerda por qué faltan doce toallas.
     */
    if ((datos.tipo === 'merma' || datos.tipo === 'ajuste') && !datos.motivo?.trim()) {
      throw errorCampo(
        'motivo',
        datos.tipo === 'merma'
          ? 'Una merma se explica: rotura, mancha, robo.'
          : 'Di por qué el conteo no coincide con el sistema.',
        'Falta el motivo',
      )
    }

    const signo = datos.tipo === 'ingreso' ? 1 : -1
    if (datos.tipo !== 'ajuste' && signo < 0 && insumo.stock < datos.cantidad) {
      throw errorCampo(
        'cantidad',
        `Solo quedan ${insumo.stock} de ${insumo.nombre}. Si de verdad hay más, regístralo como ajuste.`,
        'Sin stock',
      )
    }

    const movimiento: Movimiento = {
      ...datos,
      motivo: datos.motivo?.trim() || undefined,
      id: nuevoId('m'),
      fecha: new Date().toISOString(),
    }
    insumo.stock = datos.tipo === 'ajuste' ? datos.cantidad : insumo.stock + signo * datos.cantidad
    db.movimientos.push(movimiento)
    persistir()
    return latencia(movimiento)
  },

  /** Lo que el kardex dice del día de hoy, para la cabecera de la pantalla. */
  async resumenDelDia() {
    const hoy = new Date().toISOString().slice(0, 10)
    const deHoy = db.movimientos.filter((m) => m.fecha.slice(0, 10) === hoy)
    const sumar = (tipo: Movimiento['tipo']) =>
      deHoy.filter((m) => m.tipo === tipo).reduce((total, m) => total + m.cantidad, 0)

    return latencia({
      movimientos: deHoy.length,
      ingresos: sumar('ingreso'),
      salidas: sumar('salida'),
      mermas: sumar('merma'),
      bajoMinimo: db.insumos.filter((i) => i.activo && i.stock < i.stockMinimo).length,
    })
  },
}
