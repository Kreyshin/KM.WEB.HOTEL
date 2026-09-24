<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCarga } from '@/composables/useCarga'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmModal from '@/components/ui/KmModal.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { habitacionesService } from '@/services/habitaciones.service'
import { reservasService } from '@/services/reservas.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { HabitacionResuelta, ReservaResuelta } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaCanal, etiquetaRegimen, fechaLarga, formatearSoles } from '@/utils/formato'
import { etiquetaReserva, tonoReserva } from '@/utils/habitaciones'

/**
 * El mostrador: lo que recepción hace hoy y solo hoy.
 *
 * El check-in pide elegir habitación porque la reserva se vendió por TIPO. Solo
 * se ofrecen las que están limpias y libres: entregar una llave de una
 * habitación sucia es el fallo de servicio más caro del oficio.
 */

const localStore = useLocalStore()
const ui = useUiStore()

const llegadas = ref<ReservaResuelta[]>([])
const salidas = ref<ReservaResuelta[]>([])
const enCasa = ref<ReservaResuelta[]>([])
const { cargando, iniciar, terminar } = useCarga()

const reservaEnCurso = ref<ReservaResuelta | null>(null)
const modalCheckIn = ref(false)
const disponibles = ref<HabitacionResuelta[]>([])
const habitacionElegida = ref<string | number | undefined>('')
const guardando = ref(false)

const hoy = new Date().toISOString().slice(0, 10)

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  iniciar()
  try {
    ;[llegadas.value, salidas.value, enCasa.value] = await Promise.all([
      reservasService.llegadas(localId, hoy),
      reservasService.salidas(localId, hoy),
      reservasService.enCasa(localId),
    ])
  } catch {
    ui.error('No se pudo cargar la recepción del día.')
  } finally {
    terminar()
  }
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  cargar()
})
watch(() => localStore.localId, cargar)

async function abrirCheckIn(reserva: ReservaResuelta) {
  reservaEnCurso.value = reserva
  modalCheckIn.value = true
  habitacionElegida.value = reserva.habitacionId ?? ''
  const localId = localStore.localId
  if (!localId) return
  disponibles.value = await habitacionesService.disponibles(
    localId,
    reserva.tipoId,
    reserva.entrada,
    reserva.salida,
  )
}

const opcionesHabitacion = computed<OpcionSelect[]>(() =>
  disponibles.value
    .filter((h) => h.limpieza === 'limpia' && h.ocupacion !== 'ocupada')
    .map((h) => ({
      valor: h.id,
      etiqueta: `${h.numero} · ${h.piso?.nombre ?? ''}${h.vista ? ` · ${h.vista}` : ''}`,
    })),
)

async function confirmarCheckIn() {
  if (!reservaEnCurso.value || !habitacionElegida.value) return
  guardando.value = true
  try {
    await reservasService.checkIn(reservaEnCurso.value.id, habitacionElegida.value as string)
    ui.exito(`Check-in hecho. Habitación entregada.`)
    modalCheckIn.value = false
    await cargar()
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo hacer el check-in.')
  } finally {
    guardando.value = false
  }
}

