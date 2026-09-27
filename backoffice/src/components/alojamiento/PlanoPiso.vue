<script setup lang="ts">
import { computed, ref } from 'vue'
import HsIcono from '@/components/hotel/HsIcono.vue'
import type { HabitacionResuelta } from '@/types'
import {
  clasePlanoOcupacion,
  etiquetaLimpieza,
  etiquetaOcupacion,
  glifoLimpieza,
} from '@/utils/habitaciones'

/**
 * La planta dibujada, con el pasillo por el centro.
 *
 * El plano contesta lo que una lista no puede: **dónde está**. Qué hay libre
 * cerca del ascensor, si dos contiguas se pueden dar a una familia, qué le
 * queda a una camarera en esta planta. Eso es información espacial, y una
 * cuadrícula ordenada por número la destruye.
 *
 * Tiene dos modos porque tiene dos oficios distintos:
 *
 * - **Operar**: se toca una habitación para trabajar sobre ella. Es el tablero
 *   leído en el espacio.
 * - **Colocar**: se arrastra para situarla. Es mantenimiento del inventario, y
 *   sustituye a teclear dos porcentajes, que es lo que había antes y que nadie
 *   en un hotel va a hacer.
 */

const props = withDefaults(
  defineProps<{
    habitaciones: HabitacionResuelta[]
    modo?: 'operar' | 'colocar'
    seleccionadaId?: string
  }>(),
  { modo: 'operar' },
)

const emit = defineEmits<{
  seleccionar: [HabitacionResuelta]
  mover: [id: string, posX: number, posY: number]
}>()

/** Rejilla invisible: las habitaciones se alinean solas y el plano queda recto. */
const PASO = 2.5

const lienzo = ref<HTMLElement | null>(null)
const arrastrando = ref<string | null>(null)

const ajustar = (n: number) => Math.round(Math.min(94, Math.max(6, n)) / PASO) * PASO

function empezarArrastre(evento: PointerEvent, h: HabitacionResuelta) {
  if (props.modo !== 'colocar' || evento.button !== 0) return
  evento.preventDefault()
  arrastrando.value = h.id

  const alMover = (e: PointerEvent) => {
    const caja = lienzo.value?.getBoundingClientRect()
    if (!caja) return
    emit(
      'mover',
      h.id,
      ajustar(((e.clientX - caja.left) / caja.width) * 100),
      ajustar(((e.clientY - caja.top) / caja.height) * 100),
    )
  }

  const alSoltar = () => {
    window.removeEventListener('pointermove', alMover)
    window.removeEventListener('pointerup', alSoltar)
    arrastrando.value = null
  }

  window.addEventListener('pointermove', alMover)
  window.addEventListener('pointerup', alSoltar)
}

/**
 * Las flechas mueven la habitación enfocada.
 *
 * Ningún gesto puede ser solo de arrastre: quien no puede arrastrar —o
 * simplemente prefiere el teclado— tiene que poder colocar el plano igual.
 */
function alTeclear(evento: KeyboardEvent, h: HabitacionResuelta) {
  if (props.modo !== 'colocar') return
  const salto = evento.shiftKey ? PASO * 4 : PASO
  const movimientos: Record<string, [number, number]> = {
    ArrowLeft: [-salto, 0],
    ArrowRight: [salto, 0],
    ArrowUp: [0, -salto],
    ArrowDown: [0, salto],
  }
  const d = movimientos[evento.key]
  if (!d) return
  evento.preventDefault()
  emit('mover', h.id, ajustar(h.posX + d[0]), ajustar(h.posY + d[1]))
}

/** Quién está dentro, para el modo operar. */
const ocupadaPor = computed(
  () => (h: HabitacionResuelta) =>
    h.estancia ? `${h.estancia.adultos + h.estancia.ninos} huésped(es)` : '',
)

const descripcion = (h: HabitacionResuelta) =>
  `Habitación ${h.numero}, ${etiquetaOcupacion[h.ocupacion]}, ${etiquetaLimpieza[h.limpieza]}` +
  (props.modo === 'colocar' ? '. Arrastra o usa las flechas para colocarla.' : '')
</script>

