<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import HsIcono, { type IconoHotel } from '@/components/hotel/HsIcono.vue'
import type { EstadoReserva, ReservaResuelta } from '@/types'
import { formatearSoles } from '@/utils/formato'
import { etiquetaReserva } from '@/utils/habitaciones'

/**
 * Una reserva dentro del rack, y el control con el que se mueve.
 *
 * La barra no ocupa celdas enteras: empieza a media casilla y termina a media
 * casilla, porque una entrada es por la tarde y una salida por la mañana. Ese
 * medio hueco es lo que permite ver de un vistazo que una habitación se libera
 * y se vuelve a vender el mismo día —el día de solape, en la jerga— y es el
 * detalle por el que una recepción reconoce un rack de verdad.
 *
 * Tiene tres zonas de agarre, y las tres significan cosas distintas del
 * oficio: el **cuerpo** mueve la estancia entera —de habitación, de fecha o de
 * las dos—, el **borde izquierdo** adelanta o retrasa la entrada y el
 * **derecho** alarga o acorta la salida, que es la operación más común de un
 * mostrador. Sin los bordes, prolongar una noche obligaría a abrir un
 * formulario para cambiar una fecha.
 */

export type ModoArrastre = 'mover' | 'inicio' | 'fin'

const props = defineProps<{
  reserva: ReservaResuelta
  /** Índice de la columna donde entra, en noches desde el inicio del tramo. */
  desdeCol: number
  /** Noches que ocupa dentro del tramo visible. */
  noches: number
  /** Total de columnas del tramo, para calcular el porcentaje. */
  columnas: number
  /** La entrada real cae antes del tramo: la barra viene cortada por la izquierda. */
  cortaIzquierda: boolean
  cortaDerecha: boolean
  arrastrando?: boolean
  /** Desplazamiento vertical mientras se arrastra, en píxeles. */
  desplazada?: number
  /** Columnas que se ha desplazado en horizontal durante el arrastre. */
  columnasMovidas?: number
  /** Qué borde se está estirando, si alguno. */
  modo?: ModoArrastre
  /** El movimiento en curso no es válido: se pinta en rojo. */
  vetada?: boolean
  /** No se puede mover: estancia cerrada, cancelada o no presentada. */
  fijada?: boolean
}>()

const emit = defineEmits<{ abrir: []; arrastrar: [PointerEvent, ModoArrastre] }>()

/**
 * La geometría durante el arrastre.
 *
 * Mover desplaza los dos extremos; estirar mueve solo uno. Se calcula aquí, en
 * la propia barra, para que la vista previa siga al dedo sin esperar respuesta
 * del servicio: el veto se pinta encima, pero el movimiento se ve siempre.
 */
const estilo = computed(() => {
  const paso = 100 / props.columnas
  const d = props.columnasMovidas ?? 0
  const modo = props.modo ?? 'mover'

  const dInicio = modo === 'fin' ? 0 : d
  const dFin = modo === 'inicio' ? 0 : d

  const inicio = (props.cortaIzquierda ? props.desdeCol : props.desdeCol + 0.5) + dInicio
  const fin =
    (props.cortaDerecha ? props.desdeCol + props.noches : props.desdeCol + props.noches + 0.5) +
    dFin

  // Nunca se invierte: estirando de más, la barra se queda en media noche.
  const izq = Math.min(inicio, fin - 0.5)
  const der = Math.max(fin, inicio + 0.5)

  return {
    left: `${izq * paso}%`,
    width: `${(der - izq) * paso}%`,
    transform: props.desplazada ? `translateY(${props.desplazada}px)` : undefined,
  }
})

const tonos: Record<string, string> = {
  pendiente: 'hs-barra-pendiente',
  confirmada: 'hs-barra-confirmada',
  enCasa: 'hs-barra-encasa',
  salida: 'hs-barra-salida',
  cancelada: 'hs-barra-fria',
  noShow: 'hs-barra-fria',
}

/**
 * El estado se dice con icono además de con color. El rack se mira de lejos y
 * durante turnos enteros: el color solo no basta, y menos a un daltónico.
 */
const iconos: Record<EstadoReserva, IconoHotel> = {
  pendiente: 'noche',
  confirmada: 'llave',
  enCasa: 'enCasa',
  salida: 'salida',
  cancelada: 'bloqueo',
  noShow: 'noVino',
}

const nombre = computed(() => {
  const h = props.reserva.huesped
  return h ? `${h.apellidos}, ${h.nombres}` : props.reserva.codigo
})

const nochesTotales = computed(() => {
  const ms = new Date(props.reserva.salida).getTime() - new Date(props.reserva.entrada).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
})

