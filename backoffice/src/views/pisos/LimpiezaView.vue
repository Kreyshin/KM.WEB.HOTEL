<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import HsIcono from '@/components/hotel/HsIcono.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { habitacionesService } from '@/services/habitaciones.service'
import { limpiezaService } from '@/services/limpieza.service'
import { usuariosService } from '@/services/usuarios.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  EstadoTarea,
  HabitacionResuelta,
  Prioridad,
  TareaResuelta,
  TipoTarea,
  Usuario,
} from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { desdeHace } from '@/utils/formato'
import {
  estadosTarea,
  etiquetaLimpieza,
  etiquetaPrioridad,
  etiquetaTarea,
  etiquetaTipoTarea,
  minutosPorTipo,
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
 *
 * Tres cosas se hacen desde aquí y no desde otro sitio: **abrir** el trabajo
 * del turno, **repartirlo** entre las camareras y **moverlo** de fase. Por eso
 * cada tarjeta se puede arrastrar a otra columna, pero también avanza y
 * retrocede con botón y con las flechas del teclado: ningún gesto puede ser
 * solo de arrastre, y quien limpia lleva guantes.
 */

const localStore = useLocalStore()
const ui = useUiStore()

const tareas = ref<TareaResuelta[]>([])
const camareras = ref<Usuario[]>([])
const habitaciones = ref<HabitacionResuelta[]>([])
const { cargando, refrescando, iniciar, terminar } = useCarga()

/** Tareas que se están moviendo ahora mismo: el ocupado es de la tarjeta, no del tablero. */
const ocupadas = ref(new Set<string>())

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  iniciar()
  try {
    ;[tareas.value, camareras.value, habitaciones.value] = await Promise.all([
      limpiezaService.tablero(localId),
      usuariosService.personalDePisos(),
      habitacionesService.listarPorLocal(localId),
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

/** Sustituye una tarea por la que devuelve el servicio, sin recargar el tablero. */
function sustituir(t: TareaResuelta) {
  const i = tareas.value.findIndex((x) => x.id === t.id)
  if (i >= 0) tareas.value[i] = t
  else tareas.value.push(t)
}

const peso = { urgente: 0, alta: 1, normal: 2 } as const

const columnas = computed(() =>
  estadosTarea.map((estado) => ({
    estado,
    tareas: tareas.value
      .filter((t) => t.estado === estado)
      .sort((a, b) => peso[a.prioridad] - peso[b.prioridad] || a.creada.localeCompare(b.creada)),
  })),
)

/*
 * La carga se calcula aquí, con las tareas que ya están en pantalla. Pedirla
 * al servidor después de cada movimiento hacía que las barras llegaran tarde
 * y con un parpadeo; ahora se mueven en el mismo gesto que la tarjeta.
 */
const carga = computed(() =>
  camareras.value.map((usuario) => {
    const suyas = tareas.value.filter(
      (t) => t.asignadaAId === usuario.id && t.estado !== 'terminada',
    )
    return {
      usuario,
      tareas: suyas.length,
      minutos: suyas.reduce((total, t) => total + t.minutosEstimados, 0),
    }
  }),
)

const sinAsignar = computed(
  () => tareas.value.filter((t) => !t.asignadaAId && t.estado !== 'terminada').length,
)

const opcionesCamarera = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Sin asignar' },
  ...camareras.value.map((u) => ({ valor: u.id, etiqueta: u.nombre })),
])

const opcionesTipo: OpcionSelect[] = (Object.keys(etiquetaTipoTarea) as TipoTarea[]).map((t) => ({
  valor: t,
  etiqueta: `${etiquetaTipoTarea[t]} · ${minutosPorTipo[t]} min`,
}))

const opcionesPrioridad: OpcionSelect[] = (Object.keys(etiquetaPrioridad) as Prioridad[]).map(
  (p) => ({ valor: p, etiqueta: etiquetaPrioridad[p] }),
)

/** Habitaciones que admiten tarea: las que no tienen una abierta ya. */
const opcionesHabitacion = computed<OpcionSelect[]>(() =>
  habitaciones.value
    .filter((h) => !tareas.value.some((t) => t.habitacionId === h.id && t.estado !== 'terminada'))
    .map((h) => ({
      valor: h.id,
      etiqueta: `${h.numero} · ${h.tipo?.nombre ?? ''} · ${etiquetaLimpieza[h.limpieza]}`,
    })),
)

// ── Mover de fase ──────────────────────────────────────────────────────────

const orden = estadosTarea
const siguienteDe = (e: EstadoTarea) => orden[orden.indexOf(e) + 1]
const anteriorDe = (e: EstadoTarea) => orden[orden.indexOf(e) - 1]

async function mover(t: TareaResuelta, destino?: EstadoTarea) {
  if (!destino || destino === t.estado || ocupadas.value.has(t.id)) return
  ocupadas.value.add(t.id)
  try {
    const nueva = await limpiezaService.cambiarEstado(t.id, destino)
    sustituir(nueva)
    ui.exito(`Habitación ${nueva.habitacion?.numero}: ${etiquetaTarea[destino].toLowerCase()}.`)
  } catch {
    ui.error('No se pudo mover la tarea.')
  } finally {
    ocupadas.value.delete(t.id)
  }
}

async function asignar(t: TareaResuelta, usuarioId: string | number | undefined) {
  try {
    sustituir(await limpiezaService.asignar(t.id, (usuarioId as string) || undefined))
  } catch {
    ui.error('No se pudo asignar la tarea.')
  }
}

// ── Arrastrar entre columnas ───────────────────────────────────────────────

const arrastrando = ref<string>()
const columnaSobre = ref<EstadoTarea>()

function empezarArrastre(e: DragEvent, t: TareaResuelta) {
  arrastrando.value = t.id
  e.dataTransfer?.setData('text/plain', t.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function soltar(estado: EstadoTarea) {
  const t = tareas.value.find((x) => x.id === arrastrando.value)
  arrastrando.value = undefined
  columnaSobre.value = undefined
  if (t) mover(t, estado)
}

/** Flechas ← → sobre la tarjeta: lo mismo que arrastrarla, sin ratón. */
function alTeclado(e: KeyboardEvent, t: TareaResuelta) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    mover(t, siguienteDe(t.estado))
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    mover(t, anteriorDe(t.estado))
  }
}

// ── Abrir trabajo ──────────────────────────────────────────────────────────

const porGenerar = computed(
  () =>
    habitaciones.value.filter(
      (h) =>
        h.limpieza === 'sucia' &&
        !tareas.value.some((t) => t.habitacionId === h.id && t.estado !== 'terminada'),
    ).length,
)

const confirmandoTurno = ref(false)
const generando = ref(false)

async function generarTurno() {
  const localId = localStore.localId
  if (!localId) return
  generando.value = true
  try {
    const nuevas = await limpiezaService.generarDelTurno(localId)
    nuevas.forEach(sustituir)
    confirmandoTurno.value = false
    ui.exito(
      nuevas.length === 1
        ? 'Una tarea abierta. Queda repartirla.'
        : `${nuevas.length} tareas abiertas. Quedan por repartir.`,
    )
  } catch {
    ui.error('No se pudieron abrir las tareas del turno.')
  } finally {
    generando.value = false
  }
}

// ── Alta y edición de una tarea ────────────────────────────────────────────

const panel = ref(false)
const editandoId = ref<string>()
const guardando = ref(false)
const errores = reactive<Record<string, string>>({})

const borrador = reactive({
  habitacionId: '',
  tipo: 'salida' as TipoTarea,
  prioridad: 'normal' as Prioridad,
  minutosEstimados: minutosPorTipo.salida,
  asignadaAId: '' as string,
  notas: '',
})

function limpiarErrores() {
  for (const k of Object.keys(errores)) delete errores[k]
}

function abrirNueva() {
  editandoId.value = undefined
  limpiarErrores()
  Object.assign(borrador, {
    habitacionId: '',
    tipo: 'salida' as TipoTarea,
    prioridad: 'normal' as Prioridad,
    minutosEstimados: minutosPorTipo.salida,
    asignadaAId: '',
    notas: '',
  })
  panel.value = true
}

function abrirEdicion(t: TareaResuelta) {
  editandoId.value = t.id
  limpiarErrores()
  Object.assign(borrador, {
    habitacionId: t.habitacionId,
    tipo: t.tipo,
    prioridad: t.prioridad,
    minutosEstimados: t.minutosEstimados,
    asignadaAId: t.asignadaAId ?? '',
    notas: t.notas ?? '',
  })
  panel.value = true
}

/* Cambiar el tipo reestima los minutos, salvo que ya se hayan tocado a mano. */
watch(
  () => borrador.tipo,
  (tipo, antes) => {
    if (antes && borrador.minutosEstimados === minutosPorTipo[antes]) {
      borrador.minutosEstimados = minutosPorTipo[tipo]
    }
  },
)

async function guardar() {
  limpiarErrores()
  guardando.value = true
  try {
    if (editandoId.value) {
      const id = editandoId.value
      const editada = await limpiezaService.editar(id, {
        tipo: borrador.tipo,
        prioridad: borrador.prioridad,
        minutosEstimados: borrador.minutosEstimados,
        notas: borrador.notas || undefined,
      })
      sustituir(await limpiezaService.asignar(id, borrador.asignadaAId || undefined))
      panel.value = false
      ui.exito(`Habitación ${editada.habitacion?.numero}: tarea actualizada.`)
    } else {
      const creada = await limpiezaService.crear({
        habitacionId: borrador.habitacionId,
        tipo: borrador.tipo,
        estado: 'pendiente',
        prioridad: borrador.prioridad,
        minutosEstimados: borrador.minutosEstimados,
        asignadaAId: borrador.asignadaAId || undefined,
        notas: borrador.notas || undefined,
      })
      sustituir(creada)
      panel.value = false
      ui.exito(`Tarea abierta para la habitación ${creada.habitacion?.numero}.`)
    }
  } catch (e) {
    const error = e as { mensaje?: string; campos?: Record<string, string> }
    Object.assign(errores, error.campos ?? {})
    ui.error(error.mensaje ?? 'No se pudo guardar la tarea.')
  } finally {
    guardando.value = false
  }
}

const cancelando = ref<TareaResuelta>()

async function cancelar() {
  const t = cancelando.value
  if (!t) return
  try {
    await limpiezaService.eliminar(t.id)
    tareas.value = tareas.value.filter((x) => x.id !== t.id)
    cancelando.value = undefined
    panel.value = false
    ui.exito(`Tarea de la habitación ${t.habitacion?.numero} cancelada.`)
  } catch {
    ui.error('No se pudo cancelar la tarea.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <!-- Abrir el trabajo del día: el primer gesto de la mañana, antes de repartir. -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-tenue">
        <template v-if="porGenerar > 0">
          {{ porGenerar }}
          {{ porGenerar === 1 ? 'habitación sucia sin tarea' : 'habitaciones sucias sin tarea' }}.
        </template>
        <template v-else-if="sinAsignar > 0">
          {{ sinAsignar }} {{ sinAsignar === 1 ? 'tarea' : 'tareas' }} sin camarera.
        </template>
        <template v-else>Todo el trabajo del turno está abierto y repartido.</template>
        <span class="text-tenue">
          · Arrastra una tarjeta a otra columna, o muévela con ← y →.
        </span>
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <KmButton v-if="porGenerar > 0" variante="secundario" @click="confirmandoTurno = true">
          <HsIcono nombre="limpieza" class="size-4" />
          Abrir el turno ({{ porGenerar }})
        </KmButton>
        <KmButton @click="abrirNueva">Nueva tarea</KmButton>
      </div>
    </div>

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
        class="flex flex-col gap-3 rounded-card border p-3 transition-colors"
        :class="
          columnaSobre === col.estado ? 'border-azul bg-seleccion' : 'border-linea bg-panel-2'
        "
        @dragover.prevent="columnaSobre = col.estado"
        @dragleave="columnaSobre === col.estado && (columnaSobre = undefined)"
        @drop.prevent="soltar(col.estado)"
      >
        <header class="flex items-center justify-between px-1">
          <h2 class="hs-etiqueta text-tenue">{{ etiquetaTarea[col.estado] }}</h2>
          <span class="hs-display text-sm font-semibold text-tinta tabular-nums">
            {{ col.tareas.length }}
          </span>
        </header>

        <p v-if="col.tareas.length === 0" class="px-1 py-6 text-center text-xs text-tenue">
          {{ columnaSobre === col.estado ? 'Suelta aquí.' : 'Nada aquí.' }}
        </p>

        <article
          v-for="t in col.tareas"
          :key="t.id"
          class="hs-tarea flex flex-col gap-2.5 rounded-control border border-linea bg-panel p-3.5"
          :class="{ 'es-arrastrando': arrastrando === t.id, 'es-ocupada': ocupadas.has(t.id) }"
          draggable="true"
          tabindex="0"
          :aria-label="`Habitación ${t.habitacion?.numero}, ${etiquetaTipoTarea[t.tipo]}, ${etiquetaTarea[t.estado]}. Flechas izquierda y derecha para moverla de fase.`"
          @dragstart="empezarArrastre($event, t)"
          @dragend="arrastrando = undefined"
          @keydown="alTeclado($event, t)"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="hs-display text-lg leading-none font-semibold text-tinta">
                {{ t.habitacion?.numero }}
              </p>
              <p class="mt-1 text-xs text-tenue">{{ etiquetaTipoTarea[t.tipo] }}</p>
            </div>
            <div class="flex items-center gap-1.5">
              <KmBadge v-if="t.prioridad !== 'normal'" :tono="tonoPrioridad[t.prioridad]" punto>
                {{ etiquetaPrioridad[t.prioridad] }}
              </KmBadge>
              <span
                class="cursor-grab text-tenue"
                title="Arrástrala a otra columna, o muévela con ← y →"
              >
                <HsIcono nombre="arrastrar" class="size-4 shrink-0" aria-hidden="true" />
              </span>
            </div>
          </div>

          <p v-if="t.notas" class="text-xs text-tenue">{{ t.notas }}</p>

          <KmSelect
            :model-value="t.asignadaAId ?? ''"
            :opciones="opcionesCamarera"
            etiqueta="Asignar tarea"
            @update:model-value="(v) => asignar(t, v)"
          />

          <div class="flex items-center justify-between gap-2">
            <button
              type="button"
              class="text-[11px] text-tenue tabular-nums underline-offset-2 hover:text-tinta hover:underline"
              @click="abrirEdicion(t)"
            >
              {{ t.minutosEstimados }} min · {{ desdeHace(t.creada) }}
            </button>

            <div class="flex items-center gap-1.5">
              <button
                v-if="anteriorDe(t.estado)"
                type="button"
                class="hs-paso"
                :disabled="ocupadas.has(t.id)"
                :title="`Devolver a ${etiquetaTarea[anteriorDe(t.estado)].toLowerCase()}`"
                :aria-label="`Devolver a ${etiquetaTarea[anteriorDe(t.estado)].toLowerCase()}`"
                @click="mover(t, anteriorDe(t.estado))"
              >
                ←
              </button>
              <button
                v-if="siguienteDe(t.estado)"
                type="button"
                class="hs-paso es-principal"
                :disabled="ocupadas.has(t.id)"
                @click="mover(t, siguienteDe(t.estado))"
              >
                {{ t.estado === 'revisar' ? 'Aprobar' : 'Avanzar' }}
              </button>
              <KmBadge v-else :tono="tonoTarea.terminada">Entregada</KmBadge>
            </div>
          </div>
        </article>
      </section>
    </div>

    <!-- ── Alta y edición ──────────────────────────────────────────────── -->
    <KmDrawer
      v-model="panel"
      :titulo="editandoId ? 'Tarea de limpieza' : 'Nueva tarea'"
      :subtitulo="
        editandoId
          ? 'La habitación no cambia: si es otra, es otra tarea.'
          : 'Para lo que no nace solo: un recado, un repaso, una profunda.'
      "
    >
      <div class="flex flex-col gap-4 px-6 py-5">
        <KmField
          v-if="!editandoId"
          v-slot="{ id, invalido }"
          label="Habitación"
          requerido
          :error="errores.habitacionId"
          ayuda="Solo aparecen las que no tienen ya una tarea abierta."
        >
          <KmSelect
            :id="id"
            v-model="borrador.habitacionId"
            :opciones="opcionesHabitacion"
            :invalido="invalido"
            placeholder="Elige una habitación"
          />
        </KmField>

        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Tipo de trabajo">
            <KmSelect :id="id" v-model="borrador.tipo" :opciones="opcionesTipo" />
          </KmField>
          <KmField v-slot="{ id }" label="Prioridad">
            <KmSelect :id="id" v-model="borrador.prioridad" :opciones="opcionesPrioridad" />
          </KmField>
          <KmField
            v-slot="{ id }"
            label="Minutos estimados"
            ayuda="Es lo que suma en la carga del turno."
          >
            <KmNumero
              :id="id"
              v-model="borrador.minutosEstimados"
              :min="5"
              :max="240"
              :step="5"
              sufijo="min"
            />
          </KmField>
          <KmField v-slot="{ id }" label="Camarera">
            <KmSelect :id="id" v-model="borrador.asignadaAId" :opciones="opcionesCamarera" />
          </KmField>
        </div>

        <KmField
          v-slot="{ id }"
          label="Recado"
          ayuda="Lo que la camarera necesita saber antes de subir."
        >
          <KmInput :id="id" v-model="borrador.notas" placeholder="Entra huésped a las 15:00." />
        </KmField>
      </div>

      <template #footer>
        <div class="flex w-full items-center gap-2">
          <KmButton
            v-if="editandoId"
            variante="peligro"
            @click="cancelando = tareas.find((t) => t.id === editandoId)"
          >
            Cancelar tarea
          </KmButton>
          <span class="flex-1"></span>
          <KmButton variante="secundario" @click="panel = false">Cerrar</KmButton>
          <KmButton :cargando="guardando" @click="guardar">
            {{ editandoId ? 'Guardar' : 'Abrir tarea' }}
          </KmButton>
        </div>
      </template>
    </KmDrawer>

    <KmConfirm
      :model-value="!!cancelando"
      titulo="Cancelar la tarea"
      :mensaje="`La habitación ${cancelando?.habitacion?.numero} se queda como está y desaparece del tablero. Si hay que limpiarla, habrá que abrirla otra vez.`"
      texto-confirmar="Cancelar tarea"
      peligroso
      @update:model-value="cancelando = undefined"
      @confirmar="cancelar"
    />

    <KmConfirm
      v-model="confirmandoTurno"
      titulo="Abrir el turno"
      :mensaje="`Se abrirán ${porGenerar} tareas, una por cada habitación sucia sin trabajo asignado. Las ocupadas se abren como limpieza en estancia y las libres como salida.`"
      texto-confirmar="Abrir tareas"
      :cargando="generando"
      @confirmar="generarTurno"
    />
  </div>
</template>

<style scoped>
/* La tarjeta se levanta al cogerla, para que se vea de dónde salió. */
.hs-tarea {
  transition:
    opacity var(--km-mov-normal) var(--km-curva),
    box-shadow var(--km-mov-normal) var(--km-curva),
    transform var(--km-mov-normal) var(--km-curva);
}
.hs-tarea:focus-visible {
  outline: 2px solid var(--hs-azul, currentColor);
  outline-offset: 2px;
}
.hs-tarea.es-arrastrando {
  opacity: 0.45;
  transform: scale(0.98);
}
.hs-tarea.es-ocupada {
  opacity: 0.6;
}

.hs-paso {
  border: 1px solid var(--km-linea, currentColor);
  border-radius: var(--km-radio-control, 0.5rem);
  padding: 0.25rem 0.625rem;
  font-size: 11px;
  font-weight: 600;
  color: var(--hs-tenue, currentColor);
  transition:
    color var(--km-mov-rapido) var(--km-curva),
    border-color var(--km-mov-rapido) var(--km-curva);
}
.hs-paso.es-principal {
  color: var(--hs-azul, currentColor);
}
.hs-paso:hover:not(:disabled) {
  border-color: currentColor;
}
.hs-paso:disabled {
  opacity: 0.5;
  cursor: progress;
}
</style>
