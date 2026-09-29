<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmHora from '@/components/ui/KmHora.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import { localesService } from '@/services/locales.service'
import { ubigeosService } from '@/services/ubigeos.service'
import type { Departamento, Distrito, LocalResuelto, NuevoLocal, Provincia } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'

/**
 * Sedes de la cadena. Las horas de entrada y salida no son un adorno: de ellas
 * cuelgan el cobro de la salida tardía y la ventana de trabajo de pisos.
 *
 * La dirección termina en un **ubigeo**, no en un texto libre. Se elige en
 * cascada —departamento, provincia, distrito— porque así es como una persona
 * sabe dónde está una sede, y porque hay distritos con el mismo nombre en dos
 * departamentos. Lo que se guarda es el código de seis dígitos; los tres
 * nombres se derivan de él.
 */

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Sede', ordenable: true },
  { clave: 'direccion', etiqueta: 'Dirección' },
  { clave: 'horas', etiqueta: 'Entrada / salida', clase: 'w-48' },
  { clave: 'codigoEstablecimiento', etiqueta: 'Cód. SUNAT', clase: 'w-36', ordenable: true },
]

const nuevo = (): NuevoLocal => ({
  nombre: '',
  direccion: '',
  ubigeoId: '',
  codigoEstablecimiento: '',
  horaCheckIn: '15:00',
  horaCheckOut: '12:00',
  activo: true,
})

function validar(l: NuevoLocal): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!l.nombre.trim()) errores.nombre = 'El nombre es obligatorio.'
  if (!l.direccion.trim()) errores.direccion = 'La dirección es obligatoria.'
  if (!l.ubigeoId) errores.ubigeoId = 'Elige el distrito: es parte de la dirección fiscal.'
  if (!/^\d{4}$/.test(l.codigoEstablecimiento)) {
    errores.codigoEstablecimiento = 'Son 4 dígitos, p. ej. 0001.'
  }
  return errores
}

/* ── La cascada de ubigeo ───────────────────────────────────────────────────
 * El borrador solo guarda el código. Departamento y provincia son estado de la
 * pantalla: se rellenan solos al abrir una sede que ya tiene ubigeo, y al
 * cambiar uno se limpia lo que cuelga debajo, porque «Lima / Trujillo» no
 * existe y dejarlo a medias es peor que vaciarlo.
 */
const departamentos = ref<Departamento[]>([])
const provincias = ref<Provincia[]>([])
const distritos = ref<Distrito[]>([])

/* Se guardan los ids, no los nombres: «Lima» es departamento, provincia y
   distrito a la vez, y por nombre la cascada traería cosas de tres sitios. */
const seleccion = reactive({ departamentoId: '', provinciaId: '' })
/** Evita que el reloj de la cascada borre el distrito mientras se está cargando una sede. */
const cargandoUbigeo = ref(false)

onMounted(async () => {
  departamentos.value = await ubigeosService.departamentos()
})

watch(
  () => seleccion.departamentoId,
  async (id) => {
    provincias.value = await ubigeosService.provincias(id)
    if (cargandoUbigeo.value) return
    seleccion.provinciaId = ''
    distritos.value = []
  },
)

watch(
  () => seleccion.provinciaId,
  async (id) => {
    distritos.value = await ubigeosService.distritos(id)
  },
)

/**
 * Al abrir el formulario: si la sede ya tiene distrito, se sube por el código
 * hasta el departamento para que los tres combos aparezcan puestos.
 */
async function sincronizar(ubigeoId?: string) {
  cargandoUbigeo.value = true
  // El código lleva dentro a sus padres: 150122 → provincia 1501 → departamento 15.
  seleccion.departamentoId = ubigeoId?.slice(0, 2) ?? ''
  provincias.value = await ubigeosService.provincias(seleccion.departamentoId)
  seleccion.provinciaId = ubigeoId?.slice(0, 4) ?? ''
  distritos.value = await ubigeosService.distritos(seleccion.provinciaId)
  cargandoUbigeo.value = false
}

const opDepartamentos = computed<OpcionSelect[]>(() =>
  departamentos.value.map((d) => ({ valor: d.id, etiqueta: d.nombre })),
)
const opProvincias = computed<OpcionSelect[]>(() =>
  provincias.value.map((p) => ({ valor: p.id, etiqueta: p.nombre })),
)
const opDistritos = computed<OpcionSelect[]>(() =>
  distritos.value.map((d) => ({ valor: d.id, etiqueta: `${d.nombre} · ${d.id}` })),
)
</script>

