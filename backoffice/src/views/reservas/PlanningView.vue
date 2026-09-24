<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import BarraReserva from '@/components/planning/BarraReserva.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { reservasService } from '@/services/reservas.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError, HabitacionResuelta, ReservaResuelta } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaCanal, formatearSoles } from '@/utils/formato'
import { etiquetaLimpieza, etiquetaReserva, tonoReserva } from '@/utils/habitaciones'

/**
 * El rack: habitaciones en filas, noches en columnas.
 *
 * Es la pantalla con la que piensa una recepción. El tablero responde «¿cómo
 * está el hotel ahora?»; el rack responde «¿cómo está el hotel la semana que
 * viene?», que es de donde salen el overbooking, los cambios de habitación y
 * las ventas de última hora.
 *
 * Dos gestos, los dos del oficio:
 *
 *  - **Arrastrar una barra a otra fila** cambia la habitación de la reserva.
 *    Es lo que hace recepción varias veces al día y en papel se hacía tachando.
 *  - **Barrer noches vacías** de una habitación abre una reserva nueva ya con
 *    la habitación y las fechas puestas.
 *
 * Ninguno de los dos es la única forma de hacer las cosas: ambos tienen su
 * equivalente por teclado en el panel lateral, porque un rack que solo se
 * maneja arrastrando deja fuera a quien no puede arrastrar.
 */

const TRAMO_DIAS = 14
const ANCHO_HABITACION = 148

const localStore = useLocalStore()
const ui = useUiStore()

const habitaciones = ref<HabitacionResuelta[]>([])
const reservas = ref<ReservaResuelta[]>([])
const { cargando, refrescando, iniciar, terminar } = useCarga()

const hoy = new Date().toISOString().slice(0, 10)
const inicio = ref(hoy)

const seleccionada = ref<ReservaResuelta | null>(null)
const panelAbierto = ref(false)
const moviendoA = ref<string | number | undefined>('')

/** Arrastre en curso: qué reserva y sobre qué fila está ahora mismo. */
const arrastre = ref<{
  reservaId: string
  sobre: string | null
  vetada: boolean
  /** Píxeles recorridos en vertical: la barra acompaña al dedo. */
  dy: number
} | null>(null)

// ── El eje de tiempo ─────────────────────────────────────────────────────────

function sumarDias(iso: string, dias: number) {
  const f = new Date(`${iso}T12:00:00`)
  f.setDate(f.getDate() + dias)
  return f.toISOString().slice(0, 10)
}

const fin = computed(() => sumarDias(inicio.value, TRAMO_DIAS))

interface Noche {
  iso: string
  dia: string
  letra: string
  finde: boolean
  esHoy: boolean
}

const noches = computed<Noche[]>(() =>
  Array.from({ length: TRAMO_DIAS }, (_, i) => {
    const iso = sumarDias(inicio.value, i)
    const f = new Date(`${iso}T12:00:00`)
    const dow = f.getDay()
    return {
      iso,
      dia: String(f.getDate()),
      letra: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][dow] ?? '',
      finde: dow === 0 || dow === 6,
      esHoy: iso === hoy,
    }
  }),
)