async function hacerCheckOut(reserva: ReservaResuelta) {
  try {
    await reservasService.checkOut(reserva.id)
    ui.exito('Check-out hecho. La tarea de limpieza ya está en housekeeping.')
    await cargar()
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo cerrar la estancia.')
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <p class="text-sm text-tenue first-letter:uppercase">
      {{ fechaLarga(hoy) }} · entrada desde las {{ localStore.local?.horaCheckIn }}, salida hasta
      las {{ localStore.local?.horaCheckOut }}
    </p>

    <div class="grid gap-6 xl:grid-cols-2">
      <KmCard titulo="Llegadas de hoy" :subtitulo="`${llegadas.length} por registrar`" sin-padding>
        <ul class="flex flex-col divide-y divide-linea">
          <li v-if="!cargando && llegadas.length === 0" class="px-6 py-10 text-sm text-tenue">
            No quedan llegadas por registrar.
          </li>
          <li v-for="r in llegadas" :key="r.id" class="flex flex-wrap items-center gap-4 px-6 py-4">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-tinta">
                {{ r.huesped?.nombres }} {{ r.huesped?.apellidos }}
              </p>
              <p class="mt-0.5 text-xs text-tenue">
                {{ r.codigo }} · {{ r.tipo?.nombre }} · {{ r.noches }} noches ·
                {{ etiquetaCanal[r.canal] }} · {{ etiquetaRegimen[r.regimen] }}
              </p>
              <p v-if="r.notas" class="mt-1 text-xs text-turquesa-texto">{{ r.notas }}</p>
            </div>
            <KmBadge :tono="tonoReserva[r.estado]">{{ etiquetaReserva[r.estado] }}</KmBadge>
            <KmButton tamano="sm" @click="abrirCheckIn(r)">Check-in</KmButton>
          </li>
        </ul>
      </KmCard>

      <KmCard titulo="Salidas de hoy" :subtitulo="`${salidas.length} por cerrar`" sin-padding>
        <ul class="flex flex-col divide-y divide-linea">
          <li v-if="!cargando && salidas.length === 0" class="px-6 py-10 text-sm text-tenue">
            No hay salidas pendientes.
          </li>
          <li v-for="r in salidas" :key="r.id" class="flex flex-wrap items-center gap-4 px-6 py-4">
            <span
              class="hs-display grid size-11 shrink-0 place-items-center rounded-full border border-linea bg-panel-2 text-sm font-semibold text-tinta"
            >
              {{ r.habitacion?.numero }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-tinta">
                {{ r.huesped?.nombres }} {{ r.huesped?.apellidos }}
              </p>
              <p class="mt-0.5 text-xs text-tenue">
                {{ r.codigo }} · {{ r.noches }} noches ·
                {{ formatearSoles(r.tarifaNoche * r.noches) }}
              </p>
            </div>
            <KmButton variante="secundario" tamano="sm" @click="hacerCheckOut(r)">
              Check-out
            </KmButton>
          </li>
        </ul>
      </KmCard>
    </div>

    <KmCard
      titulo="En casa"
      :subtitulo="`${enCasa.length} estancias vivas ahora mismo`"
      sin-padding
    >
      <ul class="grid gap-px bg-linea sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="r in enCasa" :key="r.id" class="flex items-center gap-3 bg-panel px-5 py-4">
          <span
            class="hs-display grid size-10 shrink-0 place-items-center rounded-full border border-linea bg-panel-2 text-xs font-semibold text-tinta"
          >
            {{ r.habitacion?.numero ?? '—' }}
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-tinta">
              {{ r.huesped?.nombres }} {{ r.huesped?.apellidos }}
            </p>
            <p class="truncate text-xs text-tenue">
              Sale el {{ r.salida.slice(8, 10) }} · {{ r.codigo }}
            </p>
          </div>
        </li>
      </ul>
    </KmCard>

    <!-- Check-in: elegir la habitación concreta para una reserva vendida por tipo. -->
    <KmModal v-model="modalCheckIn" :titulo="`Check-in · ${reservaEnCurso?.codigo ?? ''}`">
      <div v-if="reservaEnCurso" class="flex flex-col gap-4">
        <div>
          <p class="text-sm font-semibold text-tinta">
            {{ reservaEnCurso.huesped?.nombres }} {{ reservaEnCurso.huesped?.apellidos }}
          </p>
          <p class="mt-1 text-xs text-tenue">
            {{ reservaEnCurso.tipo?.nombre }} · {{ reservaEnCurso.noches }} noches ·
            {{ formatearSoles(reservaEnCurso.tarifaNoche) }} por noche
          </p>
          <p v-if="reservaEnCurso.huesped?.preferencias" class="mt-2 text-xs text-turquesa-texto">
            {{ reservaEnCurso.huesped.preferencias }}
          </p>
        </div>

        <KmSelect
          v-model="habitacionElegida"
          :opciones="opcionesHabitacion"
          etiqueta="Habitación a entregar"
          placeholder="Elige una habitación limpia"
        />

        <p
          v-if="opcionesHabitacion.length === 0"
          class="hs-tono hs-tono-coral rounded-control border px-3 py-2 text-sm"
        >
          No hay ninguna habitación de este tipo limpia y libre. Pide el repaso a housekeeping o
          reubica al huésped en otro tipo.
        </p>
      </div>

      <template #footer>
        <KmButton variante="secundario" @click="modalCheckIn = false">Cancelar</KmButton>
        <KmButton :disabled="!habitacionElegida" :cargando="guardando" @click="confirmarCheckIn">
          Entregar habitación
        </KmButton>
      </template>
    </KmModal>
  </div>
</template>
