<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { comprobantesService, impuestosService } from '@/services/comprobantes.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { ConfigImpuestos, SerieComprobante, TipoComprobante } from '@/types'
import type { ColumnaTabla, OpcionSelect, TonoHotel } from '@/types/ui'

/**
 * El último eslabón antes de la primera venta.
 *
 * Un hotel puede tener habitaciones, tarifas y canales y seguir sin poder
 * cobrar: sin una serie activa no hay con qué emitir el comprobante, y eso se
 * descubre con el huésped delante y la maleta hecha. Por eso esta pantalla
 * avisa de lo que falta antes de que pase.
 */

const localStore = useLocalStore()
const ui = useUiStore()

const etiquetaTipo: Record<TipoComprobante, string> = {
  boleta: 'Boleta',
  factura: 'Factura',
  notaCredito: 'Nota de crédito',
  notaVenta: 'Nota de venta',
}

const tonoTipo: Record<TipoComprobante, TonoHotel> = {
  boleta: 'azul',
  factura: 'turquesa',
  notaCredito: 'coral',
  notaVenta: 'neutro',
}

const ayudaTipo: Record<TipoComprobante, string> = {
  boleta: 'Al huésped que no pide RUC. La serie empieza por B.',
  factura: 'A empresa con RUC. La serie empieza por F.',
  notaCredito: 'Corrige o anula. Va en la serie del documento que corrige: BC o FC.',
  notaVenta: 'Documento interno, sin valor tributario. NV.',
}

const tipos: OpcionSelect[] = (Object.keys(etiquetaTipo) as TipoComprobante[]).map((t) => ({
  valor: t,
  etiqueta: etiquetaTipo[t],
}))

const columnas: ColumnaTabla[] = [
  { clave: 'serie', etiqueta: 'Serie', clase: 'w-32', ordenable: true },
  { clave: 'tipo', etiqueta: 'Emite', clase: 'w-48' },
  { clave: 'correlativo', etiqueta: 'Último emitido', clase: 'w-40 text-right' },
  { clave: 'siguiente', etiqueta: 'Siguiente número', clase: 'w-48' },
]

const filtrosFijos = computed(() => ({ localId: localStore.localId ?? undefined }))

const nuevo = (): Omit<SerieComprobante, 'id'> => ({
  localId: localStore.localId ?? '',
  tipo: 'boleta',
  serie: '',
  correlativo: 0,
  activo: true,
})

function validar(s: Omit<SerieComprobante, 'id'>): Record<string, string> {
  const errores: Record<string, string> = {}
  const patron: Record<TipoComprobante, RegExp> = {
    boleta: /^B[0-9A-Z]{3}$/,
    factura: /^F[0-9A-Z]{3}$/,
    notaCredito: /^[BF]C[0-9A-Z]{2}$/,
    notaVenta: /^NV[0-9A-Z]{2}$/,
  }
  const serie = s.serie.trim().toUpperCase()
  if (!serie) errores.serie = 'La serie es obligatoria.'
  else if (!patron[s.tipo].test(serie)) {
    errores.serie = `Para ${etiquetaTipo[s.tipo].toLowerCase()}: ${s.tipo === 'boleta' ? 'B001' : s.tipo === 'factura' ? 'F001' : s.tipo === 'notaCredito' ? 'BC01 o FC01' : 'NV01'}.`
  }
  if (s.correlativo < 0) errores.correlativo = 'No puede ser negativo.'
  return errores
}

/* ── Qué falta para poder cobrar ───────────────────────────────────────── */
const series = ref<SerieComprobante[]>([])

async function revisar() {
  const { items } = await comprobantesService
    .consultar({ filtros: { localId: localStore.localId ?? undefined }, porPagina: 100 })
    .catch(() => ({ items: [] as SerieComprobante[] }))
  series.value = items
}

// El aviso es por sede: cambiar de sede cambia lo que falta.
watch(() => localStore.localId, revisar)

const faltan = computed(() =>
  (['boleta', 'factura'] as TipoComprobante[]).filter(
    (t) => !series.value.some((s) => s.tipo === t && s.activo),
  ),
)

/* ── Impuestos ─────────────────────────────────────────────────────────── */
const impuestos = ref<ConfigImpuestos>({
  igv: 18,
  preciosIncluyenIgv: true,
  exoneracionNoDomiciliados: true,
})
const guardandoImpuestos = ref(false)

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  await revisar()
  impuestos.value = await impuestosService.obtener().catch(() => impuestos.value)
})

async function guardarImpuestos() {
  guardandoImpuestos.value = true
  try {
    impuestos.value = await impuestosService.guardar(impuestos.value)
    ui.exito('Impuestos guardados.')
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudieron guardar los impuestos.')
  } finally {
    guardandoImpuestos.value = false
  }
}

