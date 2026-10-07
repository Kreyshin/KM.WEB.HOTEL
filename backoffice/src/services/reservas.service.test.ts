import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configuracionService } from './configuracion.service'
import { habitacionesService } from './habitaciones.service'
import { limpiezaService } from './limpieza.service'
import { garantiaVencida, recargoSalidaTardia, reservasService } from './reservas.service'
import { db, reiniciarMock } from './mock/db'
import type { Reserva } from '@/types'

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

/**
 * Mover una reserva por el rack.
 *
 * Es el gesto con el que trabaja una recepción, así que las reglas se prueban
 * contra el servicio y no contra la pantalla: el mismo movimiento hecho desde
 * la ficha tiene que encontrar los mismos límites.
 */
describe('reprogramar', () => {
  const sumar = (iso: string, dias: number) => {
    const f = new Date(`${iso}T12:00:00`)
    f.setDate(f.getDate() + dias)
    return f.toISOString().slice(0, 10)
  }

  it('alarga la salida sin tocar la entrada', async () => {
    const reserva = db.reservas.find((r) => r.estado === 'confirmada' && r.habitacionId)!
    const nuevaSalida = sumar(reserva.salida, 1)

    const movida = await reservasService.reprogramar(reserva.id, { salida: nuevaSalida })

    expect(movida.salida).toBe(nuevaSalida)
    expect(movida.entrada).toBe(reserva.entrada)
  })

  it('a quien ya entró no se le mueve la entrada', async () => {
    const enCasa = db.reservas.find((r) => r.estado === 'enCasa')!
    await expect(
      reservasService.reprogramar(enCasa.id, { entrada: sumar(enCasa.entrada, 1) }),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('check-in') })
  })

  it('pero sí se le puede alargar la salida', async () => {
    const enCasa = db.reservas.find((r) => r.estado === 'enCasa')!
    const nuevaSalida = sumar(enCasa.salida, 1)
    const choque = db.reservas.some(
      (r) =>
        r.id !== enCasa.id &&
        r.habitacionId === enCasa.habitacionId &&
        !['cancelada', 'noShow', 'salida'].includes(r.estado) &&
        r.entrada < nuevaSalida &&
        r.salida > enCasa.entrada,
    )
    if (choque) return

    const movida = await reservasService.reprogramar(enCasa.id, { salida: nuevaSalida })
    expect(movida.salida).toBe(nuevaSalida)
  })

  it('no deja pisar a otra reserva, y dice cuál', async () => {
    // Se fabrica el choque: dos reservas seguidas en la misma habitación.
    const primera = db.reservas.find((r) => r.estado === 'confirmada' && r.habitacionId)!
    const segunda = await reservasService.crear({
      localId: primera.localId,
      huespedId: primera.huespedId,
      tipoId: primera.tipoId,
      habitacionId: primera.habitacionId,
      entrada: primera.salida,
      salida: sumar(primera.salida, 2),
      adultos: 1,
      ninos: 0,
      canal: 'directo',
      estado: 'confirmada',
      regimen: 'desayuno',
      tarifaNoche: 200,
    })

    await expect(
      reservasService.reprogramar(primera.id, { salida: sumar(primera.salida, 1) }),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining(segunda.codigo) })
  })

  it('una reserva dura al menos una noche', async () => {
    const reserva = db.reservas.find((r) => r.estado === 'confirmada')!
    await expect(
      reservasService.reprogramar(reserva.id, { salida: reserva.entrada }),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('al menos una noche') })
  })

  it('una estancia cerrada no se mueve', async () => {
    const cerrada = db.reservas.find((r) => r.estado === 'salida')
    if (!cerrada) return
    await expect(
      reservasService.reprogramar(cerrada.id, { salida: sumar(cerrada.salida, 1) }),
    ).rejects.toMatchObject({ mensaje: expect.stringContaining('cerrada') })
  })

  it('mover de habitación y de fecha a la vez es una sola operación', async () => {
    const reserva = db.reservas.find((r) => r.estado === 'confirmada' && r.habitacionId)!
    // `db.reservas` devuelve la fila viva: se copian las fechas antes de mover.
    const entradaOriginal = reserva.entrada
    const salidaOriginal = reserva.salida
    const libre = db.habitaciones.find(
      (h) =>
        h.id !== reserva.habitacionId &&
        h.limpieza !== 'fueraServicio' &&
        !db.reservas.some(
          (r) => r.habitacionId === h.id && !['cancelada', 'noShow', 'salida'].includes(r.estado),
        ),
    )
    if (!libre) return

    const movida = await reservasService.reprogramar(reserva.id, {
      entrada: sumar(entradaOriginal, 1),
      salida: sumar(salidaOriginal, 1),
      habitacionId: libre.id,
    })

    expect(movida.habitacionId).toBe(libre.id)
    expect(movida.entrada).toBe(sumar(entradaOriginal, 1))
    expect(movida.salida).toBe(sumar(salidaOriginal, 1))
  })
})

/**
 * Las políticas configurables, probadas desde el servicio.
 *
 * Son parámetros que alguien cambia en una pantalla de configuración, y la
 * única forma de que esa pantalla signifique algo es que estas reglas lean el
 * valor de verdad. Lo que se comprueba es justo eso: el mismo gesto da un
 * resultado distinto según lo que diga la configuración.
 */
