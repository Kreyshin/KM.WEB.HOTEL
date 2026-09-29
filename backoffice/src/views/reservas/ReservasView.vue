<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCanales } from '@/composables/useCanales'
import { useCarga } from '@/composables/useCarga'
import HsIcono from '@/components/hotel/HsIcono.vue'
import BarraReserva, { type ModoArrastre } from '@/components/planning/BarraReserva.vue'
import ListaReservas from '@/components/reservas/ListaReservas.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { huespedesService } from '@/services/huespedes.service'
import { reservasService } from '@/services/reservas.service'
import { tiposService } from '@/services/tipos.service'
import { resolverTarifa } from '@/services/tarifas.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  CanalReserva,
  HabitacionResuelta,
  Huesped,
  Regimen,
  ReservaResuelta,
  TipoHabitacion,
} from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaRegimen, formatearSoles } from '@/utils/formato'
import { etiquetaLimpieza, etiquetaReserva, tonoReserva } from '@/utils/habitaciones'

/**
 * Reservas: la pantalla de control.
 *
 * Antes eran dos —un rack que solo se miraba y una tabla que solo consultaba—,
 * y ninguna de las dos sabía crear una reserva. Son la misma cosa vista de dos
 * maneras, así que viven juntas y comparten lo que importa: **la ficha y el
 * alta**.
 *
 * **La lente de rack** pone habitaciones en filas y noches en columnas. Es la
 * pantalla con la que piensa una recepción: el tablero responde «¿cómo está el
 * hotel ahora?» y el rack «¿cómo está la semana que viene?», que es de donde
 * salen el overbooking, los cambios de habitación y las ventas de última hora.
 * Sus tres gestos son del oficio: mover la barra cambia habitación y fecha,
 * tirar de los bordes cambia la entrada o la salida, y barrer noches vacías
 * vende.
 *
 * **La lente de lista** es el libro completo, buscable y filtrable. Contesta
 * lo que el rack no puede: dónde está la reserva de los Pérez, qué entra por
 * Booking este mes, cuántos no se presentaron.
 *
 * El alcance de cada lente es distinto —una ventana de catorce noches frente a
 * todo el libro— y eso **se dice en pantalla**. Fingir que comparten filtro
 * haría que cambiar de lente cambiase en silencio lo que se está mirando, que
 * es el fallo clásico de este tipo de pantalla.
 *
 * Ningún gesto es la única forma de hacer las cosas: todos tienen equivalente
 * por teclado en el panel lateral, porque un rack que solo se maneja
 * arrastrando deja fuera a quien no puede arrastrar.
 */

const TRAMO_DIAS = 14
const ANCHO_HABITACION = 148

const localStore = useLocalStore()
const ui = useUiStore()

/*
 * Solo los canales que se teclean: una reserva de Booking entra por
 * integración, y ofrecerla en el mostrador invita a crear a mano lo que el
 * canal va a mandar igual, con dos reservas para la misma cama.
 */
const {
  cargar: cargarCanales,
  nombre: nombreCanal,
  opcionesManuales: opcionesCanalMaestro,
} = useCanales()

const habitaciones = ref<HabitacionResuelta[]>([])
const reservas = ref<ReservaResuelta[]>([])
const { cargando, refrescando, iniciar, terminar } = useCarga()

const hoy = new Date().toISOString().slice(0, 10)
const inicio = ref(hoy)

/**
 * Las dos lentes sobre lo mismo.
 *
 * No son dos pantallas: son dos maneras de mirar el libro de reservas. El rack
 * enseña el **inventario en el tiempo** —habitaciones por noches— y sirve para
 * vender y recolocar; la lista enseña las **reservas como registros** y sirve
 * para encontrar una concreta. Comparten la ficha y el alta, que es lo que
 * antes estaba escrito dos veces y en dos sitios distintos.
 */
const lente = ref<'rack' | 'lista'>('rack')

const opcionesTipo = computed<OpcionSelect[]>(() =>
  tipos.value.map((t) => ({
    valor: t.id,
    etiqueta: `${t.codigo} · ${t.nombre} · hasta ${t.capacidadMaxima}`,
  })),
)

const lentes = [
  { valor: 'rack' as const, etiqueta: 'Rack', icono: 'cama' as const },
  { valor: 'lista' as const, etiqueta: 'Lista', icono: 'huesped' as const },
]

const lista = ref<InstanceType<typeof ListaReservas> | null>(null)

const seleccionada = ref<ReservaResuelta | null>(null)
const panelAbierto = ref(false)
const moviendoA = ref<string | number | undefined>('')

/**
 * Arrastre en curso.
 *
 * Guarda las dos dimensiones del rack a la vez, porque el gesto las mezcla:
 * subir o bajar cambia de habitación, ir a los lados cambia de fecha, y una
 * diagonal hace las dos cosas de un tirón. `modo` dice si se mueve la estancia
 * entera o se está tirando de un borde.
 */
const arrastre = ref<{
  reservaId: string
  modo: ModoArrastre
  sobre: string | null
  vetada: boolean
  /** Píxeles recorridos en vertical: la barra acompaña al dedo. */
  dy: number
  /** Noches recorridas en horizontal, ya redondeadas a columna. */
  dCol: number
  /** Por qué no se puede soltar aquí, para decirlo en el acto. */
  motivo: string
} | null>(null)

// ── El eje de tiempo ─────────────────────────────────────────────────────────

function sumarDias(iso: string, dias: number) {
  const f = new Date(`${iso}T12:00:00`)
  f.setDate(f.getDate() + dias)
  return f.toISOString().slice(0, 10)
}

const fin = computed(() => sumarDias(inicio.value, TRAMO_DIAS))

interface Noche {
  iso: string
  dia: string
  letra: string
  finde: boolean
  esHoy: boolean
}

const noches = computed<Noche[]>(() =>
  Array.from({ length: TRAMO_DIAS }, (_, i) => {
    const iso = sumarDias(inicio.value, i)
    const f = new Date(`${iso}T12:00:00`)
    const dow = f.getDay()
    return {
      iso,
      dia: String(f.getDate()),
      letra: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][dow] ?? '',
      finde: dow === 0 || dow === 6,
      esHoy: iso === hoy,
    }
  }),
)

