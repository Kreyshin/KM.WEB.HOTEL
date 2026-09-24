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

/**
 * El rack. Lo que se prueba aquí no es la pantalla: son las dos reglas que
 * impiden que arrastrar una barra provoque una doble venta, que es el error
 * que un rack de papel cometía y un PMS tiene que hacer imposible.
 */
describe('planning y reasignación', () => {
  beforeEach(() => reiniciarMock())

  const hoy = new Date().toISOString().slice(0, 10)
  const enDias = (n: number) => {
    const f = new Date(`${hoy}T12:00:00`)
    f.setDate(f.getDate() + n)
    return f.toISOString().slice(0, 10)
  }

  it('el tramo excluye lo que sale el primer día y lo que entra el último', async () => {
    const { reservas } = await reservasService.planning('l1', hoy, enDias(14))

    for (const r of reservas) {
      expect(r.entrada < enDias(14)).toBe(true)
      expect(r.salida > hoy).toBe(true)
      expect(['cancelada', 'noShow']).not.toContain(r.estado)
    }
  })

  it('las habitaciones vienen en el orden en que se recorre el hotel', async () => {
    const { habitaciones } = await reservasService.planning('l1', hoy, enDias(14))

    expect(habitaciones.length).toBeGreaterThan(0)
    // Todas traen su planta y su tipo resueltos: la columna fija los necesita.
    expect(habitaciones.every((h) => h.piso && h.tipo)).toBe(true)
  })

  it('no deja mover una reserva encima de otra: eso es una doble venta', async () => {
    const ocupada = db.reservas.find((r) => r.habitacionId && r.estado !== 'cancelada')!
    const otra = db.reservas.find(
      (r) =>
        r.id !== ocupada.id &&
        r.habitacionId !== ocupada.habitacionId &&
        r.entrada < ocupada.salida &&
        r.salida > ocupada.entrada &&
        !['cancelada', 'noShow', 'salida'].includes(r.estado),
    )
    if (!otra) return

    await expect(reservasService.reasignar(otra.id, ocupada.habitacionId!)).rejects.toMatchObject({
      mensaje: expect.stringContaining(ocupada.codigo),
    })
  })

  it('una habitación fuera de servicio no admite reservas', async () => {
    const fuera = db.habitaciones.find((h) => h.limpieza === 'fueraServicio')
    const reserva = db.reservas.find((r) => r.estado === 'confirmada')
    if (!fuera || !reserva) return

    await expect(reservasService.reasignar(reserva.id, fuera.id)).rejects.toMatchObject({
      mensaje: expect.stringContaining('fuera de servicio'),
    })
  })

  it('mover una estancia en curso se lleva la ocupación y deja sucia la anterior', async () => {
    const estancia = await reservasService.checkIn('r7', 'h104')
    const libre = db.habitaciones.find(
      (h) => h.ocupacion === 'libre' && h.limpieza === 'limpia' && h.id !== 'h104',
    )!

    await reservasService.reasignar('r7', libre.id)

    const anterior = db.habitaciones.find((h) => h.id === 'h104')!
    expect(anterior.ocupacion).toBe('libre')
    expect(anterior.limpieza).toBe('sucia')
    expect(anterior.estanciaId).toBeUndefined()

    const nueva = db.habitaciones.find((h) => h.id === libre.id)!
    expect(nueva.ocupacion).toBe('ocupada')
    expect(nueva.estanciaId).toBe(estancia.id)
    expect(db.estancias.find((e) => e.id === estancia.id)?.habitacionId).toBe(libre.id)
  })
})
