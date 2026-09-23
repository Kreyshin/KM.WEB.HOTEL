import { beforeEach, describe, expect, it } from 'vitest'
import { habitacionesService } from './habitaciones.service'
import { limpiezaService } from './limpieza.service'
import { reservasService } from './reservas.service'
import { db, reiniciarMock } from './mock/db'

/**
 * El ciclo central de la vertical: habitación → reserva → estancia → tarea de
 * limpieza. Se prueban las reglas que hacen que los dos ejes de estado no se
 * pisen, porque son las que un backend tendrá que respetar igual.
 */
describe('ciclo de la estancia', () => {
  beforeEach(() => reiniciarMock())

  it('el check-in ocupa la habitación y abre la estancia', async () => {
    // r7 está confirmada para hoy sobre la 104, que está limpia.
    const estancia = await reservasService.checkIn('r7', 'h104')

    expect(db.reservas.find((r) => r.id === 'r7')?.estado).toBe('enCasa')
    const habitacion = db.habitaciones.find((h) => h.id === 'h104')
    expect(habitacion?.ocupacion).toBe('ocupada')
    expect(habitacion?.estanciaId).toBe(estancia.id)
    // La limpieza no se toca: entregar una habitación no la ensucia.
    expect(habitacion?.limpieza).toBe('limpia')
  })

  it('rechaza el check-in en una habitación que no está limpia', async () => {
    // La 102 está libre pero sucia: aún no pasó housekeeping.
    await expect(reservasService.checkIn('r7', 'h102')).rejects.toMatchObject({
      mensaje: expect.stringContaining('no está lista'),
    })
    expect(db.reservas.find((r) => r.id === 'r7')?.estado).toBe('confirmada')
  })

  it('el check-out libera la habitación, la deja sucia y abre la tarea de salida', async () => {
    const tareasAntes = db.tareas.length

    await reservasService.checkOut('r1')

    const habitacion = db.habitaciones.find((h) => h.id === 'h101')
    expect(habitacion?.ocupacion).toBe('libre')
    expect(habitacion?.limpieza).toBe('sucia')
    expect(habitacion?.estanciaId).toBeUndefined()
    expect(db.reservas.find((r) => r.id === 'r1')?.estado).toBe('salida')

    const nuevas = db.tareas.slice(tareasAntes)
    expect(nuevas).toHaveLength(1)
    expect(nuevas[0]).toMatchObject({ habitacionId: 'h101', tipo: 'salida', estado: 'pendiente' })
  })

  it('no cancela una reserva con el huésped dentro', async () => {
    await expect(reservasService.cancelar('r1', 'Se arrepintió')).rejects.toMatchObject({
      mensaje: expect.stringContaining('check-out'),
    })
  })
})

describe('los dos ejes de estado', () => {
  beforeEach(() => reiniciarMock())

  it('avanzar la tarea de limpieza arrastra el estado de la habitación', async () => {
    // k1 es la tarea de salida de la 102, que está sucia.
    await limpiezaService.cambiarEstado('k1', 'enCurso')
    expect(db.habitaciones.find((h) => h.id === 'h102')?.limpieza).toBe('enLimpieza')

    await limpiezaService.cambiarEstado('k1', 'terminada')
    const habitacion = db.habitaciones.find((h) => h.id === 'h102')
    expect(habitacion?.limpieza).toBe('limpia')
    // Entregarla limpia no la vende: la ocupación sigue siendo de recepción.
    expect(habitacion?.ocupacion).toBe('libre')
  })

  it('no vende una habitación fuera de servicio', async () => {
    await expect(habitacionesService.cambiarOcupacion('h108', 'ocupada')).rejects.toMatchObject({
      mensaje: expect.stringContaining('fuera de servicio'),
    })
  })

  it('no entrega una habitación sucia aunque esté libre', async () => {
    await expect(habitacionesService.cambiarOcupacion('h102', 'ocupada')).rejects.toMatchObject({
      mensaje: expect.stringContaining('sucia'),
    })
  })

  it('las habitaciones disponibles excluyen las comprometidas por otra reserva', async () => {
    const libres = await habitacionesService.disponibles('l1', 't2', '2099-01-01', '2099-01-03')
    // Sin reservas en 2099, la 104 (doble) está disponible.
    expect(libres.map((h) => h.id)).toContain('h104')
    // La 108 está bloqueada por la incidencia de mantenimiento.
    expect(libres.map((h) => h.id)).not.toContain('h108')
  })
})
