import { computed, ref } from 'vue'
import { canalesService } from '@/services/canales.service'
import type { Canal } from '@/types'
import type { OpcionSelect } from '@/types/ui'

/**
 * Los canales, cargados una vez y compartidos por toda la sesión.
 *
 * Antes cada pantalla llevaba su propia lista escrita a mano —los mismos seis
 * códigos repetidos en cuatro sitios— y un mapa de nombres en `formato.ts`.
 * Abrir un canal nuevo obligaba a acordarse de los cinco. Ahora hay un solo
 * origen: el maestro.
 */

const canales = ref<Canal[]>([])
let cargando: Promise<void> | null = null

export function useCanales() {
  /** Carga perezosa y una sola vez, aunque la llamen tres vistas a la vez. */
  function cargar() {
    cargando ??= canalesService
      .listar()
      .then((items) => {
        canales.value = items
      })
      .catch(() => {
        cargando = null
      })
    return cargando
  }

  /** Vuelve a pedirlos: lo usa la pantalla que los edita. */
  async function recargar() {
    cargando = null
    await cargar()
  }

  /**
   * El nombre del canal de una reserva. Si el código ya no existe —un canal
   * borrado, un dato viejo— se enseña el código en crudo antes que un hueco:
   * dice más de dónde vino la reserva que una casilla vacía.
   */
  function nombre(codigo: string) {
    return canales.value.find((c) => c.codigo === codigo)?.nombre ?? codigo
  }

  const opciones = computed<OpcionSelect[]>(() =>
    canales.value.filter((c) => c.activo).map((c) => ({ valor: c.codigo, etiqueta: c.nombre })),
  )

  /** Los que se teclean en el mostrador: las OTA llegan por integración. */
  const opcionesManuales = computed<OpcionSelect[]>(() =>
    canales.value
      .filter((c) => c.activo && !c.automatico)
      .map((c) => ({ valor: c.codigo, etiqueta: c.nombre })),
  )

  return { canales, cargar, recargar, nombre, opciones, opcionesManuales }
}
