<script setup lang="ts">
import { onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { inventarioService } from '@/services/inventario.service'
import { useUiStore } from '@/stores/ui.store'
import type { Insumo, Movimiento } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { etiquetaMovimiento, hora } from '@/utils/formato'
import type { TonoHotel } from '@/types/ui'

/** Kardex del piso: qué entró, qué salió y a qué habitación se imputó. */

const ui = useUiStore()
const movimientos = ref<Movimiento[]>([])
const insumos = ref<Insumo[]>([])
const cargando = ref(true)

const columnas: ColumnaTabla[] = [
  { clave: 'fecha', etiqueta: 'Fecha', clase: 'w-36' },
  { clave: 'insumoId', etiqueta: 'Insumo' },
  { clave: 'tipo', etiqueta: 'Tipo', clase: 'w-36' },
  { clave: 'cantidad', etiqueta: 'Cantidad', clase: 'w-32 text-right' },
  { clave: 'motivo', etiqueta: 'Motivo' },
]

const tonos: Record<Movimiento['tipo'], TonoHotel> = {
  ingreso: 'salvia',
  salida: 'azul',
  ajuste: 'arena',
  merma: 'coral',
}

onMounted(async () => {
  try {
    ;[movimientos.value, insumos.value] = await Promise.all([
      inventarioService.movimientos(),
      inventarioService.todos(),
    ])
  } catch {
    ui.error('No se pudieron cargar los movimientos.')
  } finally {
    cargando.value = false
  }
})

function nombreInsumo(id: string) {
  return insumos.value.find((i) => i.id === id)?.nombre ?? id
}
</script>

<template>
  <KmCard titulo="Movimientos" subtitulo="Consumos, reposiciones y mermas del piso." sin-padding>
    <KmTable
      :columnas="columnas"
      :filas="movimientos"
      :cargando="cargando"
      mensaje-vacio="Todavía no hay movimientos registrados."
    >
      <template #col-fecha="{ fila }">
        <span class="text-xs text-tenue tabular-nums">
          {{ fila.fecha.slice(8, 10) }}/{{ fila.fecha.slice(5, 7) }} · {{ hora(fila.fecha) }}
        </span>
      </template>
      <template #col-insumoId="{ fila }">
        <span class="text-sm text-tinta">{{ nombreInsumo(fila.insumoId) }}</span>
      </template>
      <template #col-tipo="{ fila }">
        <KmBadge :tono="tonos[fila.tipo]">{{ etiquetaMovimiento[fila.tipo] }}</KmBadge>
      </template>
      <template #col-cantidad="{ fila }">
        <span class="text-sm text-tinta tabular-nums">
          {{ fila.tipo === 'ingreso' ? '+' : '−' }}{{ fila.cantidad }}
        </span>
      </template>
      <template #col-motivo="{ fila }">
        <span class="text-sm text-tenue">{{ fila.motivo ?? '—' }}</span>
      </template>
    </KmTable>
  </KmCard>
</template>
