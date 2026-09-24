<script setup lang="ts">
import PlanoTipo from '@/components/tipos/PlanoTipo.vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { tiposService } from '@/services/tipos.service'
import type { NuevoTipoHabitacion, Regimen, TipoHabitacion } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { etiquetaRegimen, formatearSoles } from '@/utils/formato'

/**
 * El tipo de habitación es lo que realmente se vende: el huésped reserva una
 * «doble con desayuno», no la 204. La habitación física se asigna después, y
 * puede cambiar sin tocar la reserva.
 */

const columnas: ColumnaTabla[] = [
  { clave: 'codigo', etiqueta: 'Código', clase: 'w-28', ordenable: true },
  { clave: 'nombre', etiqueta: 'Tipo', ordenable: true },
  { clave: 'capacidad', etiqueta: 'Aforo', clase: 'w-32', ordenable: true },
  { clave: 'tarifaBase', etiqueta: 'Tarifa base', clase: 'w-36 text-right', ordenable: true },
  { clave: 'regimenIncluido', etiqueta: 'Régimen', clase: 'w-44' },
]

const regimenes: OpcionSelect[] = (
  ['soloAlojamiento', 'desayuno', 'mediaPension', 'pensionCompleta'] as Regimen[]
).map((r) => ({ valor: r, etiqueta: etiquetaRegimen[r] }))

const nuevo = (): NuevoTipoHabitacion => ({
  codigo: '',
  nombre: '',
  descripcion: '',
  capacidad: 2,
  capacidadMaxima: 2,
  camas: '',
  tarifaBase: 200,
  regimenIncluido: 'desayuno',
  servicios: [],
  activo: true,
})

function validar(t: NuevoTipoHabitacion): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!t.codigo.trim()) errores.codigo = 'El código es obligatorio.'
  if (!t.nombre.trim()) errores.nombre = 'El nombre es obligatorio.'
  if (!t.camas.trim()) errores.camas = 'Describe la configuración de camas.'
  if (t.capacidadMaxima < t.capacidad) {
    errores.capacidadMaxima = 'No puede ser menor que la capacidad.'
  }
  return errores
}
</script>

