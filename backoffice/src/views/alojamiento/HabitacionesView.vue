<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import PlanoPiso from '@/components/alojamiento/PlanoPiso.vue'
import HsIcono from '@/components/hotel/HsIcono.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { habitacionesService } from '@/services/habitaciones.service'
import { pisosService } from '@/services/pisos.service'
import { tiposService } from '@/services/tipos.service'
import { usuariosService } from '@/services/usuarios.service'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type { EstadoLimpieza, HabitacionResuelta, Piso, TipoHabitacion, Usuario } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { desdeHace, fechaCorta } from '@/utils/formato'
import {
  etiquetaLimpieza,
  etiquetaOcupacion,
  glifoLimpieza,
  glifoOcupacion,
  tonoLimpieza,
  tonoOcupacion,
} from '@/utils/habitaciones'

/**
 * El inventario físico del hotel.
 *
 * Esta pantalla es el registro de lo que el hotel **tiene**, no de lo que pasa
 * hoy: aquí se dan de alta las habitaciones, se corrigen y se retiran. El
 * tablero contesta «¿qué pasa ahora?» y el plano «¿dónde está?»; esta contesta
 * «¿qué habitaciones existen y qué se sabe de cada una?».
 *
 * Los dos ejes de estado —ocupación y limpieza— se enseñan pero no se editan
 * a mano en el alta: los mueve la operación. Lo que sí se gobierna desde aquí
 * es lo que no cambia de un día para otro: a qué piso pertenece, de qué tipo
 * es, qué vista tiene y con cuál comunica.
 */

const localStore = useLocalStore()
const ui = useUiStore()

const pisos = ref<Piso[]>([])
const tipos = ref<TipoHabitacion[]>([])
const camareras = ref<Usuario[]>([])
const resumen = ref<Awaited<ReturnType<typeof habitacionesService.resumen>> | null>(null)
const hermanas = ref<HabitacionResuelta[]>([])

const columnas: ColumnaTabla[] = [
  { clave: 'numero', etiqueta: 'Habitación', clase: 'w-36', ordenable: true },
  { clave: 'tipo', etiqueta: 'Tipo', clase: 'w-52' },
  { clave: 'ocupacion', etiqueta: 'Ocupación', clase: 'w-36' },
  { clave: 'limpieza', etiqueta: 'Limpieza', clase: 'w-44' },
  { clave: 'vista', etiqueta: 'Vista', clase: 'w-36' },
  { clave: 'actualizada', etiqueta: 'Último cambio', clase: 'w-36', ordenable: true },
]

const filtrosFijos = computed(() => ({ localId: localStore.localId ?? undefined }))

const opcionesPiso = computed<OpcionSelect[]>(() =>
  pisos.value.map((p) => ({ valor: p.id, etiqueta: `${p.nombre} · nivel ${p.nivel}` })),
)

const opcionesTipo = computed<OpcionSelect[]>(() =>
  tipos.value.map((t) => ({ valor: t.id, etiqueta: `${t.codigo} · ${t.nombre}` })),
)

/** El alta nace libre y limpia: una habitación nueva todavía no tiene historia. */
const nuevo = (): Omit<HabitacionResuelta, 'id'> => ({
  numero: '',
  pisoId: pisos.value[0]?.id ?? '',
  tipoId: tipos.value[0]?.id ?? '',
  ocupacion: 'libre',
  limpieza: 'limpia',
  vista: '',
  comunicaCon: [],
  posX: 50,
  posY: 50,
  actualizada: new Date().toISOString(),
})

function validar(h: Omit<HabitacionResuelta, 'id'>): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!h.numero.trim()) errores.numero = 'El número es obligatorio.'
  if (!h.pisoId) errores.pisoId = 'Elige a qué piso pertenece.'
  if (!h.tipoId) errores.tipoId = 'Elige el tipo: de ahí sale la tarifa y el aforo.'
  return errores
}

