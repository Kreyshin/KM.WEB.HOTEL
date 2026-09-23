/**
 * Modelo de dominio de KM.Hotel (back office).
 *
 * Estas interfaces son el contrato entre las vistas y la capa de servicios.
 * Cuando exista el backend real solo cambia la implementación de `services/`,
 * no las vistas.
 *
 * El ciclo central de la vertical es **habitación → reserva → estancia**, con
 * dos estados vivos y deliberadamente independientes sobre la misma
 * habitación: el de *ocupación* (lo que la recepción vende) y el de *limpieza*
 * (lo que housekeeping entrega). Una habitación puede estar libre y sucia, u
 * ocupada y limpia; mezclarlos en un solo campo es el error clásico del
 * dominio y aquí se evita por diseño.
 */

// ── Autenticación y roles ────────────────────────────────────────────────────

export type Rol = 'admin' | 'recepcion' | 'gobernanta' | 'mantenimiento'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  avatarUrl?: string
  /** Sedes a las que tiene acceso (dato del ERP). Sin valor: todas. */
  localIds?: string[]
}

export interface Sesion {
  token: string
  usuario: Usuario
}

// ── Empresa y sedes ──────────────────────────────────────────────────────────

export interface Empresa {
  /** 11 dígitos con dígito verificador válido. */
  ruc: string
  razonSocial: string
  nombreComercial: string
  direccionFiscal: string
  telefono?: string
  email?: string
  moneda: 'PEN'
  zonaHoraria: string
}

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface HorarioDia {
  dia: DiaSemana
  abierto: boolean
  /** `HH:mm`. Si `cierre` es menor que `apertura`, el turno cruza la medianoche. */
  apertura: string
  cierre: string
}

/**
 * Sede hotelera. Se llama `Local` porque es el término que usa el ERP para
 * cualquier establecimiento de la cadena, y así los datos maestros viajan sin
 * traducción entre verticales.
 */
export interface Local {
  id: string
  nombre: string
  direccion: string
  distrito: string
  telefono?: string
  /** Código de establecimiento SUNAT, 4 dígitos. */
  codigoEstablecimiento: string
  /** `HH:mm`. Hora a partir de la cual la habitación se entrega. */
  horaCheckIn: string
  /** `HH:mm`. Hora límite de salida antes de cobrar noche adicional. */
  horaCheckOut: string
  /** Categoría comercial del establecimiento, en estrellas. */
  estrellas?: number
  horario?: HorarioDia[]
  activo: boolean
}

export type NuevoLocal = Omit<Local, 'id'>

// ── Alojamiento: pisos, tipos y habitaciones ─────────────────────────────────

/**
 * Agrupación física de habitaciones. Es el equivalente estructural del salón
 * en Restaurante: ordena el plano y reparte el trabajo de housekeeping.
 */
export interface Piso {
  id: string
  nombre: string
  localId: string
  descripcion?: string
  /** Número de planta; el sótano y la azotea usan negativos y valores altos. */
  nivel: number
  orden: number
  activo: boolean
}

export type NuevoPiso = Omit<Piso, 'id'>

/** Régimen de alimentación incluido en la tarifa. */
export type Regimen = 'soloAlojamiento' | 'desayuno' | 'mediaPension' | 'pensionCompleta'

export interface TipoHabitacion {
  id: string
  /** Código corto para recepción y para el ERP: `DBL`, `SUI`. */
  codigo: string
  nombre: string
  descripcion?: string
  /** Huéspedes que caben sin cama supletoria. */
  capacidad: number
  /** Huéspedes máximos con supletoria o cuna. */
  capacidadMaxima: number
  camas: string
  /** Metros cuadrados. */
  superficie?: number
  /** Tarifa de referencia por noche, en soles. Las temporadas la ajustan. */
  tarifaBase: number
  regimenIncluido: Regimen
  /** Amenities y equipamiento, para la ficha comercial. */
  servicios: string[]
  activo: boolean
}

export type NuevoTipoHabitacion = Omit<TipoHabitacion, 'id'>

/**
 * Estado de OCUPACIÓN: lo que la recepción puede vender ahora mismo.
 * No dice nada sobre si la habitación está limpia.
 */
