/**
 * Identidad del sistema de hotelería.
 *
 * Este vertical tiene lenguaje visual propio —turquesa, azul y plata sobre
 * negro azulado—, tomado del isotipo y definido en `src/assets/main.css`. La
 * pertenencia a la plataforma se mantiene como atribución explícita («Un
 * sistema Karma Systems», la división
 * de software de Karma Novum) con el isotipo corporativo, que se conserva en
 * `src/components/marca/KarmaLogo.vue`.
 *
 * El tema de plataforma sigue disponible sin cambios en
 * `src/assets/karma/karma-identidad.css` por si el sistema debe reintegrarse.
 */

export interface Marca {
  /** Nombre del producto tal como se muestra en el shell. */
  nombre: string
  /** Descriptor corto bajo el nombre. */
  descriptor: string
  /** Atribución de plataforma. */
  plataforma: string
  /** Frase de portada. */
  lema: string
  /** Lo que resuelve el sistema, para la pantalla de acceso. */
  capacidades: string[]
}

export const marca: Marca = {
  nombre: 'Alba',
  descriptor: 'Gestión hotelera',
  plataforma: 'Un sistema Karma Systems',
  lema: 'Cada habitación, lista antes de que pregunten.',
  capacidades: [
    'Tablero de habitaciones en tiempo real, piso por piso',
    'Reservas, check-in y check-out con tarifa por temporada',
    'Housekeeping, mantenimiento y facturación electrónica SUNAT',
  ],
}
