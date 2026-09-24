<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { habitacionesService } from '@/services/habitaciones.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { HabitacionResuelta, PisoConHabitaciones } from '@/types'
import { desdeHace } from '@/utils/formato'
import {
  clasePlanoOcupacion,
  estadosOcupacion,
  etiquetaLimpieza,
  etiquetaOcupacion,
  glifoLimpieza,
  tonoLimpieza,
} from '@/utils/habitaciones'

/**
 * Plano de planta: las habitaciones colocadas donde están de verdad, en dos
 * hileras a ambos lados del pasillo. Sirve para lo que una lista no puede —
 * «¿qué hay libre cerca del ascensor?»— y para reubicar de un vistazo.
 */

const localStore = useLocalStore()
const ui = useUiStore()

const pisos = ref<PisoConHabitaciones[]>([])
const pisoActivo = ref('')
const seleccionada = ref<HabitacionResuelta | null>(null)
const { cargando, iniciar, terminar } = useCarga()

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  iniciar()
  try {
    pisos.value = await habitacionesService.planoPorPiso(localId)
    if (!pisos.value.some((p) => p.id === pisoActivo.value)) {
      pisoActivo.value = pisos.value[0]?.id ?? ''
    }
  } catch {
    ui.error('No se pudo cargar el plano.')
  } finally {
    terminar()
  }
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  cargar()
})
watch(() => localStore.localId, cargar)

const pestanas = computed(() =>
  pisos.value.map((p) => ({
    valor: p.id,
    etiqueta: p.nombre,
    contador: p.habitaciones.length,
  })),
)

const piso = computed(() => pisos.value.find((p) => p.id === pisoActivo.value))
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <KmTabs v-if="pestanas.length" v-model="pisoActivo" :pestanas="pestanas" etiqueta="Piso" />

    <p v-if="cargando" class="text-sm text-tenue">Cargando el plano…</p>

    <div v-else-if="piso" class="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <!-- Lienzo del piso: el pasillo va por el centro. -->
      <div class="hs-panel relative min-h-[26rem] overflow-hidden p-4">
        <div
          class="absolute inset-x-8 top-1/2 h-10 -translate-y-1/2 rounded-full bg-panel-2"
          role="presentation"
        />
        <p
          class="hs-etiqueta absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-tenue"
        >
          Pasillo
        </p>

        <button
          v-for="h in piso.habitaciones"
          :key="h.id"
          type="button"
          class="hs-tono absolute grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-card border transition-transform hover:scale-105"
          :class="[
            clasePlanoOcupacion[h.ocupacion],
            seleccionada?.id === h.id ? 'ring-2 ring-azul ring-offset-2 ring-offset-panel' : '',
          ]"
          :style="{ left: `${h.posX}%`, top: `${h.posY}%` }"
          :aria-label="`Habitación ${h.numero}, ${etiquetaOcupacion[h.ocupacion]}, ${etiquetaLimpieza[h.limpieza]}`"
          @click="seleccionada = h"
        >
          <span class="hs-display text-base leading-none font-semibold">{{ h.numero }}</span>
          <span class="mt-1 text-[10px] opacity-80">{{ h.tipo?.codigo }}</span>
          <span class="hs-display text-xs leading-none opacity-70" aria-hidden="true">
            {{ glifoLimpieza[h.limpieza] }}
          </span>
        </button>
      </div>

      <!-- Ficha de la habitación elegida. -->
      <aside class="hs-panel flex flex-col gap-4 p-6">
        <template v-if="seleccionada">
          <div>
            <p class="hs-titulo-pagina text-tinta">{{ seleccionada.numero }}</p>
            <p class="mt-1 text-sm text-tenue">
              {{ seleccionada.tipo?.nombre }} · {{ seleccionada.tipo?.camas }}
            </p>
          </div>

          <div class="hs-filete" role="presentation" />

          <div class="flex flex-wrap gap-2">
            <KmBadge :tono="tonoLimpieza[seleccionada.limpieza]" punto>
              {{ etiquetaLimpieza[seleccionada.limpieza] }}
            </KmBadge>
            <KmBadge tono="neutro">{{ etiquetaOcupacion[seleccionada.ocupacion] }}</KmBadge>
          </div>

          <dl class="flex flex-col gap-3 text-sm">
            <div>
              <dt class="hs-etiqueta text-tenue">Aforo</dt>
              <dd class="text-tinta">
                {{ seleccionada.tipo?.capacidad }} personas · máx.
                {{ seleccionada.tipo?.capacidadMaxima }}
              </dd>
            </div>
            <div v-if="seleccionada.vista">
              <dt class="hs-etiqueta text-tenue">Vista</dt>
              <dd class="text-tinta">{{ seleccionada.vista }}</dd>
            </div>
            <div v-if="seleccionada.nota">
              <dt class="hs-etiqueta text-tenue">Nota</dt>
              <dd class="text-tinta">{{ seleccionada.nota }}</dd>
            </div>
            <div>
              <dt class="hs-etiqueta text-tenue">Último cambio</dt>
              <dd class="text-tinta">{{ desdeHace(seleccionada.actualizada) }}</dd>
            </div>
          </dl>
        </template>

        <p v-else class="text-sm text-tenue">Toca una habitación del plano para ver su ficha.</p>
      </aside>
    </div>

    <footer class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-tenue">
      <span class="hs-etiqueta">Ocupación</span>
      <span v-for="e in estadosOcupacion" :key="e" class="flex items-center gap-1.5">
        <span class="hs-tono size-3 rounded-full border" :class="clasePlanoOcupacion[e]" />
        {{ etiquetaOcupacion[e] }}
      </span>
    </footer>
  </div>
</template>
