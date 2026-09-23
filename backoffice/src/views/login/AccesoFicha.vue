<script setup lang="ts">
import FormularioAcceso from '@/components/acceso/FormularioAcceso.vue'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import MarcaAlba from '@/components/marca/MarcaAlba.vue'
import { marca } from '@/config/marca'

/**
 * Variante «Llave»: el acceso dentro de una tarjeta-llave de habitación.
 *
 * No es un formulario con un marco bonito: es el objeto que se entrega en el
 * mostrador, con su ojal para el cordón, su chip y su banda magnética. Quien
 * entra al sistema recoge su llave.
 *
 * La vertical hermana usa la misma idea con su objeto de oficio —allí la pieza
 * es una comanda de cocina—, y de ahí viene el aire de familia entre ambas.
 */
const anio = new Date().getFullYear()
</script>

<template>
  <div class="acceso-fondo grid h-full place-items-center overflow-y-auto p-5 sm:p-8">
    <div class="w-full max-w-lg py-6">
      <!-- La marca va fuera: la llave no lleva el logotipo dos veces. -->
      <div class="mb-7 flex items-center justify-center gap-3">
        <MarcaAlba :tamano="38" />
        <div>
          <p class="hs-display text-lg leading-none font-semibold text-tinta">{{ marca.nombre }}</p>
          <p class="hs-etiqueta mt-1 text-turquesa-texto">{{ marca.descriptor }}</p>
        </div>
      </div>

      <article class="acceso-llave overflow-hidden rounded-overlay bg-panel">
        <header class="acceso-banda px-7 pt-6 pb-6">
          <div class="flex items-start justify-between gap-6">
            <div class="min-w-0">
              <p class="hs-etiqueta text-white/55">Llave de acceso</p>
              <p class="hs-display mt-2 text-[1.7rem] leading-none font-semibold text-white">
                Bienvenido de vuelta
              </p>
              <p class="mt-2.5 text-xs text-white/70">Pásala para abrir el turno de hoy.</p>
            </div>

            <!-- Ojal y chip: lo que convierte un marco en una pieza. -->
            <div class="flex shrink-0 flex-col items-end gap-3.5 pt-1">
              <span class="acceso-ojal" aria-hidden="true" />
              <span class="acceso-chip" aria-hidden="true" />
            </div>
          </div>

          <div class="acceso-magnetica mt-6" aria-hidden="true" />
        </header>

        <div class="px-7 pt-7 pb-8">
          <FormularioAcceso accion="Pasar la llave" />
        </div>

        <footer
          class="flex items-center justify-between gap-4 border-t border-dashed border-linea bg-panel-2 px-7 py-3.5"
        >
          <span class="font-mono text-[11px] tracking-widest text-tenue">N.º {{ anio }}-0001</span>
          <span class="flex items-center gap-2">
            <KarmaLogo :tamano="15" />
            <span class="text-[11px] text-tenue">{{ marca.plataforma }}</span>
          </span>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
/*
 * Fondo: los dos extremos del degradado del isotipo, abiertos en dos halos
 * sobre el lino de la vertical. Sin imágenes, así que escala a cualquier
 * pantalla sin pesar nada.
 */
.acceso-fondo {
  background-color: var(--hs-bg);
  background-image:
    radial-gradient(
      38rem 22rem at 6% -8%,
      color-mix(in srgb, var(--hs-turquesa-400) 70%, transparent),
      transparent 64%
    ),
    radial-gradient(
      34rem 20rem at 102% 108%,
      color-mix(in srgb, var(--hs-azul-600) 62%, transparent),
      transparent 66%
    );
}

/* La pieza se apoya ligeramente girada: descansa, no está pegada. */
.acceso-llave {
  border: 1px solid var(--hs-border);
  box-shadow: var(--hs-sombra-flotante);
  transform: rotate(-0.6deg);
}

.acceso-banda {
  background: linear-gradient(135deg, #0b1220 0%, #0a53cf 58%, #22c9f2 130%);
}

/* Ojal del cordón, troquelado en el canto superior. */
.acceso-ojal {
  width: 38px;
  height: 8px;
  border-radius: 999px;
  background: rgb(8 13 22 / 0.5);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.22);
}

/* Chip dorado: el guiño metálico de cualquier credencial. */
.acceso-chip {
  width: 36px;
  height: 27px;
  border-radius: 5px;
  background: linear-gradient(140deg, #f6e9c4 0%, #dcc178 46%, #a8843a 100%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.35);
  position: relative;
}

/* Los contactos del chip, insinuados con dos líneas. */
.acceso-chip::after {
  content: '';
  position: absolute;
  inset: 7px 5px;
  border-top: 1px solid rgb(120 90 30 / 0.55);
  border-bottom: 1px solid rgb(120 90 30 / 0.55);
}

.acceso-magnetica {
  height: 28px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    90deg,
    rgb(8 13 22 / 0.6) 0 7px,
    rgb(8 13 22 / 0.32) 7px 11px
  );
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .acceso-llave {
    transform: none;
  }
}
</style>
