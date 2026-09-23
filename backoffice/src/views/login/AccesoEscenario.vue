<script setup lang="ts">
import { computed } from 'vue'
import FormularioAcceso from '@/components/acceso/FormularioAcceso.vue'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import MarcaAlba from '@/components/marca/MarcaAlba.vue'
import { marca } from '@/config/marca'

/**
 * Variante «Escenario»: la fachada del hotel a media noche.
 *
 * En vez de una ilustración de archivo, la escena se dibuja con la propia
 * unidad de negocio: cada ventana es una habitación y su luz dice en qué
 * estado está. Es la misma rejilla que el usuario verá en el tablero, contada
 * como fachada, así que la pantalla de acceso ya enseña el producto.
 *
 * La vertical hermana usa este mismo armazón con su unidad: allí las celdas
 * son mesas de un salón. De ahí el aire de familia entre ambas.
 */

type Estado = 'ocupada' | 'libre' | 'limpieza'

const FILAS = 4
const COLUMNAS = 11

/**
 * Patrón fijo, no aleatorio: una fachada que cambia en cada recarga parece un
 * error, y además impediría comparar capturas entre despliegues. Se escribe en
 * una sola cadena —`o` ocupada, `l` libre, `c` en limpieza— para que ningún
 * formateador pueda desalinear las filas.
 */
const PATRON = 'olooclooloo' + 'oolcooloolc' + 'looolcoolco' + 'ocolooolool'

const mapa: Record<string, Estado> = { o: 'ocupada', l: 'libre', c: 'limpieza' }

const ventanas = computed(() =>
  Array.from({ length: FILAS * COLUMNAS }, (_, i) => {
    const fila = Math.floor(i / COLUMNAS)
    const columna = i % COLUMNAS
    return {
      id: `${fila}-${columna}`,
      estado: mapa[PATRON[i] ?? 'l'] ?? 'libre',
      // El encendido se escalona por diagonales: la fachada despierta, no parpadea.
      retardo: `${(fila + columna) * 70}ms`,
    }
  }),
)

const leyenda: { estado: Estado; etiqueta: string }[] = [
  { estado: 'ocupada', etiqueta: 'Ocupada' },
  { estado: 'libre', etiqueta: 'Libre' },
  { estado: 'limpieza', etiqueta: 'En limpieza' },
]
</script>

