/**
 * "Base de datos" en memoria + localStorage para el modo mock.
 *
 * Sustituible por completo: cuando llegue el backend real, los servicios dejan
 * de importar este módulo y esta carpeta se borra.
 */

import type {
  ConfigImpuestos,
  Empresa,
  Estancia,
  Habitacion,
  HorarioDia,
  Huesped,
  Incidencia,
  Insumo,
  Local,
  Motivo,
  Movimiento,
  Piso,
  Reserva,
  RegistroAuditoria,
  Rol,
  SerieComprobante,
  TareaLimpieza,
  TarifaCanal,
  Temporada,
  TipoHabitacion,
  Turno,
  Usuario,
  ValoresConfiguracion,
} from '@/types'
import { simularRed } from './red'

/**
 * La clave lleva versión: al cambiar la forma de los datos se sube el número y
 * los navegadores con la semilla anterior parten de cero en vez de romperse.
 */
const CLAVE = 'km.hotel.mock.v1'

export interface Esquema {
  empresa: Empresa
  impuestos: ConfigImpuestos
  locales: Local[]
  usuarios: Usuario[]
  pisos: Piso[]
  tiposHabitacion: TipoHabitacion[]
  habitaciones: Habitacion[]
  huespedes: Huesped[]
  reservas: Reserva[]
  estancias: Estancia[]
  tareas: TareaLimpieza[]
  incidencias: Incidencia[]
  temporadas: Temporada[]
  tarifasCanal: TarifaCanal[]
  insumos: Insumo[]
  movimientos: Movimiento[]
  series: SerieComprobante[]
  motivos: Motivo[]
  turnos: Turno[]
  bitacora: RegistroAuditoria[]
  permisosPorRol: Record<Rol, string[]>
  configuracion: ValoresConfiguracion
}

/** Horario semanal con el mismo turno todos los días. Recepción es 24 h. */
function horarioSemanal(apertura: string, cierre: string): HorarioDia[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
    dia: dia as HorarioDia['dia'],
    abierto: true,
    apertura,
    cierre,
  }))
}

/** `YYYY-MM-DD` desplazado `dias` desde hoy. Las fechas del mock son relativas. */
function dia(dias: number) {
  const f = new Date()
  f.setDate(f.getDate() + dias)
  const mes = String(f.getMonth() + 1).padStart(2, '0')
  return `${f.getFullYear()}-${mes}-${String(f.getDate()).padStart(2, '0')}`
}

/** ISO de hace `minutos` minutos. */
function hace(minutos: number) {
  return new Date(Date.now() - minutos * 60_000).toISOString()
}

/**
 * Habitaciones de un piso: numeración `<nivel><01..n>` repartida en dos hileras
 * enfrentadas, como un pasillo real. El plano del piso las pinta con posX/posY.
 */
function habitacionesDePiso(
  pisoId: string,
  nivel: number,
  tipos: string[],
  desde = 1,
): Habitacion[] {
  return tipos.map((tipoId, i) => {
    const indice = desde + i
    const fila = i % 2 === 0 ? 30 : 68
    const columna = 8 + Math.floor(i / 2) * 17
    return {
      id: `h${nivel}${String(indice).padStart(2, '0')}`,
      numero: `${nivel}${String(indice).padStart(2, '0')}`,
      pisoId,
      tipoId,
      ocupacion: 'libre',
      limpieza: 'limpia',
      posX: Math.min(columna, 92),
      posY: fila,
      actualizada: hace(600),
    } satisfies Habitacion
  })
}