<template>
  <KmCatalogo
    titulo="Sedes"
    subtitulo="Establecimientos de la cadena, con su horario de entrada y salida."
    entidad="sede"
    femenino
    :servicio="localesService"
    :columnas="columnas"
    :nuevo="nuevo"
    :validar="validar"
    :nombre-de="(l: LocalResuelto) => l.nombre"
    @abrir-formulario="(fila?: LocalResuelto) => sincronizar(fila?.ubigeoId)"
  >
    <template #col-nombre="{ fila }">
      <span class="font-medium text-tinta">{{ fila.nombre }}</span>
      <span v-if="fila.estrellas" class="block text-xs text-turquesa-texto">
        {{ '★'.repeat(fila.estrellas) }}
      </span>
    </template>
    <template #col-direccion="{ fila }">
      <span class="text-sm text-tinta">{{ fila.direccion }}</span>
      <span class="block text-xs text-tenue">
        {{ [fila.distrito, fila.provincia, fila.departamento].filter(Boolean).join(' · ') || '—' }}
      </span>
    </template>
    <template #col-horas="{ fila }">
      <span class="text-sm text-tinta tabular-nums">
        {{ fila.horaCheckIn }} → {{ fila.horaCheckOut }}
      </span>
    </template>
    <template #col-codigoEstablecimiento="{ fila }">
      <span class="font-mono text-xs text-tenue">{{ fila.codigoEstablecimiento }}</span>
    </template>

    <template #formulario="{ borrador, errores }">
      <KmField v-slot="{ id, invalido }" label="Nombre" :error="errores.nombre" requerido>
        <KmInput :id="id" v-model="borrador.nombre" :invalido="invalido" />
      </KmField>
      <KmField v-slot="{ id, invalido }" label="Dirección" :error="errores.direccion" requerido>
        <KmInput :id="id" v-model="borrador.direccion" :invalido="invalido" />
      </KmField>

      <!-- Ubigeo: tres pasos, cada uno abre el siguiente. -->
      <div class="grid gap-4 sm:grid-cols-2">
        <KmField v-slot="{ id }" label="Departamento" requerido>
          <KmSelect
            :id="id"
            v-model="seleccion.departamentoId"
            :opciones="opDepartamentos"
            placeholder="Elige un departamento"
            vacio="El padrón de ubigeos no cargó. Reinicia los datos de ejemplo."
          />
        </KmField>
        <KmField
          v-slot="{ id }"
          label="Provincia"
          requerido
          :ayuda="seleccion.departamentoId ? undefined : 'Elige antes el departamento.'"
        >
          <KmSelect
            :id="id"
            v-model="seleccion.provinciaId"
            :opciones="opProvincias"
            :disabled="!seleccion.departamentoId"
            placeholder="Elige una provincia"
          />
        </KmField>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <KmField
          v-slot="{ id, invalido }"
          label="Distrito"
          requerido
          :error="errores.ubigeoId"
          ayuda="Se guarda su código de ubigeo, el mismo que declara SUNAT."
        >
          <KmSelect
            :id="id"
            v-model="borrador.ubigeoId"
            :opciones="opDistritos"
            :disabled="!seleccion.provinciaId"
            :invalido="invalido"
            placeholder="Elige un distrito"
          />
        </KmField>
        <KmField v-slot="{ id }" label="Teléfono">
          <KmInput :id="id" v-model="borrador.telefono" />
        </KmField>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <KmField v-slot="{ id }" label="Check-in desde">
          <KmHora :id="id" v-model="borrador.horaCheckIn" />
        </KmField>
        <KmField v-slot="{ id }" label="Check-out hasta">
          <KmHora :id="id" v-model="borrador.horaCheckOut" />
        </KmField>
        <KmField v-slot="{ id }" label="Estrellas">
          <KmNumero :id="id" v-model="borrador.estrellas" :min="1" :max="5" />
        </KmField>
      </div>

      <KmField
        v-slot="{ id, invalido }"
        label="Código de establecimiento"
        :error="errores.codigoEstablecimiento"
        ayuda="El que declara SUNAT para esta sede."
        requerido
      >
        <KmInput
          :id="id"
          v-model="borrador.codigoEstablecimiento"
          placeholder="0001"
          :invalido="invalido"
        />
      </KmField>

      <!--
        Aquí NO va el interruptor de sede activa.
        Una sede nace activa: dar de alta algo desactivado no tiene sentido, y
        el interruptor en el alta solo invita a crear registros muertos. Darla
        de baja es una decisión posterior, y KmCatalogo ya pone ese campo —con
        su aviso de consecuencias— cuando se está editando.
      -->
    </template>
  </KmCatalogo>
</template>
