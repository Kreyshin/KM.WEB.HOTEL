<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { configuracionService, porGrupo } from '@/services/configuracion.service'
import { localesService } from '@/services/locales.service'
import { useUiStore } from '@/stores/ui.store'
import type { DefinicionParametro, Local, ValorParametro } from '@/types'

/**
 * Cómo se comporta la cadena.
 *
 * Es la pantalla que convierte una decisión de dirección en una regla que el
 * programa cumple. Lo que se toca aquí no es apariencia: apagar la sobreventa
 * hace que el mostrador no pueda vender la quinta doble cuando hay cuatro, y
 * mover el redondeo cambia el precio que se ofrece esta noche.
 *
 * Dos alcances conviven. Lo marcado como **de la cadena** no se discute por
 * sede, porque tenerlo distinto en dos hoteles haría incomparables sus cifras
 * —y comparar es para lo que existe el cierre de día—. Lo marcado como
 * ajustable es el valor común del que parten las sedes, y cada una puede
 * apartarse en su propia pantalla.
 */

const ui = useUiStore()

const grupos = porGrupo()
const valores = ref<Record<string, ValorParametro>>({})
const original = ref<Record<string, ValorParametro>>({})
const sedes = ref<Local[]>([])
const guardando = ref(false)
const cargando = ref(true)

async function cargar() {
  cargando.value = true
  try {
    // Sin sede: lo que se edita aquí es el valor de la cadena, sin sobrescrituras.
    const efectivos = configuracionService.efectivos()
    valores.value = { ...efectivos }
    original.value = { ...efectivos }
    sedes.value = await localesService.listarActivos().catch(() => [])
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

const cambiados = computed(() =>
  Object.keys(valores.value).filter((c) => valores.value[c] !== original.value[c]),
)

/** Las sedes que se apartan de este valor, por su nombre. */
function sedesQueDifieren(clave: string) {
  const ids = configuracionService.sedesQueDifieren(clave)
  return ids.map((id) => sedes.value.find((s) => s.id === id)?.nombre ?? id)
}

async function guardar() {
  guardando.value = true
  try {
    await configuracionService.guardarVertical(
      Object.fromEntries(cambiados.value.map((c) => [c, valores.value[c]!])),
    )
    await cargar()
    ui.exito('Configuración de la cadena guardada.')
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo guardar la configuración.')
  } finally {
    guardando.value = false
  }
}

function descartar() {
  valores.value = { ...original.value }
}

/** Cómo se enseña un valor en el resumen de cambios: un booleano no es «true». */
function comoTexto(def: DefinicionParametro, valor?: ValorParametro) {
  if (valor === undefined) return '—'
  if (def.tipo === 'booleano') return valor ? 'sí' : 'no'
  return `${valor}${def.sufijo ? ` ${def.sufijo}` : ''}`
}

const definicionDe = (clave: string) =>
  grupos.flatMap((g) => g.parametros).find((p) => p.clave === clave)!
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <div v-for="{ grupo, parametros } in grupos" :key="grupo">
      <KmCard :titulo="grupo">
        <div class="flex flex-col gap-6">
          <div v-for="def in parametros" :key="def.clave" class="flex flex-col gap-2">
            <!-- Un booleano se explica dentro del propio interruptor. -->
            <KmSwitch
              v-if="def.tipo === 'booleano'"
              :model-value="valores[def.clave] === true"
              :etiqueta="def.etiqueta"
              :descripcion="def.descripcion"
              @update:model-value="valores[def.clave] = $event"
            />

            <KmField
              v-else
              v-slot="{ id }"
              :label="def.etiqueta"
              :ayuda="def.descripcion"
              class="max-w-md"
            >
              <KmNumero
                v-if="def.tipo === 'numero'"
                :id="id"
                :model-value="Number(valores[def.clave])"
                :min="def.minimo"
                :max="def.maximo"
                :sufijo="def.sufijo"
                @update:model-value="valores[def.clave] = $event ?? 0"
              />
              <KmSelect
                v-else-if="def.tipo === 'opcion'"
                :id="id"
                :model-value="String(valores[def.clave])"
                :opciones="
                  (def.opciones ?? []).map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))
                "
                @update:model-value="valores[def.clave] = $event ?? ''"
              />
              <KmInput
                v-else
                :id="id"
                :model-value="String(valores[def.clave] ?? '')"
                @update:model-value="valores[def.clave] = $event ?? ''"
              />
            </KmField>

            <!--
              Qué mueve el parámetro y quién puede apartarse de él. Sin esto, un
              interruptor con un nombre bonito es una invitación a no tocarlo.
            -->
            <div class="flex flex-wrap items-center gap-2 pl-0.5">
              <KmBadge :tono="def.alcance === 'vertical' ? 'azul' : 'salvia'">
                {{ def.alcance === 'vertical' ? 'De la cadena' : 'Ajustable por sede' }}
              </KmBadge>
              <span class="min-w-0 text-xs text-tenue">{{ def.efecto }}</span>
            </div>

            <p
              v-if="def.alcance === 'local' && sedesQueDifieren(def.clave).length"
              class="pl-0.5 text-xs text-coral-texto"
            >
              No afecta a {{ sedesQueDifieren(def.clave).join(', ') }}:
              {{ sedesQueDifieren(def.clave).length === 1 ? 'usa' : 'usan' }} un valor propio.
            </p>
          </div>
        </div>
      </KmCard>
    </div>

    <!--
      El resumen antes de guardar. Un parámetro cambia el comportamiento del
      hotel entero, así que conviene leer en una frase qué se está moviendo
      antes de confirmarlo.
    -->
    <KmCard v-if="cambiados.length" titulo="Lo que vas a cambiar">
      <ul class="flex flex-col gap-2">
        <li v-for="clave in cambiados" :key="clave" class="text-sm text-tinta">
          <strong>{{ definicionDe(clave).etiqueta }}</strong
          >:
          <span class="text-tenue line-through">
            {{ comoTexto(definicionDe(clave), original[clave]) }}
          </span>
          →
          <strong class="text-turquesa-texto">
            {{ comoTexto(definicionDe(clave), valores[clave]) }}
          </strong>
        </li>
      </ul>
    </KmCard>

    <div class="flex items-center justify-end gap-3">
      <KmButton v-if="cambiados.length" variante="fantasma" @click="descartar">Descartar</KmButton>
      <KmButton :cargando="guardando" :disabled="!cambiados.length || cargando" @click="guardar">
        {{ cambiados.length ? `Guardar ${cambiados.length} cambio(s)` : 'Sin cambios' }}
      </KmButton>
    </div>
  </div>
</template>
