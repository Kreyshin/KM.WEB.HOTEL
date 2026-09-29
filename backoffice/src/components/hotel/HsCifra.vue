<script setup lang="ts">
/**
 * Una cifra de cabecera: el número grande con su nombre debajo.
 *
 * Existía como CSS dentro de Habitaciones, con el nombre `.hs-cifra`, que en
 * `main.css` ya significa otra cosa —la tipografía de cifra grande—. Al copiar
 * el bloque a otra pantalla salía sin caja y con el número enorme: el estilo
 * que se veía no era el que se creía estar usando. Aquí el nombre no choca con
 * nada porque vive dentro del componente.
 */

withDefaults(
  defineProps<{
    valor: string | number
    nombre: string
    /** `alerta` para lo que duele, `aviso` para lo que conviene mirar. */
    tono?: 'neutro' | 'alerta' | 'aviso'
  }>(),
  { tono: 'neutro' },
)
</script>

<template>
  <div class="caja">
    <span class="valor" :class="`es-${tono}`">{{ valor }}</span>
    <span class="nombre">{{ nombre }}</span>
  </div>
</template>

<style scoped>
.caja {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--hs-border);
  border-radius: var(--hs-radio-card, 12px);
  background-color: var(--hs-surface);
}

.valor {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--hs-text);
}

.valor.es-alerta {
  color: var(--hs-coral);
}

.valor.es-aviso {
  color: var(--hs-turquesa-texto);
}

.nombre {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hs-muted);
}
</style>
