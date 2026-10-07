import { beforeEach, describe, expect, it } from 'vitest'
import { configuracionService } from './configuracion.service'
import { habitacionesService } from './habitaciones.service'
import { limpiezaService } from './limpieza.service'
import { db, reiniciarMock } from './mock/db'

/**
 * El tablero de pisos.
 *
 * Lo que se prueba es que el trabajo se pueda abrir, repartir y mover en los
 * dos sentidos, que es lo que hace una gobernanta en una mañana. La regla que
 * más importa es la de no abrir dos tareas para la misma puerta: dos camareras
 * subiendo a la misma habitación es el error que nadie ve hasta que pasa.
 */

const LOCAL = 'l1'

beforeEach(() => {
  localStorage.clear()
  reiniciarMock()
})

describe('limpiezaService', () => {
  it('abre una tarea a mano y la deja pendiente', async () => {
    const libre = db.habitaciones.find(
      (h) => !db.tareas.some((t) => t.habitacionId === h.id && t.estado !== 'terminada'),
    )!

    const tarea = await limpiezaService.crear({
      habitacionId: libre.id,
      tipo: 'repaso',
      estado: 'pendiente',
      prioridad: 'normal',
      minutosEstimados: 0,
    })

    expect(tarea.estado).toBe('pendiente')
    expect(tarea.habitacion?.numero).toBe(libre.numero)
    // Sin minutos, los pone el tipo de trabajo.
    expect(tarea.minutosEstimados).toBe(15)
  })

  it('se niega a abrir una segunda tarea para la misma habitación', async () => {
    const abierta = db.tareas.find((t) => t.estado !== 'terminada')!

    await expect(
      limpiezaService.crear({
        habitacionId: abierta.habitacionId,
        tipo: 'salida',
        estado: 'pendiente',
        prioridad: 'normal',
        minutosEstimados: 30,
      }),
    ).rejects.toMatchObject({ campos: { habitacionId: expect.stringContaining('ya tiene') } })
  })

  it('abre el turno solo para las sucias sin tarea, y no repite', async () => {
    const antes = limpiezaService.pendientesDeGenerar(LOCAL)
    const nuevas = await limpiezaService.generarDelTurno(LOCAL)

    expect(nuevas).toHaveLength(antes)
    expect(nuevas.every((t) => t.estado === 'pendiente')).toBe(true)
    // Una ocupada se limpia en estancia; una libre es una salida.
    for (const t of nuevas) {
      const esperado = t.habitacion?.ocupacion === 'ocupada' ? 'estancia' : 'salida'
      expect(t.tipo).toBe(esperado)
    }
    expect(await limpiezaService.generarDelTurno(LOCAL)).toHaveLength(0)
  })

  it('devuelve la tarea a la fase anterior y la habitación con ella', async () => {
    const tarea = db.tareas.find((t) => t.estado !== 'terminada')!
    await limpiezaService.cambiarEstado(tarea.id, 'revisar')

    const devuelta = await limpiezaService.cambiarEstado(tarea.id, 'enCurso')

    expect(devuelta.estado).toBe('enCurso')
    expect(db.habitaciones.find((h) => h.id === tarea.habitacionId)?.limpieza).toBe('enLimpieza')
  })

  it('no toca una habitación fuera de servicio', async () => {
    const fuera = db.habitaciones.find((h) => h.limpieza === 'fueraServicio')!
    const tarea = await limpiezaService.crear({
      habitacionId: fuera.id,
      tipo: 'profunda',
      estado: 'pendiente',
      prioridad: 'normal',
      minutosEstimados: 90,
    })

    await limpiezaService.cambiarEstado(tarea.id, 'terminada')

    expect(db.habitaciones.find((h) => h.id === fuera.id)?.limpieza).toBe('fueraServicio')
  })
})

/**
 * La inspección, que no todas las casas hacen.
 *
 * Es el parámetro por sede más visible de la vertical: cambia las columnas
 * del tablero y el número de manos por las que pasa una habitación. En la
 * semilla, l1 inspecciona y l2 no, y las dos tienen razón.
 */
describe('fases según la sede', () => {
  const sedeDeTarea = (habitacionId: string) => {
    const habitacion = db.habitaciones.find((h) => h.id === habitacionId)!
    return db.pisos.find((p) => p.id === habitacion.pisoId)!.localId
  }

  it('donde se inspecciona hay cuatro fases, y donde no, tres', () => {
    expect(limpiezaService.fases('l1')).toEqual(['pendiente', 'enCurso', 'revisar', 'terminada'])
    expect(limpiezaService.fases('l2')).toEqual(['pendiente', 'enCurso', 'terminada'])
  })

  it('no admite «por revisar» en una sede que no inspecciona', async () => {
    const tarea = db.tareas[0]!
    const sede = sedeDeTarea(tarea.habitacionId)
    expect(sede).toBe(LOCAL)

    // Con la inspección puesta, la fase existe.
    await limpiezaService.cambiarEstado(tarea.id, 'revisar')
    expect(db.habitaciones.find((h) => h.id === tarea.habitacionId)?.limpieza).toBe('inspeccion')

    // Quitada, la misma llamada se rechaza: una tarea «a revisar» sin nadie que
    // la apruebe es trabajo acabado que se queda colgado para siempre.
    await configuracionService.guardarLocal(LOCAL, { 'limpieza.requiereInspeccion': false })
    await expect(limpiezaService.cambiarEstado(tarea.id, 'revisar')).rejects.toMatchObject({
      mensaje: expect.stringContaining('no inspecciona'),
    })
  })

  it('tampoco deja poner la habitación «a inspección» por el otro camino', async () => {
    await configuracionService.guardarLocal(LOCAL, { 'limpieza.requiereInspeccion': false })
    const habitacion = db.habitaciones.find((h) => sedeDeTarea(h.id) === LOCAL)!

    await expect(
      habitacionesService.cambiarLimpieza(habitacion.id, 'inspeccion'),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('no inspecciona') })
  })
})