function semilla(): Esquema {
  const pisos: Piso[] = [
    { id: 'p1', nombre: 'Primer piso', localId: 'l1', nivel: 1, orden: 1, activo: true },
    { id: 'p2', nombre: 'Segundo piso', localId: 'l1', nivel: 2, orden: 2, activo: true },
    {
      id: 'p3',
      nombre: 'Tercer piso · Suites',
      localId: 'l1',
      nivel: 3,
      orden: 3,
      descripcion: 'Planta alta con vista al mar',
      activo: true,
    },
    { id: 'p4', nombre: 'Primer piso', localId: 'l2', nivel: 1, orden: 1, activo: true },
  ]

  const habitaciones: Habitacion[] = [
    ...habitacionesDePiso('p1', 1, ['t1', 't1', 't2', 't2', 't2', 't3', 't3', 't1']),
    ...habitacionesDePiso('p2', 2, ['t2', 't2', 't2', 't3', 't3', 't3', 't4', 't2']),
    ...habitacionesDePiso('p3', 3, ['t4', 't4', 't5', 't5']),
    ...habitacionesDePiso('p4', 1, ['t1', 't2', 't2', 't3']),
  ]

  /** Estado vivo: lo que se ve al abrir el tablero un día cualquiera a media mañana. */
  const estadoInicial: Record<
    string,
    Partial<Pick<Habitacion, 'ocupacion' | 'limpieza' | 'estanciaId' | 'nota' | 'asignadaAId'>>
  > = {
    h101: { ocupacion: 'ocupada', limpieza: 'sucia', estanciaId: 'e1' },
    h102: { ocupacion: 'libre', limpieza: 'sucia', asignadaAId: 'u4' },
    h103: { ocupacion: 'ocupada', limpieza: 'limpia', estanciaId: 'e2' },
    h104: { ocupacion: 'reservada', limpieza: 'limpia' },
    h105: { ocupacion: 'libre', limpieza: 'enLimpieza', asignadaAId: 'u4' },
    h106: { ocupacion: 'ocupada', limpieza: 'sucia', estanciaId: 'e3' },
    h108: {
      ocupacion: 'bloqueada',
      limpieza: 'fueraServicio',
      nota: 'Fuga en el baño · parte de mantenimiento abierto',
    },
    h201: { ocupacion: 'ocupada', limpieza: 'limpia', estanciaId: 'e4' },
    h202: { ocupacion: 'libre', limpieza: 'inspeccion', asignadaAId: 'u5' },
    h203: { ocupacion: 'reservada', limpieza: 'limpia' },
    h204: { ocupacion: 'ocupada', limpieza: 'sucia', estanciaId: 'e5' },
    h206: { ocupacion: 'libre', limpieza: 'sucia', asignadaAId: 'u5' },
    h207: { ocupacion: 'ocupada', limpieza: 'limpia', estanciaId: 'e6' },
    h301: { ocupacion: 'ocupada', limpieza: 'limpia', estanciaId: 'e7' },
    h302: { ocupacion: 'reservada', limpieza: 'limpia' },
    h303: { ocupacion: 'libre', limpieza: 'enLimpieza', asignadaAId: 'u4' },
  }

  for (const h of habitaciones) {
    const estado = estadoInicial[h.id]
    if (estado) Object.assign(h, estado, { actualizada: hace(20 + Math.random() * 300) })
  }

  return {
    empresa: {
      ruc: '20512345678',
      razonSocial: 'Hoteles Alba del Pacífico S.A.C.',
      nombreComercial: 'Alba',
      direccionFiscal: 'Malecón Cisneros 1240, Miraflores, Lima',
      telefono: '(01) 445 8800',
      email: 'reservas@albahoteles.pe',
      moneda: 'PEN',
      zonaHoraria: 'America/Lima',
    },

    impuestos: { igv: 18, preciosIncluyenIgv: true, exoneracionNoDomiciliados: true },

    locales: [
      {
        id: 'l1',
        nombre: 'Alba Miraflores',
        direccion: 'Malecón Cisneros 1240',
        distrito: 'Miraflores',
        telefono: '(01) 445 8800',
        codigoEstablecimiento: '0001',
        horaCheckIn: '15:00',
        horaCheckOut: '12:00',
        estrellas: 4,
        horario: horarioSemanal('00:00', '23:59'),
        activo: true,
      },
      {
        id: 'l2',
        nombre: 'Alba Barranco',
        direccion: 'Av. Pedro de Osma 380',
        distrito: 'Barranco',
        telefono: '(01) 247 1120',
        codigoEstablecimiento: '0002',
        horaCheckIn: '14:00',
        horaCheckOut: '11:00',
        estrellas: 3,
        horario: horarioSemanal('00:00', '23:59'),
        activo: true,
      },
    ],

    usuarios: [
      {
        id: 'u1',
        nombre: 'Brandon Navarro',
        email: 'admin@albahoteles.pe',
        rol: 'admin',
        activo: true,
      },
      {
        id: 'u2',
        nombre: 'Ana Quispe',
        email: 'ana@albahoteles.pe',
        rol: 'recepcion',
        activo: true,
        localIds: ['l1'],
      },
      {
        id: 'u3',
        nombre: 'Rosa Manrique',
        email: 'rosa@albahoteles.pe',
        rol: 'gobernanta',
        activo: true,
        localIds: ['l1'],
      },
      {
        id: 'u4',
        nombre: 'Delia Ccahuana',
        email: 'delia@albahoteles.pe',
        rol: 'gobernanta',
        activo: true,
        localIds: ['l1'],
      },
      {
        id: 'u5',
        nombre: 'Milagros Tito',
        email: 'milagros@albahoteles.pe',
        rol: 'gobernanta',
        activo: true,
        localIds: ['l1'],
      },
      {
        id: 'u6',
        nombre: 'Julio Ramos',
        email: 'julio@albahoteles.pe',
        rol: 'mantenimiento',
        activo: true,
        localIds: ['l1', 'l2'],
      },
    ],

    pisos,

    tiposHabitacion: [
      {
        id: 't1',
        codigo: 'SGL',
        nombre: 'Individual',
        descripcion: 'Habitación compacta para una persona, con escritorio.',
        capacidad: 1,
        capacidadMaxima: 1,
        camas: '1 cama individual',
        superficie: 16,
        tarifaBase: 180,
        regimenIncluido: 'desayuno',
        servicios: ['Wi-Fi', 'Escritorio', 'Caja fuerte', 'TV 43"'],
        activo: true,
      },
      {
        id: 't2',
        codigo: 'DBL',
        nombre: 'Doble',
        descripcion: 'La habitación estándar de la casa, con cama matrimonial.',
        capacidad: 2,
        capacidadMaxima: 3,
        camas: '1 cama queen',
        superficie: 22,
        tarifaBase: 260,
        regimenIncluido: 'desayuno',
        servicios: ['Wi-Fi', 'Minibar', 'Caja fuerte', 'TV 50"', 'Aire acondicionado'],
        activo: true,
      },
      {
        id: 't3',
        codigo: 'TWN',
        nombre: 'Twin',
        descripcion: 'Dos camas separadas, la preferida del viaje corporativo.',
        capacidad: 2,
        capacidadMaxima: 3,
        camas: '2 camas individuales',
        superficie: 24,
        tarifaBase: 275,
        regimenIncluido: 'desayuno',
        servicios: ['Wi-Fi', 'Minibar', 'Escritorio doble', 'TV 50"'],
        activo: true,
      },
      {
        id: 't4',
        codigo: 'FAM',
        nombre: 'Familiar',
        descripcion: 'Dormitorio con sala y sofá cama, comunica con la contigua.',
        capacidad: 4,
        capacidadMaxima: 5,
        camas: '1 cama king + 1 sofá cama',
        superficie: 34,
        tarifaBase: 390,
        regimenIncluido: 'desayuno',
        servicios: ['Wi-Fi', 'Minibar', 'Sala', 'Cuna a pedido', 'TV 55"'],
        activo: true,
      },
      {
        id: 't5',
        codigo: 'SUI',
        nombre: 'Suite con vista',
        descripcion: 'Planta alta, terraza privada y vista al malecón.',
        capacidad: 2,
        capacidadMaxima: 4,
        camas: '1 cama king',
        superficie: 48,
        tarifaBase: 620,
        regimenIncluido: 'mediaPension',
        servicios: ['Wi-Fi', 'Terraza', 'Bañera', 'Minibar premium', 'Late check-out'],
        activo: true,
      },
    ],

    habitaciones,

    huespedes: [
      {
        id: 'g1',
        tipoDocumento: 'dni',
        documento: '45871236',
        nombres: 'Carolina',
        apellidos: 'Vega Ríos',
        email: 'carolina.vega@correo.pe',
        telefono: '987 654 321',
        pais: 'PE',
        frecuente: true,
        activo: true,
        nochesAcumuladas: 34,
        preferencias: 'Piso alto, lejos del ascensor. Almohada extra.',
      },
      {
        id: 'g2',
        tipoDocumento: 'pasaporte',
        documento: 'X8842119',
        nombres: 'Thomas',
        apellidos: 'Meier',
        email: 't.meier@mail.de',
        pais: 'DE',
        frecuente: false,
        activo: true,
        preferencias: 'Check-in tardío, llega del aeropuerto.',
      },
      {
        id: 'g3',
        tipoDocumento: 'ruc',
        documento: '20548899117',
        nombres: 'Minera Antares',
        apellidos: 'S.A.C.',
        email: 'viajes@antares.pe',
        telefono: '(01) 610 2200',
        pais: 'PE',
        frecuente: true,
        activo: true,
        nochesAcumuladas: 212,
        preferencias: 'Factura a nombre de la empresa. Twin siempre.',
      },
      {
        id: 'g4',
        tipoDocumento: 'ce',
        documento: '001923844',
        nombres: 'Lucía',
        apellidos: 'Fernández Otero',
        email: 'lucia.fo@correo.es',
        pais: 'ES',
        frecuente: false,
        activo: true,
      },
      {
        id: 'g5',
        tipoDocumento: 'dni',
        documento: '09887421',
        nombres: 'Martín',
        apellidos: 'Salazar Pinto',
        telefono: '999 112 334',
        pais: 'PE',
        frecuente: false,
        activo: true,
      },
      {
        id: 'g6',
        tipoDocumento: 'pasaporte',
        documento: 'C4410882',
        nombres: 'Sophie',
        apellidos: 'Laurent',
        email: 'sophie.l@mail.fr',
        pais: 'FR',
        frecuente: true,
        activo: true,
        nochesAcumuladas: 11,
      },
      {
        id: 'g7',
        tipoDocumento: 'dni',
        documento: '71234509',
        nombres: 'Diego',
        apellidos: 'Chávez Núñez',
        telefono: '956 220 118',
        pais: 'PE',
        frecuente: false,
        activo: true,
      },
    ],

    reservas: [
      {
        id: 'r1',
        codigo: 'KMH-2401',
        localId: 'l1',
        huespedId: 'g1',
        tipoId: 't2',
        habitacionId: 'h101',
        entrada: dia(-2),
        salida: dia(1),
        adultos: 2,
        ninos: 0,
        canal: 'directo',
        estado: 'enCasa',
        regimen: 'desayuno',
        tarifaNoche: 260,
        anticipo: 260,
        creada: hace(60 * 24 * 9),
      },
      {
        id: 'r2',
        codigo: 'KMH-2402',
        localId: 'l1',
        huespedId: 'g2',
        tipoId: 't3',
        habitacionId: 'h103',
        entrada: dia(-1),
        salida: dia(2),
        adultos: 1,
        ninos: 0,
        canal: 'booking',
        estado: 'enCasa',
        regimen: 'desayuno',
        tarifaNoche: 298,
        creada: hace(60 * 24 * 4),
      },
      {
        id: 'r3',
        codigo: 'KMH-2403',
        localId: 'l1',
        huespedId: 'g3',
        tipoId: 't3',
        habitacionId: 'h106',
        entrada: dia(-3),
        salida: dia(0),
        adultos: 2,
        ninos: 0,
        canal: 'corporativo',
        estado: 'enCasa',
        regimen: 'mediaPension',
        tarifaNoche: 240,
        creada: hace(60 * 24 * 20),
        notas: 'Sale hoy. Factura consolidada mensual.',
      },
      {
        id: 'r4',
        codigo: 'KMH-2404',
        localId: 'l1',
        huespedId: 'g4',
        tipoId: 't2',
        habitacionId: 'h201',
        entrada: dia(-1),
        salida: dia(3),
        adultos: 2,
        ninos: 1,
        canal: 'web',
        estado: 'enCasa',
        regimen: 'desayuno',
        tarifaNoche: 275,
        anticipo: 275,
        creada: hace(60 * 24 * 12),
      },
      {
        id: 'r5',
        codigo: 'KMH-2405',
        localId: 'l1',
        huespedId: 'g5',
        tipoId: 't2',
        habitacionId: 'h204',
        entrada: dia(-4),
        salida: dia(0),
        adultos: 1,
        ninos: 0,
        canal: 'telefono',
        estado: 'enCasa',
        regimen: 'soloAlojamiento',
        tarifaNoche: 230,
        creada: hace(60 * 24 * 30),
        notas: 'Sale hoy al mediodía.',
      },
      {
        id: 'r6',
        codigo: 'KMH-2406',
        localId: 'l1',
        huespedId: 'g6',
        tipoId: 't5',
        habitacionId: 'h301',
        entrada: dia(-2),
        salida: dia(4),
        adultos: 2,
        ninos: 0,
        canal: 'expedia',
        estado: 'enCasa',
        regimen: 'mediaPension',
        tarifaNoche: 680,
        anticipo: 1360,
        creada: hace(60 * 24 * 15),
      },
      {
        id: 'r7',
        codigo: 'KMH-2407',
        localId: 'l1',
        huespedId: 'g7',
        tipoId: 't2',
        habitacionId: 'h104',
        entrada: dia(0),
        salida: dia(2),
        adultos: 2,
        ninos: 0,
        canal: 'directo',
        estado: 'confirmada',
        regimen: 'desayuno',
        tarifaNoche: 260,
        anticipo: 130,
        creada: hace(60 * 24 * 3),
        notas: 'Llega en vuelo de la tarde.',
      },
      {
        id: 'r8',
        codigo: 'KMH-2408',
        localId: 'l1',
        huespedId: 'g4',
        tipoId: 't3',
        habitacionId: 'h203',
        entrada: dia(0),
        salida: dia(1),
        adultos: 2,
        ninos: 0,
        canal: 'booking',
        estado: 'confirmada',
        regimen: 'desayuno',
        tarifaNoche: 290,
        creada: hace(60 * 24 * 2),
      },
      {
        id: 'r9',
        codigo: 'KMH-2409',
        localId: 'l1',
        huespedId: 'g1',
        tipoId: 't4',
        habitacionId: 'h302',
        entrada: dia(0),
        salida: dia(3),
        adultos: 2,
        ninos: 2,
        canal: 'directo',
        estado: 'confirmada',
        regimen: 'desayuno',
        tarifaNoche: 410,
        anticipo: 410,
        creada: hace(60 * 24 * 6),
        notas: 'Cuna para el menor. Habitación comunicada si se puede.',
      },
      {
        id: 'r10',
        codigo: 'KMH-2410',
        localId: 'l1',
        huespedId: 'g5',
        tipoId: 't1',
        entrada: dia(1),
        salida: dia(4),
        adultos: 1,
        ninos: 0,
        canal: 'web',
        estado: 'pendiente',
        regimen: 'soloAlojamiento',
        tarifaNoche: 190,
        creada: hace(240),
        notas: 'Falta garantía. Vence hoy a las 18:00.',
      },
      {
        id: 'r11',
        codigo: 'KMH-2411',
        localId: 'l1',
        huespedId: 'g2',
        tipoId: 't2',
        entrada: dia(3),
        salida: dia(6),
        adultos: 2,
        ninos: 0,
        canal: 'booking',
        estado: 'confirmada',
        regimen: 'desayuno',
        tarifaNoche: 285,
        creada: hace(60 * 12),
      },
      {
        id: 'r12',
        codigo: 'KMH-2398',
        localId: 'l1',
        huespedId: 'g7',
        tipoId: 't2',
        entrada: dia(-6),
        salida: dia(-3),
        adultos: 2,
        ninos: 0,
        canal: 'directo',
        estado: 'salida',
        regimen: 'desayuno',
        tarifaNoche: 250,
        creada: hace(60 * 24 * 22),
      },
      {
        id: 'r13',
        codigo: 'KMH-2399',
        localId: 'l1',
        huespedId: 'g6',
        tipoId: 't3',
        entrada: dia(-5),
        salida: dia(-4),
        adultos: 1,
        ninos: 0,
        canal: 'expedia',
        estado: 'noShow',
        regimen: 'desayuno',
        tarifaNoche: 280,
        creada: hace(60 * 24 * 18),
        notas: 'No se presentó. Se cobró la primera noche.',
      },
      {
        id: 'r15',
        codigo: 'KMH-2413',
        localId: 'l1',
        huespedId: 'g2',
        tipoId: 't2',
        habitacionId: 'h207',
        entrada: dia(-1),
        salida: dia(1),
        adultos: 2,
        ninos: 0,
        canal: 'web',
        estado: 'enCasa',
        regimen: 'desayuno',
        tarifaNoche: 265,
        creada: hace(60 * 24 * 7),
      },
      {
        id: 'r14',
        codigo: 'KMH-2412',
        localId: 'l2',
        huespedId: 'g3',
        tipoId: 't2',
        habitacionId: 'h101',
        entrada: dia(1),
        salida: dia(3),
        adultos: 2,
        ninos: 0,
        canal: 'corporativo',
        estado: 'confirmada',
        regimen: 'desayuno',
        tarifaNoche: 235,
        creada: hace(60 * 24 * 5),
      },
    ],

    estancias: [
      {
        id: 'e1',
        reservaId: 'r1',
        habitacionId: 'h101',
        huespedId: 'g1',
        checkIn: hace(60 * 47),
        adultos: 2,
        ninos: 0,
        consumos: 148,
        nochesConsumidas: 2,
      },
      {
        id: 'e2',
        reservaId: 'r2',
        habitacionId: 'h103',
        huespedId: 'g2',
        checkIn: hace(60 * 21),
        adultos: 1,
        ninos: 0,
        consumos: 62,
        nochesConsumidas: 1,
      },
      {
        id: 'e3',
        reservaId: 'r3',
        habitacionId: 'h106',
        huespedId: 'g3',
        checkIn: hace(60 * 71),
        adultos: 2,
        ninos: 0,
        consumos: 320,
        nochesConsumidas: 3,
      },
      {
        id: 'e4',
        reservaId: 'r4',
        habitacionId: 'h201',
        huespedId: 'g4',
        checkIn: hace(60 * 20),
        adultos: 2,
        ninos: 1,
        consumos: 96,
        nochesConsumidas: 1,
      },
      {
        id: 'e5',
        reservaId: 'r5',
        habitacionId: 'h204',
        huespedId: 'g5',
        checkIn: hace(60 * 95),
        adultos: 1,
        ninos: 0,
        consumos: 210,
        nochesConsumidas: 4,
      },
      {
        id: 'e6',
        reservaId: 'r15',
        habitacionId: 'h207',
        huespedId: 'g2',
        checkIn: hace(60 * 30),
        adultos: 2,
        ninos: 0,
        consumos: 45,
        nochesConsumidas: 1,
      },
      {
        id: 'e7',
        reservaId: 'r6',
        habitacionId: 'h301',
        huespedId: 'g6',
        checkIn: hace(60 * 46),
        adultos: 2,
        ninos: 0,
        consumos: 540,
        nochesConsumidas: 2,
      },
    ],

    tareas: [
      {
        id: 'k1',
        habitacionId: 'h102',
        tipo: 'salida',
        estado: 'pendiente',
        prioridad: 'alta',
        asignadaAId: 'u4',
        minutosEstimados: 45,
        creada: hace(150),
        notas: 'Entra huésped a las 15:00.',
      },
      {
        id: 'k2',
        habitacionId: 'h105',
        tipo: 'salida',
        estado: 'enCurso',
        prioridad: 'normal',
        asignadaAId: 'u4',
        minutosEstimados: 45,
        creada: hace(210),
      },
      {
        id: 'k3',
        habitacionId: 'h202',
        tipo: 'salida',
        estado: 'revisar',
        prioridad: 'normal',
        asignadaAId: 'u5',
        minutosEstimados: 45,
        creada: hace(320),
        notas: 'Lista para inspección de gobernanta.',
      },
      {
        id: 'k4',
        habitacionId: 'h206',
        tipo: 'salida',
        estado: 'pendiente',
        prioridad: 'urgente',
        asignadaAId: 'u5',
        minutosEstimados: 50,
        creada: hace(95),
        notas: 'Walk-in esperando en recepción.',
      },
      {
        id: 'k5',
        habitacionId: 'h303',
        tipo: 'profunda',
        estado: 'enCurso',
        prioridad: 'normal',
        asignadaAId: 'u4',
        minutosEstimados: 90,
        creada: hace(260),
      },
      {
        id: 'k6',
        habitacionId: 'h101',
        tipo: 'estancia',
        estado: 'pendiente',
        prioridad: 'normal',
        minutosEstimados: 20,
        creada: hace(60),
      },
      {
        id: 'k7',
        habitacionId: 'h106',
        tipo: 'estancia',
        estado: 'pendiente',
        prioridad: 'normal',
        minutosEstimados: 20,
        creada: hace(55),
      },
      {
        id: 'k8',
        habitacionId: 'h204',
        tipo: 'estancia',
        estado: 'terminada',
        prioridad: 'normal',
        asignadaAId: 'u5',
        minutosEstimados: 20,
        creada: hace(400),
        terminada: hace(330),
      },
      {
        id: 'k9',
        habitacionId: 'h301',
        tipo: 'cobertura',
        estado: 'pendiente',
        prioridad: 'normal',
        minutosEstimados: 12,
        creada: hace(30),
        notas: 'Suite: cobertura nocturna con detalle de bienvenida.',
      },
    ],

    incidencias: [
      {
        id: 'i1',
        habitacionId: 'h108',
        titulo: 'Fuga en la ducha',
        descripcion: 'Gotea desde el mezclador. Requiere cambio de cartucho.',
        prioridad: 'urgente',
        estado: 'enCurso',
        asignadaAId: 'u6',
        bloqueaHabitacion: true,
        creada: hace(60 * 26),
      },
      {
        id: 'i2',
        habitacionId: 'h203',
        titulo: 'Control remoto del TV sin pilas',
        prioridad: 'normal',
        estado: 'abierta',
        bloqueaHabitacion: false,
        creada: hace(180),
      },
      {
        id: 'i3',
        habitacionId: 'h207',
        titulo: 'Aire acondicionado ruidoso',
        descripcion: 'El huésped lo reportó anoche.',
        prioridad: 'alta',
        estado: 'abierta',
        asignadaAId: 'u6',
        bloqueaHabitacion: false,
        creada: hace(600),
      },
    ],

    temporadas: [
      {
        id: 's1',
        nombre: 'Temporada baja',
        desde: dia(-60),
        hasta: dia(-10),
        factor: 0.85,
        color: 'salvia',
        activa: true,
      },
      {
        id: 's2',
        nombre: 'Temporada media',
        desde: dia(-9),
        hasta: dia(20),
        factor: 1,
        color: 'azul',
        activa: true,
      },
      {
        id: 's3',
        nombre: 'Fiestas patrias',
        desde: dia(21),
        hasta: dia(28),
        factor: 1.4,
        minimoNoches: 2,
        color: 'turquesa',
        activa: true,
      },
      {
        id: 's4',
        nombre: 'Fin de año',
        desde: dia(95),
        hasta: dia(110),
        factor: 1.65,
        minimoNoches: 3,
        color: 'coral',
        activa: true,
      },
    ],

    tarifasCanal: [
      { id: 'tc1', tipoId: 't1', canal: 'directo', ajuste: 0, activa: true },
      { id: 'tc2', tipoId: 't2', canal: 'directo', ajuste: 0, activa: true },
      { id: 'tc3', tipoId: 't2', canal: 'booking', ajuste: 15, activa: true },
      { id: 'tc4', tipoId: 't2', canal: 'expedia', ajuste: 18, activa: true },
      { id: 'tc5', tipoId: 't3', canal: 'corporativo', ajuste: -12, activa: true },
      { id: 'tc6', tipoId: 't5', canal: 'expedia', ajuste: 20, activa: true },
      { id: 'tc7', tipoId: 't4', canal: 'web', ajuste: 5, activa: true },
    ],

    insumos: [
      {
        id: 'n1',
        codigo: 'AM-001',
        nombre: 'Kit de amenities (shampoo, jabón, gel)',
        categoria: 'amenities',
        unidad: 'juego',
        stock: 240,
        stockMinimo: 120,
        costo: 4.8,
        activo: true,
      },
      {
        id: 'n2',
        codigo: 'LE-010',
        nombre: 'Juego de sábanas queen',
        categoria: 'lenceria',
        unidad: 'juego',
        stock: 64,
        stockMinimo: 80,
        costo: 78,
        activo: true,
      },
      {
        id: 'n3',
        codigo: 'LE-020',
        nombre: 'Toalla de baño',
        categoria: 'lenceria',
        unidad: 'unidad',
        stock: 310,
        stockMinimo: 200,
        costo: 22,
        activo: true,
      },
      {
        id: 'n4',
        codigo: 'LI-005',
        nombre: 'Desinfectante multiuso',
        categoria: 'limpieza',
        unidad: 'litro',
        stock: 42,
        stockMinimo: 30,
        costo: 12.5,
        activo: true,
      },
      {
        id: 'n5',
        codigo: 'MB-030',
        nombre: 'Agua mineral 500 ml',
        categoria: 'minibar',
        unidad: 'unidad',
        stock: 180,
        stockMinimo: 100,
        costo: 1.9,
        activo: true,
      },
      {
        id: 'n6',
        codigo: 'MB-040',
        nombre: 'Snack salado',
        categoria: 'minibar',
        unidad: 'unidad',
        stock: 54,
        stockMinimo: 60,
        costo: 3.2,
        activo: true,
      },
      {
        id: 'n7',
        codigo: 'MT-100',
        nombre: 'Foco LED E27 9W',
        categoria: 'mantenimiento',
        unidad: 'unidad',
        stock: 88,
        stockMinimo: 40,
        costo: 7.5,
        activo: true,
      },
    ],

    movimientos: [
      {
        id: 'm1',
        insumoId: 'n1',
        tipo: 'salida',
        cantidad: 12,
        habitacionId: 'h102',
        motivo: 'Reposición de salida',
        usuarioId: 'u4',
        fecha: hace(120),
      },
      {
        id: 'm2',
        insumoId: 'n2',
        tipo: 'salida',
        cantidad: 8,
        motivo: 'Cambio de lencería piso 2',
        usuarioId: 'u5',
        fecha: hace(300),
      },
      {
        id: 'm3',
        insumoId: 'n5',
        tipo: 'salida',
        cantidad: 4,
        habitacionId: 'h301',
        motivo: 'Consumo de minibar',
        usuarioId: 'u2',
        fecha: hace(420),
      },
      {
        id: 'm4',
        insumoId: 'n3',
        tipo: 'ingreso',
        cantidad: 60,
        motivo: 'Recepción de lavandería',
        usuarioId: 'u3',
        fecha: hace(900),
      },
      {
        id: 'm5',
        insumoId: 'n2',
        tipo: 'merma',
        cantidad: 3,
        motivo: 'Manchas irreversibles',
        usuarioId: 'u3',
        fecha: hace(1500),
      },
    ],

    series: [
      { id: 'sc1', localId: 'l1', tipo: 'boleta', serie: 'B001', correlativo: 4821, activo: true },
      { id: 'sc2', localId: 'l1', tipo: 'factura', serie: 'F001', correlativo: 1190, activo: true },
      {
        id: 'sc3',
        localId: 'l1',
        tipo: 'notaCredito',
        serie: 'BC01',
        correlativo: 37,
        activo: true,
      },
      { id: 'sc4', localId: 'l2', tipo: 'boleta', serie: 'B002', correlativo: 921, activo: true },
    ],

    motivos: [
      {
        id: 'mo1',
        nombre: 'Cambio de planes del huésped',
        ambito: 'cancelacion',
        requiereNota: false,
        activo: true,
      },
      {
        id: 'mo2',
        nombre: 'Sobreventa reubicada',
        ambito: 'cancelacion',
        requiereNota: true,
        activo: true,
      },
      {
        id: 'mo3',
        nombre: 'Mantenimiento programado',
        ambito: 'bloqueo',
        requiereNota: true,
        activo: true,
      },
      {
        id: 'mo4',
        nombre: 'Uso interno del hotel',
        ambito: 'bloqueo',
        requiereNota: false,
        activo: true,
      },
      {
        id: 'mo5',
        nombre: 'Compensación por incidencia',
        ambito: 'cortesia',
        requiereNota: true,
        activo: true,
      },
      {
        id: 'mo6',
        nombre: 'Tarifa corporativa pactada',
        ambito: 'descuento',
        requiereNota: false,
        activo: true,
      },
      {
        id: 'mo7',
        nombre: 'Avería sin fecha de reparación',
        ambito: 'fueraServicio',
        requiereNota: true,
        activo: true,
      },
    ],

    turnos: [
      {
        id: 'tu1',
        localId: 'l1',
        usuarioId: 'u2',
        fecha: dia(0),
        desde: '07:00',
        hasta: '15:00',
        puesto: 'recepcion',
      },
      {
        id: 'tu2',
        localId: 'l1',
        usuarioId: 'u3',
        fecha: dia(0),
        desde: '08:00',
        hasta: '16:00',
        puesto: 'pisos',
      },
      {
        id: 'tu3',
        localId: 'l1',
        usuarioId: 'u4',
        fecha: dia(0),
        desde: '08:00',
        hasta: '16:00',
        puesto: 'pisos',
      },
      {
        id: 'tu4',
        localId: 'l1',
        usuarioId: 'u5',
        fecha: dia(0),
        desde: '09:00',
        hasta: '17:00',
        puesto: 'pisos',
      },
      {
        id: 'tu5',
        localId: 'l1',
        usuarioId: 'u6',
        fecha: dia(0),
        desde: '08:00',
        hasta: '18:00',
        puesto: 'mantenimiento',
      },
    ],

    bitacora: [
      {
        id: 'b1',
        usuarioId: 'u2',
        accion: 'Check-in',
        entidad: 'reserva',
        entidadId: 'r4',
        detalle: 'Habitación 201 asignada a Lucía Fernández Otero.',
        fecha: hace(20 * 60),
      },
      {
        id: 'b2',
        usuarioId: 'u3',
        accion: 'Habitación fuera de servicio',
        entidad: 'habitacion',
        entidadId: 'h108',
        detalle: 'Fuga en la ducha; parte de mantenimiento i1.',
        fecha: hace(26 * 60),
      },
      {
        id: 'b3',
        usuarioId: 'u2',
        accion: 'Reserva creada',
        entidad: 'reserva',
        entidadId: 'r10',
        detalle: 'Pendiente de garantía.',
        fecha: hace(240),
      },
    ],

    permisosPorRol: {
      admin: ['*'],
      recepcion: [
        'tablero.ver',
        'reservas.gestionar',
        'huespedes.gestionar',
        'habitaciones.asignar',
        'facturacion.emitir',
      ],
      gobernanta: ['tablero.ver', 'limpieza.gestionar', 'habitaciones.estado', 'inventario.ver'],
      mantenimiento: ['tablero.ver', 'incidencias.gestionar', 'habitaciones.estado'],
    },

    configuracion: {
      vertical: {
        'reserva.garantiaHoras': 24,
        'reserva.permitirSobreventa': false,
        'checkout.cobrarSalidaTardia': true,
        'limpieza.requiereInspeccion': true,
        'tarifa.redondearA': 5,
      },
      locales: {
        l2: { 'limpieza.requiereInspeccion': false },
      },
    },
  }
}

function cargar(): Esquema {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) return JSON.parse(crudo) as Esquema
  } catch {
    // localStorage bloqueado o dato corrupto: se reinicia con la semilla.
  }
  const inicial = semilla()
  guardar(inicial)
  return inicial
}

function guardar(datos: Esquema) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch {
    // Sin persistencia: los cambios viven solo en memoria durante la sesión.
  }
}

export const db = cargar()

export function persistir() {
  guardar(db)
}

/** Reinicia los datos mock a la semilla original. */
export function reiniciarMock() {
  Object.assign(db, semilla())
  guardar(db)
}

/** Simula la red (latencia y fallos configurables) para que los estados de carga y error sean visibles. */
export function latencia<T>(valor: T, ms?: number): Promise<T> {
  return simularRed(valor, ms)
}

export function nuevoId(prefijo: string) {
  return `${prefijo}${Math.random().toString(36).slice(2, 9)}`
}
