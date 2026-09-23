<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { habitacionesService } from '@/services/habitaciones.service'
import { reservasService } from '@/services/reservas.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { EstadoLimpieza, HabitacionResuelta, PisoConHabitaciones } from '@/types'
import { desdeHace, formatearSoles } from '@/utils/formato'
import {
  clasePlanoOcupacion,
  estadosLimpieza,
  etiquetaLimpieza,
  etiquetaOcupacion,
  glifoLimpieza,
  tonoLimpieza,
  tonoOcupacion,
} from '@/utils/habitaciones'

/**
 * Tablero de habitaciones en vivo.
 *
 * Es el espejo del KDS de Restaurante: la misma idea de pantalla colgada en la
 * pared que se mira de lejos y se toca de paso, con la entidad central
 * cambiada de «plato» a «habitación-noche». De ahí vienen sus reglas:
 *
 *   · Cada tarjeta comunica su estado por color, glifo y texto, nunca solo por
 *     color: el tablero se mira a tres metros y lo usan turnos enteros.
 *   · La antigüedad («hace 40 min») es información de primera clase: lo que
 *     lleva más tiempo sin moverse es lo que hay que resolver.
 *   · Las acciones son de un toque y sin diálogo: quien pasa con el carro no
 *     abre formularios.
 *
 * El refresco es un `setInterval` contra el mock. Cuando exista backend, se
 * sustituye por SSE o WebSocket sin tocar la plantilla: solo cambia `cargar`.
 */

const REFRESCO_MS = 15_000

const localStore = useLocalStore()
const ui = useUiStore()

const pisos = ref<PisoConHabitaciones[]>([])
const cargando = ref(true)
const enVivo = ref(true)
const filtro = ref('todas')
const ultimoRefresco = ref<Date | null>(null)
/** Habitaciones que cambiaron en el último refresco: se les marca el latido. */
const recienCambiadas = ref<Set<string>>(new Set())

let temporizador: ReturnType<typeof setInterval> | undefined

async function cargar(silencioso = false) {
  const localId = localStore.localId
  if (!localId) return
  if (!silencioso) cargando.value = true
  try {
    const anterior = new Map(
      pisos.value.flatMap((p) => p.habitaciones.map((h) => [h.id, h.actualizada] as const)),
    )
    const datos = await habitacionesService.planoPorPiso(localId)
    if (silencioso) {
      const cambios = new Set<string>()
      for (const piso of datos) {
        for (const h of piso.habitaciones) {
          if (anterior.has(h.id) && anterior.get(h.id) !== h.actualizada) cambios.add(h.id)
        }
      }
      recienCambiadas.value = cambios
    }
    pisos.value = datos
    ultimoRefresco.value = new Date()
  } catch {
    if (!silencioso) ui.error('No se pudo cargar el tablero.')
  } finally {
    cargando.value = false
  }
}

function arrancarRefresco() {
  clearInterval(temporizador)
  if (enVivo.value) temporizador = setInterval(() => cargar(true), REFRESCO_MS)
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  await cargar()
  arrancarRefresco()
})

onBeforeUnmount(() => clearInterval(temporizador))
watch(enVivo, arrancarRefresco)
watch(
  () => localStore.localId,
  () => cargar(),
)

const todas = computed(() => pisos.value.flatMap((p) => p.habitaciones))

const pestanas = computed(() => [
  { valor: 'todas', etiqueta: 'Todas', contador: todas.value.length },
  {
    valor: 'sucias',
    etiqueta: 'Por limpiar',
    contador: todas.value.filter((h) => h.limpieza === 'sucia').length,
  },
  {
    valor: 'libres',
    etiqueta: 'Vendibles',
    contador: todas.value.filter((h) => h.ocupacion === 'libre' && h.limpieza === 'limpia').length,
  },
  {
    valor: 'ocupadas',
    etiqueta: 'Ocupadas',
    contador: todas.value.filter((h) => h.ocupacion === 'ocupada').length,
  },
  {
    valor: 'atencion',
    etiqueta: 'Requieren atención',
    contador: todas.value.filter((h) => requiereAtencion(h)).length,
  },
])

/**
 * Una habitación «requiere atención» cuando sus dos ejes se contradicen con lo
 * que el hotel necesita: fuera de servicio, bloqueada, o libre y sucia con más
 * de dos horas sin tocarse.
 */
function requiereAtencion(h: HabitacionResuelta) {
  if (h.limpieza === 'fueraServicio' || h.ocupacion === 'bloqueada') return true
  const horas = (Date.now() - new Date(h.actualizada).getTime()) / 3_600_000
  return h.ocupacion === 'libre' && h.limpieza === 'sucia' && horas > 2
}

function pasaFiltro(h: HabitacionResuelta) {
  switch (filtro.value) {
    case 'sucias':
      return h.limpieza === 'sucia'
    case 'libres':
      return h.ocupacion === 'libre' && h.limpieza === 'limpia'
    case 'ocupadas':
      return h.ocupacion === 'ocupada'
    case 'atencion':
      return requiereAtencion(h)
    default:
      return true
  }
}

const pisosFiltrados = computed(() =>
  pisos.value
    .map((p) => ({ ...p, habitaciones: p.habitaciones.filter(pasaFiltro) }))
    .filter((p) => p.habitaciones.length > 0),
)

/** Siguiente estado de limpieza al tocar la tarjeta: el ciclo del turno. */
const siguienteLimpieza: Partial<Record<EstadoLimpieza, EstadoLimpieza>> = {
  sucia: 'enLimpieza',
  enLimpieza: 'inspeccion',
  inspeccion: 'limpia',
  limpia: 'sucia',
}

