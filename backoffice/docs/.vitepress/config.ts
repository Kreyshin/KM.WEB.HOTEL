import { defineConfig } from 'vitepress'

const REPO = 'KM.WEB.HOTEL'
const DEMO = `https://kreyshin.github.io/${REPO}/demo/`

/**
 * Documentación FUNCIONAL de la vertical.
 *
 * A diferencia de la de Restaurante, esta no documenta arquitectura ni
 * componentes: explica qué hace el sistema, con qué vocabulario y en qué orden
 * se trabaja. El lector es quien opera el hotel —recepción, gobernanta,
 * administración— o quien necesita entender el alcance antes de decidir.
 */
export default defineConfig({
  lang: 'es-PE',
  title: 'Alba',
  description: 'Cómo funciona el back office hotelero de KM.Hotel',
  base: `/${REPO}/`,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `/${REPO}/favicon.png` }],
    ['meta', { name: 'theme-color', content: '#0b1220' }],
  ],

  themeConfig: {
    logo: '/favicon.png',
    siteTitle: 'Alba · Documentación',

    nav: [
      { text: 'Guía', link: '/guia/introduccion', activeMatch: '/guia/' },
      { text: 'Módulos', link: '/modulos/', activeMatch: '/modulos/' },
      { text: 'Procesos', link: '/procesos/llegada', activeMatch: '/procesos/' },
      { text: 'Glosario', link: '/glosario' },
      { text: 'Ver demo', link: DEMO, target: '_blank' },
    ],

    sidebar: {
      '/guia/': [
        {
          text: 'Entender el sistema',
          items: [
            { text: 'Qué es Alba', link: '/guia/introduccion' },
            { text: 'Conceptos base', link: '/guia/conceptos' },
            { text: 'Los dos estados de una habitación', link: '/guia/dos-estados' },
            { text: 'El día del hotel', link: '/guia/dia-a-dia' },
            { text: 'Quién hace qué', link: '/guia/roles' },
          ],
        },
        {
          text: 'Alcance',
          items: [
            { text: 'Qué está listo', link: '/guia/estado' },
            { text: 'Preguntas frecuentes', link: '/guia/preguntas' },
          ],
        },
      ],
      '/modulos/': [
        {
          text: 'Módulos',
          items: [
            { text: 'Resumen', link: '/modulos/' },
            { text: 'Inicio · El día de hoy', link: '/modulos/inicio' },
            { text: 'Tablero de habitaciones', link: '/modulos/tablero' },
            { text: 'Alojamiento', link: '/modulos/alojamiento' },
            { text: 'Reservas', link: '/modulos/reservas' },
            { text: 'Recepción', link: '/modulos/recepcion' },
            { text: 'Huéspedes', link: '/modulos/huespedes' },
            { text: 'Housekeeping', link: '/modulos/housekeeping' },
            { text: 'Mantenimiento', link: '/modulos/mantenimiento' },
            { text: 'Amenities y lencería', link: '/modulos/inventario' },
            { text: 'Tarifas', link: '/modulos/tarifas' },
            { text: 'Configuración', link: '/modulos/configuracion' },
          ],
        },
      ],
      '/procesos/': [
        {
          text: 'Procesos de principio a fin',
          items: [
            { text: 'Una llegada', link: '/procesos/llegada' },
            { text: 'Una salida', link: '/procesos/salida' },
            { text: 'El ciclo de limpieza', link: '/procesos/limpieza' },
            { text: 'Una habitación averiada', link: '/procesos/averia' },
            { text: 'El precio de una noche', link: '/procesos/precio' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: `https://github.com/Kreyshin/${REPO}` }],
    editLink: {
      pattern: `https://github.com/Kreyshin/${REPO}/edit/main/backoffice/docs/:path`,
      text: 'Editar esta página en GitHub',
    },
    outline: { label: 'En esta página', level: [2, 3] },
    docFooter: { prev: 'Anterior', next: 'Siguiente' },
    lastUpdated: { text: 'Actualizado' },
    darkModeSwitchLabel: 'Tema',
    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Menú',
    search: { provider: 'local' },
    footer: {
      message: 'Back office Alba · Un sistema Karma Systems',
    },
  },
})
