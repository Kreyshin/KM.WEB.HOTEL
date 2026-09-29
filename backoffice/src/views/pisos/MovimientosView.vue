<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useCarga } from '@/composables/useCarga'
import HsCifra from '@/components/hotel/HsCifra.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmTable from '@/components/ui/KmTable.vue'
import { habitacionesService } from '@/services/habitaciones.service'
import { inventarioService } from '@/services/inventario.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { HabitacionResuelta, Insumo, Movimiento, TipoMovimiento } from '@/types'
import type { ColumnaTabla, OpcionSelect, TonoHotel } from '@/types/ui'
import { etiquetaMovimiento, etiquetaUnidad, hora } from '@/utils/formato'

/**
 * Kardex del piso: qué entró, qué salió y a qué habitación se imputó.
 *
 * Aquí se registra el movimiento, y registrarlo **mueve el stock en el mismo
 * acto**. Tener un kardex que no mueve el almacén, o un stock que cambia sin
 * dejar línea, son las dos maneras de que el papel y la estantería dejen de
 * parecerse; a fin de mes nadie sabe cuál de los dos miente.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()

const movimientos = ref<Movimiento[]>([])
const insumos = ref<Insumo[]>([])
const habitaciones = ref<HabitacionResuelta[]>([])
const resumen = ref<Awaited<ReturnType<typeof inventarioService.resumenDelDia>>>()
const { cargando, iniciar, terminar } = useCarga()

const columnas: ColumnaTabla[] = [
  { clave: 'fecha', etiqueta: 'Fecha', clase: 'w-36' },
  { clave: 'insumoId', etiqueta: 'Insumo' },
  { clave: 'tipo', etiqueta: 'Tipo', clase: 'w-36' },
  { clave: 'cantidad', etiqueta: 'Cantidad', clase: 'w-32 text-right' },
  { clave: 'habitacionId', etiqueta: 'Habitación', clase: 'w-28' },
  { clave: 'motivo', etiqueta: 'Motivo' },
]

const tonos: Record<TipoMovimiento, TonoHotel> = {
  ingreso: 'salvia',
  salida: 'azul',
  ajuste: 'turquesa',
  merma: 'coral',
}

const glifos: Record<TipoMovimiento, string> = {
  ingreso: '↑',
  salida: '↓',
  ajuste: '=',
  merma: '✕',
}

async function cargar() {
  iniciar()
  try {
    ;[movimientos.value, insumos.value, resumen.value] = await Promise.all([
      inventarioService.movimientos(),
      inventarioService.todos(),
      inventarioService.resumenDelDia(),
    ])
    if (localStore.localId) {
      habitaciones.value = await habitacionesService.listarPorLocal(localStore.localId)
    }
  } catch {
    ui.error('No se pudieron cargar los movimientos.')
  } finally {
    terminar()
  }
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  await cargar()
})

const insumoDe = (id: string) => insumos.value.find((i) => i.id === id)
const nombreInsumo = (id: string) => insumoDe(id)?.nombre ?? id
const numeroHabitacion = (id?: string) =>
  id ? (habitaciones.value.find((h) => h.id === id)?.numero ?? id) : null

/* ── Filtros ──────────────────────────────────────────────────────────── */
const filtroInsumo = ref<string | number | undefined>('')
const filtroTipo = ref<string | number | undefined>('')

const opcionesInsumoFiltro = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Todos los insumos' },
  ...insumos.value.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
])

const opcionesTipoFiltro: OpcionSelect[] = [
  { valor: '', etiqueta: 'Todos los tipos' },
  ...(Object.keys(etiquetaMovimiento) as TipoMovimiento[]).map((t) => ({
    valor: t,
    etiqueta: etiquetaMovimiento[t],
  })),
]

const visibles = computed(() =>
  movimientos.value.filter(
    (m) =>
      (!filtroInsumo.value || m.insumoId === filtroInsumo.value) &&
      (!filtroTipo.value || m.tipo === filtroTipo.value),
  ),
)

/* ── Registrar ────────────────────────────────────────────────────────── */
const panel = ref(false)
const guardando = ref(false)
const errores = reactive<Record<string, string>>({})

const borrador = reactive({
  insumoId: '',
  tipo: 'salida' as TipoMovimiento,
  cantidad: 1,
  habitacionId: '',
  motivo: '',
})

const opcionesInsumo = computed<OpcionSelect[]>(() =>
  insumos.value
    .filter((i) => i.activo)
    .map((i) => ({
      valor: i.id,
      etiqueta: `${i.nombre} · ${i.stock} ${etiquetaUnidad[i.unidad].toLowerCase()}`,
    })),
)