<template>
  <div
    ref="lienzo"
    class="hs-plano relative min-h-[26rem]"
    :class="modo === 'colocar' ? 'es-colocando' : ''"
  >
    <!-- El pasillo: la referencia que orienta toda la planta. -->
    <div class="hs-plano-pasillo" role="presentation" />
    <p class="hs-plano-rotulo hs-etiqueta">Pasillo</p>

    <button
      v-for="h in habitaciones"
      :key="h.id"
      type="button"
      class="hs-plano-hab hs-tono"
      :class="[
        clasePlanoOcupacion[h.ocupacion],
        seleccionadaId === h.id ? 'es-elegida' : '',
        arrastrando === h.id ? 'es-arrastrando' : '',
        h.limpieza === 'fueraServicio' ? 'es-fuera' : '',
      ]"
      :style="{ left: `${h.posX}%`, top: `${h.posY}%` }"
      :aria-label="descripcion(h)"
      @pointerdown="empezarArrastre($event, h)"
      @keydown="alTeclear($event, h)"
      @click="emit('seleccionar', h)"
    >
      <span class="hs-display text-base leading-none font-semibold">{{ h.numero }}</span>
      <span class="mt-0.5 text-[10px] leading-none opacity-80">{{ h.tipo?.codigo }}</span>

      <!-- En operar interesa el estado; en colocar, estorba. -->
      <span
        v-if="modo === 'operar'"
        class="hs-display mt-1 text-xs leading-none opacity-70"
        :title="etiquetaLimpieza[h.limpieza]"
        aria-hidden="true"
      >
        {{ glifoLimpieza[h.limpieza] }}
      </span>
      <span v-else class="hs-plano-asa" aria-hidden="true">
        <HsIcono nombre="arrastrar" tamano="xs" />
      </span>

      <span v-if="modo === 'operar' && h.estancia" class="sr-only">{{ ocupadaPor(h) }}</span>
    </button>

    <p v-if="!habitaciones.length" class="hs-plano-vacio">
      Esta planta todavía no tiene habitaciones.
    </p>
  </div>
</template>

<style scoped>
.hs-plano {
  border: 1px solid var(--hs-border);
  border-radius: var(--hs-radio-card, 12px);
  background-color: var(--hs-surface);
  overflow: hidden;
}

/* Colocando, el lienzo enseña su rejilla: se ve a qué se está alineando. */
.hs-plano.es-colocando {
  background-image:
    linear-gradient(to right, var(--hs-border) 1px, transparent 1px),
    linear-gradient(to bottom, var(--hs-border) 1px, transparent 1px);
  background-size: 5% 10%;
  cursor: crosshair;
}

.hs-plano-pasillo {
  position: absolute;
  inset-inline: 2rem;
  top: 50%;
  height: 2.5rem;
  transform: translateY(-50%);
  border-radius: 999px;
  background-color: var(--hs-surface-2);
}

.hs-plano-rotulo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  color: var(--hs-muted);
}

.hs-plano-hab {
  position: absolute;
  display: grid;
  place-items: center;
  width: 5rem;
  height: 5rem;
  transform: translate(-50%, -50%);
  border-width: 1px;
  border-style: solid;
  border-radius: var(--hs-radio-card, 12px);
  transition:
    transform var(--km-mov-rapido) var(--km-curva),
    box-shadow var(--km-mov-rapido) var(--km-curva);
  touch-action: none;
}

.hs-plano-hab:hover {
  transform: translate(-50%, -50%) scale(1.05);
  z-index: 5;
}

.hs-plano-hab:focus-visible {
  outline: none;
  box-shadow: var(--hs-foco);
  z-index: 6;
}

.hs-plano-hab.es-elegida {
  box-shadow:
    0 0 0 2px var(--hs-surface),
    0 0 0 4px var(--hs-azul-500);
  z-index: 6;
}

/* Fuera de servicio: rayado, igual que en el rack. No se vende. */
.hs-plano-hab.es-fuera {
  background-image: repeating-linear-gradient(
    -45deg,
    color-mix(in srgb, var(--hs-muted) 22%, transparent) 0 5px,
    transparent 5px 10px
  );
}

.es-colocando .hs-plano-hab {
  cursor: grab;
}

.hs-plano-hab.es-arrastrando {
  cursor: grabbing;
  z-index: 10;
  transform: translate(-50%, -50%) scale(1.08);
  box-shadow: 0 12px 26px -8px rgb(0 0 0 / 0.45);
  transition: none;
}

/* El asa solo aparece al apuntar: colocando, el plano ya se entiende. */
.hs-plano-asa {
  margin-top: 0.25rem;
  opacity: 0;
  transition: opacity var(--km-mov-rapido) var(--km-curva);
}

.hs-plano-hab:hover .hs-plano-asa,
.hs-plano-hab:focus-visible .hs-plano-asa {
  opacity: 0.8;
}

.hs-plano-vacio {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, calc(-50% + 3rem));
  margin: 0;
  font-size: 0.875rem;
  color: var(--hs-muted);
}
</style>
