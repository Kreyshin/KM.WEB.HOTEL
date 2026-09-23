import type { Rol } from '@/types'

/**
 * Estructura de navegación del shell Karma.
 *
 * La barra principal (92px) lista los MÓDULOS; el menú contextual (300px)
 * muestra únicamente las SECCIONES del módulo activo, según la guía de
 * identidad visual de Karma Corp. La distribución es la misma en todas las
 * verticales; lo que cambia es el dominio que cuelga de ella.
 */

export interface SeccionNav {
  nombreRuta: string
  etiqueta: string
  descripcion?: string
  roles?: Rol[]
}

export interface ModuloNav {
  id: string
  etiqueta: string
  /** Path de un icono SVG de 24×24 (stroke, sin fill). */
  icono: string
  secciones: SeccionNav[]
}

export const modulos: ModuloNav[] = [
  {
    id: 'inicio',
    etiqueta: 'Inicio',
    icono: 'M3 12l9-9 9 9M5 10v10h14V10',
    secciones: [
      {
        nombreRuta: 'inicio',
        etiqueta: 'El día de hoy',
        descripcion: 'Llegadas, salidas y ocupación en vivo',
      },
      {
        nombreRuta: 'tablero',
        etiqueta: 'Tablero de habitaciones',
        descripcion: 'Estado de ocupación y limpieza, en tiempo real',
      },
    ],
  },
  {
    id: 'alojamiento',
    etiqueta: 'Alojamiento',
    icono: 'M3 20V9l9-5 9 5v11M3 20h18M9 20v-6h6v6M7 12h.01M17 12h.01',
    secciones: [
      {
        nombreRuta: 'habitaciones',
        etiqueta: 'Habitaciones',
        descripcion: 'Inventario físico, estado y bloqueos',
      },
      {
        nombreRuta: 'plano',
        etiqueta: 'Plano por piso',
        descripcion: 'Distribución real de cada planta',
      },
      {
        nombreRuta: 'tipos',
        etiqueta: 'Tipos de habitación',
        descripcion: 'Lo que se vende: aforo, camas y servicios',
        roles: ['admin'],
      },
      {
        nombreRuta: 'pisos',
        etiqueta: 'Pisos',
        descripcion: 'Plantas del establecimiento',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'reservas',
    etiqueta: 'Reservas',
    icono:
      'M8 3v4M16 3v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
    secciones: [
      {
        nombreRuta: 'reservas',
        etiqueta: 'Reservas',
        descripcion: 'Agenda completa, por estado y canal',
      },
      {
        nombreRuta: 'recepcion',
        etiqueta: 'Recepción del día',
        descripcion: 'Check-in, check-out y walk-ins',
      },
      {
        nombreRuta: 'huespedes',
        etiqueta: 'Huéspedes',
        descripcion: 'Ficha, preferencias e historial',
      },
    ],
  },
  {
    id: 'pisos',
    etiqueta: 'Pisos',
    icono: 'M4 20h16M6 20V9l6-4 6 4v11M10 20v-5h4v5',
    secciones: [
      {
        nombreRuta: 'limpieza',
        etiqueta: 'Housekeeping',
        descripcion: 'Tareas del turno y carga por camarera',
      },
      {
        nombreRuta: 'incidencias',
        etiqueta: 'Mantenimiento',
        descripcion: 'Partes abiertos y habitaciones fuera de servicio',
      },
      {
        nombreRuta: 'inventario',
        etiqueta: 'Amenities y lencería',
        descripcion: 'Stock del piso y alertas de mínimo',
        roles: ['admin', 'gobernanta'],
      },
      {
        nombreRuta: 'movimientos',
        etiqueta: 'Movimientos',
        descripcion: 'Consumos, reposiciones y mermas',
        roles: ['admin', 'gobernanta'],
      },
    ],
  },
  {
    id: 'tarifas',
    etiqueta: 'Tarifas',
    icono: 'M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
    secciones: [
      {
        nombreRuta: 'tarifas',
        etiqueta: 'Rejilla de tarifas',
        descripcion: 'Precio resuelto por tipo, día y canal',
        roles: ['admin'],
      },
      {
        nombreRuta: 'temporadas',
        etiqueta: 'Temporadas',
        descripcion: 'Factores por rango de fechas',
        roles: ['admin'],
      },
      {
        nombreRuta: 'canales',
        etiqueta: 'Canales y OTA',
        descripcion: 'Ajuste y comisión por canal de venta',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'administracion',
    etiqueta: 'Admin',
    icono: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    secciones: [
      {
        nombreRuta: 'reportes',
        etiqueta: 'Producción y ocupación',
        descripcion: 'ADR, RevPAR y cierre de caja',
        roles: ['admin', 'recepcion'],
      },
      {
        nombreRuta: 'facturacion',
        etiqueta: 'Facturación SUNAT',
        descripcion: 'Comprobantes y exoneración a no domiciliados',
        roles: ['admin', 'recepcion'],
      },
      {
        nombreRuta: 'usuarios',
        etiqueta: 'Usuarios y roles',
        descripcion: 'Personal del hotel y permisos',
        roles: ['admin'],
      },
      {
        nombreRuta: 'bitacora',
        etiqueta: 'Bitácora',
        descripcion: 'Quién hizo cada acción sensible',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'configuracion',
    etiqueta: 'Config.',
    icono:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    secciones: [
      {
        nombreRuta: 'config-vertical',
        etiqueta: 'Configuración de la vertical',
        descripcion: 'Parámetros para toda la cadena',
        roles: ['admin'],
      },
      {
        nombreRuta: 'config-local',
        etiqueta: 'Configuración por sede',
        descripcion: 'Horas de check-in, salida y políticas',
        roles: ['admin'],
      },
      {
        nombreRuta: 'sedes',
        etiqueta: 'Sedes',
        descripcion: 'Establecimientos de la cadena',
        roles: ['admin'],
      },
      {
        nombreRuta: 'config-motivos',
        etiqueta: 'Motivos',
        descripcion: 'Cancelación, bloqueo y cortesía',
        roles: ['admin'],
      },
      {
        nombreRuta: 'componentes',
        etiqueta: 'Guía de componentes',
        descripcion: 'Piezas base de la interfaz',
        roles: ['admin'],
      },
    ],
  },
]

/** Módulo al que pertenece una ruta, para resaltar la barra principal. */
export function moduloDeRuta(nombreRuta?: string | symbol | null): ModuloNav | undefined {
  if (!nombreRuta) return undefined
  return modulos.find((m) => m.secciones.some((s) => s.nombreRuta === nombreRuta))
}

export const etiquetasRol: Record<Rol, string> = {
  admin: 'Administrador',
  recepcion: 'Recepción',
  gobernanta: 'Pisos y housekeeping',
  mantenimiento: 'Mantenimiento',
}