const mesVisible = computed(() => {
  const desde = new Date(`${inicio.value}T12:00:00`)
  const hasta = new Date(`${sumarDias(inicio.value, TRAMO_DIAS - 1)}T12:00:00`)
  const f = (d: Date) => d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
  const texto = f(desde) === f(hasta) ? f(desde) : `${f(desde)} — ${f(hasta)}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

// ── Lo que se pinta ──────────────────────────────────────────────────────────

/** Las reservas de cada habitación, ya recortadas al tramo visible. */
interface Tramo {
  reserva: ReservaResuelta
  desdeCol: number
  noches: number
  cortaIzquierda: boolean
  cortaDerecha: boolean
}

function indiceDe(iso: string) {
  const ms = new Date(`${iso}T12:00:00`).getTime() - new Date(`${inicio.value}T12:00:00`).getTime()
  return Math.round(ms / 86_400_000)
}

function tramosDe(habitacionId: string): Tramo[] {
  return reservas.value
    .filter((r) => r.habitacionId === habitacionId)
    .map((reserva) => {
      const i = indiceDe(reserva.entrada)
      const f = indiceDe(reserva.salida)
      const desdeCol = Math.max(0, i)
      const hastaCol = Math.min(TRAMO_DIAS, f)
      return {
        reserva,
        desdeCol,
        noches: hastaCol - desdeCol,
        cortaIzquierda: i < 0,
        cortaDerecha: f > TRAMO_DIAS,
      }
    })
    .filter((t) => t.noches > 0)
}

/** Sin habitación asignada: lo contratado por tipo que aún no tiene llave. */
const sinAsignar = computed(() => reservas.value.filter((r) => !r.habitacionId))

/** Ocupación por noche: la fila que de verdad se mira en el pie del rack. */
const ocupacionPorNoche = computed(() =>
  noches.value.map((n) => {
    const vendibles = habitaciones.value.filter((h) => h.limpieza !== 'fueraServicio').length
    const ocupadas = reservas.value.filter(
      (r) => r.habitacionId && r.entrada <= n.iso && r.salida > n.iso,
    ).length
    return { iso: n.iso, ocupadas, vendibles, pct: vendibles ? (ocupadas / vendibles) * 100 : 0 }
  }),
)

/** Las habitaciones se agrupan por planta, que es como se recorre un hotel. */
const porPiso = computed(() => {
  const grupos = new Map<string, { nombre: string; habitaciones: HabitacionResuelta[] }>()
  for (const h of habitaciones.value) {
    const id = h.piso?.id ?? 'sin-piso'
    const grupo = grupos.get(id) ?? { nombre: h.piso?.nombre ?? 'Sin planta', habitaciones: [] }
    grupo.habitaciones.push(h)
    grupos.set(id, grupo)
  }
  return [...grupos.values()]
})

const opcionesHabitacion = computed<OpcionSelect[]>(() =>
  habitaciones.value
    .filter((h) => h.limpieza !== 'fueraServicio')
    .map((h) => ({ valor: h.id, etiqueta: `${h.numero} · ${h.tipo?.nombre ?? ''}` })),
)

// ── Carga ────────────────────────────────────────────────────────────────────

/** Refresca lo que el usuario está mirando, sea el rack o la lista. */
async function refrescarLente() {
  await cargar()
  lista.value?.recargar()
}

async function cargar() {
  const localId = localStore.localId
  if (!localId) return
  iniciar()
  try {
    const datos = await reservasService.planning(localId, inicio.value, fin.value)
    habitaciones.value = datos.habitaciones
    reservas.value = datos.reservas
  } catch {
    ui.error('No se pudo cargar el planning.')
  } finally {
    terminar()
  }
}

onMounted(cargarCanales)
onMounted(async () => {
  await cargar()
  try {
    const [listaHuespedes, listaTipos] = await Promise.all([
      huespedesService.consultar({ porPagina: 500, filtros: { activo: true } }),
      tiposService.consultar({ porPagina: 100, filtros: { activo: true } }),
    ])
    huespedes.value = listaHuespedes.items
    tipos.value = listaTipos.items
  } catch {
    // Sin las listas todavía se puede vender: el huésped se da de alta.
  }
})
watch([inicio, () => localStore.localId], cargar)

/** Desplaza el tramo visible. Distinto de mover una reserva. */
function desplazarTramo(dias: number) {
  inicio.value = sumarDias(inicio.value, dias)
}

// ── Gesto 1: mover una reserva por el rack ───────────────────────────────────

/**
 * ¿Cabe esta reserva en esa habitación, con estas fechas?
 *
 * Se comprueba en el cliente mientras el dedo se mueve para poder pintar el
 * veto en el acto; el servicio lo vuelve a comprobar al soltar, que es donde
 * manda. Duplicar la regla aquí es a propósito: un rack que solo avisa después
 * de soltar obliga a deshacer, y deshacer en un rack es reordenar el hotel.
 */
function porQueNoCabe(
  habitacionId: string,
  reserva: ReservaResuelta,
  entrada: string,
  salida: string,
): string {
  const destino = habitaciones.value.find((h) => h.id === habitacionId)
  if (!destino) return 'Esa fila no es una habitación.'
  if (destino.limpieza === 'fueraServicio') {
    return `La ${destino.numero} está fuera de servicio.`
  }
  if (reserva.estado === 'enCasa' && entrada !== reserva.entrada) {
    return `${reserva.codigo} ya hizo el check-in: solo se puede mover la salida.`
  }
  const choque = reservas.value.find(
    (r) =>
      r.id !== reserva.id &&
      r.habitacionId === habitacionId &&
      !['cancelada', 'noShow', 'salida'].includes(r.estado) &&
      r.entrada < salida &&
      r.salida > entrada,
  )
  if (choque) {
    const nombre = choque.huesped?.apellidos ?? choque.codigo
    return `La ${destino.numero} ya la tiene ${nombre} esas noches.`
  }
  return ''
}

/** Las reservas cerradas se miran pero no se mueven. */
const estaFijada = (r: ReservaResuelta) => ['salida', 'cancelada', 'noShow'].includes(r.estado)

/**
 * Arrastrar y abrir la ficha son el mismo elemento, así que el `click` que
 * sigue a un arrastre hay que descartarlo: soltar una reserva en otro sitio
 * no es pedir verla.
 */
const huboArrastre = ref(false)

/**
 * Ancho real de una noche, en píxeles.
 *
 * Se mide de una celda de verdad en vez de calcularlo: las columnas son
 * fracciones de la rejilla y su ancho cambia con la ventana, así que el número
 * bueno solo lo sabe el navegador. Se mide al empezar cada arrastre, que es
 * cuando importa.
 */
function anchoColumna(): number {
  const celda = document.querySelector<HTMLElement>('[data-columna]')
  return celda?.getBoundingClientRect().width || 1
}

/** Las fechas que tendría la reserva con el desplazamiento actual. */
function fechasPropuestas(reserva: ReservaResuelta, modo: ModoArrastre, dCol: number) {
  const entrada = modo === 'fin' ? reserva.entrada : sumarDias(reserva.entrada, dCol)
  const salida = modo === 'inicio' ? reserva.salida : sumarDias(reserva.salida, dCol)
  return { entrada, salida }
}

function empezarArrastre(evento: PointerEvent, reserva: ReservaResuelta, modo: ModoArrastre) {
  if (evento.button !== 0 || estaFijada(reserva)) return
  evento.preventDefault()

  const xInicial = evento.clientX
  const yInicial = evento.clientY
  const paso = anchoColumna()

  arrastre.value = {
    reservaId: reserva.id,
    modo,
    sobre: reserva.habitacionId ?? null,
    vetada: false,
    dy: 0,
    dCol: 0,
    motivo: '',
  }

  const alMover = (e: PointerEvent) => {
    if (!arrastre.value) return

    // Estirar un borde no cambia de habitación: el gesto es solo horizontal.
    if (modo === 'mover') {
      const bajo = document.elementFromPoint(e.clientX, e.clientY)
      const fila = bajo?.closest<HTMLElement>('[data-habitacion]')
      arrastre.value.sobre = fila?.dataset.habitacion ?? arrastre.value.sobre
      arrastre.value.dy = e.clientY - yInicial
    }

    arrastre.value.dCol = Math.round((e.clientX - xInicial) / paso)

    if (Math.abs(e.clientX - xInicial) > 4 || Math.abs(e.clientY - yInicial) > 4) {
      huboArrastre.value = true
    }

    const { entrada, salida } = fechasPropuestas(reserva, modo, arrastre.value.dCol)
    const destino = arrastre.value.sobre ?? reserva.habitacionId

    if (salida <= entrada) {
      arrastre.value.vetada = true
      arrastre.value.motivo = 'Una reserva dura al menos una noche.'
    } else if (destino) {
      arrastre.value.motivo = porQueNoCabe(destino, reserva, entrada, salida)
      arrastre.value.vetada = Boolean(arrastre.value.motivo)
    }
  }

  const alSoltar = async () => {
    window.removeEventListener('pointermove', alMover)
    window.removeEventListener('pointerup', alSoltar)

    const estado = arrastre.value
    arrastre.value = null
    // El `click` llega justo después; se limpia cuando ya ha pasado.
    setTimeout(() => (huboArrastre.value = false), 0)
    if (!estado) return

    const destino = estado.sobre ?? reserva.habitacionId
    const cambiaHabitacion = Boolean(destino) && destino !== reserva.habitacionId
    if (!estado.dCol && !cambiaHabitacion) return

    if (estado.vetada) {
      ui.error(estado.motivo || 'Ahí no cabe.')
      return
    }

    await mover(reserva, estado.modo, estado.dCol, cambiaHabitacion ? destino! : undefined)
  }

  window.addEventListener('pointermove', alMover)
  window.addEventListener('pointerup', alSoltar)
}

/**
 * El movimiento contra el servicio.
 *
 * El mensaje dice **qué pasó**, no «guardado»: mover una reserva es un cambio
 * que alguien va a tener que explicar al huésped, y conviene ver el resultado
 * escrito antes de cerrar la pantalla.
 */
async function mover(
  reserva: ReservaResuelta,
  modo: ModoArrastre,
  dCol: number,
  habitacionId?: string,
) {
  const { entrada, salida } = fechasPropuestas(reserva, modo, dCol)
  try {
    const actualizada = await reservasService.reprogramar(reserva.id, {
      entrada,
      salida,
      habitacionId,
    })
    const nombre = reserva.huesped?.apellidos ?? reserva.codigo
    const numero = habitaciones.value.find(
      (h) => h.id === (habitacionId ?? reserva.habitacionId),
    )?.numero
    ui.exito(
      dCol
        ? `${nombre}: ${entrada} → ${salida} en la ${numero}.`
        : `${nombre} pasa a la ${numero}.`,
    )
    await cargar()
    if (seleccionada.value?.id === reserva.id) seleccionada.value = actualizada
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo mover la reserva.')
  }
}

async function reasignar(reserva: ReservaResuelta, habitacionId: string) {
  await mover(reserva, 'mover', 0, habitacionId)
}

// ── Gesto 2: barrer noches vacías para vender ────────────────────────────────

const seleccion = ref<{ habitacionId: string; desde: number; hasta: number } | null>(null)

function empezarSeleccion(habitacionId: string, columna: number) {
  seleccion.value = { habitacionId, desde: columna, hasta: columna }

  const alMover = (e: PointerEvent) => {
    const bajo = document.elementFromPoint(e.clientX, e.clientY)
    const celda = bajo?.closest<HTMLElement>('[data-columna]')
    if (!celda || !seleccion.value) return
    if (celda.dataset.habitacion !== habitacionId) return
    seleccion.value.hasta = Number(celda.dataset.columna)
  }

  const alSoltar = () => {
    window.removeEventListener('pointermove', alMover)
    window.removeEventListener('pointerup', alSoltar)
    if (seleccion.value) abrirVenta(seleccion.value)
    seleccion.value = null
  }

  window.addEventListener('pointermove', alMover)
  window.addEventListener('pointerup', alSoltar)
}

function enSeleccion(habitacionId: string, columna: number) {
  const s = seleccion.value
  if (!s || s.habitacionId !== habitacionId) return false
  return columna >= Math.min(s.desde, s.hasta) && columna <= Math.max(s.desde, s.hasta)
}

/**
 * La venta se cierra aquí mismo.
 *
 * Antes el rack marcaba las noches y mandaba a otra pantalla a rellenar el
 * formulario. Eso rompe el gesto: quien barre unas noches está vendiendo, y
 * hacerle cambiar de sitio para terminar es pedirle que empiece otra vez.
 *
 * Lo único que el rack no sabe es **quién** duerme ahí, así que eso es lo que
 * pregunta —y admite darlo de alta sin salir—; la habitación, las fechas y la
 * tarifa ya las conoce.
 */
const venta = ref<{
  /** Sin habitación: se vende el tipo y se asigna la llave al llegar. */
  habitacion?: HabitacionResuelta
  tipoId: string
  entrada: string
  salida: string
} | null>(null)
const guardandoVenta = ref(false)
const erroresVenta = ref<Record<string, string>>({})
const huespedes = ref<Huesped[]>([])
const tipos = ref<TipoHabitacion[]>([])

const nuevaVenta = ref({
  huespedId: '' as string | number | undefined,
  nuevoHuesped: { nombres: '', apellidos: '', documento: '', telefono: '' },
  adultos: 2,
  ninos: 0,
  canal: 'directo' as CanalReserva,
  regimen: 'desayuno' as Regimen,
  tarifaNoche: 0,
})

/** Sin huésped elegido, se está dando uno de alta. */
const altaDeHuesped = computed(() => !nuevaVenta.value.huespedId)

const opcionesHuesped = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: '+ Huésped nuevo' },
  ...huespedes.value.map((h) => ({
    valor: h.id,
    etiqueta: `${h.apellidos}, ${h.nombres}${h.frecuente ? ' · frecuente' : ''}`,
  })),
])

/*
 * Solo los canales que se teclean: una reserva de Booking entra por
 * integración, y ofrecerla en el mostrador invita a crear a mano lo que el
 * canal va a mandar igual, con dos reservas para la misma cama.
 */
const opcionesCanal = opcionesCanalMaestro

const opcionesRegimen: OpcionSelect[] = (
  ['soloAlojamiento', 'desayuno', 'mediaPension', 'pensionCompleta'] as Regimen[]
).map((r) => ({ valor: r, etiqueta: etiquetaRegimen[r] }))

const nochesVenta = computed(() => {
  if (!venta.value) return 0
  const ms = new Date(venta.value.salida).getTime() - new Date(venta.value.entrada).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
})

const totalVenta = computed(() => nochesVenta.value * (nuevaVenta.value.tarifaNoche || 0))

/** Desde el rack: la habitación y las fechas vienen del barrido. */
function abrirVenta(s: { habitacionId: string; desde: number; hasta: number }) {
  const habitacion = habitaciones.value.find((h) => h.id === s.habitacionId)
  if (!habitacion) return
  const desde = Math.min(s.desde, s.hasta)
  const hasta = Math.max(s.desde, s.hasta)
  prepararVenta({
    habitacion,
    tipoId: habitacion.tipoId,
    entrada: sumarDias(inicio.value, desde),
    salida: sumarDias(inicio.value, hasta + 1),
  })
}

/**
 * Desde el botón: no hay nada marcado, así que se parte de mañana y se deja
 * elegir el tipo. Es el camino de quien llama por teléfono para diciembre, al
 * que el rack no llega sin navegar catorce semanas.
 */
function abrirVentaVacia() {
  const tipo = tipos.value[0]
  if (!tipo) {
    ui.error('Primero hay que tener al menos un tipo de habitación.')
    return
  }
  prepararVenta({
    tipoId: tipo.id,
    entrada: sumarDias(hoy, 1),
    salida: sumarDias(hoy, 2),
  })
}

function prepararVenta(datos: {
  habitacion?: HabitacionResuelta
  tipoId: string
  entrada: string
  salida: string
}) {
  const habitacion = datos.habitacion
  const entrada = datos.entrada
  venta.value = datos
  erroresVenta.value = {}

  // La tarifa se propone resuelta —base, temporada y canal— para que no haya
  // que ir a buscarla: es el número que el recepcionista dice por teléfono.
  const tipo = habitacion?.tipo ?? tipos.value.find((t) => t.id === datos.tipoId)
  nuevaVenta.value = {
    huespedId: '',
    nuevoHuesped: { nombres: '', apellidos: '', documento: '', telefono: '' },
    adultos: Math.min(2, tipo?.capacidad ?? 2),
    ninos: 0,
    canal: 'directo',
    regimen: tipo?.regimenIncluido ?? 'desayuno',
    tarifaNoche: tipo ? resolverTarifa(tipo.id, entrada, 'directo').precio : 0,
  }
}

/**
 * La tarifa se vuelve a resolver cuando cambia cualquiera de sus tres
 * ingredientes: el tipo, la fecha de entrada —por la temporada— o el canal.
 * Dejarla pegada al primer cálculo es lo que hace que se venda a precio viejo.
 */
watch(
  () => [nuevaVenta.value.canal, venta.value?.tipoId, venta.value?.entrada],
  () => {
    if (!venta.value?.tipoId) return
    nuevaVenta.value.tarifaNoche = resolverTarifa(
      venta.value.tipoId,
      venta.value.entrada,
      nuevaVenta.value.canal,
    ).precio
  },
)

async function confirmarVenta() {
  const v = venta.value
  if (!v) return
  erroresVenta.value = {}
  guardandoVenta.value = true

  try {
    let huespedId = String(nuevaVenta.value.huespedId ?? '')

    if (!huespedId) {
      const datos = nuevaVenta.value.nuevoHuesped
      if (!datos.nombres.trim() || !datos.apellidos.trim()) {
        erroresVenta.value.apellidos = 'Nombre y apellidos, para poder llamarle.'
        return
      }
      if (!datos.documento.trim()) {
        erroresVenta.value.documento = 'El Registro de Huéspedes lo exige.'
        return
      }
      const creado = await huespedesService.crear({
        tipoDocumento: 'dni',
        documento: datos.documento.trim(),
        nombres: datos.nombres.trim(),
        apellidos: datos.apellidos.trim(),
        telefono: datos.telefono.trim() || undefined,
        frecuente: false,
        activo: true,
      })
      huespedId = creado.id
      huespedes.value = [creado, ...huespedes.value]
    }

    await reservasService.crear({
      localId: localStore.localId ?? '',
      huespedId,
      tipoId: v.tipoId,
      habitacionId: v.habitacion?.id,
      entrada: v.entrada,
      salida: v.salida,
      adultos: nuevaVenta.value.adultos,
      ninos: nuevaVenta.value.ninos,
      canal: nuevaVenta.value.canal,
      estado: 'confirmada',
      regimen: nuevaVenta.value.regimen,
      tarifaNoche: nuevaVenta.value.tarifaNoche,
    })

    ui.exito(
      v.habitacion
        ? `Vendidas ${nochesVenta.value} noche${nochesVenta.value === 1 ? '' : 's'} en la ${v.habitacion.numero}.`
        : `Reserva creada: ${nochesVenta.value} noche${nochesVenta.value === 1 ? '' : 's'}, habitación por asignar.`,
    )
    venta.value = null
    await refrescarLente()
  } catch (e) {
    const err = e as ApiError
    erroresVenta.value = err.campos ?? {}
    ui.error(err.mensaje ?? 'No se pudo cerrar la venta.')
  } finally {
    guardandoVenta.value = false
  }
}

function abrirReserva(reserva: ReservaResuelta) {
  if (lente.value === 'rack' && huboArrastre.value) return
  seleccionada.value = reserva
  moviendoA.value = reserva.habitacionId ?? ''
  panelAbierto.value = true
}

async function moverDesdePanel() {
  if (!seleccionada.value || !moviendoA.value) return
  await reasignar(seleccionada.value, String(moviendoA.value))
}
</script>

<template>
  <div class="hs-operacion flex flex-col gap-4">
    <!--
      La barra de control. Manda sobre las dos lentes y por eso lleva lo único
      que comparten: qué se está mirando y el alta, que es la misma en las dos.
    -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="hs-lentes" role="group" aria-label="Cómo mirar las reservas">
        <button
          v-for="l in lentes"
          :key="l.valor"
          type="button"
          class="hs-lente"
          :class="{ 'es-activa': lente === l.valor }"
          :aria-pressed="lente === l.valor"
          @click="lente = l.valor"
        >
          <HsIcono :nombre="l.icono" tamano="sm" />
          {{ l.etiqueta }}
        </button>
      </div>

      <KmButton @click="abrirVentaVacia">+ Nueva reserva</KmButton>
    </div>

    <!--
      El alcance es distinto en cada lente y se dice en voz alta: el rack
      enseña una ventana del hotel, la lista busca en todo el libro. Callarlo
      haría que cambiar de lente cambiase en silencio lo que se está mirando.
    -->
    <p class="hs-alcance">
      <HsIcono :nombre="lente === 'rack' ? 'cama' : 'huesped'" tamano="xs" />
      <template v-if="lente === 'rack'">
        Las <strong>{{ TRAMO_DIAS }} noches</strong> a partir del <strong>{{ inicio }}</strong
        >, habitación por habitación.
      </template>
      <template v-else>
        <strong>Todo el libro</strong> de reservas, sin límite de fechas: aquí se busca.
      </template>
    </p>

    <!-- El eje de tiempo es la navegación, no un filtro. -->
    <header v-if="lente === 'rack'" class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <KmBotonIcono icono="anterior" etiqueta="Semana anterior" @click="desplazarTramo(-7)" />
        <KmBotonIcono icono="siguiente" etiqueta="Semana siguiente" @click="desplazarTramo(7)" />
        <KmButton variante="secundario" tamano="sm" @click="inicio = hoy">Hoy</KmButton>
        <p class="hs-titulo-seccion ml-2 text-tinta">{{ mesVisible }}</p>
      </div>

      <!-- La leyenda: el color nunca va solo, y aquí se dice qué significa. -->
      <ul class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <li class="flex items-center gap-1.5 text-[11px] font-semibold text-tenue">
          <span class="hs-barra hs-barra-pendiente inline-block h-3 w-6" aria-hidden="true" />
          ◷ Pendiente
        </li>
        <li class="flex items-center gap-1.5 text-[11px] font-semibold text-tenue">
          <span class="hs-barra hs-barra-confirmada inline-block h-3 w-6" aria-hidden="true" />
          ◆ Confirmada
        </li>
        <li class="flex items-center gap-1.5 text-[11px] font-semibold text-tenue">
          <span class="hs-barra hs-barra-encasa inline-block h-3 w-6" aria-hidden="true" />
          ● En casa
        </li>
      </ul>
    </header>

    <p v-if="lente === 'rack' && cargando" class="py-16 text-center text-sm text-tenue">
      Cargando el planning…
    </p>

    <div
      v-else-if="lente === 'rack'"
      class="overflow-x-auto rounded-card border border-linea bg-panel"
      :class="{ 'hs-refrescando': refrescando }"
      :aria-busy="refrescando"
    >
      <div class="min-w-[54rem]">
        <!-- Cabecera de fechas -->
        <div
          class="sticky top-0 z-20 grid border-b border-linea bg-panel-2"
          :style="{ gridTemplateColumns: `${ANCHO_HABITACION}px repeat(${TRAMO_DIAS}, 1fr)` }"
        >
          <div class="hs-etiqueta flex items-end px-3 py-2 text-tenue">Habitación</div>
          <div
            v-for="n in noches"
            :key="n.iso"
            class="border-l border-linea px-1 py-2 text-center"
            :class="[n.finde ? 'hs-rack-finde' : '', n.esHoy ? 'hs-rack-hoy' : '']"
          >
            <p class="text-[10px] leading-none font-bold tracking-wider text-tenue uppercase">
              {{ n.letra }}
            </p>
            <p
              class="mt-1 text-sm leading-none font-semibold tabular-nums"
              :class="n.esHoy ? 'text-turquesa-texto' : 'text-tinta'"
            >
              {{ n.dia }}
            </p>
          </div>
        </div>

        <!-- Sin asignar: lo vendido por tipo que todavía no tiene llave. -->
        <section v-if="sinAsignar.length" class="border-b-2 border-linea">
          <p class="hs-etiqueta bg-panel-2 px-3 py-1.5 text-coral-texto">
            ⚠ Sin habitación asignada · {{ sinAsignar.length }}
          </p>
          <ul class="flex flex-wrap gap-2 px-3 py-2.5">
            <li v-for="r in sinAsignar" :key="r.id">
              <button
                type="button"
                class="flex items-center gap-2 rounded-control border border-linea bg-panel-2 px-2.5 py-1.5 text-left transition-colors hover:border-azul"
                @click="abrirReserva(r)"
              >
                <span class="font-mono text-[11px] font-semibold text-tinta">{{ r.codigo }}</span>
                <span class="text-xs text-tenue">
                  {{ r.tipo?.nombre }} · {{ r.entrada.slice(8, 10) }}/{{ r.entrada.slice(5, 7) }} →
                  {{ r.salida.slice(8, 10) }}/{{ r.salida.slice(5, 7) }}
                </span>
              </button>
            </li>
          </ul>
        </section>

        <!-- Una sección por planta: el hotel se recorre por pisos. -->
        <section v-for="piso in porPiso" :key="piso.nombre">
          <p class="hs-etiqueta border-b border-linea bg-panel-2 px-3 py-1.5 text-tenue">
            {{ piso.nombre }}
          </p>

          <div
            v-for="h in piso.habitaciones"
            :key="h.id"
            :data-habitacion="h.id"
            class="relative grid"
            :class="[
              arrastre?.sobre === h.id
                ? arrastre.vetada
                  ? 'hs-rack-destino-vetado'
                  : 'hs-rack-destino'
                : '',
            ]"
            :style="{ gridTemplateColumns: `${ANCHO_HABITACION}px repeat(${TRAMO_DIAS}, 1fr)` }"
          >
            <!-- Columna fija: el inventario -->
            <div
              class="hs-rack-celda flex items-center gap-2 px-3 py-2"
              :class="h.limpieza === 'fueraServicio' ? 'hs-rack-fuera' : ''"
            >
              <span class="hs-display text-sm leading-none font-semibold text-tinta">
                {{ h.numero }}
              </span>
              <span class="truncate text-[10px] leading-none text-tenue">
                {{ h.tipo?.codigo ?? h.tipo?.nombre }}
              </span>
              <span
                v-if="h.limpieza === 'fueraServicio'"
                class="ml-auto text-[10px] font-bold text-coral-texto"
                :title="h.nota"
              >
                ✕ FDS
              </span>
            </div>

            <!-- Las noches -->
            <div
              v-for="(n, i) in noches"
              :key="n.iso"
              :data-columna="i"
              :data-habitacion="h.id"
              class="hs-rack-celda h-[var(--km-celda,2.5rem)] cursor-cell"
              :class="[
                n.finde ? 'hs-rack-finde' : '',
                n.esHoy ? 'hs-rack-hoy' : '',
                h.limpieza === 'fueraServicio' ? 'hs-rack-fuera cursor-not-allowed' : '',
                enSeleccion(h.id, i) ? 'bg-seleccion' : '',
              ]"
              @pointerdown="h.limpieza !== 'fueraServicio' && empezarSeleccion(h.id, i)"
            />

            <!--
              Las reservas, por encima de la rejilla.

              La capa entera es transparente al puntero y solo las barras lo
              reciben: si el envoltorio lo captase, cubriría la fila completa y
              el barrido para vender nunca llegaría a las celdas de debajo.
            -->
            <div
              class="pointer-events-none absolute inset-y-0 right-0"
              :style="{ left: `${ANCHO_HABITACION}px` }"
            >
              <div class="relative h-full">
                <BarraReserva
                  v-for="t in tramosDe(h.id)"
                  :key="t.reserva.id"
                  :reserva="t.reserva"
                  :desde-col="t.desdeCol"
                  :noches="t.noches"
                  :columnas="TRAMO_DIAS"
                  :corta-izquierda="t.cortaIzquierda"
                  :corta-derecha="t.cortaDerecha"
                  :arrastrando="arrastre?.reservaId === t.reserva.id"
                  :desplazada="arrastre?.reservaId === t.reserva.id ? arrastre.dy : 0"
                  :columnas-movidas="arrastre?.reservaId === t.reserva.id ? arrastre.dCol : 0"
                  :modo="arrastre?.reservaId === t.reserva.id ? arrastre.modo : undefined"
                  :vetada="arrastre?.reservaId === t.reserva.id && arrastre.vetada"
                  :fijada="estaFijada(t.reserva)"
                  @arrastrar="(e, modo) => empezarArrastre(e, t.reserva, modo)"
                  @abrir="abrirReserva(t.reserva)"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Pie: la ocupación por noche, que es el número del negocio. -->
        <div
          class="grid border-t-2 border-linea bg-panel-2"
          :style="{ gridTemplateColumns: `${ANCHO_HABITACION}px repeat(${TRAMO_DIAS}, 1fr)` }"
        >
          <div class="hs-etiqueta flex items-center px-3 py-2 text-tenue">Ocupación</div>
          <div
            v-for="o in ocupacionPorNoche"
            :key="o.iso"
            class="border-l border-linea px-1 py-2 text-center"
            :title="`${o.ocupadas} de ${o.vendibles} vendibles`"
          >
            <p
              class="text-xs leading-none font-semibold tabular-nums"
              :class="o.pct >= 90 ? 'text-coral-texto' : 'text-tinta'"
            >
              {{ Math.round(o.pct) }}%
            </p>
            <div class="mx-auto mt-1.5 h-1 w-8 overflow-hidden rounded-full bg-linea">
              <div
                class="h-full rounded-full"
                :class="o.pct >= 90 ? 'bg-coral' : 'bg-azul'"
                :style="{ width: `${Math.min(100, o.pct)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- La lente de consulta: mismo libro, otra pregunta. -->
    <div v-if="lente === 'lista'" class="rounded-card border border-linea bg-panel">
      <ListaReservas ref="lista" @abrir="abrirReserva" />
    </div>

    <p v-if="lente === 'rack'" class="text-xs text-tenue">
      Arrastra una reserva para moverla de habitación o de fecha, tira de sus bordes para cambiar la
      entrada o la salida, y barre noches libres para vender. Todo se puede hacer también desde el
      panel de la reserva.
    </p>
  </div>

  <!-- Panel de la reserva -->
  <KmDrawer v-model="panelAbierto" :titulo="seleccionada?.codigo ?? 'Reserva'" ancho="md">
    <div v-if="seleccionada" class="flex flex-col gap-5">
      <header>
        <p class="hs-display text-xl leading-tight font-semibold text-tinta">
          {{ seleccionada.huesped?.nombres }} {{ seleccionada.huesped?.apellidos }}
        </p>
        <p class="mt-1 text-sm text-tenue">
          {{ seleccionada.noches }} noche{{ seleccionada.noches === 1 ? '' : 's' }} ·
          {{ seleccionada.adultos }} adulto{{ seleccionada.adultos === 1 ? '' : 's' }}
          <span v-if="seleccionada.ninos">· {{ seleccionada.ninos }} niño(s)</span>
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <KmBadge :tono="tonoReserva[seleccionada.estado]" punto>
            {{ etiquetaReserva[seleccionada.estado] }}
          </KmBadge>
          <KmBadge tono="neutro">{{ nombreCanal(seleccionada.canal) }}</KmBadge>
        </div>
      </header>

      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="hs-etiqueta text-tenue">Entrada</dt>
          <dd class="mt-1 font-semibold text-tinta tabular-nums">{{ seleccionada.entrada }}</dd>
        </div>
        <div>
          <dt class="hs-etiqueta text-tenue">Salida</dt>
          <dd class="mt-1 font-semibold text-tinta tabular-nums">{{ seleccionada.salida }}</dd>
        </div>
        <div>
          <dt class="hs-etiqueta text-tenue">Tipo contratado</dt>
          <dd class="mt-1 text-tinta">{{ seleccionada.tipo?.nombre ?? '—' }}</dd>
        </div>
        <div>
          <dt class="hs-etiqueta text-tenue">Tarifa / noche</dt>
          <dd class="mt-1 font-semibold text-tinta tabular-nums">
            {{ formatearSoles(seleccionada.tarifaNoche) }}
          </dd>
        </div>
      </dl>

      <!-- El mismo cambio de habitación, sin arrastrar. -->
      <div class="rounded-card border border-linea bg-panel-2 p-4">
        <p class="hs-etiqueta text-tenue">Habitación</p>
        <p class="mt-1 mb-3 text-sm text-tinta">
          {{
            seleccionada.habitacion
              ? `${seleccionada.habitacion.numero} · ${etiquetaLimpieza[seleccionada.habitacion.limpieza]}`
              : 'Sin asignar todavía'
          }}
        </p>
        <div class="flex items-end gap-2">
          <KmSelect
            v-model="moviendoA"
            :opciones="opcionesHabitacion"
            etiqueta="Mover a"
            placeholder="Elige habitación"
            class="flex-1"
          />
          <KmButton
            variante="secundario"
            :disabled="!moviendoA || moviendoA === seleccionada.habitacionId"
            @click="moverDesdePanel"
          >
            Mover
          </KmButton>
        </div>
      </div>

      <p v-if="seleccionada.notas" class="text-sm text-tenue">{{ seleccionada.notas }}</p>
    </div>
  </KmDrawer>

  <!-- Venta desde el rack: se cierra aquí, sin cambiar de pantalla. -->
  <KmDrawer
    :model-value="Boolean(venta)"
    :titulo="venta?.habitacion ? 'Vender estas noches' : 'Nueva reserva'"
    ancho="md"
    @update:model-value="venta = null"
  >
    <div v-if="venta" class="flex flex-col gap-5">
      <!--
        Cuando la venta viene del rack, esto ya está decidido y solo se enseña.
        Cuando viene del botón, no hay nada marcado: hay que preguntarlo.
      -->
      <section v-if="!venta.habitacion" class="flex flex-col gap-3">
        <h3 class="hs-titulo-seccion flex items-center gap-2 text-tinta">
          <HsIcono nombre="cama" tamano="sm" /> Qué se reserva
        </h3>
        <KmField
          v-slot="{ id }"
          label="Tipo de habitación"
          ayuda="Se vende el tipo; la habitación concreta se asigna al llegar."
        >
          <KmSelect :id="id" v-model="venta.tipoId" :opciones="opcionesTipo" />
        </KmField>
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Entrada" :error="erroresVenta.entrada">
            <KmInput :id="id" v-model="venta.entrada" type="date" />
          </KmField>
          <KmField v-slot="{ id }" label="Salida" :error="erroresVenta.salida">
            <KmInput :id="id" v-model="venta.salida" type="date" />
          </KmField>
        </div>
      </section>

      <!-- Lo que ya está decidido. No se pregunta: se enseña. -->
      <div class="hs-venta-resumen">
        <div>
          <p class="hs-venta-rotulo"><HsIcono nombre="cama" tamano="xs" /> Habitación</p>
          <p class="hs-venta-dato">{{ venta.habitacion?.numero ?? '—' }}</p>
          <p class="hs-venta-pie">
            {{ venta.habitacion ? venta.habitacion.tipo?.nombre : 'se asigna al llegar' }}
          </p>
        </div>
        <div>
          <p class="hs-venta-rotulo"><HsIcono nombre="llegada" tamano="xs" /> Entrada</p>
          <p class="hs-venta-dato">
            {{ venta.entrada.slice(8, 10) }}/{{ venta.entrada.slice(5, 7) }}
          </p>
          <p class="hs-venta-pie">por la tarde</p>
        </div>
        <div>
          <p class="hs-venta-rotulo"><HsIcono nombre="salida" tamano="xs" /> Salida</p>
          <p class="hs-venta-dato">
            {{ venta.salida.slice(8, 10) }}/{{ venta.salida.slice(5, 7) }}
          </p>
          <p class="hs-venta-pie">por la mañana</p>
        </div>
        <div>
          <p class="hs-venta-rotulo"><HsIcono nombre="noche" tamano="xs" /> Noches</p>
          <p class="hs-venta-dato">{{ nochesVenta }}</p>
          <p class="hs-venta-pie">es lo que se cobra</p>
        </div>
      </div>

      <!-- Lo único que el rack no sabe: quién duerme ahí. -->
      <section class="flex flex-col gap-3">
        <h3 class="hs-titulo-seccion flex items-center gap-2 text-tinta">
          <HsIcono nombre="huesped" tamano="sm" /> A nombre de quién
        </h3>

        <KmField
          v-slot="{ id }"
          label="Huésped"
          ayuda="Busca por apellido; si no está, se da de alta abajo."
        >
          <KmSelect
            :id="id"
            v-model="nuevaVenta.huespedId"
            :opciones="opcionesHuesped"
            placeholder="Buscar huésped…"
          />
        </KmField>

        <div v-if="altaDeHuesped" class="hs-alta-huesped">
          <p class="mb-3 text-xs text-tenue">
            Huésped nuevo. El documento hace falta desde ya: es uno de los campos que la norma exige
            en el Registro de Huéspedes. El resto se completa al llegar.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <KmField
              v-slot="{ id, invalido }"
              label="Nombres"
              :error="erroresVenta.nombres"
              requerido
            >
              <KmInput
                :id="id"
                v-model="nuevaVenta.nuevoHuesped.nombres"
                placeholder="María"
                :invalido="invalido"
              />
            </KmField>
            <KmField
              v-slot="{ id, invalido }"
              label="Apellidos"
              :error="erroresVenta.apellidos"
              requerido
            >
              <KmInput
                :id="id"
                v-model="nuevaVenta.nuevoHuesped.apellidos"
                placeholder="Quispe Rojas"
                :invalido="invalido"
              />
            </KmField>
            <KmField
              v-slot="{ id, invalido }"
              label="Documento"
              :error="erroresVenta.documento"
              requerido
            >
              <KmInput
                :id="id"
                v-model="nuevaVenta.nuevoHuesped.documento"
                placeholder="DNI o pasaporte"
                :invalido="invalido"
              />
            </KmField>
            <KmField v-slot="{ id }" label="Teléfono">
              <KmInput
                :id="id"
                v-model="nuevaVenta.nuevoHuesped.telefono"
                placeholder="9xx xxx xxx"
              />
            </KmField>
          </div>
        </div>
      </section>

      <!-- Cómo se vende. -->
      <section class="flex flex-col gap-3">
        <h3 class="hs-titulo-seccion flex items-center gap-2 text-tinta">
          <HsIcono nombre="tarifa" tamano="sm" /> Cómo se vende
        </h3>

        <div class="grid gap-4 sm:grid-cols-2">
          <KmField v-slot="{ id }" label="Adultos" :error="erroresVenta.adultos">
            <KmNumero :id="id" v-model="nuevaVenta.adultos" :min="1" :max="8" />
          </KmField>
          <KmField v-slot="{ id }" label="Niños">
            <KmNumero :id="id" v-model="nuevaVenta.ninos" :min="0" :max="6" />
          </KmField>
          <KmField
            v-slot="{ id }"
            label="Canal"
            ayuda="Cambia la tarifa: cada canal tiene su ajuste."
          >
            <KmSelect :id="id" v-model="nuevaVenta.canal" :opciones="opcionesCanal" />
          </KmField>
          <KmField v-slot="{ id }" label="Régimen">
            <KmSelect :id="id" v-model="nuevaVenta.regimen" :opciones="opcionesRegimen" />
          </KmField>
        </div>

        <KmField
          v-slot="{ id }"
          label="Tarifa por noche"
          :error="erroresVenta.tarifaNoche"
          ayuda="Propuesta con la temporada y el canal ya aplicados. Se puede pactar otra."
        >
          <KmNumero
            :id="id"
            v-model="nuevaVenta.tarifaNoche"
            :min="0"
            :decimales="2"
            prefijo="S/"
          />
        </KmField>

        <!-- El total, grande: es el número que se dice en voz alta. -->
        <div class="hs-venta-total">
          <span>{{ nochesVenta }} × {{ formatearSoles(nuevaVenta.tarifaNoche) }}</span>
          <strong class="hs-display">{{ formatearSoles(totalVenta) }}</strong>
        </div>
      </section>
    </div>

    <template #footer>
      <KmButton variante="fantasma" @click="venta = null">Cancelar</KmButton>
      <KmButton :cargando="guardandoVenta" @click="confirmarVenta">Confirmar reserva</KmButton>
    </template>
  </KmDrawer>
</template>

<style scoped>
/*
 * El resumen de la venta: los cuatro datos que el rack ya sabe, en cifras
 * grandes. Se enseñan en vez de preguntarse, y con ese tamaño se leen a la
 * distancia a la que se está cuando se habla por teléfono.
 */
.hs-venta-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--hs-border);
  border-radius: var(--hs-radio-card, 12px);
  background-color: var(--hs-surface-2);
}

.hs-venta-rotulo {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hs-muted);
}

.hs-venta-dato {
  margin: 0.25rem 0 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  color: var(--hs-text);
}

.hs-venta-pie {
  margin: 0.125rem 0 0;
  font-size: 0.6875rem;
  color: var(--hs-muted);
}

.hs-alta-huesped {
  padding: 1rem;
  border: 1px dashed var(--hs-border);
  border-radius: var(--hs-radio-card, 12px);
  background-color: var(--hs-surface-2);
}

/* El total se dice en voz alta, así que se ve de lejos. */
.hs-venta-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-radius: var(--hs-radio-card, 12px);
  background-color: var(--hs-azul-50);
  font-size: 0.8125rem;
  color: var(--hs-muted);
}

.hs-venta-total strong {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--hs-primary-strong);
}
</style>
