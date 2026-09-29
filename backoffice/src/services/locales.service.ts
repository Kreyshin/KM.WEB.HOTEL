import type { Consulta, Local, LocalResuelto, NuevoLocal, Paginado } from '@/types'
import { validarHorario } from '@/utils/validaciones'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia } from './mock/db'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'
import { ubigeosService } from './ubigeos.service'

const repo = crearRepositorio('locales', {
  prefijo: 'l',
  entidad: 'Sede',
  camposBusqueda: ['nombre', 'direccion', 'codigoEstablecimiento'],
})

/** Abre el código de ubigeo en los tres nombres con los que se trabaja. */
function resolver(l: Local): LocalResuelto {
  const ubigeo = ubigeosService.obtener(l.ubigeoId)
  return {
    ...l,
    departamento: ubigeo?.departamento,
    provincia: ubigeo?.provincia,
    distrito: ubigeo?.distrito,
  }
}

function validar(datos: Partial<NuevoLocal>, id?: string) {
  if (datos.nombre !== undefined) {
    if (!datos.nombre.trim()) throw errorCampo('nombre', 'El nombre es obligatorio.')
    if (existeOtro(db.locales, (l) => l.nombre, datos.nombre, id)) {
      throw errorCampo('nombre', 'Ya existe una sede con ese nombre.', 'Nombre duplicado')
    }
  }
  if (datos.codigoEstablecimiento !== undefined) {
    if (!/^\d{4}$/.test(datos.codigoEstablecimiento)) {
      throw errorCampo(
        'codigoEstablecimiento',
        'El código de establecimiento tiene 4 dígitos.',
        'Usa 4 dígitos, p. ej. 0001',
      )
    }
    if (existeOtro(db.locales, (l) => l.codigoEstablecimiento, datos.codigoEstablecimiento, id)) {
      throw errorCampo(
        'codigoEstablecimiento',
        'Otra sede ya usa ese código de establecimiento.',
        'Código duplicado',
      )
    }
  }
  if (datos.ubigeoId !== undefined && datos.ubigeoId !== '') {
    if (!ubigeosService.obtener(datos.ubigeoId)) {
      throw errorCampo('ubigeoId', 'Ese distrito no está en el padrón de ubigeos.')
    }
  }
  if (datos.horario && Object.keys(validarHorario(datos.horario)).length) {
    throw errorCampo('horario', 'Revisa el horario: hay días con horas incompletas.')
  }
  if (datos.activo === false && id) {
    const quedanActivas = db.locales.some((l) => l.id !== id && l.activo)
    if (!quedanActivas) throw { mensaje: 'Debe quedar al menos una sede activa.' }
  }
}

/** Sedes del hotel con su horario de check-in/out y su código SUNAT. */
export const localesService = {
  ...repo,

  /*
   * La consulta se resuelve antes de filtrar para que buscar «Barranco» o
   * «Cusco» encuentre la sede: el distrito ya no es un campo suyo, es el
   * nombre que hay detrás de su código.
   */
  async consultar(consulta?: Consulta): Promise<Paginado<LocalResuelto>> {
    const resueltos = db.locales.map(resolver)
    return latencia(
      aplicarConsulta(resueltos, consulta, [
        'nombre',
        'direccion',
        'codigoEstablecimiento',
        'distrito',
        'provincia',
        'departamento',
      ]),
    )
  },

  async obtener(id: string): Promise<LocalResuelto> {
    return resolver(await repo.obtener(id))
  },

  async listarActivos(): Promise<Local[]> {
    const { items } = await repo.consultar({
      filtros: { activo: true },
      // Por código de establecimiento: la sede matriz (0001) es la que abre la sesión.
      orden: { campo: 'codigoEstablecimiento', direccion: 'asc' },
      porPagina: 100,
    })
    return items
  },

  async crear(datos: NuevoLocal): Promise<LocalResuelto> {
    validar(datos)
    return resolver(await repo.crear({ ...datos, nombre: datos.nombre.trim() }))
  },

  async actualizar(id: string, datos: Partial<NuevoLocal>): Promise<LocalResuelto> {
    validar(datos, id)
    return resolver(await repo.actualizar(id, datos))
  },

  async eliminar(id: string): Promise<void> {
    const enUso = db.pisos.some((p) => p.localId === id) || db.series.some((s) => s.localId === id)
    if (enUso) {
      throw {
        mensaje: 'No se puede eliminar: la sede tiene pisos o series. Desactívala en su lugar.',
      }
    }
    validar({ activo: false }, id)
    return repo.eliminar(id)
  },
}
