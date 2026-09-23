<script setup lang="ts">
import KmBadge from '@/components/ui/KmBadge.vue'
import KmCatalogo from '@/components/ui/KmCatalogo.vue'
import KmField from '@/components/ui/KmField.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import { etiquetasRol } from '@/components/layout/navegacion'
import { usuariosService } from '@/services/usuarios.service'
import type { Rol, Usuario } from '@/types'
import type { ColumnaTabla, OpcionSelect, TonoHotel } from '@/types/ui'

/** Personal del hotel. Los permisos finos viven en el ERP; aquí va el rol. */

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Persona', ordenable: true },
  { clave: 'email', etiqueta: 'Correo', ordenable: true },
  { clave: 'rol', etiqueta: 'Rol', clase: 'w-56' },
]

const roles: OpcionSelect[] = (['admin', 'recepcion', 'gobernanta', 'mantenimiento'] as Rol[]).map(
  (r) => ({ valor: r, etiqueta: etiquetasRol[r] }),
)

const tonoRol: Record<Rol, TonoHotel> = {
  admin: 'azul',
  recepcion: 'turquesa',
  gobernanta: 'salvia',
  mantenimiento: 'neutro',
}

const nuevo = (): Omit<Usuario, 'id'> => ({
  nombre: '',
  email: '',
  rol: 'recepcion',
  activo: true,
})

function validar(u: Omit<Usuario, 'id'>): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!u.nombre.trim()) errores.nombre = 'El nombre es obligatorio.'
  if (!u.email.trim()) errores.email = 'El correo es obligatorio.'
  return errores
}
</script>

<template>
  <KmCatalogo
    titulo="Usuarios y roles"
    subtitulo="Quién entra al sistema y qué parte del hotel gestiona."
    entidad="usuario"
    :servicio="usuariosService"
    :columnas="columnas"
    :nuevo="nuevo"
    :validar="validar"
    :orden="{ campo: 'nombre', direccion: 'asc' }"
    :nombre-de="(u: Usuario) => u.nombre"
  >
    <template #col-nombre="{ fila }">
      <span class="font-medium text-tinta">{{ fila.nombre }}</span>
    </template>
    <template #col-email="{ fila }">
      <span class="font-mono text-xs text-tenue">{{ fila.email }}</span>
    </template>
    <template #col-rol="{ fila }">
      <KmBadge :tono="tonoRol[fila.rol]" punto>{{ etiquetasRol[fila.rol] }}</KmBadge>
    </template>

    <template #formulario="{ borrador, errores }">
      <KmField v-slot="{ id, invalido }" label="Nombre" :error="errores.nombre" requerido>
        <KmInput :id="id" v-model="borrador.nombre" :invalido="invalido" />
      </KmField>
      <KmField v-slot="{ id, invalido }" label="Correo" :error="errores.email" requerido>
        <KmInput :id="id" v-model="borrador.email" type="email" :invalido="invalido" />
      </KmField>
      <KmField v-slot="{ id }" label="Rol">
        <KmSelect :id="id" v-model="borrador.rol" :opciones="roles" />
      </KmField>
      <KmSwitch
        v-model="borrador.activo"
        etiqueta="Cuenta activa"
        descripcion="Una cuenta inactiva no puede iniciar sesión."
      />
    </template>
  </KmCatalogo>
</template>
