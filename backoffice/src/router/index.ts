import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { Rol } from '@/types'
import { useAuthStore } from '@/stores/auth.store'

declare module 'vue-router' {
  interface RouteMeta {
    /** Título mostrado en la cabecera de trabajo y en document.title. */
    titulo?: string
    /** Ruta pública (no requiere sesión). */
    publica?: boolean
    /** Roles autorizados. Sin definir = cualquier usuario autenticado. */
    roles?: Rol[]
  }
}

const rutas: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { publica: true, titulo: 'Iniciar sesión' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      { path: '', redirect: { name: 'inicio' } },

      // ── Inicio ──────────────────────────────────────────────────────────
      {
        path: 'inicio',
        name: 'inicio',
        component: () => import('@/views/InicioView.vue'),
        meta: { titulo: 'El día de hoy' },
      },
      {
        path: 'tablero',
        name: 'tablero',
        component: () => import('@/views/tablero/TableroView.vue'),
        meta: { titulo: 'Tablero de habitaciones' },
      },

      // ── Alojamiento ─────────────────────────────────────────────────────
      {
        path: 'habitaciones',
        name: 'habitaciones',
        component: () => import('@/views/alojamiento/HabitacionesView.vue'),
        meta: { titulo: 'Habitaciones' },
      },
      {
        path: 'habitaciones/plano',
        name: 'plano',
        component: () => import('@/views/alojamiento/PlanoView.vue'),
        meta: { titulo: 'Plano por piso' },
      },
      {
        path: 'tipos',
        name: 'tipos',
        component: () => import('@/views/alojamiento/TiposView.vue'),
        meta: { titulo: 'Tipos de habitación', roles: ['admin'] },
      },
      {
        path: 'pisos',
        name: 'pisos',
        component: () => import('@/views/alojamiento/PisosView.vue'),
        meta: { titulo: 'Pisos', roles: ['admin'] },
      },

      // ── Reservas ────────────────────────────────────────────────────────
      {
        path: 'reservas/planning',
        name: 'planning',
        component: () => import('@/views/reservas/PlanningView.vue'),
        meta: { titulo: 'Planning' },
      },
      {
        path: 'reservas',
        name: 'reservas',
        component: () => import('@/views/reservas/ReservasView.vue'),
        meta: { titulo: 'Reservas' },
      },
      {
        path: 'recepcion',
        name: 'recepcion',
        component: () => import('@/views/reservas/RecepcionView.vue'),
        meta: { titulo: 'Recepción del día' },
      },
      {
        path: 'huespedes',
        name: 'huespedes',
        component: () => import('@/views/reservas/HuespedesView.vue'),
        meta: { titulo: 'Huéspedes' },
      },

      // ── Pisos ───────────────────────────────────────────────────────────
      {
        path: 'limpieza',
        name: 'limpieza',
        component: () => import('@/views/pisos/LimpiezaView.vue'),
        meta: { titulo: 'Housekeeping' },
      },
      {
        path: 'incidencias',
        name: 'incidencias',
        component: () => import('@/views/pisos/IncidenciasView.vue'),
        meta: { titulo: 'Mantenimiento' },
      },
      {
        path: 'inventario',
        name: 'inventario',
        component: () => import('@/views/pisos/InventarioView.vue'),
        meta: { titulo: 'Amenities y lencería', roles: ['admin', 'gobernanta'] },
      },
      {
        path: 'inventario/movimientos',
        name: 'movimientos',
        component: () => import('@/views/pisos/MovimientosView.vue'),
        meta: { titulo: 'Movimientos', roles: ['admin', 'gobernanta'] },
      },

      // ── Tarifas ─────────────────────────────────────────────────────────
      {
        path: 'tarifas',
        name: 'tarifas',
        component: () => import('@/views/tarifas/TarifasView.vue'),
        meta: { titulo: 'Rejilla de tarifas', roles: ['admin'] },
      },
      {
        path: 'tarifas/temporadas',
        name: 'temporadas',
        component: () => import('@/views/tarifas/TemporadasView.vue'),
        meta: { titulo: 'Temporadas', roles: ['admin'] },
      },
      {
        path: 'tarifas/canales',
        name: 'canales',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Canales y OTA', roles: ['admin'] },
      },

      // ── Administración ──────────────────────────────────────────────────
      {
        path: 'reportes',
        name: 'reportes',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Producción y ocupación', roles: ['admin', 'recepcion'] },
      },
      {
        path: 'facturacion',
        name: 'facturacion',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Facturación SUNAT', roles: ['admin', 'recepcion'] },
      },
      {
        path: 'usuarios',
        name: 'usuarios',
        component: () => import('@/views/admin/UsuariosView.vue'),
        meta: { titulo: 'Usuarios y roles', roles: ['admin'] },
      },
      {
        path: 'bitacora',
        name: 'bitacora',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Bitácora', roles: ['admin'] },
      },

      // ── Configuración ───────────────────────────────────────────────────
      {
        path: 'configuracion/vertical',
        name: 'config-vertical',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Configuración de la vertical', roles: ['admin'] },
      },
      {
        path: 'configuracion/sede',
        name: 'config-local',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Configuración por sede', roles: ['admin'] },
      },
      {
        path: 'configuracion/sedes',
        name: 'sedes',
        component: () => import('@/views/configuracion/SedesView.vue'),
        meta: { titulo: 'Sedes', roles: ['admin'] },
      },
      {
        path: 'configuracion/motivos',
        name: 'config-motivos',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Motivos', roles: ['admin'] },
      },
      {
        path: 'guia/componentes',
        name: 'componentes',
        component: () => import('@/views/EnConstruccionView.vue'),
        meta: { titulo: 'Guía de componentes', roles: ['admin'] },
      },

      {
        path: 'sin-permiso',
        name: 'sin-permiso',
        component: () => import('@/views/SinPermisoView.vue'),
        meta: { titulo: 'Sin permiso' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'no-encontrado',
    component: () => import('@/views/NoEncontradoView.vue'),
    meta: { publica: true, titulo: 'Página no encontrada' },
  },
]

/**
 * La demo pública de GitHub Pages usa rutas con hash: Pages no sabe servir el
 * `index.html` de una SPA en subrutas.
 */
export const router = createRouter({
  history: import.meta.env.MODE === 'demo' ? createWebHashHistory() : createWebHistory(),
  routes: rutas,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.publica) {
    // Un usuario con sesión no debería volver al login.
    if (to.name === 'login' && auth.autenticado) return { name: 'inicio' }
    return true
  }

  if (!auth.autenticado) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!auth.puede(to.meta.roles)) {
    return { name: 'sin-permiso' }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.titulo ? `${to.meta.titulo} · Alba` : 'Alba · Gestión hotelera'
})
