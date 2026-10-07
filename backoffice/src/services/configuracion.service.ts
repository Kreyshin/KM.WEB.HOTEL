import type {
  AlcanceParametro,
  DefinicionParametro,
  ValorParametro,
  ValoresConfiguracion,
} from '@/types'
import { db, latencia, persistir } from './mock/db'
import { errorCampo } from './mock/reglas'

/**
 * Los parámetros con los que el hotel se comporta de una manera o de otra.
 *
 * No es un saco de ajustes: cada entrada de aquí tiene un sitio en el código
 * que la lee, y ese sitio está escrito en su `efecto`. La regla que gobierna
 * este archivo es que un parámetro sin consumidor no se añade —un interruptor
 * que no mueve nada es peor que no tenerlo, porque quien lo apaga se queda
 * creyendo que apagó algo.
 *
 * El **alcance** es la otra mitad del diseño. `vertical` es lo que no se
 * discute por sede, porque tenerlo distinto en dos hoteles de la misma cadena
 * haría incomparables sus cifras. `local` es lo que legítimamente cambia de
 * un establecimiento a otro: un hostal de doce habitaciones no inspecciona la
 * limpieza y un cinco estrellas sí, y los dos tienen razón.
 */
export const PARAMETROS: DefinicionParametro[] = [
  {
    clave: 'reserva.permitirSobreventa',
    etiqueta: 'Permitir sobreventa',
    descripcion:
      'Aceptar más reservas de un tipo de habitación que habitaciones hay de ese tipo, apostando a las cancelaciones.',
    alcance: 'vertical',
    grupo: 'Reservas',
    tipo: 'booleano',
    porDefecto: false,
    efecto:
      'Apagado, el alta de reserva se rechaza cuando el tipo ya está vendido esas noches. Encendido, se acepta y el hotel asume la reubicación.',
  },
  {
    clave: 'reserva.garantiaHoras',
    etiqueta: 'Horas que aguanta una reserva sin confirmar',
    descripcion:
      'Una reserva pendiente retiene cupo. Pasadas estas horas sin confirmarse ni cobrar anticipo, lo suelta.',
    alcance: 'vertical',
    grupo: 'Reservas',
    tipo: 'numero',
    porDefecto: 24,
    minimo: 0,
    maximo: 168,
    sufijo: 'h',
    efecto:
      'Una pendiente caducada deja de contar contra la disponibilidad del tipo, así que su cupo vuelve a venderse.',
  },
  {
    clave: 'limpieza.requiereInspeccion',
    etiqueta: 'La limpieza pasa por inspección',
    descripcion:
      'Quien limpia no es quien da el visto bueno: la habitación queda «a revisar» hasta que la gobernanta la aprueba.',
    alcance: 'local',
    grupo: 'Housekeeping',
    tipo: 'booleano',
    porDefecto: true,
    efecto:
      'Apagado, la camarera cierra la tarea de un golpe y la habitación pasa de «en limpieza» a «limpia» sin parada intermedia.',
  },
  {
    clave: 'checkout.cobrarSalidaTardia',
    etiqueta: 'Cobrar la salida tardía',
    descripcion: 'Quien se va pasada la hora de salida paga por las horas de más.',
    alcance: 'local',
    grupo: 'Salida',
    tipo: 'booleano',
    porDefecto: true,
    efecto:
      'Encendido, el check-out fuera de hora carga el recargo en la cuenta de la estancia, y ese importe entra en la producción del cierre.',
  },
  {
    clave: 'checkout.toleranciaSalidaMinutos',
    etiqueta: 'Cortesía antes de cobrar',
    descripcion: 'Minutos de gracia después de la hora de salida de la sede.',
    alcance: 'local',
    grupo: 'Salida',
    tipo: 'numero',
    porDefecto: 30,
    minimo: 0,
    maximo: 240,
    sufijo: 'min',
    efecto:
      'Dentro de la cortesía no se cobra nada. Sin ella, un ascensor lento convierte una salida normal en una reclamación en el mostrador.',
  },
  {
    clave: 'checkout.salidaTardiaPorcentaje',
    etiqueta: 'Cuánto se cobra',
    descripcion: 'Porcentaje de la tarifa de la noche que se carga por salir tarde.',
    alcance: 'local',
    grupo: 'Salida',
    tipo: 'numero',
    porDefecto: 50,
    minimo: 0,
    maximo: 100,
    sufijo: '%',
    efecto:
      'Es el importe que el check-out suma a los consumos de la estancia cuando la salida pasa de la cortesía.',
  },
  {
    clave: 'tarifa.redondearA',
    etiqueta: 'Redondear la tarifa a múltiplos de',
    descripcion:
      'La rejilla sale de multiplicar base, temporada y canal, y eso da números como 187,43.',
    alcance: 'vertical',
    grupo: 'Tarifas',
    tipo: 'numero',
    porDefecto: 5,
    minimo: 1,
    maximo: 100,
    sufijo: 'S/',
    efecto:
      'Redondea hacia arriba el precio resuelto de cada noche, el mismo que se ofrece y se factura.',
  },
]