async function cargarApoyo() {
  const localId = localStore.localId
  if (!localId) return
  try {
    const [listaPisos, listaTipos, listaCamareras, cifras, listaHermanas] = await Promise.all([
      pisosService.consultar({ filtros: { localId }, porPagina: 200 }),
      tiposService.consultar({ porPagina: 200 }),
      usuariosService.personalDePisos(),
      habitacionesService.resumen(localId),
      habitacionesService.listarPorLocal(localId),
    ])
    pisos.value = listaPisos.items.filter((p) => p.activo)
    tipos.value = listaTipos.items.filter((t) => t.activo)
    camareras.value = listaCamareras
    resumen.value = cifras
    hermanas.value = listaHermanas
  } catch {
    ui.error('No se pudieron cargar los datos de apoyo.')
  }
}

onMounted(async () => {
  if (!localStore.localId) await localStore.cargar().catch(() => undefined)
  await cargarApoyo()
})
watch(() => localStore.localId, cargarApoyo)

/** Las que pueden comunicar: todas las de la sede menos ella misma. */
function abrirPlano() {
  colocando.value = true
  if (!pisoPlano.value) pisoPlano.value = pisos.value[0]?.id ?? ''
}

function candidatasComunicadas(numeroActual: string) {
  return hermanas.value.filter((h) => h.numero !== numeroActual)
}

function alternarComunicada(borrador: Omit<HabitacionResuelta, 'id'>, id: string) {
  const actuales = borrador.comunicaCon ?? []
  borrador.comunicaCon = actuales.includes(id)
    ? actuales.filter((x) => x !== id)
    : [...actuales, id]
}

const nombreHabitacion = (id: string) => hermanas.value.find((h) => h.id === id)?.numero ?? '—'

/** Las camareras se asignan desde aquí porque el turno se reparte en lista. */
async function asignar(h: HabitacionResuelta, usuarioId: string | number | undefined) {
  try {
    await habitacionesService.asignarCamarera(h.id, (usuarioId as string) || undefined)
    ui.exito(`Habitación ${h.numero} reasignada.`)
    await cargarApoyo()
  } catch {
    ui.error('No se pudo asignar la camarera.')
  }
}

async function cambiarLimpieza(h: HabitacionResuelta, estado: EstadoLimpieza) {
  try {
    await habitacionesService.cambiarLimpieza(h.id, estado)
    ui.exito(`Habitación ${h.numero}: ${etiquetaLimpieza[estado].toLowerCase()}.`)
    await cargarApoyo()
  } catch (e) {
    ui.error((e as { mensaje?: string }).mensaje ?? 'No se pudo cambiar el estado.')
  }
}

const opcionesCamarera = computed<OpcionSelect[]>(() => [
  { valor: '', etiqueta: 'Sin asignar' },
  ...camareras.value.map((u) => ({ valor: u.id, etiqueta: u.nombre })),
])

/** Habitaciones sin camarera del turno: el hueco que deja sucia una planta. */
/**
 * El modo «colocar en el plano».
 *
 * Antes la posición se tecleaba como dos porcentajes en el alta, que es algo
 * que nadie en un hotel va a hacer. Y el plano vivía en una pantalla aparte que
 * solo pintaba. Las dos mitades se juntan aquí: **colocar el inventario es
 * mantenimiento del inventario**, y este es su sitio.
 */
const colocando = ref(false)
const pisoPlano = ref('')
const guardandoPlano = ref(false)

const pisosConPlano = computed(() =>
  pisos.value.map((p) => ({
    valor: p.id,
    etiqueta: `${p.nombre} · ${hermanas.value.filter((h) => h.pisoId === p.id).length} hab.`,
  })),
)

const habitacionesDelPiso = computed(() =>
  hermanas.value.filter((h) => h.pisoId === (pisoPlano.value || pisos.value[0]?.id)),
)

/**
 * Se mueve en local y se guarda al soltar. Pedir al servidor cada píxel haría
 * el arrastre a tirones y llenaría la bitácora de ruido.
 */
function moverEnPlano(id: string, posX: number, posY: number) {
  const h = hermanas.value.find((x) => x.id === id)
  if (!h) return
  h.posX = posX
  h.posY = posY
  guardarPosicion(h)
}

