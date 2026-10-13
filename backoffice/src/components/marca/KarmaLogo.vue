<script setup lang="ts">
import novum from '@/assets/karma/karma-novum-icono.svg'
import systems from '@/assets/karma/karma-systems-logo.svg'

/** Activos oficiales, conservados sin modificar sus formas ni colores. */
withDefaults(defineProps<{ tamano?: number; marca?: 'novum' | 'systems' }>(), {
  tamano: 40,
  marca: 'novum',
})
</script>

<template>
  <img
    :src="marca === 'systems' ? systems : novum"
    :width="tamano"
    :height="tamano"
    :alt="marca === 'systems' ? 'Karma Systems' : 'Karma Novum'"
    class="block shrink-0 object-contain"
    decoding="async"
  />
</template>