const definicion = (clave: string) => PARAMETROS.find((p) => p.clave === clave)

/** Agrupa las definiciones para pintarlas: el orden de los grupos es el del registro. */
export function porGrupo(alcance?: AlcanceParametro) {
  const grupos = new Map<string, DefinicionParametro[]>()
  for (const p of PARAMETROS) {
    if (alcance && p.alcance !== alcance) continue
    const lista = grupos.get(p.grupo) ?? []
    lista.push(p)
    grupos.set(p.grupo, lista)
  }
  return [...grupos].map(([grupo, parametros]) => ({ grupo, parametros }))
}

/**
 * El valor que manda de verdad, resuelto en tres saltos: lo que la sede
 * sobrescribe, lo que fija la cadena, y lo que trae el parámetro de serie.
 *
 * Es síncrona a propósito. La leen reglas de negocio en mitad de un cálculo
 * —resolver una tarifa, decidir si cabe una reserva— y una regla no puede
 * quedarse esperando a que llegue su configuración.
 */
export function valorParametro(clave: string, localId?: string): ValorParametro {
  const def = definicion(clave)
  const sede = localId ? db.configuracion.locales[localId] : undefined
  if (sede && clave in sede) return sede[clave]!
  if (clave in db.configuracion.vertical) return db.configuracion.vertical[clave]!
  if (!def) throw new Error(`Parámetro desconocido: ${clave}`)
  return def.porDefecto
}

/** Atajos con el tipo ya resuelto, para no castear en cada regla que los usa. */
export const flag = (clave: string, localId?: string) => valorParametro(clave, localId) === true
export function numero(clave: string, localId?: string) {
  const valor = Number(valorParametro(clave, localId))
  return Number.isFinite(valor) ? valor : Number(definicion(clave)?.porDefecto ?? 0)
}

/** Comprueba un valor contra su definición antes de dejarlo entrar. */
function validar(def: DefinicionParametro, valor: ValorParametro) {
  if (def.tipo === 'booleano' && typeof valor !== 'boolean') {
    throw errorCampo(def.clave, `«${def.etiqueta}» se guarda encendido o apagado.`)
  }
  if (def.tipo === 'numero') {
    const n = Number(valor)
    if (!Number.isFinite(n)) {
      throw errorCampo(def.clave, `«${def.etiqueta}» tiene que ser un número.`)
    }
    const min = def.minimo ?? -Infinity
    const max = def.maximo ?? Infinity
    if (n < min || n > max) {
      throw errorCampo(
        def.clave,
        `«${def.etiqueta}» va de ${min} a ${max}${def.sufijo ? ` ${def.sufijo}` : ''}.`,
        'Fuera de rango',
      )
    }
  }
  if (def.tipo === 'opcion' && !def.opciones?.some((o) => o.valor === valor)) {
    throw errorCampo(def.clave, `«${valor}» no es una opción de «${def.etiqueta}».`)
  }
}

/** Normaliza antes de guardar: un número que llega como texto se guarda como número. */
function normalizar(def: DefinicionParametro, valor: ValorParametro): ValorParametro {
  if (def.tipo === 'numero') return Number(valor)
  if (def.tipo === 'booleano') return Boolean(valor)
  return valor
}

