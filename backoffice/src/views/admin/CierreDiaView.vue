<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import HsCifra from '@/components/hotel/HsCifra.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmConfirm from '@/components/ui/KmConfirm.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { useCarga } from '@/composables/useCarga'
import { cierreService } from '@/services/cierre.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { CierreDia } from '@/types'
import type { ColumnaTabla } from '@/types/ui'
import { fechaCorta, fechaLarga, formatearSoles } from '@/utils/formato'

/**
 * Cierre de día · night audit.
 *
 * La pantalla es una revisión antes de un acto irreversible, así que está
 * ordenada como tal: primero qué falta, después qué va a pasar, y solo al
 * final el botón. Cerrar carga la noche a cada folio, marca los que no
 * llegaron y congela las cifras del día; después de eso, ese día ya no se
 * toca.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()

const revision = ref<Awaited<ReturnType<typeof cierreService.revision>>>()
const historico = ref<CierreDia[]>([])
const ultimo = ref<CierreDia>()
const confirmando = ref(false)
const cerrando = ref(false)
const { cargando, iniciar, terminar } = useCarga()

const columnas: ColumnaTabla[] = [
  { clave: 'fecha', etiqueta: 'Día', clase: 'w-36' },
  { clave: 'ocupacion', etiqueta: 'Ocupación', clase: 'w-40' },
  { clave: 'adr', etiqueta: 'ADR', clase: 'w-32 text-right' },
  { clave: 'revpar', etiqueta: 'RevPAR', clase: 'w-32 text-right' },
  { clave: 'produccion', etiqueta: 'Producción', clase: 'w-44 text-right' },
  { clave: 'noShows', etiqueta: 'No-show', clase: 'w-28 text-right' },
]

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  iniciar()
  try {
    ;[revision.value, historico.value] = await Promise.all([
      cierreService.revision(localId),
      cierreService.historico(localId),
    ])
  } catch {
    ui.error('No se pudo preparar el cierre.')
  } finally {
    terminar()
  }
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  await cargar()
})
watch(() => localStore.localId, cargar)

/** Lo que impide cerrar. Vacío: se puede. */
const bloqueos = computed(() => {
  const r = revision.value
  if (!r) return []
  const lista: string[] = []
  if (r.esFutura) lista.push('El día todavía no ha pasado.')
  if (r.yaCerrado) lista.push('Este día ya está cerrado.')
  if (r.salidasSinCheckOut.length) {
    lista.push(
      `${r.salidasSinCheckOut.length} estancia${r.salidasSinCheckOut.length === 1 ? '' : 's'} con la salida vencida y sin registrar.`,
    )
  }
  return lista
})

const mensajeConfirmar = computed(() => {
  const r = revision.value
  if (!r) return ''
  const partes = [`Se cargará la noche a ${r.enCasa} folio${r.enCasa === 1 ? '' : 's'}`]
  if (r.llegadasSinCheckIn.length) {
    partes.push(
      `se marcarán ${r.llegadasSinCheckIn.length} no-show${r.llegadasSinCheckIn.length === 1 ? '' : 's'}`,
    )
  }
  partes.push('y el día quedará cerrado para siempre')
  return `${partes.join(', ')}. La fecha del sistema pasará al día siguiente.`
})

