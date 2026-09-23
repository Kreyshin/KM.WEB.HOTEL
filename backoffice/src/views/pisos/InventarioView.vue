<script setup lang="ts">
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { inventarioService } from '@/services/inventario.service'
import type { CategoriaInsumo, Insumo, UnidadMedida } from '@/types'
import type { ColumnaTabla, OpcionSelect } from '@/types/ui'
import { etiquetaCategoriaInsumo, etiquetaUnidad, formatearSoles } from '@/utils/formato'

/** Amenities, lencería y minibar: lo que el carro repone en cada habitación. */

const columnas: ColumnaTabla[] = [
  { clave: 'codigo', etiqueta: 'Código', clase: 'w-28', ordenable: true },
  { clave: 'nombre', etiqueta: 'Insumo', ordenable: true },
  { clave: 'categoria', etiqueta: 'Categoría', clase: 'w-40' },
  { clave: 'stock', etiqueta: 'Stock', clase: 'w-44', ordenable: true },
  { clave: 'costo', etiqueta: 'Costo', clase: 'w-32 text-right', ordenable: true },
]

const categorias: OpcionSelect[] = (
  ['amenities', 'lenceria', 'limpieza', 'minibar', 'mantenimiento'] as CategoriaInsumo[]
).map((c) => ({ valor: c, etiqueta: etiquetaCategoriaInsumo[c] }))

const unidades: OpcionSelect[] = (
  ['unidad', 'juego', 'litro', 'kilogramo', 'paquete'] as UnidadMedida[]
).map((u) => ({ valor: u, etiqueta: etiquetaUnidad[u] }))

const nuevo = (): Omit<Insumo, 'id'> => ({
  codigo: '',
  nombre: '',
  categoria: 'amenities',
  unidad: 'unidad',
  stock: 0,
  stockMinimo: 0,
  costo: 0,
  activo: true,
})

function validar(i: Omit<Insumo, 'id'>): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!i.codigo.trim()) errores.codigo = 'El código es obligatorio.'
  if (!i.nombre.trim()) errores.nombre = 'El nombre es obligatorio.'
  return errores
}
</script>

<template>
  <KmCatalogo
    titulo="Amenities y lencería"
    subtitulo="El consumible del piso. Por debajo del mínimo, la fila se marca en coral."
    entidad="insumo"
    :servicio="inventarioService"
    :columnas="columnas"
    :nuevo="nuevo"
    :validar="validar"
    :orden="{ campo: 'nombre', direccion: 'asc' }"
    :nombre-de="(i: Insumo) => i.nombre"
    :exportacion="[
      { etiqueta: 'Código', valor: (i: Insumo) => i.codigo },
      { etiqueta: 'Insumo', valor: (i: Insumo) => i.nombre },
      { etiqueta: 'Stock', valor: (i: Insumo) => i.stock },
      { etiqueta: 'Mínimo', valor: (i: Insumo) => i.stockMinimo },
    ]"
    archivo="insumos-piso"
  >
    <template #col-codigo="{ fila }">
      <span class="font-mono text-xs text-tenue">{{ fila.codigo }}</span>
    </template>
    <template #col-nombre="{ fila }">
      <span class="font-medium text-tinta">{{ fila.nombre }}</span>
    </template>
    <template #col-categoria="{ fila }">
      <span class="text-sm text-tenue">{{ etiquetaCategoriaInsumo[fila.categoria] }}</span>
    </template>
    <template #col-stock="{ fila }">
      <span class="text-sm text-tinta tabular-nums">
        {{ fila.stock }} {{ etiquetaUnidad[fila.unidad].toLowerCase() }}
      </span>
      <KmBadge v-if="fila.stock < fila.stockMinimo" tono="coral" punto class="ml-2">
        Bajo mínimo
      </KmBadge>
      <span v-else class="block text-xs text-tenue">mín. {{ fila.stockMinimo }}</span>
    </template>
    <template #col-costo="{ fila }">
      <span class="text-sm text-tinta tabular-nums">{{ formatearSoles(fila.costo) }}</span>
    </template>

    <template #formulario="{ borrador, errores }">
      <div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <KmField v-slot="{ id, invalido }" label="Código" :error="errores.codigo" requerido>
          <KmInput :id="id" v-model="borrador.codigo" placeholder="AM-001" :invalido="invalido" />
        </KmField>
        <KmField v-slot="{ id, invalido }" label="Nombre" :error="errores.nombre" requerido>
          <KmInput :id="id" v-model="borrador.nombre" :invalido="invalido" />
        </KmField>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <KmField v-slot="{ id }" label="Categoría">
          <KmSelect :id="id" v-model="borrador.categoria" :opciones="categorias" />
        </KmField>
        <KmField v-slot="{ id }" label="Unidad">
          <KmSelect :id="id" v-model="borrador.unidad" :opciones="unidades" />
        </KmField>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <KmField v-slot="{ id }" label="Stock">
          <KmNumero :id="id" v-model="borrador.stock" :min="0" />
        </KmField>
        <KmField v-slot="{ id }" label="Stock mínimo">
          <KmNumero :id="id" v-model="borrador.stockMinimo" :min="0" />
        </KmField>
        <KmField v-slot="{ id }" label="Costo unitario">
          <KmNumero :id="id" v-model="borrador.costo" :min="0" :decimales="2" prefijo="S/" />
        </KmField>
      </div>

      <KmSwitch v-model="borrador.activo" etiqueta="Insumo activo" />
    </template>
  </KmCatalogo>
</template>