<template>
  <KmCatalogo
    titulo="Tipos de habitación"
    subtitulo="Lo que se publica y se vende. La habitación física se asigna al hacer el check-in."
    entidad="tipo"
    :servicio="tiposService"
    :columnas="columnas"
    :nuevo="nuevo"
    :validar="validar"
    :nombre-de="(t: TipoHabitacion) => t.nombre"
    ancho-drawer="lg"
    vista-por-defecto="tarjetas"
    :exportacion="[
      { etiqueta: 'Código', valor: (t: TipoHabitacion) => t.codigo },
      { etiqueta: 'Tipo', valor: (t: TipoHabitacion) => t.nombre },
      { etiqueta: 'Capacidad', valor: (t: TipoHabitacion) => t.capacidad },
      { etiqueta: 'Tarifa base', valor: (t: TipoHabitacion) => t.tarifaBase },
      { etiqueta: 'Activo', valor: (t: TipoHabitacion) => t.activo },
    ]"
    archivo="tipos-habitacion"
  >
    <template #col-codigo="{ fila }">
      <span class="font-mono text-xs font-semibold text-tinta">{{ fila.codigo }}</span>
    </template>
    <template #col-nombre="{ fila }">
      <span class="font-medium text-tinta">{{ fila.nombre }}</span>
      <span class="block text-xs text-tenue">{{ fila.camas }}</span>
    </template>
    <template #col-capacidad="{ fila }">
      <span class="text-sm text-tinta tabular-nums">
        {{ fila.capacidad }}<span class="text-tenue"> · máx. {{ fila.capacidadMaxima }}</span>
      </span>
    </template>
    <template #col-tarifaBase="{ fila }">
      <span class="hs-display text-sm font-semibold text-tinta tabular-nums">
        {{ formatearSoles(fila.tarifaBase) }}
      </span>
    </template>
    <template #col-regimenIncluido="{ fila }">
      <KmBadge tono="turquesa">{{ etiquetaRegimen[fila.regimenIncluido] }}</KmBadge>
    </template>

    <!--
      La tarjeta del tipo: lo que de verdad se vende. El plano, el aforo y la
      tarifa se leen de un vistazo, que es como se elige un tipo cuando suena
      el teléfono; la tabla sigue a un clic para quien viene a buscar uno.
    -->
    <template #tarjeta="{ fila, editar, eliminar }">
      <article
        class="group flex flex-col overflow-hidden rounded-card border border-linea bg-panel transition-colors hover:border-turquesa"
        :class="fila.activo ? '' : 'opacity-60'"
      >
        <PlanoTipo :camas="fila.camas" :superficie="fila.superficie" />

        <div class="flex flex-1 flex-col p-4">
          <header class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="hs-display truncate text-lg leading-tight font-semibold text-tinta">
                {{ fila.nombre }}
              </p>
              <p class="font-mono text-[11px] text-tenue">{{ fila.codigo }}</p>
            </div>
            <p
              class="hs-display shrink-0 text-right text-lg leading-none font-semibold text-tinta tabular-nums"
            >
              {{ formatearSoles(fila.tarifaBase) }}
              <span class="block text-[10px] font-medium text-tenue">por noche</span>
            </p>
          </header>

          <p class="mt-2 text-sm text-tenue">{{ fila.camas }}</p>

          <div class="mt-3 flex flex-wrap gap-1.5">
            <KmBadge tono="neutro">
              {{ fila.capacidad }} pax
              <template v-if="fila.capacidadMaxima > fila.capacidad">
                · +{{ fila.capacidadMaxima - fila.capacidad }} supletoria
              </template>
            </KmBadge>
            <KmBadge tono="turquesa">{{ etiquetaRegimen[fila.regimenIncluido] }}</KmBadge>
            <KmBadge v-if="!fila.activo" tono="neutro">✕ No se publica</KmBadge>
          </div>

          <!-- Los amenities son argumento de venta: se ven sin abrir la ficha. -->
          <ul v-if="fila.servicios.length" class="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            <li
              v-for="s in fila.servicios.slice(0, 4)"
              :key="s"
              class="text-[11px] text-tenue before:mr-1 before:content-['·']"
            >
              {{ s }}
            </li>
            <li
              v-if="fila.servicios.length > 4"
              class="text-[11px] font-semibold text-turquesa-texto"
            >
              +{{ fila.servicios.length - 4 }}
            </li>
          </ul>

          <!-- Las acciones aparecen al acercarse, para no ensuciar la rejilla. -->
          <footer
            class="mt-auto flex justify-end gap-1 pt-4 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
          >
            <KmBotonIcono
              icono="editar"
              etiqueta="Editar"
              :contexto="fila.nombre"
              @click="editar"
            />
            <KmBotonIcono
              v-if="eliminar"
              icono="eliminar"
              etiqueta="Eliminar"
              :contexto="fila.nombre"
              tono="peligro"
              @click="eliminar"
            />
          </footer>
        </div>
      </article>
    </template>

    <template #formulario="{ borrador, errores }">
      <div class="grid gap-4 sm:grid-cols-2">
        <KmField v-slot="{ id, invalido }" label="Código" :error="errores.codigo" requerido>
          <KmInput :id="id" v-model="borrador.codigo" placeholder="DBL" :invalido="invalido" />
        </KmField>
        <KmField v-slot="{ id, invalido }" label="Nombre" :error="errores.nombre" requerido>
          <KmInput :id="id" v-model="borrador.nombre" placeholder="Doble" :invalido="invalido" />
        </KmField>
      </div>

      <KmField v-slot="{ id }" label="Descripción">
        <KmInput :id="id" v-model="borrador.descripcion" placeholder="Cómo se anuncia el tipo" />
      </KmField>

      <KmField v-slot="{ id, invalido }" label="Camas" :error="errores.camas" requerido>
        <KmInput
          :id="id"
          v-model="borrador.camas"
          placeholder="1 cama queen"
          :invalido="invalido"
        />
      </KmField>

      <div class="grid gap-4 sm:grid-cols-3">
        <KmField v-slot="{ id }" label="Capacidad">
          <KmNumero :id="id" v-model="borrador.capacidad" :min="1" :max="10" />
        </KmField>
        <KmField
          v-slot="{ id }"
          label="Capacidad máxima"
          :error="errores.capacidadMaxima"
          ayuda="Con supletoria o cuna."
        >
          <KmNumero :id="id" v-model="borrador.capacidadMaxima" :min="1" :max="12" />
        </KmField>
        <KmField v-slot="{ id }" label="Superficie (m²)">
          <KmNumero :id="id" v-model="borrador.superficie" :min="0" :max="500" />
        </KmField>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <KmField v-slot="{ id }" label="Tarifa base por noche">
          <KmNumero :id="id" v-model="borrador.tarifaBase" :min="0" :step="10" />
        </KmField>
        <KmField v-slot="{ id }" label="Régimen incluido">
          <KmSelect :id="id" v-model="borrador.regimenIncluido" :opciones="regimenes" />
        </KmField>
      </div>

      <KmSwitch
        v-model="borrador.activo"
        etiqueta="Tipo activo"
        descripcion="Un tipo inactivo deja de publicarse, pero conserva su histórico."
      />
    </template>
  </KmCatalogo>
</template>
