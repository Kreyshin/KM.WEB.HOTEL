<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * Lista de etiquetas escrita a mano, con sugerencias.
 *
 * Nace de un dato que se veía y no se podía escribir: los servicios del tipo
 * de habitación salían en la ficha comercial sin ningún campo detrás. Un
 * `<input>` de texto separado por comas no vale —cada hotel acaba con «TV»,
 * «Tv 50"» y «televisor», y ningún filtro agrupa—, así que se ofrece lo de
 * siempre a un clic y se deja escribir lo raro.
 *
 * Añadir con Enter y quitar con Retroceso: no hay gesto que dependa del ratón.
 */

const props = withDefaults(
  defineProps<{
    id?: string
    /** Lo que se ofrece a un clic. No limita: se puede escribir cualquier cosa. */
    sugerencias?: string[]
    placeholder?: string
    maximo?: number
  }>(),
  { sugerencias: () => [], maximo: 20 },
)

const modelo = defineModel<string[]>({ default: () => [] })

const texto = ref('')

const disponibles = computed(() =>
  props.sugerencias.filter((s) => !modelo.value.some((v) => igual(v, s))),
)

const igual = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), 'es', { sensitivity: 'base' }) === 0

function anadir(valor: string) {
  const limpio = valor.trim()
  if (!limpio || modelo.value.length >= props.maximo) return
  if (modelo.value.some((v) => igual(v, limpio))) return
  modelo.value = [...modelo.value, limpio]
  texto.value = ''
}

function quitar(valor: string) {
  modelo.value = modelo.value.filter((v) => v !== valor)
}

function alTeclear(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    anadir(texto.value)
  } else if (e.key === 'Backspace' && !texto.value && modelo.value.length) {
    modelo.value = modelo.value.slice(0, -1)
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <ul v-if="modelo.length" class="flex flex-wrap gap-1.5">
      <li v-for="v in modelo" :key="v" class="km-etiqueta">
        <span>{{ v }}</span>
        <button
          type="button"
          class="km-etiqueta-quitar"
          :aria-label="`Quitar ${v}`"
          @click="quitar(v)"
        >
          ✕
        </button>
      </li>
    </ul>

    <input
      :id="id"
      v-model="texto"
      type="text"
      autocomplete="off"
      :placeholder="placeholder ?? 'Escribe y pulsa Enter'"
      class="hs-sin-anillo h-10 w-full rounded-control border border-linea bg-lienzo px-3 text-sm text-tinta outline-none focus:border-azul"
      @keydown="alTeclear"
      @blur="anadir(texto)"
    />

    <div v-if="disponibles.length" class="flex flex-wrap items-center gap-1.5">
      <span class="text-[11px] text-tenue">Habituales:</span>
      <button
        v-for="s in disponibles"
        :key="s"
        type="button"
        class="km-sugerencia"
        @click="anadir(s)"
      >
        + {{ s }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.km-etiqueta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.3rem 0.2rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--km-linea, currentColor);
  background: var(--hs-panel-2, transparent);
  font-size: 0.8rem;
  color: var(--hs-tinta, currentColor);
}

.km-etiqueta-quitar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  font-size: 0.65rem;
  color: var(--hs-tenue, currentColor);
  transition: background-color var(--km-mov-rapido) var(--km-curva);
}

.km-etiqueta-quitar:hover {
  background: var(--hs-seleccion, transparent);
  color: var(--hs-coral, currentColor);
}

.km-sugerencia {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px dashed var(--km-linea, currentColor);
  font-size: 0.75rem;
  color: var(--hs-tenue, currentColor);
  transition:
    color var(--km-mov-rapido) var(--km-curva),
    border-color var(--km-mov-rapido) var(--km-curva);
}

.km-sugerencia:hover {
  color: var(--hs-azul, currentColor);
  border-color: currentColor;
}
</style>
