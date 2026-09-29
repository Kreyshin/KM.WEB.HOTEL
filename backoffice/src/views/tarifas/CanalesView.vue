<script setup lang="ts">
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { canalesService } from '@/services/canales.service'
import type { Canal, NuevoCanal, TipoCanal } from '@/types'
import type { ColumnaTabla, OpcionSelect, TonoHotel } from '@/types/ui'

/**
 * Por dónde entra cada reserva y qué cuesta venderla.
 *
 * Eran seis valores escritos en el código, así que abrir una agencia nueva
 * pedía tocar el programa. Ahora es un maestro, y el **código** es lo que la
 * reserva guarda: por eso se escribe una vez al dar de alta y después no se
 * cambia — cambiarlo dejaría huérfano todo lo vendido por ese canal.
 *
 * Los dos porcentajes no son lo mismo y confundirlos sale caro:
 *
 * - **Comisión**: lo que se lleva el intermediario. No cambia lo que paga el
 *   huésped; cambia lo que le queda al hotel.
 * - **Ajuste**: mueve el precio publicado en ese canal. Es como se compensa la
 *   comisión sin romper la paridad de tarifas.
 */

const etiquetaTipo: Record<TipoCanal, string> = {
  directo: 'Directo',
  ota: 'OTA',
  agencia: 'Agencia',
  corporativo: 'Corporativo',
}

const tonoTipo: Record<TipoCanal, TonoHotel> = {
  directo: 'salvia',
  ota: 'coral',
  agencia: 'turquesa',
  corporativo: 'azul',
}

const tipos: OpcionSelect[] = (Object.keys(etiquetaTipo) as TipoCanal[]).map((t) => ({
  valor: t,
  etiqueta: etiquetaTipo[t],
}))

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Canal', ordenable: true },
  { clave: 'tipo', etiqueta: 'Tipo', clase: 'w-36' },
  { clave: 'comision', etiqueta: 'Comisión', clase: 'w-32 text-right', ordenable: true },
  { clave: 'ajuste', etiqueta: 'Ajuste de tarifa', clase: 'w-40 text-right' },
  { clave: 'neto', etiqueta: 'Queda del neto', clase: 'w-40 text-right' },
]

const nuevo = (): NuevoCanal => ({
  codigo: '',
  nombre: '',
  tipo: 'agencia',
  comision: 0,
  ajuste: 0,
  automatico: false,
  activo: true,
})

function validar(c: NuevoCanal): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!c.nombre.trim()) errores.nombre = 'El nombre es obligatorio.'
  if (!/^[a-z][a-z0-9-]{1,19}$/.test(c.codigo.trim())) {
    errores.codigo = 'Minúsculas, sin espacios ni tildes: «agencia-viajes».'
  }
  if (c.comision < 0) errores.comision = 'Una comisión no puede ser negativa.'
  return errores
}

/**
 * Lo que de verdad entra al hotel por una noche de S/ 200 vendida por ese canal:
 * se publica con el ajuste y luego el canal se queda su comisión.
 */
function neto(canal: Canal) {
  const publicado = 200 * (1 + canal.ajuste / 100)
  return Math.round(publicado * (1 - canal.comision / 100))
}
</script>