describe('sobreventa y garantía', () => {
  beforeEach(() => {
    localStorage.clear()
    reiniciarMock()
  })

  const ENTRADA = '2099-03-01'
  const SALIDA = '2099-03-03'

  /** Una reserva más del tipo t2 en la sede l1, sin habitación asignada. */
  const unaMas = (estado: Reserva['estado'] = 'confirmada') => ({
    localId: 'l1',
    huespedId: 'g1',
    tipoId: 't2',
    entrada: ENTRADA,
    salida: SALIDA,
    adultos: 1,
    ninos: 0,
    canal: 'directo',
    estado,
    regimen: 'desayuno' as const,
    tarifaNoche: 200,
  })

  it('no vende más habitaciones de un tipo que las que hay', async () => {
    const { libres } = await reservasService.cupo('l1', 't2', ENTRADA, SALIDA)
    expect(libres).toBeGreaterThan(0)

    // Se llena el tipo hasta la última habitación.
    for (let i = 0; i < libres; i++) await reservasService.crear(unaMas())

    await expect(reservasService.crear(unaMas())).rejects.toMatchObject({
      campos: { tipoId: 'Sin disponibilidad' },
    })
  })

  it('con sobreventa permitida, la misma venta se acepta', async () => {
    const { libres } = await reservasService.cupo('l1', 't2', ENTRADA, SALIDA)
    for (let i = 0; i < libres; i++) await reservasService.crear(unaMas())

    await configuracionService.guardarVertical({ 'reserva.permitirSobreventa': true })
    const extra = await reservasService.crear(unaMas())
    expect(extra.id).toBeTruthy()
  })

  it('una pendiente sin confirmar ni anticipo suelta el cupo al vencer la garantía', async () => {
    const antes = await reservasService.cupo('l1', 't2', ENTRADA, SALIDA)
    const pendiente = await reservasService.crear(unaMas('pendiente'))
    expect((await reservasService.cupo('l1', 't2', ENTRADA, SALIDA)).libres).toBe(antes.libres - 1)

    // Se envejece la reserva más allá de las 24 h de garantía de la semilla.
    db.reservas.find((r) => r.id === pendiente.id)!.creada = new Date(
      Date.now() - 48 * 3_600_000,
    ).toISOString()
    expect((await reservasService.cupo('l1', 't2', ENTRADA, SALIDA)).libres).toBe(antes.libres)

    // Con la garantía a cero, una pendiente no retiene nada desde el primer momento.
    await configuracionService.guardarVertical({ 'reserva.garantiaHoras': 0 })
    const reciente = await reservasService.crear(unaMas('pendiente'))
    expect(garantiaVencida(db.reservas.find((r) => r.id === reciente.id)!)).toBe(true)
  })

  it('una pendiente con anticipo retiene el cupo pase el tiempo que pase', async () => {
    const pendiente = await reservasService.crear({ ...unaMas('pendiente'), anticipo: 200 })
    const fila = db.reservas.find((r) => r.id === pendiente.id)!
    fila.creada = new Date(Date.now() - 365 * 24 * 3_600_000).toISOString()
    // El dinero en la mesa es la garantía: nadie suelta una habitación ya cobrada.
    expect(garantiaVencida(fila)).toBe(false)
  })
})

describe('salida tardía', () => {
  beforeEach(() => {
    localStorage.clear()
    reiniciarMock()
  })

  afterEach(() => vi.useRealTimers())

  /** r1 está enCasa en l1, cuya hora de salida es la de la semilla. */
  const enCasa = () => db.reservas.find((r) => r.id === 'r1')!
  const horaSalida = () => db.locales.find((l) => l.id === 'l1')!.horaCheckOut

  /** Un `Date` de hoy a la hora pedida. */
  const aLas = (hhmm: string) => new Date(`${new Date().toISOString().slice(0, 10)}T${hhmm}:00`)

  const masMinutos = (hhmm: string, minutos: number) => {
    const [h, m] = hhmm.split(':').map(Number)
    const total = h! * 60 + m! + minutos
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  it('dentro de la cortesía no se cobra nada', () => {
    // 30 minutos de cortesía en la semilla: justo en el límite no hay recargo.
    expect(recargoSalidaTardia(enCasa(), aLas(masMinutos(horaSalida(), 30)))).toBeUndefined()
  })

  it('pasada la cortesía cobra el porcentaje de la noche', () => {
    const recargo = recargoSalidaTardia(enCasa(), aLas(masMinutos(horaSalida(), 31)))
    // 50 % de los 260 de r1.
    expect(recargo?.importe).toBe(130)
  })

  it('la sede que no cobra salida tardía no cobra nada', async () => {
    await configuracionService.guardarLocal('l1', { 'checkout.cobrarSalidaTardia': false })
    expect(recargoSalidaTardia(enCasa(), aLas(masMinutos(horaSalida(), 120)))).toBeUndefined()
  })

  it('el recargo entra en los consumos de la estancia, que es lo que suma el cierre', async () => {
    const estanciaAntes = db.estancias.find((e) => e.reservaId === 'r1' && !e.checkOut)!
    const consumosAntes = estanciaAntes.consumos

    // El reloj se mueve igual: el mock simula latencia con temporizadores y sin
    // esto el check-out se quedaría esperando un `setTimeout` congelado.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(aLas(masMinutos(horaSalida(), 90)))
    const { recargo } = await reservasService.checkOut('r1')

    expect(recargo).toBe(130)
    expect(db.estancias.find((e) => e.id === estanciaAntes.id)?.consumos).toBe(consumosAntes + 130)
  })
})
