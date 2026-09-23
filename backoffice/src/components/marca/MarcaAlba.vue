<script setup lang="ts">
/**
 * Amanecer sobre el mar: isotipo de la vertical Hotelería.
 *
 * El sol naciente (arena) sobre las tres olas (azul noche) da el nombre del
 * producto, Alba, y su promesa: el turno que empieza con todo en orden. Los
 * colores son fijos: la marca no cambia con el tema de la interfaz.
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
      <linearGradient
        id="hs-sol"
        x1="164"
        y1="108"
        x2="348"
        y2="300"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#f8f2e5" />
        <stop offset="0.3" stop-color="#eadcbc" />
        <stop offset="0.68" stop-color="#d4b87d" />
        <stop offset="1" stop-color="#96773a" />
      </linearGradient>
      <linearGradient
        id="hs-ola-alta"
        x1="72"
        y1="300"
        x2="440"
        y2="372"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#6b9adb" />
        <stop offset="0.5" stop-color="#3a6bb5" />
        <stop offset="1" stop-color="#1f3a68" />
      </linearGradient>
      <linearGradient
        id="hs-ola-media"
        x1="60"
        y1="356"
        x2="452"
        y2="424"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#3a6bb5" />
        <stop offset="0.6" stop-color="#1f3a68" />
        <stop offset="1" stop-color="#101c33" />
      </linearGradient>
      <linearGradient
        id="hs-ola-baja"
        x1="48"
        y1="412"
        x2="464"
        y2="470"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#17294a" />
        <stop offset="1" stop-color="#080c14" />
      </linearGradient>
      <filter
        id="hs-sombra-alba"
        x="20"
        y="60"
        width="472"
        height="420"
        filterUnits="userSpaceOnUse"
        color-interpolation-filters="sRGB"
      >
        <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#060a12" flood-opacity="0.5" />
      </filter>
    </defs>

    <g :filter="'url(#hs-sombra-alba)'">
      <!-- Sol naciente: el disco asoma por detrás de la primera ola. -->
      <circle cx="256" cy="232" r="96" fill="url(#hs-sol)" />
      <!-- Rayos: tres trazos cortos, el gesto del amanecer. -->
      <path
        d="M256 88v36M146 128l24 26M366 128l-24 26"
        stroke="#d4b87d"
        stroke-width="16"
        stroke-linecap="round"
      />

      <path
        d="M60 316c48-26 86-26 132 0s98 26 146 0 82-26 122 2v40c-44-24-82-24-126 2s-100 26-146 0-84-26-128-2z"
        fill="url(#hs-ola-alta)"
      />
      <path
        d="M48 378c50-28 90-28 138 0s102 28 152 0 84-28 126 2v40c-46-26-86-26-132 2s-104 28-152 0-88-28-132-2z"
        fill="url(#hs-ola-media)"
      />
      <path
        d="M40 438c52-28 94-28 144 0s106 28 158 0 86-28 130 2v22H40z"
        fill="url(#hs-ola-baja)"
      />
    </g>
  </svg>
</template>
