import type {
  CanalReserva,
  CategoriaInsumo,
  Regimen,
  TipoDocumento,
  TipoMovimiento,
  UnidadMedida,
} from '@/types'

/** Importe en soles, con separador de miles y dos decimales. */
export function formatearSoles(monto: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(monto)
}

/** `12 mar` — formato corto para tablas y tableros. */
export function fechaCorta(iso: string) {
  const f = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return f.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

/** `lunes 12 de marzo` — formato largo para cabeceras de día. */
export function fechaLarga(iso: string) {
  const f = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return f.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** `14:35` a partir de un ISO completo. */
export function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Antigüedad legible para el tablero: «hace 4 min», «hace 3 h».
 * El tablero de habitaciones vive de esto: lo que lleva más tiempo sin tocarse
 * es lo que hay que mirar primero.
 */
export function desdeHace(iso: string, ahora = Date.now()) {
  const minutos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60_000))
  if (minutos < 1) return 'ahora mismo'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`
}

/** Noches facturables entre dos fechas `YYYY-MM-DD`. La salida no se cobra. */
export function noches(entrada: string, salida: string) {
  const a = new Date(`${entrada}T12:00:00`).getTime()
  const b = new Date(`${salida}T12:00:00`).getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

export const etiquetaRegimen: Record<Regimen, string> = {
  soloAlojamiento: 'Solo alojamiento',
  desayuno: 'Con desayuno',
  mediaPension: 'Media pensión',
  pensionCompleta: 'Pensión completa',
}

export const etiquetaCanal: Record<CanalReserva, string> = {
  directo: 'Directo',
  telefono: 'Teléfono',
  web: 'Web propia',
  booking: 'Booking.com',
  expedia: 'Expedia',
  corporativo: 'Corporativo',
}

/** Las OTA no se teclean: llegan por integración y no se editan a mano. */
export const canalesExternos: CanalReserva[] = ['booking', 'expedia']

export const etiquetaDocumento: Record<TipoDocumento, string> = {
  dni: 'DNI',
  ce: 'Carné de extranjería',
  pasaporte: 'Pasaporte',
  ruc: 'RUC',
}

export const etiquetaUnidad: Record<UnidadMedida, string> = {
  unidad: 'Unidad',
  juego: 'Juego',
  litro: 'Litro',
  kilogramo: 'Kilogramo',
  paquete: 'Paquete',
}

export const etiquetaCategoriaInsumo: Record<CategoriaInsumo, string> = {
  amenities: 'Amenities',
  lenceria: 'Lencería',
  limpieza: 'Limpieza',
  minibar: 'Minibar',
  mantenimiento: 'Mantenimiento',
}

export const etiquetaMovimiento: Record<TipoMovimiento, string> = {
  ingreso: 'Ingreso',
  salida: 'Salida',
  ajuste: 'Ajuste',
  merma: 'Merma',
}

/** `CV` a partir de «Carolina Vega Ríos». */
export function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
}