export type EstadoOcupacion = 'libre' | 'ocupada' | 'reservada' | 'bloqueada'

/**
 * Estado de LIMPIEZA: lo que housekeeping entrega.
 * `inspeccion` es el paso intermedio en hoteles con gobernanta que valida.
 */
export type EstadoLimpieza = 'limpia' | 'sucia' | 'enLimpieza' | 'inspeccion' | 'fueraServicio'

export interface Habitacion {
  id: string
  /** Número visible, único dentro de la sede: `201`, `PH-1`. */
  numero: string
  pisoId: string
  tipoId: string
  ocupacion: EstadoOcupacion
  limpieza: EstadoLimpieza
  /** Estancia en curso, si la habitación está ocupada. */
  estanciaId?: string
  /** Camarera asignada al turno de hoy. */
  asignadaAId?: string
  /** Vista o característica comercial: «mar», «interior», «terraza». */
  vista?: string
  /** Habitaciones comunicadas, para vender familias juntas. */
  comunicaCon?: string[]
  /** Posición en el plano del piso, en porcentaje del contenedor (0–100). */
  posX: number
  posY: number
  /** Motivo del bloqueo o de la baja de servicio. */
  nota?: string
  /** ISO. Último cambio de cualquiera de los dos estados: ordena el tablero. */
  actualizada: string
}

export type NuevaHabitacion = Omit<Habitacion, 'id' | 'actualizada'>

/** Habitación con su tipo y su piso resueltos, para el tablero y los listados. */
export interface HabitacionResuelta extends Habitacion {
  tipo?: TipoHabitacion
  piso?: Piso
  /** Estancia en curso ya resuelta, cuando la hay. */
  estancia?: Estancia
}

/** Piso con sus habitaciones resueltas, para la vista de plano. */
export interface PisoConHabitaciones extends Piso {
  habitaciones: HabitacionResuelta[]
}

// ── Huéspedes ────────────────────────────────────────────────────────────────

export type TipoDocumento = 'dni' | 'ce' | 'pasaporte' | 'ruc'

export interface Huesped {
  id: string
  tipoDocumento: TipoDocumento
  documento: string
  nombres: string
  apellidos: string
  email?: string
  telefono?: string
  /** Código ISO de país de residencia, para la estadística de turismo. */
  pais?: string
  /** Notas de recepción: alergias, preferencia de piso, celebraciones. */
  preferencias?: string
  /** Huésped recurrente o de programa de fidelidad. */
  frecuente: boolean
  /** Noches acumuladas en la cadena. Dato consolidado del ERP. */
  nochesAcumuladas?: number
  /** Una ficha inactiva se archiva: no aparece al reservar, pero conserva su historial. */
  activo: boolean
}

export type NuevoHuesped = Omit<Huesped, 'id'>

// ── Reservas y estancias ─────────────────────────────────────────────────────

/** De dónde viene la reserva. Las OTA llegan por integración, no se teclean. */
export type CanalReserva = 'directo' | 'telefono' | 'web' | 'booking' | 'expedia' | 'corporativo'

/**
 * Ciclo de vida de la reserva. `enCasa` es la estancia viva: la reserva dejó
 * de ser una promesa y pasó a ocupar una habitación real.
 */
export type EstadoReserva =
  'pendiente' | 'confirmada' | 'enCasa' | 'salida' | 'cancelada' | 'noShow'

export interface Reserva {
  id: string
  /** Localizador que ve el huésped: `KMH-2410`. */
  codigo: string
  localId: string
  huespedId: string
  tipoId: string
  /** Habitación asignada. Se puede reservar por tipo y asignar al llegar. */
  habitacionId?: string
  /** `YYYY-MM-DD`. Noche de entrada. */
  entrada: string
  /** `YYYY-MM-DD`. Día de salida; no se cobra como noche. */
  salida: string
  adultos: number
  ninos: number
  canal: CanalReserva
  estado: EstadoReserva
  regimen: Regimen
  /** Tarifa por noche pactada, en soles. Puede diferir de la del tipo. */
  tarifaNoche: number
  /** Importe ya cobrado como garantía, en soles. */
  anticipo?: number
  notas?: string
  /** ISO. Cuándo entró la reserva al sistema. */
  creada: string
}