async function cerrar() {
  const localId = localStore.localId
  if (!localId) return
  cerrando.value = true
  try {
    ultimo.value = await cierreService.cerrar(localId, auth.usuario?.id ?? '')
    confirmando.value = false
    ui.exito(`Día ${fechaCorta(ultimo.value.fecha)} cerrado.`)
    await cargar()
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo cerrar el día.')
  } finally {
    cerrando.value = false
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <p v-if="cargando" class="text-sm text-tenue">Preparando el cierre…</p>

    <template v-else-if="revision">
      <!-- La fecha operativa no es «hoy»: es el día que el hotel sigue operando. -->
      <div class="hs-panel flex flex-wrap items-center gap-4 p-6">
        <div>
          <p class="hs-etiqueta text-turquesa-texto">Día a cerrar</p>
          <p class="hs-titulo-pagina mt-1 text-tinta">{{ fechaLarga(revision.fecha) }}</p>
          <p class="mt-1 text-xs text-tenue">
            El hotel opera este día hasta que se cierre, aunque el calendario diga otra cosa.
          </p>
        </div>
        <div class="hs-filete h-px flex-1" role="presentation" />
        <KmButton :disabled="bloqueos.length > 0" :cargando="cerrando" @click="confirmando = true">
          Cerrar el día
        </KmButton>
      </div>

      <!-- ── Lo que falta ─────────────────────────────────────────────── -->
      <KmCard
        titulo="Antes de cerrar"
        subtitulo="El cierre no adivina: lo que no esté resuelto aquí lo bloquea."
      >
        <ul class="flex flex-col gap-3">
          <li class="hs-chequeo" :class="revision.salidasSinCheckOut.length ? 'es-malo' : 'es-ok'">
            <span class="hs-chequeo-glifo">
              {{ revision.salidasSinCheckOut.length ? '✕' : '✓' }}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-tinta">
                Salidas del día, registradas
                <KmBadge v-if="revision.salidasSinCheckOut.length" tono="coral"> Bloquea </KmBadge>
              </p>
              <p class="text-xs text-tenue">
                <template v-if="revision.salidasSinCheckOut.length">
                  {{ revision.salidasSinCheckOut.length }} estancia{{
                    revision.salidasSinCheckOut.length === 1 ? '' : 's'
                  }}
                  con la salida vencida y el huésped todavía dentro del sistema. O se fue y falta el
                  check-out, o extendió y falta mover la reserva.
                </template>
                <template v-else>Ninguna salida quedó a medias.</template>
              </p>
            </div>
          </li>

          <li class="hs-chequeo" :class="revision.llegadasSinCheckIn.length ? 'es-aviso' : 'es-ok'">
            <span class="hs-chequeo-glifo">
              {{ revision.llegadasSinCheckIn.length ? '!' : '✓' }}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-tinta">Llegadas del día</p>
              <p class="text-xs text-tenue">
                <template v-if="revision.llegadasSinCheckIn.length">
                  {{ revision.llegadasSinCheckIn.length }} reserva{{
                    revision.llegadasSinCheckIn.length === 1 ? '' : 's'
                  }}
                  esperaban entrar hoy y nadie llegó. Al cerrar se marcan como
                  <strong>no-show</strong>, que es lo que permite cobrar la primera noche de las
                  garantizadas.
                </template>
                <template v-else>Todas las llegadas entraron o se resolvieron.</template>
              </p>
            </div>
          </li>

          <li class="hs-chequeo es-ok">
            <span class="hs-chequeo-glifo">✓</span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-tinta">
                {{ revision.enCasa }} habitaci{{ revision.enCasa === 1 ? 'ón' : 'ones' }} en casa
              </p>
              <p class="text-xs text-tenue">
                A cada una se le cargará la noche. Es lo que el huésped paga por dormir hoy, y no se
                cobra ni al entrar ni al salir: se cobra cada noche que pasa.
              </p>
            </div>
          </li>
        </ul>
      </KmCard>

      <!-- ── Lo que acaba de quedar congelado ─────────────────────────── -->
      <KmCard
        v-if="ultimo"
        :titulo="`Cifras del ${fechaCorta(ultimo.fecha)}`"
        subtitulo="Congeladas. A partir de aquí, ese día vale lo mismo se pregunte cuando se pregunte."
      >
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HsCifra :valor="`${ultimo.ocupacion}%`" nombre="Ocupación" />
          <HsCifra :valor="formatearSoles(ultimo.adr)" nombre="ADR · tarifa media" />
          <HsCifra :valor="formatearSoles(ultimo.revpar)" nombre="RevPAR" />
          <HsCifra
            :valor="formatearSoles(ultimo.produccionAlojamiento + ultimo.produccionConsumos)"
            nombre="Producción del día"
          />
        </div>
        <p class="mt-4 text-xs text-tenue">
          {{ ultimo.ocupadas }} de {{ ultimo.vendibles }} habitaciones vendibles ·
          {{ formatearSoles(ultimo.produccionAlojamiento) }} de alojamiento y
          {{ formatearSoles(ultimo.produccionConsumos) }} de consumos ·
          {{ ultimo.noShows }} no-show.
        </p>
      </KmCard>

      <!-- ── Historia ─────────────────────────────────────────────────── -->
      <KmCard
        titulo="Días cerrados"
        subtitulo="El mes no se calcula: es la suma de estos días. Si falta uno, el mes es una estimación."
        sin-padding
      >
        <KmTable
          :columnas="columnas"
          :filas="historico"
          mensaje-vacio="Todavía no se ha cerrado ningún día. El primero empieza la contabilidad del hotel."
        >
          <template #col-fecha="{ fila }">
            <span class="text-sm text-tinta tabular-nums">{{ fechaCorta(fila.fecha) }}</span>
          </template>
          <template #col-ocupacion="{ fila }">
            <span class="hs-display text-sm font-semibold text-tinta tabular-nums">
              {{ fila.ocupacion }}%
            </span>
            <span class="ml-2 text-xs text-tenue"> {{ fila.ocupadas }}/{{ fila.vendibles }} </span>
          </template>
          <template #col-adr="{ fila }">
            <span class="text-sm text-tinta tabular-nums">{{ formatearSoles(fila.adr) }}</span>
          </template>
          <template #col-revpar="{ fila }">
            <span class="text-sm text-tinta tabular-nums">{{ formatearSoles(fila.revpar) }}</span>
          </template>
          <template #col-produccion="{ fila }">
            <span class="hs-display text-sm font-semibold text-tinta tabular-nums">
              {{ formatearSoles(fila.produccionAlojamiento + fila.produccionConsumos) }}
            </span>
          </template>
          <template #col-noShows="{ fila }">
            <span
              class="text-sm tabular-nums"
              :class="fila.noShows ? 'text-coral-texto' : 'text-tenue'"
            >
              {{ fila.noShows }}
            </span>
          </template>
        </KmTable>
      </KmCard>
    </template>

    <KmConfirm
      v-model="confirmando"
      :titulo="`Cerrar el ${fechaCorta(revision?.fecha ?? '')}`"
      :mensaje="mensajeConfirmar"
      texto-confirmar="Cerrar el día"
      :cargando="cerrando"
      @confirmar="cerrar"
    />
  </div>
</template>

<style scoped>
/*
 * Cada línea de la revisión dice su estado con glifo, color y palabra: quien
 * no distingue el coral del verde tiene que poder leerlo igual.
 */
.hs-chequeo {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--hs-border);
  border-radius: var(--hs-radio-control, 8px);
}

.hs-chequeo-glifo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.hs-chequeo.es-ok .hs-chequeo-glifo {
  color: var(--hs-salvia-texto, currentColor);
  background: var(--hs-salvia-fondo, transparent);
}

.hs-chequeo.es-aviso .hs-chequeo-glifo {
  color: var(--hs-turquesa-texto, currentColor);
  background: var(--hs-turquesa-fondo, transparent);
}

.hs-chequeo.es-malo {
  border-color: var(--hs-coral);
}

.hs-chequeo.es-malo .hs-chequeo-glifo {
  color: var(--hs-coral-texto, currentColor);
  background: var(--hs-coral-fondo, transparent);
}
</style>