// ── Ficha al pasar por encima ────────────────────────────────────────────────

/*
 * El `title` del navegador tarda un segundo, se corta y no sabe de temas. La
 * recepción consulta el rack a ritmo de teléfono, así que la ficha sale
 * enseguida y trae lo que se pregunta: quién, cuántas noches, cuánto y por
 * dónde entró.
 */
const fichaVisible = ref(false)
const posicion = ref({ x: 0, y: 0, debajo: false })
let temporizador: ReturnType<typeof setTimeout> | undefined

/** Alto aproximado de la ficha, para decidir si cabe encima de la barra. */
const ALTO_FICHA = 210

function mostrarFicha(evento: PointerEvent) {
  if (props.arrastrando) return
  const caja = (evento.currentTarget as HTMLElement).getBoundingClientRect()
  // Las primeras filas del rack no tienen sitio arriba: ahí la ficha baja.
  const debajo = caja.top < ALTO_FICHA
  posicion.value = {
    x: Math.min(Math.max(caja.left + caja.width / 2, 130), window.innerWidth - 130),
    y: debajo ? caja.bottom : caja.top,
    debajo,
  }
  temporizador = setTimeout(() => (fichaVisible.value = true), 140)
}

function ocultarFicha() {
  clearTimeout(temporizador)
  fichaVisible.value = false
}

onBeforeUnmount(() => clearTimeout(temporizador))

const resumenAccesible = computed(
  () =>
    `${nombre.value}. ${etiquetaReserva[props.reserva.estado]}. ` +
    `${nochesTotales.value} noche${nochesTotales.value === 1 ? '' : 's'}, ` +
    `del ${props.reserva.entrada} al ${props.reserva.salida}.`,
)
</script>

<template>
  <div
    class="hs-barra pointer-events-auto absolute inset-y-1 flex items-stretch"
    :class="[
      tonos[reserva.estado] ?? 'hs-barra-confirmada',
      cortaIzquierda ? 'hs-barra-corta-izq' : '',
      cortaDerecha ? 'hs-barra-corta-der' : '',
      arrastrando ? 'hs-barra-arrastrando' : '',
      vetada ? 'hs-barra-vetada' : '',
      fijada ? 'hs-barra-fijada' : '',
    ]"
    :style="estilo"
  >
    <!-- Borde izquierdo: adelanta o retrasa la entrada. -->
    <span
      v-if="!fijada && !cortaIzquierda"
      class="hs-asa hs-asa-izq"
      role="separator"
      :aria-label="`Cambiar la entrada de ${nombre}`"
      title="Arrastra para cambiar la entrada"
      @pointerdown.stop="emit('arrastrar', $event, 'inicio')"
    />

    <!-- Cuerpo: abre la ficha al pulsar, mueve la estancia al arrastrar. -->
    <button
      type="button"
      class="hs-barra-cuerpo flex min-w-0 flex-1 items-center gap-1.5 px-1.5 text-left"
      :aria-label="resumenAccesible"
      @pointerdown="!fijada && emit('arrastrar', $event, 'mover')"
      @pointerenter="mostrarFicha"
      @pointerleave="ocultarFicha"
      @focus="fichaVisible = false"
      @click="emit('abrir')"
    >
      <HsIcono :nombre="iconos[reserva.estado]" tamano="xs" class="shrink-0 opacity-90" />
      <span class="hs-barra-nombre truncate">{{ nombre }}</span>
      <span v-if="noches >= 3" class="hs-barra-noches ml-auto shrink-0">
        {{ nochesTotales }}
      </span>
    </button>

    <!-- Borde derecho: alarga o acorta la salida. Es el gesto más frecuente. -->
    <span
      v-if="!fijada && !cortaDerecha"
      class="hs-asa hs-asa-der"
      role="separator"
      :aria-label="`Cambiar la salida de ${nombre}`"
      title="Arrastra para alargar o acortar la salida"
      @pointerdown.stop="emit('arrastrar', $event, 'fin')"
    />
  </div>

  <Teleport to="body">
    <div
      v-if="fichaVisible"
      class="hs-ficha-rack"
      :class="posicion.debajo ? 'es-debajo' : ''"
      role="note"
      :style="{ left: `${posicion.x}px`, top: `${posicion.y}px` }"
    >
      <p class="hs-ficha-nombre">{{ nombre }}</p>
      <p class="hs-ficha-codigo">{{ reserva.codigo }} · {{ etiquetaReserva[reserva.estado] }}</p>

      <dl class="hs-ficha-datos">
        <div>
          <dt><HsIcono nombre="noche" tamano="xs" /> Noches</dt>
          <dd>{{ nochesTotales }}</dd>
        </div>
        <div>
          <dt><HsIcono nombre="llegada" tamano="xs" /> Entrada</dt>
          <dd>{{ reserva.entrada }}</dd>
        </div>
        <div>
          <dt><HsIcono nombre="salida" tamano="xs" /> Salida</dt>
          <dd>{{ reserva.salida }}</dd>
        </div>
        <div>
          <dt><HsIcono nombre="huesped" tamano="xs" /> Huéspedes</dt>
          <dd>
            {{ reserva.adultos }}<template v-if="reserva.ninos">+{{ reserva.ninos }}</template>
          </dd>
        </div>
        <div>
          <dt><HsIcono nombre="tarifa" tamano="xs" /> Por noche</dt>
          <dd>{{ formatearSoles(reserva.tarifaNoche) }}</dd>
        </div>
        <div>
          <dt><HsIcono nombre="ota" tamano="xs" /> Canal</dt>
          <dd class="capitalize">{{ reserva.canal }}</dd>
        </div>
      </dl>

      <p v-if="!fijada" class="hs-ficha-pista">
        <HsIcono nombre="arrastrar" tamano="xs" /> Arrastra para mover ·
        <HsIcono nombre="estirar" tamano="xs" /> tira de los bordes para cambiar las fechas
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
/*
 * Las asas. Ocho píxeles es el mínimo que un ratón acierta sin apuntar; en
 * modo operación crecen con el resto de la interfaz.
 */
