import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import type { ApiError } from '@/types'

export interface CuentaDemo {
  usuario: string
  rol: string
}

/** Accesos rápidos para probar las guardas por rol sin backend. */
export const cuentasDemo: CuentaDemo[] = [
  { usuario: 'admin', rol: 'Administrador' },
  { usuario: 'ana', rol: 'Recepción' },
  { usuario: 'rosa', rol: 'Gobernanta' },
  { usuario: 'julio', rol: 'Mantenimiento' },
]

/**
 * Lógica de la pantalla de acceso, compartida por sus variantes visuales.
 *
 * Las variantes cambian la puesta en escena, nunca el comportamiento: validar,
 * autenticar y redirigir ocurre aquí una sola vez.
 */
export function useAcceso() {
  const auth = useAuthStore()
  const ui = useUiStore()
  const router = useRouter()
  const route = useRoute()

  const usuario = ref(cuentasDemo[0]!.usuario)
  const password = ref('demo')
  const errores = ref<Record<string, string>>({})
  const errorGeneral = ref('')

  async function enviar() {
    errores.value = {}
    errorGeneral.value = ''

    if (!usuario.value.trim()) {
      errores.value.usuario = 'Ingresa tu usuario.'
      return
    }
    if (!password.value) {
      errores.value.password = 'Ingresa tu contraseña.'
      return
    }

    try {
      const sesion = await auth.login(usuario.value, password.value)
      ui.exito(`Bienvenido, ${sesion.usuario.nombre.split(' ')[0]}.`)
      const destino = (route.query.redirect as string) || '/inicio'
      router.push(destino)
    } catch (e) {
      const err = e as ApiError
      errorGeneral.value = err.mensaje ?? 'No se pudo iniciar sesión.'
      errores.value = err.campos ?? {}
    }
  }

  return { auth, usuario, password, errores, errorGeneral, enviar, cuentasDemo }
}
