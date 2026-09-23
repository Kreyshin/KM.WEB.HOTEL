<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KmButton from '@/components/ui/KmButton.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import MarcaAlba from '@/components/marca/MarcaAlba.vue'
import { marca } from '@/config/marca'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError } from '@/types'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const email = ref('admin@albahoteles.pe')
const password = ref('demo')
const errores = ref<Record<string, string>>({})
const errorGeneral = ref('')

async function enviar() {
  errores.value = {}
  errorGeneral.value = ''

  if (!email.value.trim()) {
    errores.value.email = 'Ingresa tu correo.'
    return
  }
  if (!password.value) {
    errores.value.password = 'Ingresa tu contraseña.'
    return
  }

  try {
    const sesion = await auth.login(email.value, password.value)
    ui.exito(`Bienvenido, ${sesion.usuario.nombre.split(' ')[0]}.`)
    const destino = (route.query.redirect as string) || '/inicio'
    router.push(destino)
  } catch (e) {
    const err = e as ApiError
    errorGeneral.value = err.mensaje ?? 'No se pudo iniciar sesión.'
    errores.value = err.campos ?? {}
  }
}

/** Accesos rápidos para probar las guardas por rol sin backend. */
const cuentasDemo = [
  { email: 'admin@albahoteles.pe', rol: 'Administrador' },
  { email: 'ana@albahoteles.pe', rol: 'Recepción' },
  { email: 'rosa@albahoteles.pe', rol: 'Gobernanta' },
  { email: 'julio@albahoteles.pe', rol: 'Mantenimiento' },
]
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

        <form class="mt-9 flex flex-col gap-4" @submit.prevent="enviar">
          <KmField v-slot="{ id, invalido }" label="Correo" :error="errores.email" requerido>
            <KmInput
              :id="id"
              v-model="email"
              type="email"
              autocomplete="username"
              placeholder="tucorreo@hotel.pe"
              :invalido="invalido"
            />
          </KmField>

          <KmField v-slot="{ id, invalido }" label="Contraseña" :error="errores.password" requerido>
            <KmInput
              :id="id"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              :invalido="invalido"
            />
          </KmField>

          <p
            v-if="errorGeneral"
            class="hs-tono hs-tono-coral rounded-control border px-3 py-2 text-sm font-medium"
          >
            {{ errorGeneral }}
          </p>

          <KmButton type="submit" tamano="lg" bloque :cargando="auth.cargando">Entrar</KmButton>
        </form>

        <div class="mt-9 rounded-card border border-linea bg-panel-2 p-4">
          <p class="hs-etiqueta mb-2.5 text-tenue">Cuentas de prueba · cualquier contraseña</p>
          <ul class="flex flex-col gap-0.5">
            <li v-for="c in cuentasDemo" :key="c.email">
              <button
                type="button"
                class="w-full rounded-control px-2 py-1.5 text-left text-xs text-tenue transition-colors hover:bg-seleccion hover:text-tinta"
                @click="email = c.email"
              >
                <span class="font-mono">{{ c.email }}</span>
                <span class="opacity-70"> · {{ c.rol }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
