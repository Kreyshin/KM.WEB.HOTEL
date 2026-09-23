import type { Usuario } from '@/types'
import { validarEmail } from '@/utils/validaciones'
import { db } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const repo = crearRepositorio('usuarios', {
  prefijo: 'u',
  entidad: 'Usuario',
  camposBusqueda: ['nombre', 'email'],
})

function validar(datos: Partial<Omit<Usuario, 'id'>>, id?: string) {
  if (datos.nombre !== undefined && !datos.nombre.trim()) {
    throw errorCampo('nombre', 'El nombre es obligatorio.')
  }
  if (datos.email !== undefined) {
    if (!validarEmail(datos.email))
      throw errorCampo('email', 'El correo no tiene un formato válido.')
    if (existeOtro(db.usuarios, (u) => u.email, datos.email, id)) {
      throw errorCampo('email', 'Ya existe una cuenta con ese correo.', 'Correo duplicado')
    }
  }
  if (datos.activo === false && id) {
    const admins = db.usuarios.filter((u) => u.rol === 'admin' && u.activo && u.id !== id)
    if (!admins.length) throw { mensaje: 'Debe quedar al menos un administrador activo.' }
  }
}

export const usuariosService = {
  ...repo,

  /** Camareras de piso del turno, para asignar tareas. */
  async personalDePisos(): Promise<Usuario[]> {
    const { items } = await repo.consultar({
      filtros: { rol: 'gobernanta', activo: true },
      porPagina: 50,
    })
    return items
  },

  async crear(datos: Omit<Usuario, 'id'>): Promise<Usuario> {
    validar(datos)
    return repo.crear({ ...datos, email: datos.email.trim().toLowerCase() })
  },

  async actualizar(id: string, datos: Partial<Omit<Usuario, 'id'>>): Promise<Usuario> {
    validar(datos, id)
    return repo.actualizar(id, datos)
  },
}
