<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { habitacionesService } from '@/services/habitaciones.service'
import { incidenciasService } from '@/services/incidencias.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { HabitacionResuelta, Incidencia, Prioridad } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { desdeHace } from '@/utils/formato'
import { etiquetaPrioridad, tonoPrioridad } from '@/utils/habitaciones'

/**
 * Partes de mantenimiento. Una incidencia que bloquea deja la habitación fuera
 * de servicio y la retira del inventario vendible; al resolverla vuelve como
 * sucia, nunca como lista.
 */

const localStore = useLocalStore()
const ui = useUiStore()

const incidencias = ref<Incidencia[]>([])
const habitaciones = ref<HabitacionResuelta[]>([])
const cargando = ref(true)
const modalAbierto = ref(false)
const guardando = ref(false)

const borrador = ref({
  habitacionId: '' as string | number | undefined,
  titulo: '',
  descripcion: '',
  prioridad: 'normal' as Prioridad,
  bloqueaHabitacion: false,
})

const prioridades: OpcionSelect[] = (['normal', 'alta', 'urgente'] as Prioridad[]).map((p) => ({
  valor: p,
  etiqueta: etiquetaPrioridad[p],
}))

const opcionesHabitacion = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Zona común (sin habitación)' },
  ...habitaciones.value.map((h) => ({ valor: h.id, etiqueta: `Habitación ${h.numero}` })),
])

async function cargar() {
  cargando.value = true
  try {
    const localId = localStore.localId
    ;[incidencias.value, habitaciones.value] = await Promise.all([
      incidenciasService.todos(),
      localId ? habitacionesService.listarPorLocal(localId) : Promise.resolve([]),
    ])
  } catch {
    ui.error('No se pudieron cargar las incidencias.')
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  cargar()
})

const abiertas = computed(() => incidencias.value.filter((i) => i.estado !== 'resuelta'))
const resueltas = computed(() =>
  incidencias.value.filter((i) => i.estado === 'resuelta').slice(0, 8),
)

function numeroDe(habitacionId?: string) {
  return habitaciones.value.find((h) => h.id === habitacionId)?.numero
}

function abrirNueva() {
  borrador.value = {
    habitacionId: '',
    titulo: '',
    descripcion: '',
    prioridad: 'normal',
    bloqueaHabitacion: false,
  }
  modalAbierto.value = true
}

async function guardar() {
  if (!borrador.value.titulo.trim()) {
    ui.error('Describe la incidencia en una línea.')
    return
  }
  guardando.value = true
  try {
    await incidenciasService.crear({
      habitacionId: (borrador.value.habitacionId as string) || undefined,
      titulo: borrador.value.titulo.trim(),
      descripcion: borrador.value.descripcion.trim() || undefined,
      prioridad: borrador.value.prioridad,
      estado: 'abierta',
      bloqueaHabitacion: borrador.value.bloqueaHabitacion,
    })
    ui.exito('Parte registrado.')
    modalAbierto.value = false
    cargar()
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo registrar el parte.')
  } finally {
    guardando.value = false
  }
}

async function resolver(i: Incidencia) {
  try {
    await incidenciasService.resolver(i.id)
    ui.exito(
      i.bloqueaHabitacion
        ? 'Parte cerrado. La habitación vuelve al circuito como sucia.'
        : 'Parte cerrado.',
    )
    cargar()
  } catch {
    ui.error('No se pudo cerrar el parte.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <KmCard
      titulo="Partes abiertos"
      :subtitulo="`${abiertas.length} incidencias sin cerrar`"
      sin-padding
    >
      <template #acciones>
        <KmButton tamano="sm" @click="abrirNueva">Nuevo parte</KmButton>
      </template>

      <ul class="flex flex-col divide-y divide-linea">
        <li v-if="!cargando && abiertas.length === 0" class="px-6 py-10 text-sm text-tenue">
          No hay incidencias abiertas. Todo el inventario está vendible.
        </li>
        <li v-for="i in abiertas" :key="i.id" class="flex flex-wrap items-center gap-4 px-6 py-4">
          <span
            v-if="i.habitacionId"
            class="hs-display grid size-11 shrink-0 place-items-center rounded-full border border-linea bg-panel-2 text-sm font-semibold text-tinta"
          >
            {{ numeroDe(i.habitacionId) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-tinta">{{ i.titulo }}</p>
            <p v-if="i.descripcion" class="mt-0.5 text-xs text-tenue">{{ i.descripcion }}</p>
            <p class="mt-1 text-xs text-tenue">Abierto {{ desdeHace(i.creada) }}</p>
          </div>
          <KmBadge :tono="tonoPrioridad[i.prioridad]" punto>
            {{ etiquetaPrioridad[i.prioridad] }}
          </KmBadge>
          <KmBadge v-if="i.bloqueaHabitacion" tono="neutro">Fuera de servicio</KmBadge>
          <KmButton variante="secundario" tamano="sm" @click="resolver(i)">Cerrar parte</KmButton>
        </li>
      </ul>
    </KmCard>

    <KmCard titulo="Cerrados recientemente" sin-padding>
      <ul class="flex flex-col divide-y divide-linea">
        <li v-if="resueltas.length === 0" class="px-6 py-8 text-sm text-tenue">
          Todavía no hay partes cerrados.
        </li>
        <li v-for="i in resueltas" :key="i.id" class="flex items-center gap-4 px-6 py-3">
          <span class="min-w-0 flex-1 truncate text-sm text-tinta">
            <template v-if="i.habitacionId">Hab. {{ numeroDe(i.habitacionId) }} · </template>
            {{ i.titulo }}
          </span>
          <span class="text-xs text-tenue">{{ i.resuelta ? desdeHace(i.resuelta) : '' }}</span>
        </li>
      </ul>
    </KmCard>

    <KmModal v-model="modalAbierto" titulo="Nuevo parte de mantenimiento">
      <div class="flex flex-col gap-4">
        <KmField v-slot="{ id }" label="Habitación">
          <KmSelect :id="id" v-model="borrador.habitacionId" :opciones="opcionesHabitacion" />
        </KmField>

        <KmField v-slot="{ id }" label="Qué pasa" requerido>
          <KmInput :id="id" v-model="borrador.titulo" placeholder="Fuga en la ducha" />
        </KmField>

        <KmField v-slot="{ id }" label="Detalle">
          <KmInput
            :id="id"
            v-model="borrador.descripcion"
            placeholder="Lo que vio quien lo reportó"
          />
        </KmField>

        <KmField v-slot="{ id }" label="Prioridad">
          <KmSelect :id="id" v-model="borrador.prioridad" :opciones="prioridades" />
        </KmField>

        <KmSwitch
          v-model="borrador.bloqueaHabitacion"
          etiqueta="Deja la habitación fuera de servicio"
          descripcion="Se retira del inventario vendible hasta que el parte se cierre."
        />
      </div>

      <template #footer>
        <KmButton variante="secundario" @click="modalAbierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="guardar">Registrar parte</KmButton>
      </template>
    </KmModal>
  </div>
</template>
