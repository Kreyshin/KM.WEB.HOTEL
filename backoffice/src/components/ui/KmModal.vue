<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

withDefaults(defineProps<{ titulo?: string; ancho?: 'sm' | 'md' | 'lg' }>(), { ancho: 'md' })

const abierto = defineModel<boolean>({ required: true })

const anchos = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' } as const

function cerrar() {
  abierto.value = false
}

function alPresionarTecla(e: KeyboardEvent) {
  if (e.key === 'Escape') cerrar()
}

// El modal bloquea el scroll del body y escucha Escape solo mientras está abierto.
watch(abierto, (esta) => {
  document.body.style.overflow = esta ? 'hidden' : ''
  if (esta) window.addEventListener('keydown', alPresionarTecla)
  else window.removeEventListener('keydown', alPresionarTecla)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', alPresionarTecla)
})
</script>

<template>
  <Teleport to="body">
    <!--
      Antes aparecía y desaparecía de golpe: el `v-if` no anima nada, y al
      cerrar no había ni transición. Un diálogo que se planta en pantalla se
      lee como un salto, no como algo que se abre.
    -->
    <Transition name="hs-modal">
      <div v-if="abierto" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="hs-modal-velo absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cerrar" />

        <div
          role="dialog"
          aria-modal="true"
          class="hs-modal-caja relative w-full rounded-overlay border border-linea bg-panel shadow-2xl"
          :class="anchos[ancho]"
        >
          <header
            v-if="titulo || $slots.header"
            class="flex items-center justify-between border-b border-linea px-6 py-4"
          >
            <slot name="header">
              <h2 class="hs-titulo-seccion text-tinta">{{ titulo }}</h2>
            </slot>
            <button
              type="button"
              class="rounded-control p-1.5 text-tenue transition-colors hover:bg-seleccion hover:text-tinta"
              aria-label="Cerrar"
              @click="cerrar"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div class="max-h-[70vh] overflow-y-auto px-6 py-5">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="flex justify-end gap-2 border-t border-linea px-6 py-4"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * El velo funde y la caja sube un poco al entrar. Al salir baja lo justo:
 * salir siempre más corto que entrar, porque nadie quiere esperar a que se
 * vaya algo que ya cerró.
 */
.hs-modal-velo {
  transition: opacity var(--km-mov-normal) var(--km-curva);
}

.hs-modal-caja {
  transition:
    transform var(--km-mov-normal) var(--km-curva),
    opacity var(--km-mov-normal) var(--km-curva);
}

.hs-modal-enter-from .hs-modal-velo,
.hs-modal-leave-to .hs-modal-velo {
  opacity: 0;
}

.hs-modal-enter-from .hs-modal-caja {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.97);
}

.hs-modal-leave-to .hs-modal-caja {
  opacity: 0;
  transform: scale(0.98);
}

.hs-modal-leave-active .hs-modal-caja,
.hs-modal-leave-active .hs-modal-velo {
  transition-duration: var(--km-mov-rapido);
}
</style>
