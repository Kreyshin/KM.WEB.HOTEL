<script setup lang="ts">
/**
 * Iconografía del oficio hotelero.
 *
 * `KmIcono` es del kit compartido y habla de almacén: cajas, lotes, estantes.
 * Sirve igual en las tres verticales y por eso no puede decir «llegada»,
 * «cobertura» ni «no vino». Estos sí: son los sustantivos con los que habla
 * una recepción, y tenerlos dibujados evita el recurso al emoji, que se ve
 * distinto en cada máquina y no hereda el color del texto.
 *
 * Trazo de 24×24, `currentColor` y `stroke-width` constante, para que un icono
 * puesto en un botón, en una barra del rack o dentro de un badge pese lo mismo
 * que la letra que tiene al lado.
 */
export type IconoHotel =
  | 'llegada'
  | 'salida'
  | 'enCasa'
  | 'noVino'
  | 'noche'
  | 'huesped'
  | 'cama'
  | 'llave'
  | 'limpieza'
  | 'bloqueo'
  | 'arrastrar'
  | 'estirar'
  | 'ota'
  | 'tarifa'

withDefaults(
  defineProps<{
    nombre: IconoHotel
    /** Acompaña al texto: `sm` va con 14px, `md` con 16px. */
    tamano?: 'xs' | 'sm' | 'md' | 'lg'
  }>(),
  { tamano: 'sm' },
)

const tamanos = { xs: 'size-3.5', sm: 'size-4', md: 'size-5', lg: 'size-6' } as const

/**
 * Cada icono es una lista de trazos. Se dibujan sin relleno y con las uniones
 * redondeadas, que es lo que mantiene la familia unida a tamaño pequeño.
 */
const trazos: Record<IconoHotel, string[]> = {
  // Puerta con flecha que entra: el huésped llega.
  llegada: ['M14 4h5v16h-5', 'M4 12h9', 'M10 8l4 4-4 4'],
  // La misma puerta, con la flecha saliendo.
  salida: ['M10 4H5v16h5', 'M20 12h-9', 'M14 8l-4 4 4 4'],
  // Cama con alguien dentro: la habitación está viva.
  enCasa: ['M3 18v-7h18v7', 'M3 18h18', 'M6 11V8h6v3', 'M16 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  // Calendario tachado: la reserva que no se presentó.
  noVino: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4M16 3v4', 'M9.5 14.5l5 3M14.5 14.5l-5 3'],
  // Luna: la unidad que vende un hotel.
  noche: ['M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z'],
  huesped: ['M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
  cama: ['M3 19v-8h18v8', 'M3 19h18', 'M3 11V7', 'M7 11V9h5v2'],
  // Llave de habitación con su llavero.
  llave: ['M15.5 11.5a4 4 0 1 0-3.9-5H11L4 13.5V19h5l1-1v-2h2v-2h2l1-1z', 'M16.5 7.5h.01'],
  // Gota y brillo: limpieza.
  limpieza: [
    'M12 3.5S6.5 10 6.5 14a5.5 5.5 0 0 0 11 0c0-4-5.5-10.5-5.5-10.5z',
    'M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5',
  ],
  // Candado cerrado: fuera de servicio o bloqueada.
  bloqueo: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 6 0v3', 'M12 15v2'],
  // Cuatro flechas: esto se puede mover.
  arrastrar: [
    'M12 4v16M4 12h16',
    'M12 4l-2.5 2.5M12 4l2.5 2.5',
    'M12 20l-2.5-2.5M12 20l2.5-2.5',
    'M4 12l2.5-2.5M4 12l2.5 2.5',
    'M20 12l-2.5-2.5M20 12l2.5 2.5',
  ],
  // Barra con topes: el borde que se estira.
  estirar: [
    'M7 5v14M17 5v14',
    'M10 12h4',
    'M10 12l1.5-1.5M10 12l1.5 1.5',
    'M14 12l-1.5-1.5M14 12l-1.5 1.5',
  ],
  // Globo con meridianos: el canal externo.
  ota: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M3.5 9h17M3.5 15h17',
    'M12 3c2.5 2.5 3.8 5.6 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z',
  ],
  // Etiqueta de precio.
  tarifa: ['M4 11.5V4h7.5L20 12.5 12.5 20 4 11.5z', 'M8 8h.01'],
}
</script>

<template>
  <svg
    :class="tamanos[tamano]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in trazos[nombre]" :key="i" :d="d" />
  </svg>
</template>