let pendiente: ReturnType<typeof setTimeout> | undefined
function guardarPosicion(h: HabitacionResuelta) {
  clearTimeout(pendiente)
  guardandoPlano.value = true
  pendiente = setTimeout(async () => {
    try {
      await habitacionesService.actualizar(h.id, { posX: h.posX, posY: h.posY })
    } catch {
      ui.error('No se pudo guardar la posición.')
    } finally {
      guardandoPlano.value = false
    }
  }, 350)
}

const sinAsignar = computed(
  () => hermanas.value.filter((h) => h.limpieza === 'sucia' && !h.asignadaAId).length,
)
</script>

<template>
  <div class="flex flex-col gap-5">
    <!--
      Las cifras del inventario. No son las de la jornada —eso lo da el
      tablero—: son las que se miran al planificar, y la de fuera de servicio
      es la que más duele, porque cada una es una habitación que no se vende.
    -->
    <div v-if="resumen" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div class="hs-cifra">
        <span class="hs-display hs-cifra-valor">{{ resumen.total }}</span>
        <span class="hs-cifra-nombre">Habitaciones</span>
      </div>
      <div class="hs-cifra">
        <span class="hs-display hs-cifra-valor">{{ resumen.vendibles }}</span>
        <span class="hs-cifra-nombre">Vendibles hoy</span>
      </div>
      <div class="hs-cifra">
        <span class="hs-display hs-cifra-valor">{{ resumen.ocupacion }}%</span>
        <span class="hs-cifra-nombre">Ocupación</span>
      </div>
      <div class="hs-cifra" :class="{ 'es-alerta': (resumen.porLimpieza.fueraServicio ?? 0) > 0 }">
        <span class="hs-display hs-cifra-valor">{{ resumen.porLimpieza.fueraServicio ?? 0 }}</span>
        <span class="hs-cifra-nombre">Fuera de servicio</span>
      </div>
      <div class="hs-cifra" :class="{ 'es-aviso': sinAsignar > 0 }">
        <span class="hs-display hs-cifra-valor">{{ sinAsignar }}</span>
        <span class="hs-cifra-nombre">Sucias sin camarera</span>
      </div>
    </div>

    <!-- Dos oficios: el registro de lo que existe y dónde está cada cosa. -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="hs-lentes" role="group" aria-label="Cómo trabajar el inventario">
        <button
          type="button"
          class="hs-lente"
          :class="{ 'es-activa': !colocando }"
          :aria-pressed="!colocando"
          @click="colocando = false"
        >
          <HsIcono nombre="cama" tamano="sm" /> Inventario
        </button>
        <button
          type="button"
          class="hs-lente"
          :class="{ 'es-activa': colocando }"
          :aria-pressed="colocando"
          @click="abrirPlano"
        >
          <HsIcono nombre="arrastrar" tamano="sm" /> Colocar en el plano
        </button>
      </div>

      <p v-if="colocando" class="flex items-center gap-2 text-xs text-tenue">
        <HsIcono nombre="arrastrar" tamano="xs" />
        Arrastra cada habitación a su sitio, o muévela con las flechas.
        <span v-if="guardandoPlano" class="text-azul">Guardando…</span>
      </p>
    </div>

    <!-- El plano de una planta, en modo edición. -->
    <section v-if="colocando" class="flex flex-col gap-3">
      <div class="w-full sm:w-72">
        <KmSelect v-model="pisoPlano" :opciones="pisosConPlano" etiqueta="Planta" />
      </div>
      <PlanoPiso
        :habitaciones="habitacionesDelPiso"
        modo="colocar"
        @mover="moverEnPlano"
        @seleccionar="() => {}"
      />
      <p class="text-xs text-tenue">
        Las habitaciones se alinean solas a una rejilla. Shift con las flechas mueve de cuatro en
        cuatro. Lo que coloques aquí es lo que verá el tablero en su lente de plano.
      </p>
    </section>

    <KmCatalogo
      v-else
      :key="localStore.localId ?? 'sin-sede'"
      titulo="Habitaciones"
      subtitulo="El inventario físico de la sede: lo que existe, de qué tipo es y en qué estado está."
      entidad="habitación"
      femenino
      :servicio="habitacionesService"
      sin-estado
      :columnas="columnas"
      :nuevo="nuevo"
      :validar="validar"
      :filtros-fijos="filtrosFijos"
      :orden="{ campo: 'numero', direccion: 'asc' }"
      :nombre-de="(h: HabitacionResuelta) => h.numero"
      ancho-drawer="lg"
      vista-por-defecto="tarjetas"
      :exportacion="[
        { etiqueta: 'Número', valor: (h: HabitacionResuelta) => h.numero },
        { etiqueta: 'Piso', valor: (h: HabitacionResuelta) => h.piso?.nombre ?? '' },
        { etiqueta: 'Tipo', valor: (h: HabitacionResuelta) => h.tipo?.nombre ?? '' },
        { etiqueta: 'Ocupación', valor: (h: HabitacionResuelta) => etiquetaOcupacion[h.ocupacion] },
        { etiqueta: 'Limpieza', valor: (h: HabitacionResuelta) => etiquetaLimpieza[h.limpieza] },
        { etiqueta: 'Vista', valor: (h: HabitacionResuelta) => h.vista ?? '' },
      ]"
      archivo="habitaciones"
      @cambio="cargarApoyo"
    >
      <!-- ── Tabla ────────────────────────────────────────────────────── -->
      <template #col-numero="{ fila }">
        <span class="hs-display text-base font-semibold text-tinta">{{ fila.numero }}</span>
        <span class="block text-xs text-tenue">{{ fila.piso?.nombre ?? 'sin piso' }}</span>
      </template>

      <template #col-tipo="{ fila }">
        <span class="text-sm text-tinta">{{ fila.tipo?.nombre ?? '—' }}</span>
        <span class="block text-xs text-tenue">{{ fila.tipo?.camas ?? '' }}</span>
      </template>

      <template #col-ocupacion="{ fila }">
        <KmBadge :tono="tonoOcupacion[fila.ocupacion]" punto>
          {{ glifoOcupacion[fila.ocupacion] }} {{ etiquetaOcupacion[fila.ocupacion] }}
        </KmBadge>
      </template>

      <template #col-limpieza="{ fila }">
        <KmBadge :tono="tonoLimpieza[fila.limpieza]">
          {{ glifoLimpieza[fila.limpieza] }} {{ etiquetaLimpieza[fila.limpieza] }}
        </KmBadge>
      </template>

      <template #col-vista="{ fila }">
        <span class="text-sm text-tenue">{{ fila.vista || '—' }}</span>
      </template>

      <template #col-actualizada="{ fila }">
        <span class="text-xs text-tenue">{{ desdeHace(fila.actualizada) }}</span>
      </template>

      <!-- ── Tarjeta ──────────────────────────────────────────────────── -->
      <template #tarjeta="{ fila, editar, eliminar }">
        <article class="hs-habitacion" :class="{ 'esta-fuera': fila.limpieza === 'fueraServicio' }">
          <header class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="hs-display text-2xl leading-none font-semibold text-tinta">
                {{ fila.numero }}
              </p>
              <p class="mt-1 truncate text-xs text-tenue">
                {{ fila.piso?.nombre ?? 'sin piso' }} · {{ fila.tipo?.nombre ?? 'sin tipo' }}
              </p>
            </div>
            <KmBadge :tono="tonoOcupacion[fila.ocupacion]" punto>
              {{ glifoOcupacion[fila.ocupacion] }} {{ etiquetaOcupacion[fila.ocupacion] }}
            </KmBadge>
          </header>

          <!-- Quién está dentro. Es lo primero que se busca al abrir una ficha. -->
          <p v-if="fila.estancia" class="hs-dentro">
            Ocupada desde {{ fechaCorta(fila.estancia.checkIn) }} ·
            {{ fila.estancia.adultos }} adulto{{ fila.estancia.adultos === 1 ? '' : 's' }}
            <template v-if="fila.estancia.ninos">+ {{ fila.estancia.ninos }} niño(s)</template>
          </p>
          <p v-else-if="fila.nota" class="hs-nota">{{ fila.nota }}</p>

          <dl class="hs-datos">
            <div>
              <dt>Aforo</dt>
              <dd>
                {{ fila.tipo?.capacidad ?? '—'
                }}<span v-if="fila.tipo"> · máx. {{ fila.tipo.capacidadMaxima }}</span>
              </dd>
            </div>
            <div>
              <dt>Vista</dt>
              <dd>{{ fila.vista || '—' }}</dd>
            </div>
            <div v-if="fila.comunicaCon?.length">
              <dt>Comunica con</dt>
              <dd>{{ fila.comunicaCon.map(nombreHabitacion).join(', ') }}</dd>
            </div>
          </dl>

          <!-- Limpieza: se mira y se mueve desde aquí, que es donde se la busca. -->
          <div class="hs-limpieza">
            <KmBadge :tono="tonoLimpieza[fila.limpieza]">
              {{ glifoLimpieza[fila.limpieza] }} {{ etiquetaLimpieza[fila.limpieza] }}
            </KmBadge>
            <span class="text-[11px] text-tenue">{{ desdeHace(fila.actualizada) }}</span>
          </div>

          <KmSelect
            :model-value="fila.asignadaAId ?? ''"
            :opciones="opcionesCamarera"
            etiqueta="Camarera del turno"
            class="w-full"
            @update:model-value="asignar(fila, $event)"
          />

          <footer class="hs-acciones">
            <button
              v-if="fila.limpieza === 'sucia'"
              type="button"
              class="hs-enlace"
              @click="cambiarLimpieza(fila, 'enLimpieza')"
            >
              Empezar limpieza
            </button>
            <button
              v-else-if="fila.limpieza === 'enLimpieza'"
              type="button"
              class="hs-enlace"
              @click="cambiarLimpieza(fila, 'inspeccion')"
            >
              Pasar a inspección
            </button>
            <button
              v-else-if="fila.limpieza === 'inspeccion'"
              type="button"
              class="hs-enlace"
              @click="cambiarLimpieza(fila, 'limpia')"
            >
              Dar por limpia
            </button>
            <span class="flex-1"></span>
            <button type="button" class="hs-enlace" @click="editar">Editar</button>
            <button v-if="eliminar" type="button" class="hs-enlace es-peligro" @click="eliminar">
              Eliminar
            </button>
          </footer>
        </article>
      </template>

      <!-- ── Formulario ───────────────────────────────────────────────── -->
      <template #formulario="{ borrador, errores, editando }">
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField
            v-slot="{ id, invalido }"
            label="Número"
            :error="errores.numero"
            ayuda="Único en la sede. Vale «201» o «PH-1»."
            requerido
          >
            <KmInput :id="id" v-model="borrador.numero" placeholder="201" :invalido="invalido" />
          </KmField>

          <KmField v-slot="{ id, invalido }" label="Piso" :error="errores.pisoId" requerido>
            <KmSelect
              :id="id"
              v-model="borrador.pisoId"
              :opciones="opcionesPiso"
              :invalido="invalido"
              placeholder="Elige el piso"
            />
          </KmField>
        </div>

        <KmField
          v-slot="{ id, invalido }"
          label="Tipo de habitación"
          :error="errores.tipoId"
          ayuda="De aquí salen la tarifa base, el aforo y el régimen incluido."
          requerido
        >
          <KmSelect
            :id="id"
            v-model="borrador.tipoId"
            :opciones="opcionesTipo"
            :invalido="invalido"
            placeholder="Elige el tipo"
          />
        </KmField>

        <KmField
          v-slot="{ id }"
          label="Vista"
          ayuda="Atributo comercial: «mar», «interior», «terraza». Se usa para vender."
        >
          <KmInput :id="id" v-model="borrador.vista" placeholder="Vista al valle" />
        </KmField>

        <!--
          Las comunicadas son lo que permite vender una familia junta. Sin esto,
          la recepción lo sabe de memoria y se pierde cuando cambia la persona.
        -->
        <KmField
          label="Comunica con"
          ayuda="Habitaciones unidas por puerta interior. Se venden juntas a familias."
        >
          <div class="hs-comunicadas">
            <KmCheckbox
              v-for="otra in candidatasComunicadas(borrador.numero)"
              :key="otra.id"
              tamano="sm"
              :model-value="(borrador.comunicaCon ?? []).includes(otra.id)"
              @update:model-value="alternarComunicada(borrador, otra.id)"
            >
              {{ otra.numero }}
            </KmCheckbox>
            <p v-if="!candidatasComunicadas(borrador.numero).length" class="text-xs text-tenue">
              No hay otras habitaciones en esta sede todavía.
            </p>
          </div>
        </KmField>

        <KmField
          v-slot="{ id }"
          label="Nota"
          ayuda="Motivo del bloqueo o cualquier cosa que recepción deba saber."
        >
          <KmInput :id="id" v-model="borrador.nota" placeholder="Aire acondicionado averiado" />
        </KmField>

        <!--
          La posición es la del plano del piso, en porcentaje. Se teclea aquí
          para que una habitación nueva aparezca en su sitio desde el primer día.
        -->
        <div class="grid gap-4 sm:grid-cols-2">
          <KmField
            v-slot="{ id }"
            label="Posición en el plano · X"
            ayuda="0 a la izquierda, 100 a la derecha."
          >
            <KmNumero :id="id" v-model="borrador.posX" :min="0" :max="100" sufijo="%" />
          </KmField>
          <KmField v-slot="{ id }" label="Posición en el plano · Y" ayuda="0 arriba, 100 abajo.">
            <KmNumero :id="id" v-model="borrador.posY" :min="0" :max="100" sufijo="%" />
          </KmField>
        </div>

        <p v-if="!editando" class="text-xs text-tenue">
          La habitación nace libre y limpia. Los dos estados los mueve después la operación:
          recepción la ocupa, housekeeping la limpia.
        </p>
      </template>
    </KmCatalogo>
  </div>