const mesVisible = computed(() => {
  const desde = new Date(`${inicio.value}T12:00:00`)
  const hasta = new Date(`${sumarDias(inicio.value, TRAMO_DIAS - 1)}T12:00:00`)
  const f = (d: Date) => d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
  const texto = f(desde) === f(hasta) ? f(desde) : `${f(desde)} — ${f(hasta)}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

// ── Lo que se pinta ──────────────────────────────────────────────────────────

/** Las reservas de cada habitación, ya recortadas al tramo visible. */
interface Tramo {
  reserva: ReservaResuelta
  desdeCol: number
  noches: number
  cortaIzquierda: boolean
  cortaDerecha: boolean
}

function indiceDe(iso: string) {
  const ms = new Date(`${iso}T12:00:00`).getTime() - new Date(`${inicio.value}T12:00:00`).getTime()
  return Math.round(ms / 86_400_000)
}

function tramosDe(habitacionId: string): Tramo[] {
  return reservas.value
    .filter((r) => r.habitacionId === habitacionId)
    .map((reserva) => {
      const i = indiceDe(reserva.entrada)
      const f = indiceDe(reserva.salida)
      const desdeCol = Math.max(0, i)
      const hastaCol = Math.min(TRAMO_DIAS, f)
      return {
        reserva,
        desdeCol,
        noches: hastaCol - desdeCol,
        cortaIzquierda: i < 0,
        cortaDerecha: f > TRAMO_DIAS,
      }
    })
    .filter((t) => t.noches > 0)
}

/** Sin habitación asignada: lo contratado por tipo que aún no tiene llave. */
const sinAsignar = computed(() => reservas.value.filter((r) => !r.habitacionId))

/** Ocupación por noche: la fila que de verdad se mira en el pie del rack. */
const ocupacionPorNoche = computed(() =>
  noches.value.map((n) => {
    const vendibles = habitaciones.value.filter((h) => h.limpieza !== 'fueraServicio').length
    const ocupadas = reservas.value.filter(
      (r) => r.habitacionId && r.entrada <= n.iso && r.salida > n.iso,
    ).length
    return { iso: n.iso, ocupadas, vendibles, pct: vendibles ? (ocupadas / vendibles) * 100 : 0 }
  }),
)

/** Las habitaciones se agrupan por planta, que es como se recorre un hotel. */
const porPiso = computed(() => {
  const grupos = new Map<string, { nombre: string; habitaciones: HabitacionResuelta[] }>()
  for (const h of habitaciones.value) {
    const id = h.piso?.id ?? 'sin-piso'
    const grupo = grupos.get(id) ?? { nombre: h.piso?.nombre ?? 'Sin planta', habitaciones: [] }
    grupo.habitaciones.push(h)
    grupos.set(id, grupo)
  }
  return [...grupos.values()]
})

const opcionesHabitacion = computed<OpcionSelect[]>(() =>
  habitaciones.value
    .filter((h) => h.limpieza !== 'fueraServicio')
    .map((h) => ({ valor: h.id, etiqueta: `${h.numero} · ${h.tipo?.nombre ?? ''}` })),
)

// ── Carga ────────────────────────────────────────────────────────────────────

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  iniciar()
  try {
    const datos = await reservasService.planning(localId, inicio.value, fin.value)
    habitaciones.value = datos.habitaciones
    reservas.value = datos.reservas
  } catch {
    ui.error('No se pudo cargar el planning.')
  } finally {
    terminar()
  }
}

onMounted(cargar)
watch([inicio, () => localStore.localId], cargar)

function mover(dias: number) {
  inicio.value = sumarDias(inicio.value, dias)
}

// ── Gesto 1: arrastrar una reserva a otra habitación ─────────────────────────

/** ¿Cabe esta reserva en esa habitación sin pisar a nadie? */
function cabeEn(habitacionId: string, reserva: ReservaResuelta) {
  const destino = habitaciones.value.find((h) => h.id === habitacionId)
  if (!destino || destino.limpieza === 'fueraServicio') return false
  return !reservas.value.some(
    (r) =>
      r.id !== reserva.id &&
      r.habitacionId === habitacionId &&
      r.entrada < reserva.salida &&
      r.salida > reserva.entrada,
  )
}

/**
 * Arrastrar y abrir la ficha son el mismo botón, así que el `click` que sigue
 * a un arrastre hay que descartarlo: soltar una reserva en otra habitación no
 * es pedir verla.
 */
const huboArrastre = ref(false)

function empezarArrastre(evento: PointerEvent, reserva: ReservaResuelta) {
  if (evento.button !== 0) return
  const yInicial = evento.clientY
  arrastre.value = { reservaId: reserva.id, sobre: null, vetada: false, dy: 0 }

  const alMover = (e: PointerEvent) => {
    const bajo = document.elementFromPoint(e.clientX, e.clientY)
    const fila = bajo?.closest<HTMLElement>('[data-habitacion]')
    const id = fila?.dataset.habitacion ?? null
    if (!arrastre.value) return
    arrastre.value.sobre = id
    arrastre.value.dy = e.clientY - yInicial
    if (Math.abs(arrastre.value.dy) > 4) huboArrastre.value = true
    arrastre.value.vetada = Boolean(id) && id !== reserva.habitacionId && !cabeEn(id!, reserva)
  }

  const alSoltar = async () => {
    window.removeEventListener('pointermove', alMover)
    window.removeEventListener('pointerup', alSoltar)
    const destino = arrastre.value?.sobre
    arrastre.value = null
    // El `click` llega justo después; se limpia cuando ya ha pasado.
    setTimeout(() => (huboArrastre.value = false), 0)
    if (!destino || destino === reserva.habitacionId) return
    await reasignar(reserva, destino)
  }

  window.addEventListener('pointermove', alMover)
  window.addEventListener('pointerup', alSoltar)
}

async function reasignar(reserva: ReservaResuelta, habitacionId: string) {
  try {
    await reservasService.reasignar(reserva.id, habitacionId)
    const numero = habitaciones.value.find((h) => h.id === habitacionId)?.numero
    ui.exito(`${reserva.codigo} pasa a la ${numero}.`)
    await cargar()
    if (seleccionada.value?.id === reserva.id) {
      seleccionada.value = reservas.value.find((r) => r.id === reserva.id) ?? null
    }
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar la habitación.')
  }
}

// ── Gesto 2: barrer noches vacías para vender ────────────────────────────────

const seleccion = ref<{ habitacionId: string; desde: number; hasta: number } | null>(null)

function empezarSeleccion(habitacionId: string, columna: number) {
  seleccion.value = { habitacionId, desde: columna, hasta: columna }

  const alMover = (e: PointerEvent) => {
    const bajo = document.elementFromPoint(e.clientX, e.clientY)
    const celda = bajo?.closest<HTMLElement>('[data-columna]')
    if (!celda || !seleccion.value) return
    if (celda.dataset.habitacion !== habitacionId) return
    seleccion.value.hasta = Number(celda.dataset.columna)
  }

  const alSoltar = () => {
    window.removeEventListener('pointermove', alMover)
    window.removeEventListener('pointerup', alSoltar)
    if (seleccion.value) abrirVenta(seleccion.value)
    seleccion.value = null
  }

  window.addEventListener('pointermove', alMover)
  window.addEventListener('pointerup', alSoltar)
}

function enSeleccion(habitacionId: string, columna: number) {
  const s = seleccion.value
  if (!s || s.habitacionId !== habitacionId) return false
  return columna >= Math.min(s.desde, s.hasta) && columna <= Math.max(s.desde, s.hasta)
}

/**
 * De momento el rack no crea la reserva: lleva los datos ya puestos a la
 * agenda, que es donde vive el formulario completo. Vender desde aquí sin
 * pedir huésped sería crear una reserva a medias.
 */
const venta = ref<{ habitacion: HabitacionResuelta; entrada: string; salida: string } | null>(null)

function abrirVenta(s: { habitacionId: string; desde: number; hasta: number }) {
  const habitacion = habitaciones.value.find((h) => h.id === s.habitacionId)
  if (!habitacion) return
  const desde = Math.min(s.desde, s.hasta)
  const hasta = Math.max(s.desde, s.hasta)
  venta.value = {
    habitacion,
    entrada: sumarDias(inicio.value, desde),
    salida: sumarDias(inicio.value, hasta + 1),
  }
}

function abrirReserva(reserva: ReservaResuelta) {
  if (huboArrastre.value) return
  seleccionada.value = reserva
  moviendoA.value = reserva.habitacionId ?? ''
  panelAbierto.value = true
}

async function moverDesdePanel() {
  if (!seleccionada.value || !moviendoA.value) return
  await reasignar(seleccionada.value, String(moviendoA.value))
}
</script>

<template>
  <div class="hs-operacion flex flex-col gap-4">
    <!-- El eje de tiempo es la navegación, no un filtro. -->
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <KmBotonIcono icono="anterior" etiqueta="Semana anterior" @click="mover(-7)" />
        <KmBotonIcono icono="siguiente" etiqueta="Semana siguiente" @click="mover(7)" />
        <KmButton variante="secundario" tamano="sm" @click="inicio = hoy">Hoy</KmButton>
        <p class="hs-titulo-seccion ml-2 text-tinta">{{ mesVisible }}</p>
      </div>

      <!-- La leyenda: el color nunca va solo, y aquí se dice qué significa. -->
      <ul class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <li class="flex items-center gap-1.5 text-[11px] font-semibold text-tenue">
          <span class="hs-barra hs-barra-pendiente inline-block h-3 w-6" aria-hidden="true" />
          ◷ Pendiente
        </li>
        <li class="flex items-center gap-1.5 text-[11px] font-semibold text-tenue">
          <span class="hs-barra hs-barra-confirmada inline-block h-3 w-6" aria-hidden="true" />
          ◆ Confirmada
        </li>
        <li class="flex items-center gap-1.5 text-[11px] font-semibold text-tenue">
          <span class="hs-barra hs-barra-encasa inline-block h-3 w-6" aria-hidden="true" />
          ● En casa
        </li>
      </ul>
    </header>

    <p v-if="cargando" class="py-16 text-center text-sm text-tenue">Cargando el planning…</p>

    <div
      v-else
      class="overflow-x-auto rounded-card border border-linea bg-panel"
      :class="{ 'hs-refrescando': refrescando }"
      :aria-busy="refrescando"
    >
      <div class="min-w-[54rem]">
        <!-- Cabecera de fechas -->
        <div
          class="sticky top-0 z-20 grid border-b border-linea bg-panel-2"
          :style="{ gridTemplateColumns: `${ANCHO_HABITACION}px repeat(${TRAMO_DIAS}, 1fr)` }"
        >
          <div class="hs-etiqueta flex items-end px-3 py-2 text-tenue">Habitación</div>
          <div
            v-for="n in noches"
            :key="n.iso"
            class="border-l border-linea px-1 py-2 text-center"
            :class="[n.finde ? 'hs-rack-finde' : '', n.esHoy ? 'hs-rack-hoy' : '']"
          >
            <p class="text-[10px] leading-none font-bold tracking-wider text-tenue uppercase">
              {{ n.letra }}
            </p>
            <p
              class="mt-1 text-sm leading-none font-semibold tabular-nums"
              :class="n.esHoy ? 'text-turquesa-texto' : 'text-tinta'"
            >
              {{ n.dia }}
            </p>
          </div>
        </div>

        <!-- Sin asignar: lo vendido por tipo que todavía no tiene llave. -->
        <section v-if="sinAsignar.length" class="border-b-2 border-linea">
          <p class="hs-etiqueta bg-panel-2 px-3 py-1.5 text-coral-texto">
            ⚠ Sin habitación asignada · {{ sinAsignar.length }}
          </p>
          <ul class="flex flex-wrap gap-2 px-3 py-2.5">
            <li v-for="r in sinAsignar" :key="r.id">
              <button
                type="button"
                class="flex items-center gap-2 rounded-control border border-linea bg-panel-2 px-2.5 py-1.5 text-left transition-colors hover:border-azul"
                @click="abrirReserva(r)"
              >
                <span class="font-mono text-[11px] font-semibold text-tinta">{{ r.codigo }}</span>
                <span class="text-xs text-tenue">
                  {{ r.tipo?.nombre }} · {{ r.entrada.slice(8, 10) }}/{{ r.entrada.slice(5, 7) }} →
                  {{ r.salida.slice(8, 10) }}/{{ r.salida.slice(5, 7) }}
                </span>
              </button>
            </li>
          </ul>
        </section>

        <!-- Una sección por planta: el hotel se recorre por pisos. -->
        <section v-for="piso in porPiso" :key="piso.nombre">
          <p class="hs-etiqueta border-b border-linea bg-panel-2 px-3 py-1.5 text-tenue">
            {{ piso.nombre }}
          </p>

          <div
            v-for="h in piso.habitaciones"
            :key="h.id"
            :data-habitacion="h.id"
            class="relative grid"
            :class="[
              arrastre?.sobre === h.id
                ? arrastre.vetada
                  ? 'hs-rack-destino-vetado'
                  : 'hs-rack-destino'
                : '',
            ]"
            :style="{ gridTemplateColumns: `${ANCHO_HABITACION}px repeat(${TRAMO_DIAS}, 1fr)` }"
          >
            <!-- Columna fija: el inventario -->
            <div
              class="hs-rack-celda flex items-center gap-2 px-3 py-2"
              :class="h.limpieza === 'fueraServicio' ? 'hs-rack-fuera' : ''"
            >
              <span class="hs-display text-sm leading-none font-semibold text-tinta">
                {{ h.numero }}
              </span>
              <span class="truncate text-[10px] leading-none text-tenue">
                {{ h.tipo?.codigo ?? h.tipo?.nombre }}
              </span>
              <span
                v-if="h.limpieza === 'fueraServicio'"
                class="ml-auto text-[10px] font-bold text-coral-texto"
                :title="h.nota"
              >
                ✕ FDS
              </span>
            </div>

            <!-- Las noches -->
            <div
              v-for="(n, i) in noches"
              :key="n.iso"
              :data-columna="i"
              :data-habitacion="h.id"
              class="hs-rack-celda h-[var(--km-celda,2.5rem)] cursor-cell"
              :class="[
                n.finde ? 'hs-rack-finde' : '',
                n.esHoy ? 'hs-rack-hoy' : '',
                h.limpieza === 'fueraServicio' ? 'hs-rack-fuera cursor-not-allowed' : '',
                enSeleccion(h.id, i) ? 'bg-seleccion' : '',
              ]"
              @pointerdown="h.limpieza !== 'fueraServicio' && empezarSeleccion(h.id, i)"
            />

            <!-- Las reservas, por encima de la rejilla -->
            <div
              class="pointer-events-none absolute inset-y-0 right-0"
              :style="{ left: `${ANCHO_HABITACION}px` }"
            >
              <div class="pointer-events-auto relative h-full">
                <BarraReserva
                  v-for="t in tramosDe(h.id)"
                  :key="t.reserva.id"
                  :reserva="t.reserva"
                  :desde-col="t.desdeCol"
                  :noches="t.noches"
                  :columnas="TRAMO_DIAS"
                  :corta-izquierda="t.cortaIzquierda"
                  :corta-derecha="t.cortaDerecha"
                  :arrastrando="arrastre?.reservaId === t.reserva.id"
                  :desplazada="arrastre?.reservaId === t.reserva.id ? arrastre.dy : 0"
                  @arrastrar="empezarArrastre($event, t.reserva)"
                  @abrir="abrirReserva(t.reserva)"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Pie: la ocupación por noche, que es el número del negocio. -->
        <div
          class="grid border-t-2 border-linea bg-panel-2"
          :style="{ gridTemplateColumns: `${ANCHO_HABITACION}px repeat(${TRAMO_DIAS}, 1fr)` }"
        >
          <div class="hs-etiqueta flex items-center px-3 py-2 text-tenue">Ocupación</div>
          <div
            v-for="o in ocupacionPorNoche"
            :key="o.iso"
            class="border-l border-linea px-1 py-2 text-center"
            :title="`${o.ocupadas} de ${o.vendibles} vendibles`"
          >
            <p
              class="text-xs leading-none font-semibold tabular-nums"
              :class="o.pct >= 90 ? 'text-coral-texto' : 'text-tinta'"
            >
              {{ Math.round(o.pct) }}%
            </p>
            <div class="mx-auto mt-1.5 h-1 w-8 overflow-hidden rounded-full bg-linea">
              <div
                class="h-full rounded-full"
                :class="o.pct >= 90 ? 'bg-coral' : 'bg-azul'"
                :style="{ width: `${Math.min(100, o.pct)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="text-xs text-tenue">
      Arrastra una reserva a otra fila para cambiarla de habitación, o barre noches libres para
      abrir una venta. Las dos cosas se pueden hacer también desde el panel de la reserva.
    </p>
  </div>

  <!-- Panel de la reserva -->
  <KmDrawer v-model="panelAbierto" :titulo="seleccionada?.codigo ?? 'Reserva'" ancho="md">
    <div v-if="seleccionada" class="flex flex-col gap-5">
      <header>
        <p class="hs-display text-xl leading-tight font-semibold text-tinta">
          {{ seleccionada.huesped?.nombres }} {{ seleccionada.huesped?.apellidos }}
        </p>
        <p class="mt-1 text-sm text-tenue">
          {{ seleccionada.noches }} noche{{ seleccionada.noches === 1 ? '' : 's' }} ·
          {{ seleccionada.adultos }} adulto{{ seleccionada.adultos === 1 ? '' : 's' }}
          <span v-if="seleccionada.ninos">· {{ seleccionada.ninos }} niño(s)</span>
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <KmBadge :tono="tonoReserva[seleccionada.estado]" punto>
            {{ etiquetaReserva[seleccionada.estado] }}
          </KmBadge>
          <KmBadge tono="neutro">{{ etiquetaCanal[seleccionada.canal] }}</KmBadge>
        </div>
      </header>

      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="hs-etiqueta text-tenue">Entrada</dt>
          <dd class="mt-1 font-semibold text-tinta tabular-nums">{{ seleccionada.entrada }}</dd>
        </div>
        <div>
          <dt class="hs-etiqueta text-tenue">Salida</dt>
          <dd class="mt-1 font-semibold text-tinta tabular-nums">{{ seleccionada.salida }}</dd>
        </div>
        <div>
          <dt class="hs-etiqueta text-tenue">Tipo contratado</dt>
          <dd class="mt-1 text-tinta">{{ seleccionada.tipo?.nombre ?? '—' }}</dd>
        </div>
        <div>
          <dt class="hs-etiqueta text-tenue">Tarifa / noche</dt>
          <dd class="mt-1 font-semibold text-tinta tabular-nums">
            {{ formatearSoles(seleccionada.tarifaNoche) }}
          </dd>
        </div>
      </dl>

      <!-- El mismo cambio de habitación, sin arrastrar. -->
      <div class="rounded-card border border-linea bg-panel-2 p-4">
        <p class="hs-etiqueta text-tenue">Habitación</p>
        <p class="mt-1 mb-3 text-sm text-tinta">
          {{
            seleccionada.habitacion
              ? `${seleccionada.habitacion.numero} · ${etiquetaLimpieza[seleccionada.habitacion.limpieza]}`
              : 'Sin asignar todavía'
          }}
        </p>
        <div class="flex items-end gap-2">
          <KmSelect
            v-model="moviendoA"
            :opciones="opcionesHabitacion"
            etiqueta="Mover a"
            placeholder="Elige habitación"
            class="flex-1"
          />
          <KmButton
            variante="secundario"
            :disabled="!moviendoA || moviendoA === seleccionada.habitacionId"
            @click="moverDesdePanel"
          >
            Mover
          </KmButton>
        </div>
      </div>

      <p v-if="seleccionada.notas" class="text-sm text-tenue">{{ seleccionada.notas }}</p>
    </div>
  </KmDrawer>

  <!-- Venta desde el rack -->
  <KmDrawer
    :model-value="Boolean(venta)"
    titulo="Vender estas noches"
    ancho="sm"
    @update:model-value="venta = null"
  >
    <div v-if="venta" class="flex flex-col gap-4">
      <p class="text-sm text-tenue">
        Has marcado unas noches libres. Para cerrar la venta falta el huésped, que se pide en la
        agenda de reservas.
      </p>
      <dl class="rounded-card border border-linea bg-panel-2 p-4 text-sm">
        <div class="flex justify-between py-1">
          <dt class="text-tenue">Habitación</dt>
          <dd class="font-semibold text-tinta">
            {{ venta.habitacion.numero }} · {{ venta.habitacion.tipo?.nombre }}
          </dd>
        </div>
        <div class="flex justify-between py-1">
          <dt class="text-tenue">Entrada</dt>
          <dd class="font-semibold text-tinta tabular-nums">{{ venta.entrada }}</dd>
        </div>
        <div class="flex justify-between py-1">
          <dt class="text-tenue">Salida</dt>
          <dd class="font-semibold text-tinta tabular-nums">{{ venta.salida }}</dd>
        </div>
        <div class="flex justify-between py-1">
          <dt class="text-tenue">Tarifa base</dt>
          <dd class="font-semibold text-tinta tabular-nums">
            {{ formatearSoles(venta.habitacion.tipo?.tarifaBase ?? 0) }}
          </dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <KmButton variante="fantasma" @click="venta = null">Cerrar</KmButton>
      <KmButton
        @click="
          $router.push({
            name: 'reservas',
            query: {
              habitacion: venta?.habitacion.id,
              entrada: venta?.entrada,
              salida: venta?.salida,
            },
          })
        "
      >
        Continuar en reservas
      </KmButton>
    </template>
  </KmDrawer>
</template>