/** Lo que se le cobra al huésped por una noche de 200, con y sin exoneración. */
const ejemplo = computed(() => {
  const neto = impuestos.value.preciosIncluyenIgv ? 200 / (1 + impuestos.value.igv / 100) : 200
  return {
    neto: Math.round(neto * 100) / 100,
    conIgv: Math.round(neto * (1 + impuestos.value.igv / 100) * 100) / 100,
  }
})
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <!-- El aviso que evita descubrirlo con el huésped delante. -->
    <div v-if="faltan.length" class="hs-panel es-aviso flex flex-wrap items-center gap-4 p-5">
      <div class="min-w-0">
        <p class="hs-etiqueta text-coral-texto">⚠ Esta sede todavía no puede facturar</p>
        <p class="mt-1 text-sm text-tinta">
          Falta una serie activa de
          <strong>{{ faltan.map((t) => etiquetaTipo[t].toLowerCase()).join(' y de ') }}</strong
          >. Sin ella, el check-out se queda a medias.
        </p>
      </div>
    </div>

    <KmCatalogo
      :key="localStore.localId ?? 'sin-sede'"
      titulo="Series de comprobante"
      subtitulo="Con qué numeración emite esta sede. La serie y el correlativo son los que declara SUNAT."
      entidad="serie"
      femenino
      :servicio="comprobantesService"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :filtros-fijos="filtrosFijos"
      :nombre-de="(s: SerieComprobante) => s.serie"
      @cambio="revisar"
    >
      <template #col-serie="{ fila }">
        <span class="hs-display font-mono text-base font-semibold text-tinta">
          {{ fila.serie }}
        </span>
      </template>

      <template #col-tipo="{ fila }">
        <KmBadge :tono="tonoTipo[fila.tipo]" punto>{{ etiquetaTipo[fila.tipo] }}</KmBadge>
      </template>

      <template #col-correlativo="{ fila }">
        <span class="text-sm text-tinta tabular-nums">
          {{ fila.correlativo === 0 ? 'ninguno' : fila.correlativo.toLocaleString('es-PE') }}
        </span>
      </template>

      <template #col-siguiente="{ fila }">
        <span
          class="font-mono text-sm tabular-nums"
          :class="fila.activo ? 'text-tinta' : 'text-tenue line-through'"
        >
          {{ fila.serie }}-{{ String(fila.correlativo + 1).padStart(8, '0') }}
        </span>
        <span v-if="!fila.activo" class="block text-[11px] text-tenue">no emite</span>
      </template>

      <template #formulario="{ borrador, errores, editando }">
        <KmField v-slot="{ id }" label="Emite" :ayuda="ayudaTipo[borrador.tipo as TipoComprobante]">
          <KmSelect :id="id" v-model="borrador.tipo" :opciones="tipos" :disabled="editando" />
        </KmField>

        <div class="grid gap-4 sm:grid-cols-2">
          <KmField
            v-slot="{ id, invalido }"
            label="Serie"
            :error="errores.serie"
            ayuda="Cuatro caracteres. La letra la manda el tipo."
            requerido
          >
            <KmInput
              :id="id"
              v-model="borrador.serie"
              placeholder="B001"
              class="font-mono uppercase"
              :invalido="invalido"
            />
          </KmField>
          <KmField
            v-slot="{ id }"
            label="Último número emitido"
            :error="errores.correlativo"
            :ayuda="
              editando
                ? 'Solo sube. Bajarlo repetiría números ya entregados.'
                : 'Déjalo en 0 si la serie empieza de cero. Si vienes de otro sistema, pon el último que emitió.'
            "
          >
            <KmNumero :id="id" v-model="borrador.correlativo" :min="0" :max="99999999" />
          </KmField>
        </div>

        <p class="rounded-control border border-linea bg-panel-2 p-3 text-sm text-tenue">
          El próximo comprobante saldría como
          <strong class="font-mono text-tinta">
            {{ (borrador.serie || '····').toUpperCase() }}-{{
              String(borrador.correlativo + 1).padStart(8, '0')
            }}
          </strong>
        </p>

        <!--
          El estado no se pregunta en el alta: una serie nace emitiendo.
          Desactivarla es lo que se hace al agotar un talonario o al cerrar una
          numeración, y eso es una decisión posterior.
        -->
      </template>
    </KmCatalogo>

    <!-- ── Impuestos: un registro único de toda la cadena ─────────────── -->
    <KmCard
      titulo="Impuestos"
      subtitulo="Valen para toda la cadena: el IGV no se da de alta, se cambia el día que lo cambia el Estado."
    >
      <div class="flex flex-col gap-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="IGV" ayuda="El vigente en Perú es 18 %.">
            <KmNumero :id="id" v-model="impuestos.igv" :min="0" :max="50" sufijo="%" />
          </KmField>
          <div class="flex items-end">
            <p class="text-sm text-tenue">
              Una noche publicada a <strong class="text-tinta">S/ 200</strong> son
              <strong class="text-tinta tabular-nums">S/ {{ ejemplo.neto.toFixed(2) }}</strong>
              de base
              {{ impuestos.preciosIncluyenIgv ? 'más' : 'y se le suman' }}
              <strong class="text-tinta tabular-nums">
                S/ {{ (ejemplo.conIgv - ejemplo.neto).toFixed(2) }}
              </strong>
              de IGV.
            </p>
          </div>
        </div>

        <KmSwitch
          v-model="impuestos.preciosIncluyenIgv"
          etiqueta="Los precios publicados ya incluyen IGV"
          descripcion="Lo normal en hotelería: el huésped ve el precio final. Si se apaga, el IGV se suma al facturar y la tarifa de la rejilla no es lo que se cobra."
        />

        <KmSwitch
          v-model="impuestos.exoneracionNoDomiciliados"
          etiqueta="Exonerar a no domiciliados"
          descripcion="D. Leg. 919: el hospedaje a un extranjero no domiciliado es exportación de servicios y no lleva IGV. Exige TAM y pasaporte, y no vale más allá de 60 días por entrada."
        />

        <div class="flex justify-end">
          <KmButton :cargando="guardandoImpuestos" @click="guardarImpuestos">
            Guardar impuestos
          </KmButton>
        </div>
      </div>
    </KmCard>
  </div>
</template>
