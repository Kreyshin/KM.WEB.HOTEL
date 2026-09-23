<script setup lang="ts">
import { computed } from 'vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { pisosService } from '@/services/pisos.service'
import { useLocalStore } from '@/stores/local.store'
import type { NuevoPiso, Piso } from '@/types'
import type { ColumnaTabla } from '@/types/ui'

const localStore = useLocalStore()

const columnas: ColumnaTabla[] = [
  { clave: 'nivel', etiqueta: 'Nivel', clase: 'w-24', ordenable: true },
  { clave: 'nombre', etiqueta: 'Piso', ordenable: true },
  { clave: 'descripcion', etiqueta: 'Descripción' },
  { clave: 'orden', etiqueta: 'Orden', clase: 'w-24', ordenable: true },
]

const nuevo = (): NuevoPiso => ({
  nombre: '',
  localId: localStore.localId ?? '',
  nivel: 1,
  orden: 99,
  activo: true,
})

const filtrosFijos = computed(() => ({ localId: localStore.localId ?? undefined }))

function validar(p: NuevoPiso): Record<string, string> {
  return p.nombre.trim() ? {} : { nombre: 'El nombre es obligatorio.' }
}
</script>

<template>
  <KmCatalogo
    :key="localStore.localId ?? 'sin-sede'"
    titulo="Pisos"
    subtitulo="Plantas de la sede activa. Ordenan el plano y reparten el trabajo de housekeeping."
    entidad="piso"
    :servicio="pisosService"
    :columnas="columnas"
    :nuevo="nuevo"
    :validar="validar"
    :filtros-fijos="filtrosFijos"
    :orden="{ campo: 'orden', direccion: 'asc' }"
    :nombre-de="(p: Piso) => p.nombre"
  >
    <template #col-nivel="{ fila }">
      <span class="hs-display text-base font-semibold text-tinta tabular-nums">
        {{ fila.nivel }}
      </span>
    </template>
    <template #col-nombre="{ fila }">
      <span class="font-medium text-tinta">{{ fila.nombre }}</span>
    </template>
    <template #col-descripcion="{ fila }">
      <span class="text-sm text-tenue">{{ fila.descripcion ?? '—' }}</span>
    </template>

    <template #formulario="{ borrador, errores }">
      <KmField v-slot="{ id, invalido }" label="Nombre" :error="errores.nombre" requerido>
        <KmInput
          :id="id"
          v-model="borrador.nombre"
          placeholder="Segundo piso"
          :invalido="invalido"
        />
      </KmField>
      <KmField v-slot="{ id }" label="Descripción">
        <KmInput :id="id" v-model="borrador.descripcion" placeholder="Planta alta con vista" />
      </KmField>
      <div class="grid gap-4 sm:grid-cols-2">
        <KmField v-slot="{ id }" label="Nivel" ayuda="Negativo para sótanos.">
          <KmNumero :id="id" v-model="borrador.nivel" :min="-5" :max="60" />
        </KmField>
        <KmField v-slot="{ id }" label="Orden en el plano">
          <KmNumero :id="id" v-model="borrador.orden" :min="1" :max="99" />
        </KmField>
      </div>
      <KmSwitch v-model="borrador.activo" etiqueta="Piso activo" />
    </template>
  </KmCatalogo>
</template>
