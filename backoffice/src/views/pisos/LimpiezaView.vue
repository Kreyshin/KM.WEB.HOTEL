<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { limpiezaService } from '@/services/limpieza.service'
import { usuariosService } from '@/services/usuarios.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { EstadoTarea, TareaResuelta, Usuario } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { desdeHace } from '@/utils/formato'
import {
  estadosTarea,
  etiquetaPrioridad,
  etiquetaTarea,
  etiquetaTipoTarea,
  tonoPrioridad,
  tonoTarea,
} from '@/utils/habitaciones'

/**
 * Tablero de housekeeping: una columna por fase del trabajo.
 *
 * Es el mismo patrón de columnas del KDS de cocina —pendiente, en curso, por
 * revisar, terminada— porque el oficio es el mismo: una cola de trabajo con
 * tiempo encima. Mover una tarjeta mueve también el estado de limpieza de la
 * habitación; no hay dos verdades.
 */

const localStore = useLocalStore()
const ui = useUiStore()

const tareas = ref<TareaResuelta[]>([])
const camareras = ref<Usuario[]>([])
const carga = ref<{ usuario: Usuario; tareas: number; minutos: number }[]>([])
const { cargando, refrescando, iniciar, terminar } = useCarga()

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  iniciar()
  try {
    ;[tareas.value, camareras.value, carga.value] = await Promise.all([
      limpiezaService.tablero(localId),
      usuariosService.personalDePisos(),
      limpiezaService.cargaPorCamarera(localId),
    ])
  } catch {
    ui.error('No se pudo cargar el tablero de pisos.')
  } finally {
    terminar()
  }
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  cargar()
})
watch(() => localStore.localId, cargar)

const columnas = computed(() =>
  estadosTarea.map((estado) => ({
    estado,
    tareas: tareas.value.filter((t) => t.estado === estado),
  })),
)

const opcionesCamarera = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Sin asignar' },
  ...camareras.value.map((u) => ({ valor: u.id, etiqueta: u.nombre })),
])

/** Siguiente fase de la tarea; la última no avanza. */
const siguiente: Partial<Record<EstadoTarea, EstadoTarea>> = {
  pendiente: 'enCurso',
  enCurso: 'revisar',
  revisar: 'terminada',
}

async function avanzar(t: TareaResuelta) {
  const destino = siguiente[t.estado]
  if (!destino) return
  try {
    await limpiezaService.cambiarEstado(t.id, destino)
    ui.exito(`Habitación ${t.habitacion?.numero}: ${etiquetaTarea[destino].toLowerCase()}.`)
    cargar()
  } catch {
    ui.error('No se pudo avanzar la tarea.')
  }
}

async function asignar(t: TareaResuelta, usuarioId: string | number | undefined) {
  try {
    await limpiezaService.asignar(t.id, (usuarioId as string) || undefined)
    cargar()
  } catch {
    ui.error('No se pudo asignar la tarea.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <!-- Carga del turno: cuánto trabajo tiene cada camarera antes de repartir más. -->
    <KmCard
      titulo="Carga del turno"
      subtitulo="Minutos estimados de trabajo pendiente por persona."
    >
      <ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="c in carga" :key="c.usuario.id">
          <div class="mb-2 flex items-baseline justify-between gap-3">
            <span class="text-sm font-semibold text-tinta">{{ c.usuario.nombre }}</span>
            <span class="text-xs text-tenue tabular-nums">
              {{ c.tareas }} tarea{{ c.tareas === 1 ? '' : 's' }} · {{ c.minutos }} min
            </span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-linea">
            <div
              class="h-full rounded-full bg-azul transition-[width] duration-500"
              :style="{ width: `${Math.min(100, (c.minutos / 240) * 100)}%` }"
            />
          </div>
        </li>
      </ul>
    </KmCard>

    <p v-if="cargando" class="text-sm text-tenue">Cargando tareas…</p>

    <div
      v-else
      class="grid gap-4 lg:grid-cols-4"
      :class="{ 'hs-refrescando': refrescando }"
      :aria-busy="refrescando"
    >
      <section
        v-for="col in columnas"
        :key="col.estado"
        class="flex flex-col gap-3 rounded-card border border-linea bg-panel-2 p-3"
      >
        <header class="flex items-center justify-between px-1">
          <h2 class="hs-etiqueta text-tenue">{{ etiquetaTarea[col.estado] }}</h2>
          <span class="hs-display text-sm font-semibold text-tinta tabular-nums">
            {{ col.tareas.length }}
          </span>
        </header>

        <p v-if="col.tareas.length === 0" class="px-1 py-6 text-center text-xs text-tenue">
          Nada aquí.
        </p>

        <article
          v-for="t in col.tareas"
          :key="t.id"
          class="flex flex-col gap-2.5 rounded-control border border-linea bg-panel p-3.5"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="hs-display text-lg leading-none font-semibold text-tinta">
                {{ t.habitacion?.numero }}
              </p>
              <p class="mt-1 text-xs text-tenue">{{ etiquetaTipoTarea[t.tipo] }}</p>
            </div>
            <KmBadge v-if="t.prioridad !== 'normal'" :tono="tonoPrioridad[t.prioridad]" punto>
              {{ etiquetaPrioridad[t.prioridad] }}
            </KmBadge>
          </div>

          <p v-if="t.notas" class="text-xs text-tenue">{{ t.notas }}</p>

          <KmSelect
            :model-value="t.asignadaAId ?? ''"
            :opciones="opcionesCamarera"
            etiqueta="Asignar tarea"
            @update:model-value="(v) => asignar(t, v)"
          />

          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] text-tenue tabular-nums">
              {{ t.minutosEstimados }} min · {{ desdeHace(t.creada) }}
            </span>
            <button
              v-if="t.estado !== 'terminada'"
              type="button"
              class="rounded-control border border-linea px-2.5 py-1 text-[11px] font-semibold text-azul transition-colors hover:border-azul"
              @click="avanzar(t)"
            >
              {{ t.estado === 'revisar' ? 'Aprobar' : 'Avanzar' }}
            </button>
            <KmBadge v-else :tono="tonoTarea.terminada">Entregada</KmBadge>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>
