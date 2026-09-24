<script setup lang="ts">
import { computed } from 'vue'

/**
 * Plano en miniatura del tipo de habitación.
 *
 * Un tipo es lo que el hotel vende, y una fila de tabla no deja imaginarlo: la
 * diferencia entre «doble» y «twin» no está en el nombre, está en si hay una
 * cama o dos. El plano se deduce de la configuración de camas que ya guarda el
 * tipo, así que no hace falta ni una foto ni un campo nuevo.
 *
 * Es el mismo recurso que en Taller dibuja el vehículo de la hoja de ingreso:
 * un trazo neutro sirve para cualquier dato y se lee igual en claro que en
 * oscuro.
 */

const props = defineProps<{ camas: string; superficie?: number }>()

type Mueble = 'ancha' | 'estrecha' | 'sofa'

/**
 * `1 cama king + 1 sofá cama` → `['ancha', 'sofa']`.
 *
 * Se lee el texto tal cual lo escribe recepción, sin obligar a un catálogo de
 * camas: lo que importa para el plano es cuántas piezas hay y si son anchas.
 */
const muebles = computed<Mueble[]>(() => {
  const texto = props.camas.toLowerCase()
  const piezas: Mueble[] = []

  for (const trozo of texto.split('+')) {
    const cantidad = Number(trozo.match(/\d+/)?.[0] ?? 1)
    const tipo: Mueble = /sof[aá]/.test(trozo)
      ? 'sofa'
      : /individual|simple|twin/.test(trozo)
        ? 'estrecha'
        : 'ancha'
    for (let i = 0; i < cantidad; i++) piezas.push(tipo)
  }

  return piezas.slice(0, 3)
})

/** Ancho de cada pieza en el plano, en unidades del `viewBox`. */
const anchos: Record<Mueble, number> = { ancha: 44, estrecha: 28, sofa: 36 }

/**
 * Reparto horizontal sobre la zona libre —del baño a la pared de la derecha—,
 * centrando cada pieza en su carril.
 */
const colocadas = computed(() => {
  const inicio = 44
  const disponible = 152 - inicio
  const total = muebles.value.length || 1
  const carril = disponible / total
  return muebles.value.map((tipo, i) => ({
    tipo,
    x: inicio + i * carril + (carril - anchos[tipo]) / 2,
    w: anchos[tipo],
  }))
})
</script>

<template>
  <div class="hs-plano relative">
    <svg
      viewBox="0 0 160 72"
      class="block w-full text-azul-400"
      fill="none"
      stroke="currentColor"
      stroke-linejoin="round"
      :aria-label="`Plano orientativo: ${camas}`"
      role="img"
    >
      <!-- Muros -->
      <rect x="4" y="4" width="152" height="64" rx="3" stroke-width="2.5" />

      <!-- Ventana en el muro del fondo: por ahí entra la luz y la vista. -->
      <path d="M62 4h50" stroke-width="5" class="text-turquesa" />

      <!-- Baño: el bloque que siempre está junto a la puerta. -->
      <rect x="4" y="38" width="32" height="30" rx="2" stroke-width="1.5" stroke-dasharray="4 3" />
      <circle cx="13" cy="60" r="3.5" stroke-width="1.5" />
      <rect x="22" y="45" width="9" height="11" rx="1.5" stroke-width="1.5" />

      <!-- Puerta con su barrido -->
      <path d="M4 32V20" stroke-width="3.5" class="text-panel" />
      <path d="M4 20a12 12 0 0 1 12 12" stroke-width="1.2" stroke-dasharray="2.5 2.5" />

      <!-- Camas y sofá -->
      <g v-for="(m, i) in colocadas" :key="i">
        <template v-if="m.tipo === 'sofa'">
          <rect :x="m.x" y="44" :width="m.w" height="20" rx="3" stroke-width="2" />
          <path :d="`M${m.x + 3} 44v-5h${m.w - 6}v5`" stroke-width="2" />
        </template>
        <template v-else>
          <!-- Colchón -->
          <rect :x="m.x" y="14" :width="m.w" height="44" rx="3" stroke-width="2" />
          <!-- Almohadas -->
          <path :d="`M${m.x + 4} 25h${m.w - 8}`" stroke-width="1.5" />
          <!-- Mesilla -->
          <rect :x="m.x + m.w + 2.5" y="14" width="7" height="7" rx="1.5" stroke-width="1.5" />
        </template>
      </g>
    </svg>

    <p v-if="superficie" class="hs-etiqueta absolute right-2 bottom-1.5 text-tenue">
      {{ superficie }} m²
    </p>
  </div>
</template>

<style scoped>
.hs-plano {
  padding: 0.75rem 0.75rem 0.5rem;
  border-radius: var(--hs-radio-card);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--hs-turquesa-500) 10%, var(--hs-surface-2)) 0%,
    var(--hs-surface-2) 70%
  );
}
</style>
