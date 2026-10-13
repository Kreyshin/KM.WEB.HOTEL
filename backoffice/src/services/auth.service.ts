import type { Sesion } from '@/types'
import { db, latencia } from './mock/db'

export const authService = {
  /**
   * Mock: el usuario es el identificador anterior a @ del correo de la cuenta.
   * Cualquier contraseña es válida en demo.
   * Reemplazar por `http.post<Sesion>('/auth/login', { usuario, password })`.
   */
  async login(nombreUsuario: string, _password: string): Promise<Sesion> {
    const usuario = db.usuarios.find(
      (u) => u.email.split('@')[0]?.toLowerCase() === nombreUsuario.trim().toLowerCase(),
    )
    await latencia(null, 400)
    if (!usuario) {
      throw {
        mensaje: 'No existe una cuenta con ese usuario.',
        campos: { usuario: 'Usuario no registrado' },
      }
    }
    if (!usuario.activo) {
      throw { mensaje: 'La cuenta está desactivada. Contacta al administrador.' }
    }
    return { token: `mock.${usuario.id}.${Date.now()}`, usuario: structuredClone(usuario) }
  },

  async logout(): Promise<void> {
    await latencia(null, 100)
  },
}