export const configuracionService = {
  definiciones(alcance?: AlcanceParametro): DefinicionParametro[] {
    return alcance ? PARAMETROS.filter((p) => p.alcance === alcance) : [...PARAMETROS]
  },

  async obtener(): Promise<ValoresConfiguracion> {
    return latencia({
      vertical: { ...db.configuracion.vertical },
      locales: Object.fromEntries(
        Object.entries(db.configuracion.locales).map(([id, v]) => [id, { ...v }]),
      ),
    })
  },

  /** Los valores con los que opera una sede, ya resueltos. Es lo que pinta la pantalla. */
  efectivos(localId?: string): Record<string, ValorParametro> {
    return Object.fromEntries(PARAMETROS.map((p) => [p.clave, valorParametro(p.clave, localId)]))
  },

  /** `true` si esa sede tiene valor propio para la clave, en vez de heredarlo. */
  esPropio(localId: string, clave: string): boolean {
    return Boolean(db.configuracion.locales[localId] && clave in db.configuracion.locales[localId]!)
  },

  /**
   * Qué sedes se apartan del valor de la cadena, para que quien cambia el
   * valor común sepa a quién no va a afectar.
   */
  sedesQueDifieren(clave: string): string[] {
    return Object.entries(db.configuracion.locales)
      .filter(([, valores]) => clave in valores)
      .map(([localId]) => localId)
  },

  /** Lo que vale para toda la cadena. Admite parámetros de los dos alcances: aquí se fija el común. */
  async guardarVertical(valores: Record<string, ValorParametro>): Promise<ValoresConfiguracion> {
    for (const [clave, valor] of Object.entries(valores)) {
      const def = definicion(clave)
      if (!def) throw errorCampo(clave, `El parámetro «${clave}» no existe.`)
      validar(def, valor)
    }
    for (const [clave, valor] of Object.entries(valores)) {
      db.configuracion.vertical[clave] = normalizar(definicion(clave)!, valor)
    }

    /*
     * Al mover el valor común, las sedes que ya tenían ese mismo valor dejan
     * de estar sobrescribiendo nada: se les quita el registro propio. Si no,
     * quedarían ancladas para siempre a un número que hoy coincide y mañana
     * no, sin que nadie haya decidido apartarlas.
     */
    for (const [localId, propios] of Object.entries(db.configuracion.locales)) {
      for (const clave of Object.keys(valores)) {
        if (clave in propios && propios[clave] === db.configuracion.vertical[clave]) {
          delete propios[clave]
        }
      }
      if (!Object.keys(propios).length) delete db.configuracion.locales[localId]
    }

    persistir()
    return this.obtener()
  },

  /**
   * Lo que una sede hace distinto.
   *
   * Dos reglas que no son capricho. Un parámetro de la cadena no se puede
   * sobrescribir aquí: si el IGV o la sobreventa cambiaran por sede, las
   * cifras de dos hoteles dejarían de poder compararse, que es justo lo que
   * el cierre de día existe para permitir. Y un valor idéntico al de la
   * cadena no se guarda como propio: ese registro es invisible y mentiroso
   * —el día que la cadena cambie el suyo, esta sede se quedará con el
   * anterior sin que nadie lo haya decidido—.
   */
  async guardarLocal(
    localId: string,
    valores: Record<string, ValorParametro>,
  ): Promise<ValoresConfiguracion> {
    if (!db.locales.some((l) => l.id === localId)) throw { mensaje: 'Sede no encontrada.' }

    for (const [clave, valor] of Object.entries(valores)) {
      const def = definicion(clave)
      if (!def) throw errorCampo(clave, `El parámetro «${clave}» no existe.`)
      if (def.alcance !== 'local') {
        throw errorCampo(
          clave,
          `«${def.etiqueta}» vale para toda la cadena: cámbialo en la configuración de la vertical.`,
          'No se ajusta por sede',
        )
      }
      validar(def, valor)
    }

    const propios = db.configuracion.locales[localId] ?? {}
    for (const [clave, valor] of Object.entries(valores)) {
      const normalizado = normalizar(definicion(clave)!, valor)
      if (normalizado === valorParametro(clave)) delete propios[clave]
      else propios[clave] = normalizado
    }
    if (Object.keys(propios).length) db.configuracion.locales[localId] = propios
    else delete db.configuracion.locales[localId]

    persistir()
    return this.obtener()
  },

  /** Devuelve una clave a lo que diga la cadena. */
  async restablecer(localId: string, clave: string): Promise<ValoresConfiguracion> {
    const propios = db.configuracion.locales[localId]
    if (propios) {
      delete propios[clave]
      if (!Object.keys(propios).length) delete db.configuracion.locales[localId]
      persistir()
    }
    return this.obtener()
  },
}
