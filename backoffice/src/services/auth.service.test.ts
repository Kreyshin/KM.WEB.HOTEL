import { describe, expect, it } from 'vitest'
import { authService } from './auth.service'

describe('acceso por usuario', () => {
  it('acepta el usuario sin correo, ignorando espacios y mayúsculas', async () => {
    const sesion = await authService.login(' ADMIN ', 'demo')
    expect(sesion.usuario.email).toBe('admin@albahoteles.pe')
  })

  it('rechaza un correo como identificador de acceso', async () => {
    await expect(authService.login('admin@albahoteles.pe', 'demo')).rejects.toMatchObject({
      campos: { usuario: 'Usuario no registrado' },
    })
  })
})
