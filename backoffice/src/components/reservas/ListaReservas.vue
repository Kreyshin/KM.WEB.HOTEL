<script setup lang="ts">
import { computed, onMounted } from 'vue'
import HsIcono from '@/components/hotel/HsIcono.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmPaginacion from '@/components/ui/KmPaginacion.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { useCanales } from '@/composables/useCanales'
import { useListado } from '@/composables/useListado'
import { reservasService } from '@/services/reservas.service'
import type { ReservaResuelta } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { fechaCorta, formatearSoles } from '@/utils/formato'
import { estadosReserva, etiquetaReserva, tonoReserva } from '@/utils/habitaciones'

/**
 * La lente de consulta: el libro de reservas.
 *
 * Contesta lo que el rack no puede: «¿dónde está la reserva de los Pérez?»,
 * «¿qué entra por Booking este mes?», «¿cuántos no se presentaron?». Por eso
 * **no comparte el tramo de fechas con el rack**: el rack enseña una ventana
 * del hotel y esta busca en todo el libro. Mezclar los dos alcances haría que
 * cambiar de lente cambiase en silencio lo que se está mirando.
 */

defineProps<{ recargarAl?: number }>()
const emit = defineEmits<{ abrir: [ReservaResuelta] }>()

const columnas: ColumnaTabla[] = [
  { clave: 'codigo', etiqueta: 'Localizador', clase: 'w-36', ordenable: true },
  { clave: 'huesped', etiqueta: 'Huésped' },
  { clave: 'estancia', etiqueta: 'Estancia', clase: 'w-52' },
  { clave: 'canal', etiqueta: 'Canal', clase: 'w-36' },
  { clave: 'tarifaNoche', etiqueta: 'Tarifa/noche', clase: 'w-36 text-right', ordenable: true },
  { clave: 'estado', etiqueta: 'Estado', clase: 'w-36' },
  { clave: 'acciones', etiqueta: '', clase: 'w-24 text-right' },
]

const { consulta, items, total, cargando, error, recargar } = useListado<ReservaResuelta>(
  (c) => reservasService.consultarResueltas(c),
  { orden: { campo: 'entrada', direccion: 'desc' }, porPagina: 20 },
)

defineExpose({ recargar })

const opcionesEstado: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los estados' },
  ...estadosReserva.map((e) => ({ valor: e, etiqueta: etiquetaReserva[e] })),
]

/* Los canales salen del maestro: uno nuevo aparece aquí sin tocar esta vista. */
const { cargar: cargarCanales, nombre: nombreCanal, opciones } = useCanales()
onMounted(cargarCanales)

const opcionesCanal = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los canales' },
  ...opciones.value,
])

function filtro(clave: string) {
  return computed({
    get: () => (consulta.filtros?.[clave] as string) ?? '',
    set: (v: string | number | undefined) => {
      consulta.filtros = { ...consulta.filtros, [clave]: v === '' ? undefined : (v as string) }
    },
  })
}

const filtroEstado = filtro('estado')
const filtroCanal = filtro('canal')
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-wrap items-center gap-3 border-b border-linea px-5 py-3">
      <KmBusqueda
        v-model="consulta.buscar"
        placeholder="Localizador, huésped…"
        class="min-w-56 flex-1"
      />
      <div class="w-44">
        <KmSelect v-model="filtroEstado" :opciones="opcionesEstado" etiqueta="Estado" />
      </div>
      <div class="w-44">
        <KmSelect v-model="filtroCanal" :opciones="opcionesCanal" etiqueta="Canal" />
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
          {{ fila.huesped?.apellidos }}, {{ fila.huesped?.nombres }}
        </span>
        <span class="block text-xs text-tenue">
          {{ fila.tipo?.nombre }}
          <template v-if="fila.habitacion"> · Hab. {{ fila.habitacion.numero }}</template>
          <template v-else> · sin habitación asignada</template>
          · {{ fila.adultos }} adulto{{ fila.adultos === 1 ? '' : 's' }}
          <template v-if="fila.ninos"> y {{ fila.ninos }} menor(es)</template>
        </span>
      </template>

      <template #col-estancia="{ fila }">
        <span class="text-sm text-tinta tabular-nums">
          {{ fechaCorta(fila.entrada) }} → {{ fechaCorta(fila.salida) }}
        </span>
        <span class="flex items-center gap-1 text-xs text-tenue">
          <HsIcono nombre="noche" tamano="xs" />
          {{ fila.noches }} noche{{ fila.noches === 1 ? '' : 's' }}
        </span>
      </template>

      <template #col-canal="{ fila }">
        <span class="text-sm text-tenue">{{ nombreCanal(fila.canal) }}</span>
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

      <template #col-acciones="{ fila }">
        <KmButton variante="fantasma" tamano="sm" @click="emit('abrir', fila)">Ver ficha</KmButton>
      </template>
    </KmTable>

    <div class="border-t border-linea px-5 py-3">
      <KmPaginacion
        v-model:pagina="consulta.pagina"
        v-model:por-pagina="consulta.porPagina"
        :total="total"
      />
    </div>
  </div>
</template>