.hs-asa {
  width: 8px;
  flex: none;
  cursor: ew-resize;
  border-radius: inherit;
  background-image: linear-gradient(
    to right,
    transparent 2px,
    currentColor 2px,
    currentColor 3px,
    transparent 3px,
    transparent 5px,
    currentColor 5px,
    currentColor 6px,
    transparent 6px
  );
  opacity: 0;
  transition: opacity var(--km-mov-rapido) var(--km-curva);
}

.hs-barra:hover .hs-asa,
.hs-barra:focus-within .hs-asa {
  opacity: 0.55;
}

.hs-asa:hover {
  opacity: 1 !important;
}

.hs-barra-cuerpo {
  cursor: grab;
  border-radius: inherit;
}

.hs-barra-arrastrando .hs-barra-cuerpo {
  cursor: grabbing;
}

.hs-barra-fijada .hs-barra-cuerpo {
  cursor: pointer;
}

/*
 * El nombre y el contador de noches.
 *
 * 12px es el suelo legible para un dato que se lee todo el día; por debajo
 * de eso el apellido se adivina en vez de leerse. El contador va en cifras
 * tabulares para que las barras de una columna no bailen.
 */
.hs-barra-nombre {
  font-size: 0.75rem;
  line-height: 1.1;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.hs-barra-noches {
  display: inline-flex;
  min-width: 1.15rem;
  justify-content: center;
  padding: 0.0625rem 0.25rem;
  border-radius: 999px;
  background-color: rgb(255 255 255 / 0.22);
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

/* ── La ficha flotante ──────────────────────────────────────────────────── */

.hs-ficha-rack {
  position: fixed;
  z-index: 60;
  transform: translate(-50%, calc(-100% - 10px));
  /* Aparece sin llamar la atención: es un dato, no un aviso. */
  animation: hs-ficha-entra var(--km-mov-rapido) var(--km-curva);
  width: 15rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--hs-border);
  border-radius: var(--hs-radio-card, 12px);
  background-color: var(--hs-surface);
  box-shadow: var(--hs-sombra-flotante, 0 12px 34px -12px rgb(11 20 33 / 0.38));
  pointer-events: none;
}

.hs-ficha-rack.es-debajo {
  transform: translate(-50%, 10px);
}

@keyframes hs-ficha-entra {
  from {
    opacity: 0;
  }
}

.hs-ficha-nombre {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--hs-text);
}

.hs-ficha-codigo {
  margin: 0.125rem 0 0.625rem;
  font-size: 0.6875rem;
  color: var(--hs-muted);
}

.hs-ficha-datos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 0.75rem;
  margin: 0;
  padding-top: 0.625rem;
  border-top: 1px solid var(--hs-border);
}

.hs-ficha-datos dt {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--hs-muted);
}

.hs-ficha-datos dd {
  margin: 0.0625rem 0 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--hs-text);
  font-variant-numeric: tabular-nums;
}

.hs-ficha-pista {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  margin: 0.625rem 0 0;
  padding-top: 0.5rem;
  border-top: 1px solid var(--hs-border);
  font-size: 0.625rem;
  color: var(--hs-muted);
}
</style>
