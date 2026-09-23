<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { tarifasService } from '@/services/tarifas.service'
import { useUiStore } from '@/stores/ui.store'
import type { Temporada } from '@/types'
import type { ColumnaTabla, TonoHotel } from '@/types/ui'
import { fechaCorta, noches } from '@/utils/formato'

/**
 * Temporadas: el factor que multiplica la tarifa base en un rango de fechas.
 * El servicio impide que dos temporadas activas se solapen, porque entonces el
 * precio de un día quedaría indeterminado.
 */

const ui = useUiStore()
const temporadas = ref<Temporada[]>([])
const cargando = ref(true)

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Temporada' },
  { clave: 'rango', etiqueta: 'Vigencia', clase: 'w-56' },
  { clave: 'factor', etiqueta: 'Factor', clase: 'w-40' },
  { clave: 'minimoNoches', etiqueta: 'Mínimo', clase: 'w-32' },
  { clave: 'activa', etiqueta: 'Estado', clase: 'w-32' },
]

const tonos: Record<Temporada['color'], TonoHotel> = {
  azul: 'azul',
  arena: 'arena',
  coral: 'coral',
  salvia: 'salvia',
}

onMounted(async () => {
  try {
    temporadas.value = await tarifasService.temporadas.listar()
  } catch {
    ui.error('No se pudieron cargar las temporadas.')
  } finally {
    cargando.value = false
  }
})

const hoy = new Date().toISOString().slice(0, 10)
const vigente = computed(() =>
  temporadas.value.find((t) => t.activa && t.desde <= hoy && t.hasta >= hoy),
)
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <div v-if="vigente" class="hs-panel flex flex-wrap items-center gap-4 p-6">
      <div>
        <p class="hs-etiqueta text-arena-texto">Temporada vigente</p>
        <p class="hs-titulo-pagina mt-1 text-tinta">{{ vigente.nombre }}</p>
      </div>
      <div class="hs-filete h-px flex-1" role="presentation" />
      <p class="hs-cifra text-tinta">×{{ vigente.factor.toFixed(2) }}</p>
    </div>

    <KmCard
      titulo="Temporadas"
      subtitulo="Dos temporadas activas no pueden solaparse: el precio de un día debe ser uno solo."
      sin-padding
    >
      <KmTable
        :columnas="columnas"
        :filas="temporadas"
        :cargando="cargando"
        mensaje-vacio="Todavía no hay temporadas definidas."
      >
        <template #col-nombre="{ fila }">
          <KmBadge :tono="tonos[fila.color]" punto>{{ fila.nombre }}</KmBadge>
        </template>
        <template #col-rango="{ fila }">
          <span class="text-sm text-tinta tabular-nums">
            {{ fechaCorta(fila.desde) }} → {{ fechaCorta(fila.hasta) }}
          </span>
          <span class="block text-xs text-tenue">
            {{ noches(fila.desde, fila.hasta) + 1 }} días
          </span>
        </template>
        <template #col-factor="{ fila }">
          <span class="hs-display text-base font-semibold text-tinta tabular-nums">
            ×{{ fila.factor.toFixed(2) }}
          </span>
          <span class="ml-2 text-xs text-tenue">
            {{ fila.factor > 1 ? '+' : '' }}{{ Math.round((fila.factor - 1) * 100) }}%
          </span>
        </template>
        <template #col-minimoNoches="{ fila }">
          <span class="text-sm text-tenue">
            {{ fila.minimoNoches ? `${fila.minimoNoches} noches` : 'Sin mínimo' }}
          </span>
        </template>
        <template #col-activa="{ fila }">
          <KmBadge :tono="fila.activa ? 'salvia' : 'neutro'">
            {{ fila.activa ? 'Activa' : 'Inactiva' }}
          </KmBadge>
        </template>
      </KmTable>
    </KmCard>
  </div>
</template>
