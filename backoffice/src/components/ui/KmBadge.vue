<script setup lang="ts">
import type { TonoHotel } from '@/types/ui'

withDefaults(defineProps<{ tono?: TonoHotel; punto?: boolean }>(), {
  tono: 'neutro',
  punto: false,
})

/** Los tonos se resuelven con color-mix en main.css, así valen en ambos temas. */
const clases: Record<TonoHotel, string> = {
  neutro: 'hs-tono-neutro',
  azul: 'hs-tono-azul',
  arena: 'hs-tono-arena',
  coral: 'hs-tono-coral',
  salvia: 'hs-tono-salvia',
}
</script>

<template>
  <span
    class="hs-tono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
    :class="clases[tono]"
  >
    <span
      v-if="punto"
      class="size-1.5 shrink-0 rounded-full"
      style="background-color: var(--hs-tono-color)"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
