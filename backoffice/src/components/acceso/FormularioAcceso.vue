<script setup lang="ts">
import { ref } from 'vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import { useAcceso } from '@/composables/useAcceso'

/**
 * Campos de acceso. Es la única pieza que habla con el store de sesión: las
 * variantes de la pantalla la envuelven y solo deciden qué hay alrededor.
 */
withDefaults(
  defineProps<{
    /** Texto del botón. «Entrar» en la portada, «Abrir turno» en las demás. */
    accion?: string
    /** Sobre fondo oscuro los textos de apoyo se aclaran. */
    sobreOscuro?: boolean
  }>(),
  { accion: 'Entrar', sobreOscuro: false },
)

const { usuario, password, errores, errorGeneral, enviar, auth, cuentasDemo } = useAcceso()
const mostrarPassword = ref(false)
const mostrarAyuda = ref(false)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="enviar">
    <KmField v-slot="{ id, invalido }" label="Usuario" :error="errores.usuario" requerido>
      <KmInput
        :id="id"
        v-model="usuario"
        type="text"
        autocomplete="username"
        placeholder="Tu usuario"
        :invalido="invalido"
      />
    </KmField>

    <KmField v-slot="{ id, invalido }" label="Contraseña" :error="errores.password" requerido>
      <div class="relative">
        <KmInput
          :id="id"
          v-model="password"
          :type="mostrarPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="••••••••"
          :invalido="invalido"
          class="pr-12"
        />
        <button
          type="button"
          class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-tenue hover:text-tinta"
          :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          :aria-pressed="mostrarPassword"
          @click="mostrarPassword = !mostrarPassword"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </KmField>

    <button
      type="button"
      class="self-end text-xs text-tenue hover:text-tinta"
      :aria-expanded="mostrarAyuda"
      @click="mostrarAyuda = !mostrarAyuda"
    >
      ¿Olvidaste tu contraseña?
    </button>
    <p v-if="mostrarAyuda" class="text-xs text-tenue" role="status">
      Contacta al administrador de tu hotel para recuperar el acceso.
    </p>

    <p
      v-if="errorGeneral"
      class="hs-tono hs-tono-coral rounded-control border px-3 py-2 text-sm font-medium"
    >
      {{ errorGeneral }}
    </p>

    <!-- `data-testid`: el texto del botón cambia con la variante, el gancho no. -->
    <KmButton
      type="submit"
      tamano="lg"
      bloque
      data-testid="acceso-enviar"
      :cargando="auth.cargando"
    >
      {{ accion }}
    </KmButton>

    <!--
      Las cuentas de prueba son parte del producto mientras no haya backend:
      cambiar de rol es la forma de ver cómo cambia el sistema.
    -->
    <details class="mt-1 text-xs text-tenue">
      <summary class="cursor-pointer hover:text-tinta">Probar con una cuenta demo</summary>
      <div class="mt-3">
        <p class="hs-etiqueta mb-2" :class="sobreOscuro ? 'text-white/55' : 'text-tenue'">
          Cuentas de prueba · cualquier contraseña
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in cuentasDemo"
            :key="c.usuario"
            type="button"
            class="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
            :class="
              usuario === c.usuario
                ? 'border-transparent bg-accion text-white'
                : sobreOscuro
                  ? 'border-white/20 text-white/70 hover:border-white/50 hover:text-white'
                  : 'border-linea text-tenue hover:border-azul hover:text-azul'
            "
            @click="usuario = c.usuario"
          >
            {{ c.rol }}
          </button>
        </div>
      </div>
    </details>
  </form>
</template>