export type NuevaReserva = Omit<Reserva, 'id' | 'codigo' | 'creada'>

/** Reserva con huésped, tipo y habitación resueltos, para listados y tablero. */
export interface ReservaResuelta extends Reserva {
  huesped?: Huesped
  tipo?: TipoHabitacion
  habitacion?: Habitacion
  /** Noches facturables: salida − entrada. */
  noches: number
}

/**
 * Estancia: la reserva ya materializada en una habitación con gente dentro.
 * Se separa de `Reserva` porque su ciclo de vida es el de la habitación
 * (check-in → consumos → check-out), no el del contrato de venta.
 */
export interface Estancia {
  id: string
  reservaId: string
  habitacionId: string
  huespedId: string
  /** ISO. Momento real del check-in. */
  checkIn: string
  /** ISO. Momento real del check-out; sin valor, la estancia sigue viva. */
  checkOut?: string
  adultos: number
  ninos: number
  /** Consumos cargados a la habitación, en soles. */
  consumos: number
  /** Noches consumidas hasta hoy. */
  nochesConsumidas: number
}

// ── Housekeeping ─────────────────────────────────────────────────────────────

/**
 * Tipo de servicio de limpieza. La distinción importa porque el tiempo y el
 * material no son los mismos: una salida se prepara entera, una cobertura son
 * diez minutos.
 */
export type TipoTarea = 'salida' | 'estancia' | 'cobertura' | 'repaso' | 'profunda'

export type EstadoTarea = 'pendiente' | 'enCurso' | 'revisar' | 'terminada'

export type Prioridad = 'normal' | 'alta' | 'urgente'

export interface TareaLimpieza {
  id: string
  habitacionId: string
  tipo: TipoTarea
  estado: EstadoTarea
  prioridad: Prioridad
  /** Camarera asignada. */
  asignadaAId?: string
  /** Minutos estimados según el tipo de tarea y el tipo de habitación. */
  minutosEstimados: number
  /** ISO. Cuándo se creó la tarea (normalmente, al hacer check-out). */
  creada: string
  /** ISO. Cuándo se marcó terminada. */
  terminada?: string
  notas?: string
}

export type NuevaTareaLimpieza = Omit<TareaLimpieza, 'id' | 'creada'>

/** Tarea con habitación y responsable resueltos, para el tablero de limpieza. */
export interface TareaResuelta extends TareaLimpieza {
  habitacion?: Habitacion
  responsable?: Usuario
}

/** Parte de mantenimiento sobre una habitación o zona común. */
export interface Incidencia {
  id: string
  habitacionId?: string
  titulo: string
  descripcion?: string
  prioridad: Prioridad
  estado: 'abierta' | 'enCurso' | 'resuelta'
  asignadaAId?: string
  /** Si es true, la habitación queda fuera de servicio mientras dure. */
  bloqueaHabitacion: boolean
  creada: string
  resuelta?: string
}

// ── Tarifas ──────────────────────────────────────────────────────────────────

/**
 * Temporada con un factor sobre la tarifa base del tipo de habitación.
 * Se resuelve por fecha: la temporada más específica (rango más corto) gana.
 */
export interface Temporada {
  id: string
  nombre: string
  /** `YYYY-MM-DD`, ambos extremos incluidos. */
  desde: string
  hasta: string
  /** Multiplicador sobre la tarifa base: 1.25 = +25 %. */
  factor: number
  /** Noches mínimas exigidas en esta temporada. */
  minimoNoches?: number
  color: TonoTarifa
  activa: boolean
}

export type NuevaTemporada = Omit<Temporada, 'id'>

/** Tono con el que la temporada se pinta en el calendario de tarifas. */
export type TonoTarifa = 'azul' | 'arena' | 'coral' | 'salvia'

/** Precio publicado de un tipo de habitación en un canal concreto. */
export interface TarifaCanal {
  id: string
  tipoId: string
  canal: CanalReserva
  /** Ajuste sobre la tarifa resuelta, en %. Las OTA suelen ir con comisión. */
  ajuste: number
  activa: boolean
}

// ── Inventario de piso (amenities y lencería) ────────────────────────────────

