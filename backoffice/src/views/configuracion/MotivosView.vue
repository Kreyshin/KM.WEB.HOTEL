<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { AMBITOS, motivosService } from '@/services/motivos.service'
import type { AmbitoMotivo, Motivo, NuevoMotivo } from '@/types'
import type { ColumnaTabla, Pestana } from '@/types/ui'

/**
 * El catálogo del «por qué».
 *
 * Cada cancelación, bloqueo, descuento y cortesía arrastra una razón, y la
 * diferencia entre escribirla a mano y elegirla de una lista es que la segunda
 * se puede contar. «Cambio de planes» y «cambió de planes» son el mismo hecho
 * y dos filas distintas en cualquier informe: por eso un hotel que tipifica
 * sabe si las cancelaciones vienen del canal o del mostrador, y uno que no,
 * solo sabe cuántas hubo.
 *
 * Se trabaja por ámbito, en pestañas, porque el ámbito no es una etiqueta de
 * color: es lo que impide que un motivo de cancelación se ofrezca al bloquear
 * una habitación. Y por eso tampoco se puede mover de ámbito una vez creado
 * —hacerlo reescribiría el pasado que ya quedó anotado con él—.
 */

/* KmTabs trabaja con `string`; el ámbito se estrecha aquí, una sola vez. */
const pestanaActiva = ref<string>('cancelacion')
const ambito = computed(() => pestanaActiva.value as AmbitoMotivo)

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Motivo', ordenable: true },
  { clave: 'requiereNota', etiqueta: 'Pide explicación', clase: 'w-48' },
]

const definicionAmbito = computed(() => AMBITOS.find((a) => a.valor === ambito.value)!)

/* ── El recuento por pestaña y el aviso de ámbito vacío ─────────────────── */
const todos = ref<Motivo[]>([])

async function revisar() {
  const { items } = await motivosService
    .consultar({ porPagina: 200 })
    .catch(() => ({ items: [] as Motivo[] }))
  todos.value = items
}

onMounted(revisar)

const activosDe = (valor: AmbitoMotivo) =>
  todos.value.filter((m) => m.ambito === valor && m.activo).length

const pestanas = computed<Pestana[]>(() =>
  AMBITOS.map((a) => ({ valor: a.valor, etiqueta: a.etiqueta, contador: activosDe(a.valor) })),
)

/**
 * Un ámbito sin motivos activos no es un catálogo pequeño: es el «por qué»
 * otra vez en texto libre, porque quien tenga que explicar algo no tendrá nada
 * que elegir.
 */
const vacio = computed(() => activosDe(ambito.value) === 0)

const nuevo = (): NuevoMotivo => ({
  nombre: '',
  ambito: ambito.value,
  // La cortesía nace pidiendo explicación: no cobrar nada es lo que más se
  // pregunta a fin de mes, y lo que peor se defiende sin una nota.
  requiereNota: ambito.value === 'cortesia',
  activo: true,
})

function validar(m: NuevoMotivo): Record<string, string> {
  const errores: Record<string, string> = {}
  const nombre = m.nombre.trim()
  if (!nombre) errores.nombre = 'El motivo necesita un nombre.'
  else if (nombre.length < 3) errores.nombre = 'Con menos de tres letras no es un motivo.'
  return errores
}

const filtrosFijos = computed(() => ({ ambito: ambito.value }))
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmTabs v-model="pestanaActiva" :pestanas="pestanas" etiqueta="Ámbito del motivo">
      <div class="flex flex-col gap-5">
        <!-- El aviso que explica qué se pierde teniendo la pestaña vacía. -->
        <div v-if="vacio" class="hs-panel es-aviso flex flex-wrap items-center gap-4 p-5">
          <div class="min-w-0">
            <p class="hs-etiqueta text-coral-texto">
              ⚠ Sin motivos de {{ definicionAmbito.etiqueta.toLowerCase() }}
            </p>
            <p class="mt-1 text-sm text-tinta">
              Quien tenga que explicar el caso no tendrá nada que elegir, y el «por qué» volverá a
              ser texto libre: contable como suma, inservible para saber la causa.
            </p>
          </div>
        </div>

        <KmCatalogo
          :key="ambito"
          :titulo="`Motivos de ${definicionAmbito.etiqueta.toLowerCase()}`"
          :subtitulo="definicionAmbito.descripcion"
          entidad="motivo"
          :servicio="motivosService"
          :columnas="columnas"
          :nuevo="nuevo"
          :validar="validar"
          :filtros-fijos="filtrosFijos"
          :nombre-de="(m: Motivo) => m.nombre"
          ancho-drawer="sm"
          @cambio="revisar"
        >
          <template #col-nombre="{ fila }">
            <span class="font-medium text-tinta">{{ fila.nombre }}</span>
          </template>

          <template #col-requiereNota="{ fila }">
            <KmBadge :tono="fila.requiereNota ? 'azul' : 'neutro'">
              {{ fila.requiereNota ? 'Nota obligatoria' : 'Basta el motivo' }}
            </KmBadge>
          </template>

          <template #formulario="{ borrador, errores, editando }">
            <KmField
              v-slot="{ id, invalido }"
              label="Motivo"
              :error="errores.nombre"
              ayuda="Como lo diría quien lo elige en el mostrador, y corto: una lista larga no se lee, se ignora."
              requerido
            >
              <KmInput
                :id="id"
                v-model="borrador.nombre"
                :invalido="invalido"
                placeholder="Sobreventa reubicada"
              />
            </KmField>

            <KmSwitch
              v-model="borrador.requiereNota"
              etiqueta="Pedir una explicación además del motivo"
              descripcion="Para lo que alguien tendrá que justificar después. Exigirla en todo convierte la nota en un «.» y la vacía de sentido."
            />

            <p class="rounded-control border border-linea bg-panel-2 p-3 text-sm text-tenue">
              <template v-if="editando">
                El ámbito no se cambia: este motivo ya puede estar escrito en registros cerrados.
                Desactívalo y crea el que corresponda.
              </template>
              <template v-else>
                Se crea en
                <strong class="text-tinta">{{ definicionAmbito.etiqueta.toLowerCase() }}</strong>
                y ahí se queda.
              </template>
            </p>
          </template>
        </KmCatalogo>
      </div>
    </KmTabs>
  </div>
</template>