</template>

<style scoped>
/* Las cifras del inventario, en la misma línea de lectura que el tablero. */
.hs-cifra {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--hs-border);
  border-radius: var(--hs-radio-card, 12px);
  background-color: var(--hs-surface);
}

.hs-cifra-valor {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--hs-text);
}

.hs-cifra.es-alerta .hs-cifra-valor {
  color: var(--hs-coral);
}
.hs-cifra.es-aviso .hs-cifra-valor {
  color: var(--hs-turquesa-texto);
}

.hs-cifra-nombre {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hs-muted);
}

/* La tarjeta de la habitación. */
.hs-habitacion {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--hs-border);
  border-radius: var(--hs-radio-card, 12px);
  background-color: var(--hs-surface);
  transition: border-color var(--km-mov-normal) var(--km-curva);
}

.hs-habitacion:hover {
  border-color: var(--hs-azul-400);
}

/* Fuera de servicio se marca en el filo: es la que no se puede vender. */
.hs-habitacion.esta-fuera {
  border-left: 4px solid var(--hs-coral);
}

.hs-dentro,
.hs-nota {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: var(--hs-radio-control, 8px);
  font-size: 0.78rem;
}

.hs-dentro {
  background-color: color-mix(in srgb, var(--hs-coral) 10%, var(--hs-surface));
  color: var(--hs-text);
}

.hs-nota {
  background-color: var(--hs-surface-2);
  color: var(--hs-muted);
}

.hs-datos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
  margin: 0;
  font-size: 0.8rem;
}

.hs-datos dt {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hs-muted);
}

.hs-datos dd {
  margin: 0;
  color: var(--hs-text);
}

.hs-limpieza {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.hs-acciones {
  /* Abajo del todo: en una rejilla, las acciones de todas las tarjetas quedan
     en la misma línea de mira aunque unas tengan huésped dentro y otras no. */
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--hs-border);
}

.hs-enlace {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--hs-muted);
  cursor: pointer;
  transition: color var(--km-mov-rapido) var(--km-curva);
}

.hs-enlace:hover {
  color: var(--hs-text);
}
.hs-enlace.es-peligro:hover {
  color: var(--hs-coral);
}

.hs-comunicadas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0.75rem;
  border: 1px solid var(--hs-border);
  border-radius: var(--hs-radio-control, 8px);
  background-color: var(--hs-surface-2);
  max-height: 9rem;
  overflow-y: auto;
}
</style>
