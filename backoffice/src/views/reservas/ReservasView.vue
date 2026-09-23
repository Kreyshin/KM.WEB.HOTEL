<script setup lang="ts">
import { computed } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmPaginacion from '@/components/ui/KmPaginacion.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { useListado } from '@/composables/useListado'
import { reservasService } from '@/services/reservas.service'
import type { ReservaResuelta } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { etiquetaCanal, fechaCorta, formatearSoles } from '@/utils/formato'
import { estadosReserva, etiquetaReserva, tonoReserva } from '@/utils/habitaciones'

/** Agenda completa: el libro de reservas, con su filtro por estado y canal. */

const columnas: ColumnaTabla[] = [
  { clave: 'codigo', etiqueta: 'Localizador', clase: 'w-36', ordenable: true },
  { clave: 'huesped', etiqueta: 'Huésped' },
  { clave: 'estancia', etiqueta: 'Estancia', clase: 'w-52', ordenable: false },
  { clave: 'canal', etiqueta: 'Canal', clase: 'w-36' },
  { clave: 'tarifaNoche', etiqueta: 'Tarifa/noche', clase: 'w-36 text-right', ordenable: true },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-36' },
]

const { consulta, items, total, cargando, error, recargar } = useListado<ReservaResuelta>(
  (c) => reservasService.consultarResueltas(c),
  { orden: { campo: 'entrada', direccion: 'desc' }, porPagina: 20 },
)

const opcionesEstado: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los estados' },
  ...estadosReserva.map((e) => ({ valor: e, etiqueta: etiquetaReserva[e] })),
]

const filtroEstado = computed({
  get: () => (consulta.filtros?.estado as string) ?? '',
  set: (v: string | number | undefined) => {
    consulta.filtros = { ...consulta.filtros, estado: v === '' ? undefined : (v as string) }
  },
})
</script>

<template>
  <KmCard
    titulo="Reservas"
    subtitulo="Todo lo contratado: lo que llega, lo que está dentro y lo que ya se fue."
    sin-padding
  >
    <div class="flex flex-wrap items-center gap-3 border-b border-linea px-6 py-3">
      <KmBusqueda v-model="consulta.buscar" placeholder="Buscar por localizador" />
      <div class="w-full sm:w-48">
        <KmSelect v-model="filtroEstado" :opciones="opcionesEstado" etiqueta="Estado" />
      </div>
    </div>

    <KmTable
      v-model:orden="consulta.orden"
      :columnas="columnas"
      :filas="items"
      :cargando="cargando"
      :error="error"
      mensaje-vacio="No hay reservas con este filtro."
      @reintentar="recargar"
    >
      <template #col-codigo="{ fila }">
        <span class="font-mono text-xs font-semibold text-tinta">{{ fila.codigo }}</span>
      </template>

      <template #col-huesped="{ fila }">
        <span class="font-medium text-tinta">
          {{ fila.huesped?.nombres }} {{ fila.huesped?.apellidos }}
        </span>
        <span class="block text-xs text-tenue">
          {{ fila.tipo?.nombre }}
          <template v-if="fila.habitacion"> · Hab. {{ fila.habitacion.numero }}</template>
          · {{ fila.adultos }} adulto{{ fila.adultos === 1 ? '' : 's' }}
          <template v-if="fila.ninos"> y {{ fila.ninos }} menor(es)</template>
        </span>
      </template>

      <template #col-estancia="{ fila }">
        <span class="text-sm text-tinta tabular-nums">
          {{ fechaCorta(fila.entrada) }} → {{ fechaCorta(fila.salida) }}
        </span>
        <span class="block text-xs text-tenue">
          {{ fila.noches }} noche{{ fila.noches === 1 ? '' : 's' }}
        </span>
      </template>

      <template #col-canal="{ fila }">
        <span class="text-sm text-tenue">{{ etiquetaCanal[fila.canal] }}</span>
      </template>

      <template #col-tarifaNoche="{ fila }">
        <span class="hs-display text-sm font-semibold text-tinta tabular-nums">
          {{ formatearSoles(fila.tarifaNoche) }}
        </span>
        <span v-if="fila.anticipo" class="block text-xs text-tenue">
          {{ formatearSoles(fila.anticipo) }} de anticipo
        </span>
      </template>

      <template #col-estado="{ fila }">
        <KmBadge :tono="tonoReserva[fila.estado]" punto>
          {{ etiquetaReserva[fila.estado] }}
        </KmBadge>
      </template>
    </KmTable>

    <div class="border-t border-linea px-6 py-3">
      <KmPaginacion
        v-model:pagina="consulta.pagina"
        v-model:por-pagina="consulta.porPagina"
        :total="total"
      />
    </div>
  </KmCard>
</template>
