import type {
  EstadoLimpieza,
  EstadoOcupacion,
  EstadoReserva,
  EstadoTarea,
  Prioridad,
  TipoTarea,
} from '@/types'
import type { TonoHotel } from '@/types/ui'

/**
 * Los dos ejes de estado de una habitación viven separados a propósito: la
 * recepción vende ocupación y housekeeping entrega limpieza. Aquí solo se
 * traducen a etiqueta, tono y glifo; nadie los combina en un estado único.
 */

export const estadosOcupacion: EstadoOcupacion[] = ['libre', 'ocupada', 'reservada', 'bloqueada']

export const etiquetaOcupacion: Record<EstadoOcupacion, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  bloqueada: 'Bloqueada',
}

/** Azul para lo disponible, coral para lo ocupado, arena para lo comprometido. */
export const tonoOcupacion: Record<EstadoOcupacion, TonoHotel> = {
  libre: 'azul',
  ocupada: 'coral',
  reservada: 'arena',
  bloqueada: 'neutro',
}

export const estadosLimpieza: EstadoLimpieza[] = [
  'limpia',
  'sucia',
  'enLimpieza',
  'inspeccion',
  'fueraServicio',
]

export const etiquetaLimpieza: Record<EstadoLimpieza, string> = {
  limpia: 'Limpia',
  sucia: 'Sucia',
  enLimpieza: 'En limpieza',
  inspeccion: 'Por inspeccionar',
  fueraServicio: 'Fuera de servicio',
}

export const tonoLimpieza: Record<EstadoLimpieza, TonoHotel> = {
  limpia: 'salvia',
  sucia: 'coral',
  enLimpieza: 'azul',
  inspeccion: 'arena',
  fueraServicio: 'neutro',
}

/**
 * Marca gráfica por estado de limpieza: el estado no se comunica solo por
 * color, que es la única forma de que el tablero sirva de lejos y a daltónicos.
 */
export const glifoLimpieza: Record<EstadoLimpieza, string> = {
  limpia: '✓',
  sucia: '•',
  enLimpieza: '◍',
  inspeccion: '◐',
  fueraServicio: '✕',
}

export const glifoOcupacion: Record<EstadoOcupacion, string> = {
  libre: '○',
  ocupada: '●',
  reservada: '◑',
  bloqueada: '✕',
}

/** Clase de tono para el plano del piso (resuelta con color-mix en main.css). */
export const clasePlanoOcupacion: Record<EstadoOcupacion, string> = {
  libre: 'hs-tono-azul',
  ocupada: 'hs-tono-coral',
  reservada: 'hs-tono-arena',
  bloqueada: 'hs-tono-neutro',
}

// ── Reservas ─────────────────────────────────────────────────────────────────

export const estadosReserva: EstadoReserva[] = [
  'pendiente',
  'confirmada',
  'enCasa',
  'salida',
  'cancelada',
  'noShow',
]

export const etiquetaReserva: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  enCasa: 'En casa',
  salida: 'Salida',
  cancelada: 'Cancelada',
  noShow: 'No show',
}

export const tonoReserva: Record<EstadoReserva, TonoHotel> = {
  pendiente: 'arena',
  confirmada: 'azul',
  enCasa: 'salvia',
  salida: 'neutro',
  cancelada: 'neutro',
  noShow: 'coral',
}

// ── Housekeeping ─────────────────────────────────────────────────────────────

export const estadosTarea: EstadoTarea[] = ['pendiente', 'enCurso', 'revisar', 'terminada']

export const etiquetaTarea: Record<EstadoTarea, string> = {
  pendiente: 'Pendiente',
  enCurso: 'En curso',
  revisar: 'Por revisar',
  terminada: 'Terminada',
}

export const tonoTarea: Record<EstadoTarea, TonoHotel> = {
  pendiente: 'coral',
  enCurso: 'azul',
  revisar: 'arena',
  terminada: 'salvia',
}

export const etiquetaTipoTarea: Record<TipoTarea, string> = {
  salida: 'Salida',
  estancia: 'En estancia',
  cobertura: 'Cobertura',
  repaso: 'Repaso',
  profunda: 'Limpieza profunda',
}

/** Minutos estándar por tipo de tarea. Sirven para estimar la carga del turno. */
export const minutosPorTipo: Record<TipoTarea, number> = {
  salida: 45,
  estancia: 20,
  cobertura: 12,
  repaso: 15,
  profunda: 90,
}

export const etiquetaPrioridad: Record<Prioridad, string> = {
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const tonoPrioridad: Record<Prioridad, TonoHotel> = {
  normal: 'neutro',
  alta: 'arena',
  urgente: 'coral',
}