export type UnidadMedida = 'unidad' | 'juego' | 'litro' | 'kilogramo' | 'paquete'

export type CategoriaInsumo = 'amenities' | 'lenceria' | 'limpieza' | 'minibar' | 'mantenimiento'

export interface Insumo {
  id: string
  codigo: string
  nombre: string
  categoria: CategoriaInsumo
  unidad: UnidadMedida
  stock: number
  stockMinimo: number
  /** Costo unitario en soles, dato del ERP. */
  costo: number
  activo: boolean
}

export type TipoMovimiento = 'ingreso' | 'salida' | 'ajuste' | 'merma'

export interface Movimiento {
  id: string
  insumoId: string
  tipo: TipoMovimiento
  cantidad: number
  /** Habitación a la que se imputa el consumo, si aplica. */
  habitacionId?: string
  motivo?: string
  usuarioId: string
  /** ISO. */
  fecha: string
}

// ── Facturación ──────────────────────────────────────────────────────────────

export type TipoComprobante = 'boleta' | 'factura' | 'notaCredito' | 'notaVenta'

export interface SerieComprobante {
  id: string
  localId: string
  tipo: TipoComprobante
  /** Cuatro caracteres: B001, F001, BC01, NV01. */
  serie: string
  /** Último número emitido; el siguiente será `correlativo + 1`. */
  correlativo: number
  activo: boolean
}

export interface ConfigImpuestos {
  /** IGV vigente, en %. */
  igv: number
  /** Los precios publicados ya incluyen impuestos. */
  preciosIncluyenIgv: boolean
  /**
   * Exoneración de IGV a huéspedes no domiciliados con menos de 60 días de
   * estancia (D. Leg. 919). Es la particularidad fiscal de la vertical.
   */
  exoneracionNoDomiciliados: boolean
}

// ── Operación y auditoría ────────────────────────────────────────────────────

export interface Turno {
  id: string
  localId: string
  usuarioId: string
  /** `YYYY-MM-DD`. */
  fecha: string
  /** `HH:mm`. */
  desde: string
  hasta: string
  puesto: 'recepcion' | 'pisos' | 'mantenimiento' | 'guardia'
}

export interface RegistroAuditoria {
  id: string
  usuarioId: string
  accion: string
  entidad: string
  entidadId?: string
  detalle?: string
  /** ISO. */
  fecha: string
}

export interface Motivo {
  id: string
  nombre: string
  ambito: 'cancelacion' | 'bloqueo' | 'descuento' | 'cortesia' | 'fueraServicio'
  requiereNota: boolean
  activo: boolean
}

// ── Configuración de la vertical ─────────────────────────────────────────────

/** A quién afecta un parámetro: a toda la cadena o a una sede. */
export type AlcanceParametro = 'vertical' | 'local'

export interface DefinicionParametro {
  clave: string
  etiqueta: string
  descripcion?: string
  alcance: AlcanceParametro
  grupo: string
  tipo: 'booleano' | 'numero' | 'texto' | 'opcion'
  opciones?: { valor: string; etiqueta: string }[]
  porDefecto: string | number | boolean
}

export type ValorParametro = string | number | boolean

/** Valores efectivos: los de la vertical y los sobrescritos por cada sede. */
export interface ValoresConfiguracion {
  vertical: Record<string, ValorParametro>
  locales: Record<string, Record<string, ValorParametro>>
}

// ── Consulta y transporte ────────────────────────────────────────────────────

export interface Paginado<T> {
  items: T[]
  total: number
  pagina: number
  porPagina: number
}

export type DireccionOrden = 'asc' | 'desc'

export interface Orden {
  campo: string
  direccion: DireccionOrden
}

/**
 * Parámetros de listado que entiende cualquier servicio paginado.
 * Se traducen 1:1 a query string cuando el servicio pase a HTTP:
 * `?buscar=&orden=numero:asc&pagina=1&porPagina=20&estado=libre`.
 */
export interface Consulta {
  buscar?: string
  orden?: Orden
  pagina?: number
  porPagina?: number
  /** Igualdad exacta por campo; `undefined` o `''` no filtra. */
  filtros?: Record<string, string | number | boolean | undefined>
}

export interface ApiError {
  mensaje: string
  campos?: Record<string, string>
}
