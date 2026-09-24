<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import { habitacionesService } from '@/services/habitaciones.service'
import { incidenciasService } from '@/services/incidencias.service'
import { limpiezaService } from '@/services/limpieza.service'
import { reservasService } from '@/services/reservas.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { Incidencia, ReservaResuelta, TareaResuelta } from '@/types'
import { fechaLarga, formatearSoles } from '@/utils/formato'
import {
  etiquetaTipoTarea,
  tonoPrioridad,
  tonoReserva,
  etiquetaReserva,
} from '@/utils/habitaciones'

/**
 * Portada de la vertical: la jornada, no el catálogo.
 *
 * Restaurante abre con una rejilla de indicadores porque su unidad de tiempo
 * es el servicio. Un hotel abre con el DÍA: quién llega, quién se va y qué
 * falta para que las habitaciones estén listas entre una cosa y la otra. Por
 * eso la pantalla es una franja de jornada y tres columnas de trabajo, no
 * cuatro tarjetas de cifras.
 */

const auth = useAuthStore()
const localStore = useLocalStore()
const ui = useUiStore()

const llegadas = ref<ReservaResuelta[]>([])
const salidas = ref<ReservaResuelta[]>([])
const tareas = ref<TareaResuelta[]>([])
const incidencias = ref<Incidencia[]>([])
const resumen = ref<Awaited<ReturnType<typeof habitacionesService.resumen>> | null>(null)
const { cargando, iniciar, terminar } = useCarga()

const hoy = new Date().toISOString().slice(0, 10)

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  iniciar()
  try {
    ;[llegadas.value, salidas.value, tareas.value, incidencias.value, resumen.value] =
      await Promise.all([
        reservasService.llegadas(localId, hoy),
        reservasService.salidas(localId, hoy),
        limpiezaService.tablero(localId),
        incidenciasService.abiertas(),
        habitacionesService.resumen(localId),
      ])
  } catch {
    ui.error('No se pudo cargar el resumen del día.')
  } finally {
    terminar()
  }
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  cargar()
})
watch(() => localStore.localId, cargar)

const pendientesLimpieza = computed(() =>
  tareas.value.filter((t) => t.estado !== 'terminada').slice(0, 6),
)

const minutosPendientes = computed(() =>
  tareas.value
    .filter((t) => t.estado !== 'terminada')
    .reduce((total, t) => total + t.minutosEstimados, 0),
)

/** Ingreso comprometido por las llegadas de hoy: primera noche de cada reserva. */
const ingresoPrevisto = computed(() =>
  llegadas.value.reduce((total, r) => total + r.tarifaNoche, 0),
)

const ocupacion = computed(() => resumen.value?.ocupacion ?? 0)

/** Arco de ocupación: 0–100 sobre una circunferencia de radio 52. */
const arco = computed(() => {
  const circunferencia = 2 * Math.PI * 52
  return {
    total: circunferencia,
    lleno: (ocupacion.value / 100) * circunferencia,
  }
})

const saludo = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const incidenciasBloqueantes = computed(
  () => incidencias.value.filter((i) => i.bloqueaHabitacion).length,
)
</script>

