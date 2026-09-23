<script setup lang="ts">
/**
 * Isotipo de la vertical Hotelería.
 *
 * Un techo en chevron —ala izquierda plata, ala derecha en degradado turquesa →
 * azul— cobijando una cama. Es el resumen del producto: el alojamiento (techo)
 * y la unidad que se vende (cama-noche).
 *
 * Los colores son fijos: la marca no cambia con el tema de la interfaz. Los
 * `id` de los degradados llevan el prefijo `hs-marca-` para no chocar con los
 * del isotipo de plataforma cuando ambos conviven en la misma página.
 */
withDefaults(defineProps<{ tamano?: number }>(), { tamano: 44 })
</script>

<template>
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 512 512"
    fill="none"
    role="img"
    aria-label="Alba · Hotelería"
  >
    <defs>
      <!-- Ala izquierda del techo: plata, del claro al grafito. -->
      <linearGradient
        id="hs-marca-plata"
        x1="70"
        y1="110"
        x2="250"
        y2="345"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#ccd3dc" />
        <stop offset="0.55" stop-color="#9aa6b6" />
        <stop offset="1" stop-color="#5c6a7d" />
      </linearGradient>

      <!-- Ala derecha: el degradado maestro, turquesa a azul profundo. -->
      <linearGradient
        id="hs-marca-degradado"
        x1="268"
        y1="96"
        x2="452"
        y2="342"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#22c9f2" />
        <stop offset="0.45" stop-color="#0a9fe0" />
        <stop offset="1" stop-color="#0e3a96" />
      </linearGradient>

      <!-- Cabecera de la cama: el mismo degradado, en vertical. -->
      <linearGradient
        id="hs-marca-cabecera"
        x1="256"
        y1="252"
        x2="256"
        y2="324"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#22c9f2" />
        <stop offset="1" stop-color="#1268ec" />
      </linearGradient>

      <!-- Base de la cama: plata que cae al negro azulado por la derecha. -->
      <linearGradient
        id="hs-marca-base"
        x1="120"
        y1="360"
        x2="400"
        y2="392"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#c3cbd6" />
        <stop offset="0.52" stop-color="#aab4c2" />
        <stop offset="0.62" stop-color="#3b4a60" />
        <stop offset="1" stop-color="#101827" />
      </linearGradient>
    </defs>

    <!-- Techo: dos alas que arrancan del vértice superior. -->
    <path d="M247 88 63 262v107a10 10 0 0 0 17 7l167-158z" fill="url(#hs-marca-plata)" />
    <path d="M265 88l184 174v107a10 10 0 0 1-17 7L265 218z" fill="url(#hs-marca-degradado)" />

    <!-- Cama: cabecera, base y dos patas. -->
    <path
      d="M172 324v-38a34 34 0 0 1 34-34h100a34 34 0 0 1 34 34v38z"
      fill="url(#hs-marca-cabecera)"
    />
    <rect x="118" y="322" width="276" height="86" rx="26" fill="url(#hs-marca-base)" />
    <rect x="134" y="398" width="34" height="46" rx="12" fill="#101827" />
    <rect x="344" y="398" width="34" height="46" rx="12" fill="#101827" />
  </svg>
</template>