const opcionesTipo: OpcionSelect[] = (Object.keys(etiquetaMovimiento) as TipoMovimiento[]).map(
  (t) => ({ valor: t, etiqueta: etiquetaMovimiento[t] }),
)

const opcionesHabitacion = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Sin imputar a una habitación' },
  ...habitaciones.value.map((h) => ({ valor: h.id, etiqueta: h.numero })),
])

const elegido = computed(() => insumoDe(borrador.insumoId))

/** Lo que quedará en el almacén si se guarda. Se ve antes de guardar. */
const stockResultante = computed(() => {
  const insumo = elegido.value
  if (!insumo) return null
  if (borrador.tipo === 'ajuste') return borrador.cantidad
  const signo = borrador.tipo === 'ingreso' ? 1 : -1
  return insumo.stock + signo * borrador.cantidad
})

const ayudaCantidad = computed(() => {
  if (borrador.tipo === 'ajuste') return 'Escribe el stock CONTADO, no la diferencia.'
  if (!elegido.value) return undefined
  return `Hay ${elegido.value.stock} ${etiquetaUnidad[elegido.value.unidad].toLowerCase()}.`
})

const exigeMotivo = computed(() => borrador.tipo === 'merma' || borrador.tipo === 'ajuste')

function abrir(tipo: TipoMovimiento = 'salida') {
  for (const k of Object.keys(errores)) delete errores[k]
  Object.assign(borrador, {
    insumoId: '',
    tipo,
    cantidad: 1,
    habitacionId: '',
    motivo: '',
  })
  panel.value = true
}

