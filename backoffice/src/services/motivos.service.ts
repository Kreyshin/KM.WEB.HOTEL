import type { AmbitoMotivo, Consulta, Motivo, NuevoMotivo, Paginado } from '@/types'
import { db } from './mock/db'
import { errorCampo } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('motivos', {
  prefijo: 'mo',
  entidad: 'Motivo',
  camposBusqueda: ['nombre'],
})

/**
 * Catálogo de motivos: el «por qué» tipificado.
 *
 * Todo lo que se cancela, se bloquea, se regala o se descuenta tiene una
 * razón, y la diferencia entre escribirla a mano y elegirla de una lista es
 * que la segunda se puede contar. «Cambio de planes» y «cambió de planes» son
 * el mismo hecho y dos filas distintas en cualquier informe, y por eso el
 * texto libre no sirve para saber si las cancelaciones vienen del canal o del
 * mostrador.
 *
 * El ámbito no es una etiqueta de color: es lo que impide que un motivo de
 * cancelación se ofrezca al bloquear una habitación.
 */

/** Qué significa cada ámbito, en el orden en que se enseña. */
export const AMBITOS: { valor: AmbitoMotivo; etiqueta: string; descripcion: string }[] = [
  {
    valor: 'cancelacion',
    etiqueta: 'Cancelación',
    descripcion:
      'Por qué se cae una reserva. Es el que se mira para saber si el problema es del canal.',
  },
  {
    valor: 'bloqueo',
    etiqueta: 'Bloqueo',
    descripcion:
      'Por qué una habitación sale del inventario sin estar averiada: obra, uso interno, cortesía larga.',
  },
  {
    valor: 'fueraServicio',
    etiqueta: 'Fuera de servicio',
    descripcion:
      'Por qué una habitación no se puede vender. Va de la mano del parte de mantenimiento.',
  },
  {
    valor: 'descuento',
    etiqueta: 'Descuento',
    descripcion:
      'Por qué se cobra menos de la tarifa. Lo que explica la diferencia entre el ADR y la rejilla.',
  },
  {
    valor: 'cortesia',
    etiqueta: 'Cortesía',
    descripcion:
      'Por qué no se cobra nada. Es el que más conviene tener corto y con nota obligatoria.',
  },
]

export const etiquetaAmbito = (ambito: AmbitoMotivo) =>
  AMBITOS.find((a) => a.valor === ambito)?.etiqueta ?? ambito

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

/*
 * La unicidad es **por ámbito**, no global. «Mantenimiento programado» es un
 * motivo razonable para bloquear una habitación y también para dejarla fuera
 * de servicio, y obligar a inventar un sinónimo para el segundo caso solo
 * conseguiría que los informes no cuadraran.
 */
function validar(datos: Partial<NuevoMotivo>, id?: string) {
  const actual = id ? db.motivos.find((m) => m.id === id) : undefined
  const ambito = datos.ambito ?? actual?.ambito

  if (datos.nombre !== undefined) {
    const nombre = datos.nombre.trim()
    if (!nombre) throw errorCampo('nombre', 'El motivo necesita un nombre.')
    if (nombre.length < 3) {
      throw errorCampo('nombre', 'Con menos de tres letras no es un motivo, es una inicial.')
    }
    const repetido = db.motivos.some(
      (m) => m.id !== id && m.ambito === ambito && normalizar(m.nombre) === normalizar(nombre),
    )
    if (repetido) {
      throw errorCampo(
        'nombre',
        `Ya hay un motivo así en ${etiquetaAmbito(ambito!).toLowerCase()}.`,
        'Motivo duplicado',
      )
    }
  }

  if (datos.ambito !== undefined) {
    if (!AMBITOS.some((a) => a.valor === datos.ambito)) {
      throw errorCampo('ambito', 'Ese ámbito no existe.')
    }
    /*
     * El ámbito no se mueve en caliente. Un motivo ya usado se quedó escrito
     * en cancelaciones y en partes; cambiárselo reescribiría el pasado, que es
     * lo único que un catálogo de motivos no puede permitirse.
     */
    if (actual && datos.ambito !== actual.ambito) {
      throw errorCampo(
        'ambito',
        'El ámbito de un motivo no se cambia: desactiva este y crea el que corresponde.',
        'No se puede mover',
      )
    }
  }
}

export const motivosService = {
  ...repo,

  async consultar(consulta?: Consulta): Promise<Paginado<Motivo>> {
    return repo.consultar({ orden: { campo: 'nombre', direccion: 'asc' }, ...consulta })
  },

  async crear(datos: NuevoMotivo): Promise<Motivo> {
    validar(datos)
    return repo.crear({ ...datos, nombre: datos.nombre.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoMotivo>): Promise<Motivo> {
    validar(datos, id)
    const nombre = datos.nombre !== undefined ? datos.nombre.trim() : undefined
    return repo.actualizar(id, nombre !== undefined ? { ...datos, nombre } : datos)
  },

  /** Los que se le pueden ofrecer hoy a quien tiene que explicar algo. */
  porAmbito(ambito: AmbitoMotivo): Motivo[] {
    return db.motivos
      .filter((m) => m.ambito === ambito && m.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  },

  /** Ámbitos sin ningún motivo activo: ahí el «por qué» vuelve a ser texto libre. */
  ambitosVacios(): AmbitoMotivo[] {
    return AMBITOS.filter((a) => !db.motivos.some((m) => m.ambito === a.valor && m.activo)).map(
      (a) => a.valor,
    )
  },

  /**
   * Lo que comprueba quien va a usar un motivo, no quien lo mantiene.
   *
   * Vive aquí para que la regla se escriba una vez: el día que la cancelación
   * y el bloqueo tengan pantalla, los dos exigirán la nota igual.
   */
  validarUso(motivoId: string, nota?: string): Motivo {
    const motivo = db.motivos.find((m) => m.id === motivoId)
    if (!motivo) throw errorCampo('motivoId', 'Ese motivo no está en el catálogo.')
    if (!motivo.activo) {
      throw errorCampo('motivoId', `«${motivo.nombre}» ya no está en uso. Elige otro.`)
    }
    if (motivo.requiereNota && !nota?.trim()) {
      throw errorCampo('nota', `«${motivo.nombre}» exige explicar el caso.`, 'Hace falta una nota')
    }
    return motivo
  },
}