async function avanzarLimpieza(h: HabitacionResuelta) {
  const siguiente = siguienteLimpieza[h.limpieza]
  if (!siguiente) {
    ui.error('La habitación está fuera de servicio. Ciérrala desde Mantenimiento.')
    return
  }
  try {
    await habitacionesService.cambiarLimpieza(h.id, siguiente)
    ui.exito(`Habitación ${h.numero}: ${etiquetaLimpieza[siguiente].toLowerCase()}.`)
    await cargar(true)
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo cambiar el estado.')
  }
}

async function cerrarEstancia(h: HabitacionResuelta) {
  const reserva = h.estancia
    ? (await reservasService.todos()).find((r) => r.id === h.estancia?.reservaId)
    : undefined
  if (!reserva) {
    ui.error('No se encontró la reserva de esta estancia.')
    return
  }
  try {
    await reservasService.checkOut(reserva.id)
    ui.exito(`Check-out de la ${h.numero} hecho. Housekeeping ya tiene la tarea.`)
    await cargar(true)
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo cerrar la estancia.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <KmTabs v-model="filtro" :pestanas="pestanas" />

      <div class="flex items-center gap-4">
        <p v-if="ultimoRefresco" class="text-xs text-tenue tabular-nums">
          Actualizado {{ desdeHace(ultimoRefresco.toISOString()) }}
        </p>
        <label class="flex items-center gap-2 text-sm text-tenue">
          <KmSwitch v-model="enVivo" />
          <span class="flex items-center gap-1.5">
            <span
              v-if="enVivo"
              class="size-1.5 animate-pulse rounded-full bg-azul"
              aria-hidden="true"
            />
            En vivo
          </span>
        </label>
      </div>
    </div>

    <p v-if="cargando" class="text-sm text-tenue">Cargando el tablero…</p>

    <p
      v-else-if="pisosFiltrados.length === 0"
      class="rounded-card border border-linea bg-panel px-6 py-12 text-center text-sm text-tenue"
    >
      Ninguna habitación cumple este filtro ahora mismo.
    </p>

    <section v-for="piso in pisosFiltrados" :key="piso.id" class="flex flex-col gap-3">
      <div class="flex items-baseline gap-3">
        <h2 class="hs-titulo-seccion text-tinta">{{ piso.nombre }}</h2>
        <span class="hs-etiqueta text-tenue">{{ piso.habitaciones.length }} habitaciones</span>
        <div class="hs-filete flex-1" role="presentation" />
      </div>

      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <li
          v-for="h in piso.habitaciones"
          :key="h.id"
          class="hs-tono flex flex-col gap-3 rounded-card border p-4 transition-shadow"
          :class="[clasePlanoOcupacion[h.ocupacion], recienCambiadas.has(h.id) ? 'hs-latido' : '']"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="hs-display text-2xl leading-none font-semibold">{{ h.numero }}</p>
              <p class="mt-1.5 text-xs opacity-80">{{ h.tipo?.nombre }}</p>
            </div>
            <span
              class="hs-display text-xl leading-none opacity-70"
              :title="etiquetaLimpieza[h.limpieza]"
              aria-hidden="true"
            >
              {{ glifoLimpieza[h.limpieza] }}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <KmBadge :tono="tonoOcupacion[h.ocupacion]" punto>
              {{ etiquetaOcupacion[h.ocupacion] }}
            </KmBadge>
            <KmBadge :tono="tonoLimpieza[h.limpieza]">{{ etiquetaLimpieza[h.limpieza] }}</KmBadge>
          </div>

          <p v-if="h.nota" class="text-xs font-medium opacity-90">{{ h.nota }}</p>

          <p v-else-if="h.estancia" class="text-xs opacity-85">
            {{ h.estancia.adultos }} adulto{{ h.estancia.adultos === 1 ? '' : 's' }}
            <template v-if="h.estancia.ninos">· {{ h.estancia.ninos }} menor(es)</template>
            · {{ formatearSoles(h.estancia.consumos) }} en consumos
          </p>

          <div class="mt-auto flex items-center justify-between gap-2 pt-1">
            <span class="text-[11px] tabular-nums opacity-70">
              {{ desdeHace(h.actualizada) }}
            </span>

            <div class="flex items-center gap-1.5">
              <button
                v-if="h.ocupacion === 'ocupada'"
                type="button"
                class="rounded-control border border-current/30 px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-white/35 dark:hover:bg-white/10"
                @click="cerrarEstancia(h)"
              >
                Check-out
              </button>
              <button
                type="button"
                class="rounded-control border border-current/30 px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-white/35 dark:hover:bg-white/10"
                :disabled="h.limpieza === 'fueraServicio'"
                :class="h.limpieza === 'fueraServicio' ? 'cursor-not-allowed opacity-40' : ''"
                @click="avanzarLimpieza(h)"
              >
                {{
                  h.limpieza === 'sucia'
                    ? 'Empezar'
                    : h.limpieza === 'enLimpieza'
                      ? 'A revisar'
                      : h.limpieza === 'inspeccion'
                        ? 'Aprobar'
                        : 'Marcar sucia'
                }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- Leyenda: el tablero se usa de pie, sin manual. -->
    <footer class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-tenue">
      <span class="hs-etiqueta">Limpieza</span>
      <span v-for="estado in estadosLimpieza" :key="estado" class="flex items-center gap-1.5">
        <span class="hs-display" aria-hidden="true">{{ glifoLimpieza[estado] }}</span>
        {{ etiquetaLimpieza[estado] }}
      </span>
    </footer>
  </div>
</template>
