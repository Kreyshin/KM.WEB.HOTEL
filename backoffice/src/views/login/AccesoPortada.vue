<script setup lang="ts">
import FormularioAcceso from '@/components/acceso/FormularioAcceso.vue'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import MarcaAlba from '@/components/marca/MarcaAlba.vue'
import { marca } from '@/config/marca'

/**
 * Variante «Portada»: la de siempre. Mitad manifiesto, mitad formulario.
 *
 * Es la más sobria de las tres y la que mejor funciona cuando la pantalla se
 * usa para presentar el producto a alguien que no lo conoce.
 */
</script>

<template>
  <div class="grid h-full lg:grid-cols-[1.05fr_1fr]">
    <!--
      Portada: negro azulado con el degradado del isotipo al fondo, turquesa
      arriba y azul abajo. Sobria, sin fotografía, con el peso puesto en la
      tipografía y en la marca de la vertical.
    -->
    <div class="relative hidden flex-col justify-between overflow-hidden p-14 lg:flex">
      <div class="absolute inset-0 bg-[#0b1220]" />
      <div
        class="absolute top-[-20rem] left-1/2 size-[46rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style="background: radial-gradient(circle, #22c9f2 0%, transparent 65%)"
      />
      <div
        class="absolute right-[-14rem] bottom-[-18rem] size-[40rem] rounded-full opacity-45 blur-3xl"
        style="background: radial-gradient(circle, #0a53cf 0%, transparent 70%)"
      />

      <!-- Filigrana del isotipo, a gran escala y muy tenue. -->
      <MarcaAlba
        :tamano="520"
        class="pointer-events-none absolute right-[-9rem] bottom-[-7rem] opacity-[0.08]"
        aria-hidden="true"
      />

      <div class="relative flex items-center gap-3.5">
        <MarcaAlba :tamano="46" />
        <div>
          <p class="hs-display text-xl leading-none font-semibold text-[#f4f7fa]">
            {{ marca.nombre }}
          </p>
          <p class="hs-etiqueta mt-1.5 text-[#22c9f2]">{{ marca.descriptor }}</p>
        </div>
      </div>

      <div class="relative">
        <h1 class="hs-display max-w-lg text-[3.3rem] leading-[1.06] font-semibold text-[#f4f7fa]">
          {{ marca.lema }}
        </h1>

        <div class="hs-filete mt-8 max-w-md" role="presentation" />

        <ul class="mt-7 flex max-w-md flex-col gap-3.5">
          <li
            v-for="c in marca.capacidades"
            :key="c"
            class="flex items-start gap-3 text-sm text-[#c0cbd9]"
          >
            <span class="mt-[7px] size-1 shrink-0 rounded-full bg-[#22c9f2]" aria-hidden="true" />
            {{ c }}
          </li>
        </ul>
      </div>

      <!-- La pertenencia a la plataforma se mantiene explícita. -->
      <div class="relative flex items-center gap-2.5">
        <KarmaLogo :tamano="20" />
        <p class="text-xs text-[#8593a6]">{{ marca.plataforma }}</p>
      </div>
    </div>

    <!-- Formulario -->
    <div class="flex items-center justify-center bg-panel p-6">
      <div class="w-full max-w-sm">
        <div class="mb-10 flex items-center gap-3 lg:hidden">
          <MarcaAlba :tamano="42" />
          <div>
            <p class="hs-display text-lg leading-none font-semibold text-tinta">
              {{ marca.nombre }}
            </p>
            <p class="hs-etiqueta mt-1.5 text-turquesa-texto">{{ marca.descriptor }}</p>
          </div>
        </div>

        <h2 class="hs-titulo-pagina text-tinta">Iniciar sesión</h2>
        <p class="mt-2 text-sm text-tenue">Ingresa con tu cuenta del hotel.</p>

        <div class="mt-9">
          <FormularioAcceso />
        </div>
      </div>
    </div>
  </div>
</template>