async function registrar() {
  for (const k of Object.keys(errores)) delete errores[k]
  if (!borrador.insumoId) {
    errores.insumoId = 'Elige un insumo.'
    return
  }
  guardando.value = true
  try {
    const movimiento = await inventarioService.registrarMovimiento({
      insumoId: borrador.insumoId,
      tipo: borrador.tipo,
      cantidad: borrador.cantidad,
      habitacionId: borrador.habitacionId || undefined,
      motivo: borrador.motivo || undefined,
      usuarioId: auth.usuario?.id ?? '',
    })
    // La fila nueva entra arriba, sin recargar el kardex entero.
    movimientos.value = [movimiento, ...movimientos.value]
    const insumo = insumoDe(movimiento.insumoId)
    resumen.value = await inventarioService.resumenDelDia()
    insumos.value = await inventarioService.todos()
    panel.value = false
    ui.exito(
      `${etiquetaMovimiento[movimiento.tipo]} registrada. ${insumo?.nombre}: ${insumoDe(movimiento.insumoId)?.stock} en almacén.`,
    )
  } catch (e) {
    const error = e as { mensaje?: string; campos?: Record<string, string> }
    Object.assign(errores, error.campos ?? {})
    ui.error(error.mensaje ?? 'No se pudo registrar el movimiento.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <!-- El día en cuatro cifras: lo que se mira antes de reponer. -->
    <div v-if="resumen" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <HsCifra :valor="resumen.movimientos" nombre="Movimientos hoy" />
      <HsCifra :valor="resumen.salidas" nombre="Salidas a habitación" />
      <HsCifra
        :valor="resumen.mermas"
        nombre="Mermas"
        :tono="resumen.mermas > 0 ? 'alerta' : 'neutro'"
      />
      <HsCifra
        :valor="resumen.bajoMinimo"
        nombre="Bajo mínimo"
        :tono="resumen.bajoMinimo > 0 ? 'aviso' : 'neutro'"
      />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <KmSelect v-model="filtroInsumo" :opciones="opcionesInsumoFiltro" etiqueta="Insumo" />
        <KmSelect v-model="filtroTipo" :opciones="opcionesTipoFiltro" etiqueta="Tipo" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <KmButton variante="secundario" @click="abrir('ingreso')">Registrar ingreso</KmButton>
        <KmButton @click="abrir('salida')">Registrar salida</KmButton>
      </div>
    </div>

    <KmCard
      titulo="Movimientos"
      subtitulo="Consumos, reposiciones, mermas y conteos del piso. Cada línea movió el almacén."
      sin-padding
    >
      <KmTable
        :columnas="columnas"
        :filas="visibles"
        :cargando="cargando"
        mensaje-vacio="Todavía no hay movimientos registrados."
      >
        <template #col-fecha="{ fila }">
          <span class="text-xs text-tenue tabular-nums">
            {{ fila.fecha.slice(8, 10) }}/{{ fila.fecha.slice(5, 7) }} · {{ hora(fila.fecha) }}
          </span>
        </template>
        <template #col-insumoId="{ fila }">
          <span class="text-sm text-tinta">{{ nombreInsumo(fila.insumoId) }}</span>
        </template>
        <template #col-tipo="{ fila }">
          <KmBadge :tono="tonos[fila.tipo]">
            {{ glifos[fila.tipo] }} {{ etiquetaMovimiento[fila.tipo] }}
          </KmBadge>
        </template>
        <template #col-cantidad="{ fila }">
          <span class="hs-display text-sm font-semibold text-tinta tabular-nums">
            {{ fila.tipo === 'ajuste' ? '' : fila.tipo === 'ingreso' ? '+' : '−'
            }}{{ fila.cantidad }}
          </span>
        </template>
        <template #col-habitacionId="{ fila }">
          <span class="text-sm text-tenue tabular-nums">
            {{ numeroHabitacion(fila.habitacionId) ?? '—' }}
          </span>
        </template>
        <template #col-motivo="{ fila }">
          <span class="text-sm text-tenue">{{ fila.motivo ?? '—' }}</span>
        </template>
      </KmTable>
    </KmCard>

    <!-- ── Registrar ──────────────────────────────────────────────────── -->
    <KmDrawer
      v-model="panel"
      titulo="Registrar movimiento"
      subtitulo="Lo que se guarde aquí mueve el almacén en el mismo acto."
    >
      <div class="flex flex-col gap-4 px-6 py-5">
        <KmField v-slot="{ id, invalido }" label="Insumo" :error="errores.insumoId" requerido>
          <KmSelect
            :id="id"
            v-model="borrador.insumoId"
            :opciones="opcionesInsumo"
            :invalido="invalido"
            placeholder="Elige un insumo"
          />
        </KmField>

        <KmField v-slot="{ id }" label="Tipo de movimiento">
          <KmSelect :id="id" v-model="borrador.tipo" :opciones="opcionesTipo" />
        </KmField>

        <KmField
          v-slot="{ id }"
          :label="borrador.tipo === 'ajuste' ? 'Stock contado' : 'Cantidad'"
          :error="errores.cantidad"
          :ayuda="ayudaCantidad"
        >
          <KmNumero
            :id="id"
            v-model="borrador.cantidad"
            :min="0"
            :max="9999"
            :sufijo="elegido ? etiquetaUnidad[elegido.unidad].toLowerCase() : undefined"
          />
        </KmField>

        <KmField
          v-if="borrador.tipo === 'salida'"
          v-slot="{ id }"
          label="Habitación"
          ayuda="Imputa el consumo a una puerta. Es lo que después explica el gasto por habitación."
        >
          <KmSelect :id="id" v-model="borrador.habitacionId" :opciones="opcionesHabitacion" />
        </KmField>

        <KmField
          v-slot="{ id, invalido }"
          label="Motivo"
          :error="errores.motivo"
          :requerido="exigeMotivo"
          :ayuda="
            borrador.tipo === 'merma'
              ? 'Una merma se explica: rotura, mancha, robo.'
              : borrador.tipo === 'ajuste'
                ? 'Por qué el conteo no coincide con el sistema.'
                : 'Opcional.'
          "
        >
          <KmInput
            :id="id"
            v-model="borrador.motivo"
            :invalido="invalido"
            placeholder="Reposición semanal"
          />
        </KmField>

        <!-- La consecuencia, antes de guardar: es el número que se va a discutir. -->
        <p
          v-if="elegido"
          class="rounded-control border border-linea bg-panel-2 p-3 text-sm text-tenue"
        >
          <strong class="text-tinta">{{ elegido.nombre }}</strong> pasaría de
          <strong class="text-tinta tabular-nums">{{ elegido.stock }}</strong> a
          <strong
            class="tabular-nums"
            :class="
              stockResultante !== null && stockResultante < elegido.stockMinimo
                ? 'text-coral-texto'
                : 'text-tinta'
            "
          >
            {{ stockResultante }}
          </strong>
          {{ etiquetaUnidad[elegido.unidad].toLowerCase() }}.
          <template v-if="stockResultante !== null && stockResultante < elegido.stockMinimo">
            Queda por debajo del mínimo de {{ elegido.stockMinimo }}.
          </template>
        </p>
      </div>

      <template #footer>
        <KmButton variante="secundario" :disabled="guardando" @click="panel = false">
          Cancelar
        </KmButton>
        <KmButton :cargando="guardando" @click="registrar">Registrar</KmButton>
      </template>
    </KmDrawer>
  </div>
</template>
