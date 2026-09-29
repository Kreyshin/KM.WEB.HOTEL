<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { tarifasService } from '@/services/tarifas.service'
import type { NuevaTemporada, Temporada, TonoTarifa } from '@/types'
import type { ColumnaTabla, OpcionSelect, TonoHotel } from '@/types/ui'
import { fechaCorta, noches } from '@/utils/formato'

/**
 * Temporadas: el factor que multiplica la tarifa base en un rango de fechas.
 *
 * Es el segundo eslabón de la puesta en marcha, justo después de los tipos:
 * sin temporadas, un hotel vende en julio al mismo precio que en mayo. La
 * regla dura es que dos temporadas activas no pueden solaparse, porque el
 * precio de un día tiene que ser uno solo; el servicio lo rechaza diciendo con
 * cuál choca.
 */

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Temporada', ordenable: true },
  { clave: 'rango', etiqueta: 'Vigencia', clase: 'w-56' },
  { clave: 'factor', etiqueta: 'Factor', clase: 'w-40', ordenable: true },
  { clave: 'minimoNoches', etiqueta: 'Mínimo', clase: 'w-32' },
]

const tonos: Record<TonoTarifa, TonoHotel> = {
  azul: 'azul',
  turquesa: 'turquesa',
  coral: 'coral',
  salvia: 'salvia',
}

const colores: OpcionSelect[] = [
  { valor: 'salvia', etiqueta: 'Verde · temporada baja' },
  { valor: 'azul', etiqueta: 'Azul · temporada media' },
  { valor: 'turquesa', etiqueta: 'Turquesa · puente o feriado' },
  { valor: 'coral', etiqueta: 'Coral · temporada alta' },
]

const hoy = new Date().toISOString().slice(0, 10)
const enUnMes = () => {
  const f = new Date()
  f.setMonth(f.getMonth() + 1)
  return f.toISOString().slice(0, 10)
}

const nuevo = (): NuevaTemporada => ({
  nombre: '',
  desde: hoy,
  hasta: enUnMes(),
  factor: 1,
  color: 'azul',
  activo: true,
})

function validar(t: NuevaTemporada): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!t.nombre.trim()) errores.nombre = 'El nombre es obligatorio.'
  if (!t.desde) errores.desde = 'Falta la fecha de inicio.'
  if (!t.hasta) errores.hasta = 'Falta la fecha de fin.'
  if (t.desde && t.hasta && t.hasta < t.desde) {
    errores.hasta = 'El fin no puede ser anterior al inicio.'
  }
  if (t.factor < 0.1 || t.factor > 5) errores.factor = 'El factor va de 0,10 a 5,00.'
  return errores
}

/* La temporada de hoy: lo primero que se mira al abrir la pantalla. */
const vigenteAhora = ref<Temporada>()

async function cargarVigente() {
  const todas = await tarifasService.temporadas.listar().catch(() => [])
  vigenteAhora.value = todas.find((t) => t.activo && t.desde <= hoy && t.hasta >= hoy)
}

onMounted(cargarVigente)

const porcentaje = (factor: number) => `${factor > 1 ? '+' : ''}${Math.round((factor - 1) * 100)}%`

/** Lo que cuesta una noche de 200 soles con este factor: el número se entiende solo. */
const ejemplo = computed(() => (factor: number) => Math.round(200 * factor))
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <div v-if="vigenteAhora" class="hs-panel flex flex-wrap items-center gap-4 p-6">
      <div>
        <p class="hs-etiqueta text-turquesa-texto">Temporada vigente</p>
        <p class="hs-titulo-pagina mt-1 text-tinta">{{ vigenteAhora.nombre }}</p>
      </div>
      <div class="hs-filete h-px flex-1" role="presentation" />
      <p class="hs-cifra text-tinta">×{{ vigenteAhora.factor.toFixed(2) }}</p>
    </div>

    <KmCatalogo
      titulo="Temporadas"
      subtitulo="El factor que mueve la tarifa base según la fecha. Dos temporadas activas no pueden solaparse: el precio de un día debe ser uno solo."
      entidad="temporada"
      femenino
      :servicio="tarifasService.temporadas"
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :nombre-de="(t: Temporada) => t.nombre"
      @cambio="cargarVigente"
    >
      <template #col-nombre="{ fila }">
        <KmBadge :tono="tonos[fila.color]" punto>{{ fila.nombre }}</KmBadge>
      </template>
      <template #col-rango="{ fila }">
        <span class="text-sm text-tinta tabular-nums">
          {{ fechaCorta(fila.desde) }} → {{ fechaCorta(fila.hasta) }}
        </span>
        <span class="block text-xs text-tenue">{{ noches(fila.desde, fila.hasta) + 1 }} días</span>
      </template>
      <template #col-factor="{ fila }">
        <span class="hs-display text-base font-semibold text-tinta tabular-nums">
          ×{{ fila.factor.toFixed(2) }}
        </span>
        <span class="ml-2 text-xs text-tenue">{{ porcentaje(fila.factor) }}</span>
      </template>
      <template #col-minimoNoches="{ fila }">
        <span class="text-sm text-tenue">
          {{ fila.minimoNoches ? `${fila.minimoNoches} noches` : 'Sin mínimo' }}
        </span>
      </template>

      <template #formulario="{ borrador, errores }">
        <KmField v-slot="{ id, invalido }" label="Nombre" :error="errores.nombre" requerido>
          <KmInput
            :id="id"
            v-model="borrador.nombre"
            placeholder="Fiestas patrias"
            :invalido="invalido"
          />
        </KmField>

        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id, invalido }" label="Desde" :error="errores.desde" requerido>
            <KmFecha :id="id" v-model="borrador.desde" :invalido="invalido" />
          </KmField>
          <KmField
            v-slot="{ id, invalido }"
            label="Hasta"
            :error="errores.hasta"
            ayuda="Los dos extremos entran en la temporada."
            requerido
          >
            <KmFecha :id="id" v-model="borrador.hasta" :invalido="invalido" />
          </KmField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <KmField
            v-slot="{ id }"
            label="Factor sobre la tarifa base"
            :error="errores.factor"
            :ayuda="`${porcentaje(borrador.factor)} · una noche de S/ 200 se vende a S/ ${ejemplo(borrador.factor)}`"
          >
            <KmNumero
              :id="id"
              v-model="borrador.factor"
              :min="0.1"
              :max="5"
              :step="0.05"
              :decimales="2"
            />
          </KmField>
          <KmField
            v-slot="{ id }"
            label="Mínimo de noches"
            ayuda="Vacío: sin mínimo. Se usa en puentes y fin de año."
          >
            <KmNumero :id="id" v-model="borrador.minimoNoches" :min="1" :max="14" />
          </KmField>
        </div>

        <KmField
          v-slot="{ id }"
          label="Color en el rack"
          ayuda="Con qué color se pinta esta temporada en la rejilla de tarifas."
        >
          <KmSelect :id="id" v-model="borrador.color" :opciones="colores" />
        </KmField>

        <!--
          El estado no se pregunta en el alta: una temporada nace vigente. Y
          desactivarla no es cosmética — libera sus fechas para que otra pueda
          ocuparlas, así que KmCatalogo lo pide solo al editar y con su aviso.
        -->
      </template>
    </KmCatalogo>
  </div>
</template>