<template>
  <KmCatalogo
    titulo="Canales y comisiones"
    subtitulo="Por dónde entra cada reserva y qué cuesta venderla."
    entidad="canal"
    :servicio="canalesService"
    :columnas="columnas"
    :nuevo="nuevo"
    :validar="validar"
    :nombre-de="(c: Canal) => c.nombre"
  >
    <template #col-nombre="{ fila }">
      <span class="font-medium text-tinta">{{ fila.nombre }}</span>
      <span class="block font-mono text-[11px] text-tenue">{{ fila.codigo }}</span>
    </template>

    <template #col-tipo="{ fila }">
      <KmBadge :tono="tonoTipo[fila.tipo]" punto>{{ etiquetaTipo[fila.tipo] }}</KmBadge>
      <span v-if="fila.automatico" class="mt-1 block text-[11px] text-tenue"> ⟳ Entra sola </span>
    </template>

    <template #col-comision="{ fila }">
      <span
        class="hs-display text-sm font-semibold tabular-nums"
        :class="fila.comision > 0 ? 'text-coral-texto' : 'text-tenue'"
      >
        {{ fila.comision > 0 ? `−${fila.comision}%` : 'sin comisión' }}
      </span>
    </template>

    <template #col-ajuste="{ fila }">
      <span class="text-sm text-tinta tabular-nums">
        {{ fila.ajuste > 0 ? '+' : '' }}{{ fila.ajuste }}%
      </span>
      <span class="block text-[11px] text-tenue">
        {{ fila.ajuste === 0 ? 'mismo precio' : fila.ajuste > 0 ? 'más caro' : 'más barato' }}
      </span>
    </template>

    <template #col-neto="{ fila }">
      <span class="hs-display text-sm font-semibold text-tinta tabular-nums">
        S/ {{ neto(fila) }}
      </span>
      <span class="block text-[11px] text-tenue">de una de S/ 200</span>
    </template>

    <!-- ── Formulario ───────────────────────────────────────────────── -->
    <template #formulario="{ borrador, errores, editando }">
      <div class="grid gap-4 sm:grid-cols-2">
        <KmField
          v-slot="{ id, invalido }"
          label="Código"
          :error="errores.codigo"
          :ayuda="
            editando
              ? 'No se cambia: es lo que guardan las reservas ya vendidas.'
              : 'Lo que quedará escrito en cada reserva de este canal.'
          "
          requerido
        >
          <KmInput
            :id="id"
            v-model="borrador.codigo"
            placeholder="agencia-viajes"
            :invalido="invalido"
            :disabled="editando"
          />
        </KmField>
        <KmField v-slot="{ id, invalido }" label="Nombre" :error="errores.nombre" requerido>
          <KmInput
            :id="id"
            v-model="borrador.nombre"
            placeholder="Agencia Viajes del Sur"
            :invalido="invalido"
          />
        </KmField>
      </div>

      <KmField v-slot="{ id }" label="Tipo de canal">
        <KmSelect :id="id" v-model="borrador.tipo" :opciones="tipos" />
      </KmField>

      <div class="grid gap-4 sm:grid-cols-2">
        <KmField
          v-slot="{ id }"
          label="Comisión"
          :error="errores.comision"
          ayuda="Lo que se lleva el canal. No lo paga el huésped: lo pone el hotel."
        >
          <KmNumero :id="id" v-model="borrador.comision" :min="0" :max="100" sufijo="%" />
        </KmField>
        <KmField
          v-slot="{ id }"
          label="Ajuste de tarifa"
          ayuda="Mueve el precio publicado en este canal. En negativo, es un descuento pactado."
        >
          <KmNumero :id="id" v-model="borrador.ajuste" :min="-100" :max="100" sufijo="%" />
        </KmField>
      </div>

      <!-- La cuenta que decide si el canal vale la pena, hecha delante. -->
      <p class="rounded-control border border-linea bg-panel-2 p-3 text-sm text-tenue">
        Una noche de <strong class="text-tinta">S/ 200</strong> se publicaría a
        <strong class="text-tinta tabular-nums">
          S/ {{ Math.round(200 * (1 + borrador.ajuste / 100)) }}
        </strong>
        y al hotel le quedarían
        <strong class="text-tinta tabular-nums">
          S/ {{ Math.round(200 * (1 + borrador.ajuste / 100) * (1 - borrador.comision / 100)) }}
        </strong>
        después de la comisión.
      </p>

      <KmSwitch
        v-model="borrador.automatico"
        etiqueta="Las reservas entran solas"
        descripcion="Marca las OTA y el motor propio: llegan por integración y no se teclean en el mostrador."
      />

      <!--
        El estado no se pregunta en el alta: un canal nace vendiendo. Cerrarlo
        es una decisión posterior, y KmCatalogo lo pide solo al editar.
      -->
    </template>
  </KmCatalogo>
</template>
