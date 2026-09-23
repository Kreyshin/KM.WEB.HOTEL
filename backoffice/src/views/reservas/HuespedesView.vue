<script setup lang="ts">
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { huespedesService } from '@/services/huespedes.service'
import type { Huesped, NuevoHuesped, TipoDocumento } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { etiquetaDocumento } from '@/utils/formato'

/**
 * Ficha de hospedaje: lo que recepción necesita saber del huésped más allá de
 * su ficha comercial en el ERP. Las preferencias son el dato que convierte una
 * segunda estancia en una estancia recordada.
 */

const columnas: ColumnaTabla[] = [
  { clave: 'apellidos', etiqueta: 'Huésped', ordenable: true },
  { clave: 'documento', etiqueta: 'Documento', clase: 'w-52' },
  { clave: 'contacto', etiqueta: 'Contacto', clase: 'w-60' },
  { clave: 'frecuente', etiqueta: 'Fidelidad', clase: 'w-44' },
]

const tiposDocumento: OpcionSelect[] = (['dni', 'ce', 'pasaporte', 'ruc'] as TipoDocumento[]).map(
  (t) => ({ valor: t, etiqueta: etiquetaDocumento[t] }),
)

const nuevo = (): NuevoHuesped => ({
  tipoDocumento: 'dni',
  documento: '',
  nombres: '',
  apellidos: '',
  frecuente: false,
  activo: true,
})

function validar(h: NuevoHuesped): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!h.nombres.trim()) errores.nombres = 'El nombre es obligatorio.'
  if (!h.apellidos.trim()) errores.apellidos = 'Los apellidos son obligatorios.'
  if (!h.documento.trim()) errores.documento = 'El documento es obligatorio.'
  return errores
}
</script>

<template>
  <KmCatalogo
    titulo="Huéspedes"
    subtitulo="Ficha de hospedaje: documento, contacto y lo que hay que recordar de su estancia."
    entidad="huésped"
    :servicio="huespedesService"
    :columnas="columnas"
    :nuevo="nuevo"
    :validar="validar"
    :orden="{ campo: 'apellidos', direccion: 'asc' }"
    :nombre-de="(h: Huesped) => `${h.nombres} ${h.apellidos}`"
    :exportacion="[
      { etiqueta: 'Nombres', valor: (h: Huesped) => h.nombres },
      { etiqueta: 'Apellidos', valor: (h: Huesped) => h.apellidos },
      { etiqueta: 'Documento', valor: (h: Huesped) => h.documento },
      { etiqueta: 'País', valor: (h: Huesped) => h.pais ?? '' },
    ]"
    archivo="huespedes"
  >
    <template #col-apellidos="{ fila }">
      <span class="font-medium text-tinta">{{ fila.nombres }} {{ fila.apellidos }}</span>
      <span v-if="fila.preferencias" class="block text-xs text-tenue">{{ fila.preferencias }}</span>
    </template>

    <template #col-documento="{ fila }">
      <span class="text-sm text-tinta">
        <span class="hs-etiqueta text-tenue">{{ etiquetaDocumento[fila.tipoDocumento] }}</span>
        <span class="ml-2 font-mono text-xs">{{ fila.documento }}</span>
      </span>
      <span v-if="fila.pais" class="block text-xs text-tenue">{{ fila.pais }}</span>
    </template>

    <template #col-contacto="{ fila }">
      <span class="block truncate text-sm text-tinta">{{ fila.email ?? '—' }}</span>
      <span class="block text-xs text-tenue">{{ fila.telefono ?? '' }}</span>
    </template>

    <template #col-frecuente="{ fila }">
      <KmBadge v-if="fila.frecuente" tono="turquesa" punto>
        Frecuente · {{ fila.nochesAcumuladas ?? 0 }} noches
      </KmBadge>
      <span v-else class="text-sm text-tenue">—</span>
    </template>

    <template #formulario="{ borrador, errores }">
      <div class="grid gap-4 sm:grid-cols-2">
        <KmField v-slot="{ id, invalido }" label="Nombres" :error="errores.nombres" requerido>
          <KmInput :id="id" v-model="borrador.nombres" :invalido="invalido" />
        </KmField>
        <KmField v-slot="{ id, invalido }" label="Apellidos" :error="errores.apellidos" requerido>
          <KmInput :id="id" v-model="borrador.apellidos" :invalido="invalido" />
        </KmField>
      </div>

      <div class="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <KmField v-slot="{ id }" label="Tipo de documento">
          <KmSelect :id="id" v-model="borrador.tipoDocumento" :opciones="tiposDocumento" />
        </KmField>
        <KmField v-slot="{ id, invalido }" label="Documento" :error="errores.documento" requerido>
          <KmInput :id="id" v-model="borrador.documento" :invalido="invalido" />
        </KmField>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <KmField v-slot="{ id }" label="Correo">
          <KmInput :id="id" v-model="borrador.email" type="email" />
        </KmField>
        <KmField v-slot="{ id }" label="Teléfono">
          <KmInput :id="id" v-model="borrador.telefono" />
        </KmField>
      </div>

      <KmField v-slot="{ id }" label="País de residencia" ayuda="Código ISO: PE, DE, ES…">
        <KmInput :id="id" v-model="borrador.pais" placeholder="PE" />
      </KmField>

      <KmField
        v-slot="{ id }"
        label="Preferencias"
        ayuda="Lo que recepción debe recordar: piso, almohada, celebraciones."
      >
        <KmInput :id="id" v-model="borrador.preferencias" />
      </KmField>

      <KmSwitch
        v-model="borrador.frecuente"
        etiqueta="Huésped frecuente"
        descripcion="Entra en el programa de fidelidad de la cadena."
      />

      <KmSwitch
        v-model="borrador.activo"
        etiqueta="Ficha activa"
        descripcion="Archivarla la retira del buscador de reservas sin perder su historial."
      />
    </template>
  </KmCatalogo>
</template>