<template>
  <div class="grid h-full lg:grid-cols-[1.1fr_1fr]">
    <!-- Escena -->
    <div class="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
      <div class="absolute inset-0 bg-[#080d16]" />
      <div
        class="absolute inset-x-0 top-0 h-2/3 opacity-60"
        style="background: radial-gradient(60rem 30rem at 50% -20%, #0e3a96 0%, transparent 70%)"
      />

      <header class="relative flex items-center gap-3.5">
        <MarcaAlba :tamano="44" />
        <div>
          <p class="hs-display text-xl leading-none font-semibold text-[#f4f7fa]">
            {{ marca.nombre }}
          </p>
          <p class="hs-etiqueta mt-1.5 text-[#22c9f2]">{{ marca.descriptor }}</p>
        </div>
      </header>

      <!-- La fachada: una ventana por habitación. -->
      <div class="relative my-6 flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div
          class="acceso-fachada w-full max-w-[26rem] rounded-t-card border-x border-t border-white/10 px-4 pt-5 pb-0"
        >
          <div
            class="grid gap-[7px]"
            :style="{ gridTemplateColumns: `repeat(${COLUMNAS}, minmax(0, 1fr))` }"
            role="img"
            :aria-label="`Fachada del hotel con ${FILAS * COLUMNAS} habitaciones en distintos estados`"
          >
            <span
              v-for="v in ventanas"
              :key="v.id"
              class="acceso-ventana"
              :class="`es-${v.estado}`"
              :style="{ animationDelay: v.retardo }"
            />
          </div>

          <!-- Zócalo: marquesina y puerta, para que la rejilla lea como edificio. -->
          <div class="mt-4 flex items-end justify-center border-t border-white/10 pt-3">
            <span class="acceso-puerta" aria-hidden="true" />
          </div>
        </div>
      </div>

      <!-- Acera: el filete de la marca cierra la escena por abajo. -->
      <div class="hs-filete relative" role="presentation" />

      <div class="relative">
        <h1
          class="hs-display mt-8 max-w-sm text-[2.4rem] leading-[1.12] font-semibold text-[#f4f7fa]"
        >
          {{ marca.lema }}
        </h1>

        <ul class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          <li
            v-for="l in leyenda"
            :key="l.estado"
            class="flex items-center gap-2 text-xs text-[#9aa6b6]"
          >
            <span class="acceso-punto" :class="`es-${l.estado}`" aria-hidden="true" />
            {{ l.etiqueta }}
          </li>
        </ul>

        <div class="mt-8 flex items-center gap-2.5">
          <KarmaLogo :tamano="18" />
          <p class="text-xs text-[#8593a6]">{{ marca.plataforma }}</p>
        </div>
      </div>
    </div>

    <!-- Acceso -->
    <div class="flex items-center justify-center bg-panel p-6">
      <div class="w-full max-w-sm">
        <div class="mb-9 flex items-center gap-3 lg:hidden">
          <MarcaAlba :tamano="40" />
          <p class="hs-display text-lg leading-none font-semibold text-tinta">{{ marca.nombre }}</p>
        </div>

        <p class="hs-etiqueta text-turquesa-texto">Recepción</p>
        <h2 class="hs-titulo-pagina mt-2 text-tinta">Abre tu turno</h2>
        <p class="mt-2 text-sm text-tenue">
          El hotel ya está despierto. Entra para ver cómo amaneció.
        </p>

        <div class="mt-8">
          <FormularioAcceso accion="Abrir turno" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * La fachada se insinúa con un degradado vertical: arriba se funde con la
 * noche, abajo se apoya en la acera.
 */
.acceso-fachada {
  background: linear-gradient(180deg, rgb(17 24 39 / 0.2) 0%, rgb(17 24 39 / 0.9) 100%);
  backdrop-filter: blur(2px);
}

.acceso-ventana {
  display: block;
  aspect-ratio: 2 / 3;
  border-radius: 2px;
  opacity: 0;
  animation: acceso-encender 0.7s ease-out forwards;
}

/* Ocupada: luz cálida detrás del cristal. */
.acceso-ventana.es-ocupada {
  background: linear-gradient(180deg, #22c9f2 0%, #1268ec 100%);
  box-shadow: 0 0 10px -1px rgb(34 201 242 / 0.5);
}

/* Libre: el cristal refleja la noche. */
.acceso-ventana.es-libre {
  background: rgb(148 163 184 / 0.14);
  border: 1px solid rgb(148 163 184 / 0.2);
}

/* La entrada, iluminada bajo la marquesina. */
.acceso-puerta {
  width: 46px;
  height: 30px;
  border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, rgb(34 201 242 / 0.55) 0%, rgb(18 104 236 / 0.25) 100%);
  box-shadow: 0 -6px 26px -4px rgb(34 201 242 / 0.5);
}

/* En limpieza: la luz de servicio, más tenue y en movimiento. */
.acceso-ventana.es-limpieza {
  background: rgb(34 201 242 / 0.28);
  animation:
    acceso-encender 0.7s ease-out forwards,
    acceso-servicio 3.2s ease-in-out infinite 1.2s;
}

.acceso-punto {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  display: inline-block;
}

.acceso-punto.es-ocupada {
  background: linear-gradient(180deg, #22c9f2 0%, #1268ec 100%);
}

.acceso-punto.es-libre {
  background: rgb(148 163 184 / 0.3);
  border: 1px solid rgb(148 163 184 / 0.45);
}

.acceso-punto.es-limpieza {
  background: rgb(34 201 242 / 0.45);
}

@keyframes acceso-encender {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes acceso-servicio {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

/* Quien pide menos movimiento ve la fachada encendida, sin transición. */
@media (prefers-reduced-motion: reduce) {
  .acceso-ventana,
  .acceso-ventana.es-limpieza {
    opacity: 1;
    animation: none;
  }
}
</style>