<template>
  <div class="flex w-full flex-col gap-7">
    <!--
      Franja de jornada: el arco de ocupación a la izquierda y, a su lado, las
      tres cifras que gobiernan el día. Todo en una sola superficie para que se
      lea como un parte, no como un panel de control.
    -->
    <section class="hs-panel overflow-hidden">
      <div class="flex flex-col gap-8 p-7 lg:flex-row lg:items-center">
        <div class="flex items-center gap-6">
          <div class="relative shrink-0">
            <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
              <circle
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke="var(--hs-border)"
                stroke-width="10"
              />
              <circle
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke="var(--hs-primary)"
                stroke-width="10"
                stroke-linecap="round"
                :stroke-dasharray="`${arco.lleno} ${arco.total}`"
                transform="rotate(-90 64 64)"
                style="transition: stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)"
              />
            </svg>
            <div class="absolute inset-0 grid place-items-center">
              <p class="hs-cifra text-tinta">{{ ocupacion }}<span class="text-lg">%</span></p>
            </div>
            <p class="hs-etiqueta mt-2 text-center text-tenue">Ocupación</p>
          </div>

          <div>
            <p class="hs-display text-xl text-tinta">
              {{ saludo }}, {{ auth.usuario?.nombre.split(' ')[0] }}.
            </p>
            <p class="mt-1 text-sm text-tenue first-letter:uppercase">{{ fechaLarga(hoy) }}</p>
            <p class="mt-3 text-xs text-tenue">
              {{ resumen?.ocupadas ?? 0 }} de {{ resumen?.vendibles ?? 0 }} habitaciones vendibles
              ocupadas
              <template v-if="incidenciasBloqueantes">
                · {{ incidenciasBloqueantes }} fuera de servicio
              </template>
            </p>
          </div>
        </div>

        <div class="hs-filete h-px w-full lg:hidden" role="presentation" />

        <div class="grid flex-1 gap-6 sm:grid-cols-3">
          <div>
            <p class="hs-etiqueta text-turquesa-texto">Llegan hoy</p>
            <p class="hs-cifra mt-2 text-tinta">{{ llegadas.length }}</p>
            <p class="mt-1 text-xs text-tenue">{{ formatearSoles(ingresoPrevisto) }} previstos</p>
          </div>
          <div>
            <p class="hs-etiqueta text-turquesa-texto">Salen hoy</p>
            <p class="hs-cifra mt-2 text-tinta">{{ salidas.length }}</p>
            <p class="mt-1 text-xs text-tenue">Cada una abre una tarea de salida</p>
          </div>
          <div>
            <p class="hs-etiqueta text-turquesa-texto">Pisos pendientes</p>
            <p class="hs-cifra mt-2 text-tinta">{{ pendientesLimpieza.length }}</p>
            <p class="mt-1 text-xs text-tenue">≈ {{ minutosPendientes }} min de trabajo</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Tres columnas de trabajo: el día leído de izquierda a derecha. -->
    <div class="grid gap-6 xl:grid-cols-3">
      <section class="rounded-card border border-linea bg-panel">
        <header class="flex items-baseline justify-between border-b border-linea px-6 py-4">
          <h2 class="hs-titulo-seccion text-tinta">Llegadas</h2>
          <RouterLink
            :to="{ name: 'recepcion' }"
            class="text-xs font-semibold text-azul hover:underline"
          >
            Ir a recepción
          </RouterLink>
        </header>
        <ul class="flex flex-col divide-y divide-linea">
          <li v-if="!cargando && llegadas.length === 0" class="px-6 py-8 text-sm text-tenue">
            Nadie llega hoy. Buen momento para las limpiezas profundas.
          </li>
          <li v-for="r in llegadas" :key="r.id" class="flex items-center gap-3 px-6 py-3.5">
            <span
              class="hs-display grid size-10 shrink-0 place-items-center rounded-full border border-linea bg-panel-2 text-xs font-semibold text-tinta"
            >
              {{ r.habitacion?.numero ?? '—' }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-tinta">
                {{ r.huesped?.nombres }} {{ r.huesped?.apellidos }}
              </span>
              <span class="block truncate text-xs text-tenue">
                {{ r.tipo?.nombre }} · {{ r.noches }} noche{{ r.noches === 1 ? '' : 's' }} ·
                {{ r.codigo }}
              </span>
            </span>
            <KmBadge :tono="tonoReserva[r.estado]">{{ etiquetaReserva[r.estado] }}</KmBadge>
          </li>
        </ul>
      </section>

      <section class="rounded-card border border-linea bg-panel">
        <header class="flex items-baseline justify-between border-b border-linea px-6 py-4">
          <h2 class="hs-titulo-seccion text-tinta">Salidas</h2>
          <span class="hs-etiqueta text-tenue">Hasta {{ localStore.local?.horaCheckOut }}</span>
        </header>
        <ul class="flex flex-col divide-y divide-linea">
          <li v-if="!cargando && salidas.length === 0" class="px-6 py-8 text-sm text-tenue">
            No hay salidas previstas para hoy.
          </li>
          <li v-for="r in salidas" :key="r.id" class="flex items-center gap-3 px-6 py-3.5">
            <span
              class="hs-display grid size-10 shrink-0 place-items-center rounded-full border border-linea bg-panel-2 text-xs font-semibold text-tinta"
            >
              {{ r.habitacion?.numero ?? '—' }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-tinta">
                {{ r.huesped?.nombres }} {{ r.huesped?.apellidos }}
              </span>
              <span class="block truncate text-xs text-tenue">
                {{ r.noches }} noche{{ r.noches === 1 ? '' : 's' }} · {{ r.codigo }}
              </span>
            </span>
            <KmBadge tono="turquesa">Por salir</KmBadge>
          </li>
        </ul>
      </section>

      <section class="rounded-card border border-linea bg-panel">
        <header class="flex items-baseline justify-between border-b border-linea px-6 py-4">
          <h2 class="hs-titulo-seccion text-tinta">Pisos</h2>
          <RouterLink
            :to="{ name: 'limpieza' }"
            class="text-xs font-semibold text-azul hover:underline"
          >
            Ver housekeeping
          </RouterLink>
        </header>
        <ul class="flex flex-col divide-y divide-linea">
          <li
            v-if="!cargando && pendientesLimpieza.length === 0"
            class="px-6 py-8 text-sm text-tenue"
          >
            Todas las habitaciones están entregadas.
          </li>
          <li
            v-for="t in pendientesLimpieza"
            :key="t.id"
            class="flex items-center gap-3 px-6 py-3.5"
          >
            <span
              class="hs-display grid size-10 shrink-0 place-items-center rounded-full border border-linea bg-panel-2 text-xs font-semibold text-tinta"
            >
              {{ t.habitacion?.numero }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-tinta">
                {{ etiquetaTipoTarea[t.tipo] }}
              </span>
              <span class="block truncate text-xs text-tenue">
                {{ t.responsable?.nombre ?? 'Sin asignar' }} · {{ t.minutosEstimados }} min
              </span>
            </span>
            <KmBadge v-if="t.prioridad !== 'normal'" :tono="tonoPrioridad[t.prioridad]" punto>
              {{ t.prioridad === 'urgente' ? 'Urgente' : 'Alta' }}
            </KmBadge>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
