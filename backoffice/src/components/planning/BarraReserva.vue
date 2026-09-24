<script setup lang="ts">
import { computed } from 'vue'
import type { ReservaResuelta } from '@/types'
import { etiquetaReserva } from '@/utils/habitaciones'

/**
 * Una reserva dentro del rack.
 *
 * La barra no ocupa celdas enteras: empieza a media casilla y termina a media
 * casilla, porque una entrada es por la tarde y una salida por la mañana. Ese
 * medio hueco es lo que permite ver de un vistazo que una habitación se libera
 * y se vuelve a vender el mismo día —el día de solape, en la jerga— y es el
 * detalle por el que una recepción reconoce un rack de verdad.
 */

const props = defineProps<{
  reserva: ReservaResuelta
  /** Índice de la columna donde entra, en noches desde el inicio del tramo. */
  desdeCol: number
  /** Noches que ocupa dentro del tramo visible. */
  noches: number
  /** Total de columnas del tramo, para calcular el porcentaje. */
  columnas: number
  /** La entrada real cae antes del tramo: la barra viene cortada por la izquierda. */
  cortaIzquierda: boolean
  cortaDerecha: boolean
  arrastrando?: boolean
  /** Desplazamiento vertical mientras se arrastra, en píxeles. */
  desplazada?: number
}>()

const emit = defineEmits<{ abrir: []; arrastrar: [PointerEvent] }>()

const estilo = computed(() => {
  const paso = 100 / props.columnas
  const inicio = props.cortaIzquierda ? props.desdeCol : props.desdeCol + 0.5
  const fin = props.cortaDerecha
    ? props.desdeCol + props.noches
    : props.desdeCol + props.noches + 0.5
  return {
    left: `${inicio * paso}%`,
    width: `${(fin - inicio) * paso}%`,
    transform: props.desplazada ? `translateY(${props.desplazada}px)` : undefined,
  }
})

/**
 * El color dice el estado de la reserva, pero nunca va solo: delante de la
 * barra hay un glifo y dentro va el nombre. La misma regla que en el tablero.
 */
const tonos: Record<string, string> = {
  pendiente: 'hs-barra-pendiente',
  confirmada: 'hs-barra-confirmada',
  enCasa: 'hs-barra-encasa',
  salida: 'hs-barra-salida',
}

const glifos: Record<string, string> = {
  pendiente: '◷',
  confirmada: '◆',
  enCasa: '●',
  salida: '✓',
}

const etiqueta = computed(() => {
  const r = props.reserva
  const nombre = r.huesped ? `${r.huesped.nombres} ${r.huesped.apellidos}` : r.codigo
  return `${nombre} · ${etiquetaReserva[r.estado]} · ${r.entrada} a ${r.salida}`
})
</script>

<template>
  <button
    type="button"
    class="hs-barra absolute inset-y-1 flex items-center gap-1.5 overflow-hidden px-2 text-left"
    :class="[
      tonos[reserva.estado] ?? 'hs-barra-confirmada',
      cortaIzquierda ? 'hs-barra-corta-izq' : '',
      cortaDerecha ? 'hs-barra-corta-der' : '',
      arrastrando ? 'hs-barra-arrastrando' : '',
    ]"
    :style="estilo"
    :title="etiqueta"
    :aria-label="etiqueta"
    @pointerdown="emit('arrastrar', $event)"
    @click="emit('abrir')"
  >
    <span class="shrink-0 text-[10px] leading-none opacity-80" aria-hidden="true">
      {{ glifos[reserva.estado] ?? '◆' }}
    </span>
    <span class="truncate text-[11px] leading-none font-semibold">
      {{ reserva.huesped?.apellidos ?? reserva.codigo }}
    </span>
    <span v-if="noches > 2" class="truncate text-[10px] leading-none opacity-70">
      {{ reserva.huesped?.nombres }}
    </span>
  </button>
</template>
