<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBusqueda from '@/components/ui/KmBusqueda.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { habitacionesService } from '@/services/habitaciones.service'
import { usuariosService } from '@/services/usuarios.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { EstadoLimpieza, HabitacionResuelta, Orden, Usuario } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { desdeHace } from '@/utils/formato'
import {
  estadosLimpieza,
  estadosOcupacion,
  etiquetaLimpieza,
  etiquetaOcupacion,
  tonoLimpieza,
  tonoOcupacion,
} from '@/utils/habitaciones'

/**
 * Inventario físico de habitaciones. A diferencia del tablero, aquí se trabaja
 * en modo lista: buscar una habitación concreta, ver de un vistazo sus dos
 * estados y reasignar la camarera del turno.
 */

const localStore = useLocalStore()
const ui = useUiStore()

const habitaciones = ref<HabitacionResuelta[]>([])
const camareras = ref<Usuario[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const buscar = ref('')
const filtroOcupacion = ref<string | number | undefined>('')
const filtroLimpieza = ref<string | number | undefined>('')
const orden = ref<Orden | undefined>({ campo: 'numero', direccion: 'asc' })

const columnas: ColumnaTabla[] = [
  { clave: 'numero', etiqueta: 'Habitación', clase: 'w-40', ordenable: true },
  { clave: 'tipo', etiqueta: 'Tipo', clase: 'w-48' },
  { clave: 'ocupacion', etiqueta: 'Ocupación', clase: 'w-40' },
  { clave: 'limpieza', etiqueta: 'Limpieza', clase: 'w-48' },
  { clave: 'asignadaAId', etiqueta: 'Camarera del turno', clase: 'w-56' },
  { clave: 'actualizada', etiqueta: 'Último cambio', clase: 'w-40', ordenable: true },
]

const opcionesOcupacion: OpcionSelect[] = [
  { valor: '', etiqueta: 'Toda ocupación' },
  ...estadosOcupacion.map((e) => ({ valor: e, etiqueta: etiquetaOcupacion[e] })),
]

const opcionesLimpieza: OpcionSelect[] = [
  { valor: '', etiqueta: 'Toda limpieza' },
  ...estadosLimpieza.map((e) => ({ valor: e, etiqueta: etiquetaLimpieza[e] })),
]

const opcionesCamarera = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Sin asignar' },
  ...camareras.value.map((u) => ({ valor: u.id, etiqueta: u.nombre })),
])

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  cargando.value = true
  error.value = null
  try {
    ;[habitaciones.value, camareras.value] = await Promise.all([
      habitacionesService.listarPorLocal(localId),
      usuariosService.personalDePisos(),
    ])
  } catch (e) {
    error.value = (e as { mensaje?: string }).mensaje ?? 'No se pudieron cargar las habitaciones.'
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  cargar()
})
watch(() => localStore.localId, cargar)

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filtradas = computed(() => {
  const t = normalizar(buscar.value.trim())
  const lista = habitaciones.value.filter(
    (h) =>
      (!t || normalizar(`${h.numero} ${h.tipo?.nombre ?? ''} ${h.nota ?? ''}`).includes(t)) &&
      (!filtroOcupacion.value || h.ocupacion === filtroOcupacion.value) &&
      (!filtroLimpieza.value || h.limpieza === filtroLimpieza.value),
  )
  if (!orden.value) return lista
  const { campo, direccion } = orden.value
  const signo = direccion === 'desc' ? -1 : 1
  return [...lista].sort(
    (a, b) =>
      signo *
      String(a[campo as keyof HabitacionResuelta] ?? '').localeCompare(
        String(b[campo as keyof HabitacionResuelta] ?? ''),
        'es',
        { numeric: true },
      ),
  )
})

async function cambiarLimpieza(h: HabitacionResuelta, estado: EstadoLimpieza) {
  try {
    await habitacionesService.cambiarLimpieza(h.id, estado)
    ui.exito(`Habitación ${h.numero}: ${etiquetaLimpieza[estado].toLowerCase()}.`)
    cargar()
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo cambiar el estado.')
  }
}

async function asignar(h: HabitacionResuelta, usuarioId: string | number | undefined) {
  try {
    await habitacionesService.asignarCamarera(h.id, (usuarioId as string) || undefined)
    cargar()
  } catch {
    ui.error('No se pudo asignar la camarera.')
  }
}
</script>

<template>
  <KmCard
    titulo="Habitaciones"
    subtitulo="Ocupación y limpieza son dos ejes independientes: una habitación puede estar libre y sucia."
    sin-padding
  >
    <div class="flex flex-wrap items-center gap-3 border-b border-linea px-6 py-3">
      <KmBusqueda v-model="buscar" placeholder="Buscar habitación" />
      <div class="w-full sm:w-44">
        <KmSelect v-model="filtroOcupacion" :opciones="opcionesOcupacion" etiqueta="Ocupación" />
      </div>
      <div class="w-full sm:w-48">
        <KmSelect v-model="filtroLimpieza" :opciones="opcionesLimpieza" etiqueta="Limpieza" />
      </div>
      <p class="ml-auto text-xs text-tenue tabular-nums">
        {{ filtradas.length }} de {{ habitaciones.length }}
      </p>
    </div>

    <KmTable
      v-model:orden="orden"
      :columnas="columnas"
      :filas="filtradas"
      :cargando="cargando"
      :error="error"
      mensaje-vacio="Ninguna habitación coincide con el filtro."
      @reintentar="cargar"
    >
      <template #col-numero="{ fila }">
        <span class="hs-display text-lg font-semibold text-tinta">{{ fila.numero }}</span>
        <span class="block text-xs text-tenue">{{ fila.piso?.nombre }}</span>
      </template>

      <template #col-tipo="{ fila }">
        <span class="text-sm text-tinta">{{ fila.tipo?.nombre }}</span>
        <span class="block text-xs text-tenue">{{ fila.tipo?.camas }}</span>
      </template>

      <template #col-ocupacion="{ fila }">
        <KmBadge :tono="tonoOcupacion[fila.ocupacion]" punto>
          {{ etiquetaOcupacion[fila.ocupacion] }}
        </KmBadge>
        <span v-if="fila.nota" class="mt-1 block text-xs text-tenue">{{ fila.nota }}</span>
      </template>

      <template #col-limpieza="{ fila }">
        <div class="flex items-center gap-2">
          <KmBadge :tono="tonoLimpieza[fila.limpieza]">
            {{ etiquetaLimpieza[fila.limpieza] }}
          </KmBadge>
          <button
            v-if="fila.limpieza === 'sucia'"
            type="button"
            class="text-xs font-semibold text-azul hover:underline"
            @click="cambiarLimpieza(fila, 'enLimpieza')"
          >
            Empezar
          </button>
          <button
            v-else-if="fila.limpieza === 'inspeccion'"
            type="button"
            class="text-xs font-semibold text-azul hover:underline"
            @click="cambiarLimpieza(fila, 'limpia')"
          >
            Aprobar
          </button>
        </div>
      </template>

      <template #col-asignadaAId="{ fila }">
        <KmSelect
          :model-value="fila.asignadaAId ?? ''"
          :opciones="opcionesCamarera"
          etiqueta="Camarera asignada"
          @update:model-value="(v) => asignar(fila, v)"
        />
      </template>

      <template #col-actualizada="{ fila }">
        <span class="text-xs text-tenue tabular-nums">{{ desdeHace(fila.actualizada) }}</span>
      </template>
    </KmTable>
  </KmCard>
</template>
