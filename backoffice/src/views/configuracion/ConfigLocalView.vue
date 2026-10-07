<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { configuracionService, porGrupo, valorParametro } from '@/services/configuracion.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { DefinicionParametro, ValorParametro } from '@/types'

/**
 * Lo que esta sede hace distinto del resto de la cadena.
 *
 * Toda la pantalla gira alrededor de una distinción: **heredado** o
 * **propio**. Heredado significa que la sede sigue a la cadena y se moverá con
 * ella el día que la cadena cambie; propio significa que se apartó a
 * conciencia y se queda donde está. Una pantalla de configuración que no
 * distingue las dos cosas es la que produce la pregunta imposible de un año
 * después: «¿esto está así porque alguien lo decidió o porque nadie lo tocó?».
 *
 * Por eso un valor que coincide con el de la cadena no se guarda como propio:
 * el servicio lo descarta, y el campo vuelve a decir «heredado».
 *
 * Aquí **no** se editan el nombre, la dirección ni las horas de la sede. Eso
 * es su ficha, y vive en Sedes: dos sitios para cambiar la hora de salida son
 * dos sitios donde dejarla distinta.
 */

const localStore = useLocalStore()
const ui = useUiStore()

/* Solo los parámetros que admiten valor por sede. Ofrecer aquí los de la
   cadena sería prometer algo que el servicio rechaza. */
const grupos = porGrupo('local')

const valores = ref<Record<string, ValorParametro>>({})
const original = ref<Record<string, ValorParametro>>({})
const propios = ref<Record<string, boolean>>({})
const guardando = ref(false)

const sede = computed(() => localStore.local)

function cargar() {
  const id = localStore.localId
  const efectivos = configuracionService.efectivos(id ?? undefined)
  const soloLocales = Object.fromEntries(
    grupos.flatMap((g) => g.parametros).map((p) => [p.clave, efectivos[p.clave]!]),
  )
  valores.value = { ...soloLocales }
  original.value = { ...soloLocales }
  propios.value = Object.fromEntries(
    Object.keys(soloLocales).map((c) => [c, id ? configuracionService.esPropio(id, c) : false]),
  )
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  cargar()
})

// Cambiar de sede en la barra recarga la pantalla: es otra sede, otros valores.
watch(() => localStore.localId, cargar)

const cambiados = computed(() =>
  Object.keys(valores.value).filter((c) => valores.value[c] !== original.value[c]),
)

/** El valor de la cadena, para poder decir de qué se está apartando la sede. */
const deLaCadena = (clave: string) => valorParametro(clave)

function comoTexto(def: DefinicionParametro, valor?: ValorParametro) {
  if (valor === undefined) return '—'
  if (def.tipo === 'booleano') return valor ? 'sí' : 'no'
  return `${valor}${def.sufijo ? ` ${def.sufijo}` : ''}`
}

async function guardar() {
  const id = localStore.localId
  if (!id) return
  guardando.value = true
  try {
    await configuracionService.guardarLocal(
      id,
      Object.fromEntries(cambiados.value.map((c) => [c, valores.value[c]!])),
    )
    cargar()
    ui.exito(`Configuración de ${sede.value?.nombre ?? 'la sede'} guardada.`)
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo guardar la configuración.')
  } finally {
    guardando.value = false
  }
}

/** Devolver una clave a lo que diga la cadena. Es el gesto inverso a apartarse. */
async function heredar(clave: string) {
  const id = localStore.localId
  if (!id) return
  try {
    await configuracionService.restablecer(id, clave)
    cargar()
    ui.exito('Vuelve a seguir a la cadena.')
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo restablecer.')
  }
}

function descartar() {
  valores.value = { ...original.value }
}

const propiosActivos = computed(() => Object.values(propios.value).filter(Boolean).length)
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <div v-if="!sede" class="hs-panel p-5">
      <p class="text-sm text-tenue">Elige una sede en la barra superior para configurarla.</p>
    </div>

    <template v-else>
      <!-- La ficha de la sede, de solo lectura: se mira aquí y se edita donde vive. -->
      <KmCard
        :titulo="sede.nombre"
        subtitulo="Lo que esta sede hace distinto. Los datos de la ficha se cambian en Sedes."
      >
        <div class="flex flex-col gap-4">
          <dl class="grid gap-4 sm:grid-cols-3">
            <div>
              <dt class="hs-etiqueta text-tenue">Entrada</dt>
              <dd class="hs-display text-lg text-tinta tabular-nums">{{ sede.horaCheckIn }}</dd>
            </div>
            <div>
              <dt class="hs-etiqueta text-tenue">Salida</dt>
              <dd class="hs-display text-lg text-tinta tabular-nums">{{ sede.horaCheckOut }}</dd>
            </div>
            <div>
              <dt class="hs-etiqueta text-tenue">Cód. SUNAT</dt>
              <dd class="font-mono text-sm text-tinta">{{ sede.codigoEstablecimiento }}</dd>
            </div>
          </dl>
          <p class="text-sm text-tenue">
            La hora de salida es la que usa el recargo por salida tardía.
            <RouterLink :to="{ name: 'sedes' }" class="text-turquesa-texto underline">
              Cambiarla en la ficha de la sede
            </RouterLink>
          </p>
        </div>
      </KmCard>

      <div v-for="{ grupo, parametros } in grupos" :key="grupo">
        <KmCard :titulo="grupo">
          <div class="flex flex-col gap-6">
            <div v-for="def in parametros" :key="def.clave" class="flex flex-col gap-2">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
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
                      :opciones="def.opciones ?? []"
                      @update:model-value="valores[def.clave] = $event ?? ''"
                    />
                    <KmInput
                      v-else
                      :id="id"
                      :model-value="String(valores[def.clave] ?? '')"
                      @update:model-value="valores[def.clave] = $event ?? ''"
                    />
                  </KmField>
                </div>

                <!--
                  Heredado o propio, dicho sin ambigüedad y con el camino de
                  vuelta a mano. Volver a heredar no es «restablecer por
                  defecto»: es dejar de ser la excepción.
                -->
                <div class="flex shrink-0 items-center gap-2">
                  <KmBadge :tono="propios[def.clave] ? 'coral' : 'neutro'" punto>
                    {{ propios[def.clave] ? 'Valor propio' : 'Heredado' }}
                  </KmBadge>
                  <KmBotonIcono
                    v-if="propios[def.clave]"
                    icono="anular"
                    etiqueta="Volver a seguir a la cadena"
                    :contexto="def.etiqueta"
                    @click="heredar(def.clave)"
                  />
                </div>
              </div>

              <p class="pl-0.5 text-xs text-tenue">{{ def.efecto }}</p>
              <p v-if="propios[def.clave]" class="pl-0.5 text-xs text-coral-texto">
                La cadena usa {{ comoTexto(def, deLaCadena(def.clave)) }}.
              </p>
            </div>
          </div>
        </KmCard>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-tenue">
          {{
            propiosActivos
              ? `${sede.nombre} se aparta de la cadena en ${propiosActivos} parámetro(s).`
              : `${sede.nombre} sigue a la cadena en todo.`
          }}
        </p>
        <div class="flex items-center gap-3">
          <KmButton v-if="cambiados.length" variante="fantasma" @click="descartar">
            Descartar
          </KmButton>
          <KmButton :cargando="guardando" :disabled="!cambiados.length" @click="guardar">
            {{ cambiados.length ? `Guardar ${cambiados.length} cambio(s)` : 'Sin cambios' }}
          </KmButton>
        </div>
      </div>
    </template>
  </div>
</template>
