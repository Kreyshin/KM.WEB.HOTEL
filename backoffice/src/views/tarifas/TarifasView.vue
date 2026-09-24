<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmCard from '@/components/ui/KmCard.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { tarifasService } from '@/services/tarifas.service'
import { useUiStore } from '@/stores/ui.store'
import type { CanalReserva } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaCanal, fechaCorta, formatearSoles } from '@/utils/formato'

/**
 * Rejilla de tarifas: un tipo por fila, los próximos catorce días por columna.
 *
 * Es la pantalla donde se ve el precio DEFINITIVO, ya resuelto —base del tipo,
 * factor de temporada, ajuste de canal y redondeo—, no los ingredientes. Quien
 * abre esto quiere saber cuánto cobra el jueves, no qué reglas se aplicaron.
 */

const ui = useUiStore()

const canal = ref<string | number | undefined>('directo')
const rejilla = ref<Awaited<ReturnType<typeof tarifasService.rejilla>> | null>(null)
const { cargando, iniciar, terminar } = useCarga()

const canales: OpcionSelect[] = (
  ['directo', 'web', 'telefono', 'booking', 'expedia', 'corporativo'] as CanalReserva[]
).map((c) => ({ valor: c, etiqueta: etiquetaCanal[c] }))

async function cargar() {
  iniciar()
  try {
    rejilla.value = await tarifasService.rejilla(14, canal.value as CanalReserva)
  } catch {
    ui.error('No se pudo calcular la rejilla de tarifas.')
  } finally {
    terminar()
  }
}

onMounted(cargar)
watch(canal, cargar)

/** Fin de semana: se marca en la cabecera porque es donde se mueve el precio. */
function esFinDeSemana(fecha: string) {
  const dia = new Date(`${fecha}T12:00:00`).getDay()
  return dia === 0 || dia === 6
}
</script>

<template>
  <KmCard
    titulo="Rejilla de tarifas"
    subtitulo="Precio final por tipo y día, con la temporada y el ajuste de canal ya aplicados."
    sin-padding
  >
    <template #acciones>
      <div class="w-52">
        <KmSelect v-model="canal" :opciones="canales" etiqueta="Canal de venta" />
      </div>
    </template>

    <div class="overflow-x-auto">
      <table v-if="rejilla" class="w-full min-w-[60rem] border-collapse text-sm">
        <thead>
          <tr class="border-b border-linea">
            <th
              scope="col"
              class="hs-etiqueta sticky left-0 bg-panel px-4 py-3 text-left text-tenue"
            >
              Tipo
            </th>
            <th
              v-for="f in rejilla.fechas"
              :key="f"
              scope="col"
              class="hs-etiqueta px-2 py-3 text-center"
              :class="esFinDeSemana(f) ? 'text-turquesa-texto' : 'text-tenue'"
            >
              {{ fechaCorta(f) }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="fila in rejilla.filas"
            :key="fila.tipo.id"
            class="border-b border-linea last:border-0"
          >
            <th scope="row" class="sticky left-0 bg-panel px-4 py-3 text-left">
              <span class="block text-sm font-semibold text-tinta">{{ fila.tipo.nombre }}</span>
              <span class="block font-mono text-xs text-tenue">{{ fila.tipo.codigo }}</span>
            </th>
            <td
              v-for="celda in fila.celdas"
              :key="celda.fecha"
              class="px-2 py-3 text-center"
              :title="
                celda.temporada
                  ? `${celda.temporada.nombre} · factor ${celda.factor}`
                  : 'Sin temporada'
              "
            >
              <span class="hs-display block text-sm font-semibold text-tinta tabular-nums">
                {{ formatearSoles(celda.precio) }}
              </span>
              <span
                v-if="celda.factor !== 1"
                class="hs-etiqueta block"
                :class="celda.factor > 1 ? 'text-turquesa-texto' : 'text-tenue'"
              >
                {{ celda.factor > 1 ? '+' : '' }}{{ Math.round((celda.factor - 1) * 100) }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else-if="cargando" class="px-6 py-10 text-sm text-tenue">Calculando tarifas…</p>
    </div>
  </KmCard>
</template>
