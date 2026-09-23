/**
 * Variantes de la pantalla de acceso.
 *
 * Las tres comparten lógica, tipografía y paleta; cambian la puesta en escena.
 * La elegida se fija aquí y se puede previsualizar con `?acceso=` en la URL,
 * que es como se comparan sin tocar código.
 */
export const variantesAcceso = ['portada', 'escenario', 'ficha'] as const

export type VarianteAcceso = (typeof variantesAcceso)[number]

export const etiquetaVariante: Record<VarianteAcceso, string> = {
  portada: 'Portada',
  escenario: 'Fachada',
  ficha: 'Llave',
}

export const descripcionVariante: Record<VarianteAcceso, string> = {
  portada: 'Manifiesto a la izquierda, formulario a la derecha.',
  escenario: 'La fachada del hotel, con una ventana por habitación.',
  ficha: 'El acceso dentro de una tarjeta-llave.',
}

/** La que se sirve por defecto. */
export const varianteAccesoPorDefecto: VarianteAcceso = 'escenario'

export function esVarianteAcceso(valor: unknown): valor is VarianteAcceso {
  return typeof valor === 'string' && (variantesAcceso as readonly string[]).includes(valor)
}
