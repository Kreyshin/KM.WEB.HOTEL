import type { Departamento, Distrito, Provincia } from '@/types'

/**
 * Padrón de ubigeos del INEI, en sus tres tablas.
 *
 * El real tiene 25 departamentos, 196 provincias y 1 874 distritos, y vive en
 * el núcleo compartido por las tres verticales. Aquí va un extracto de trabajo
 * —Lima, Callao y Cusco como plaza de sierra— suficiente para usar la pantalla
 * de sedes de punta a punta: hay dos departamentos con varias provincias, una
 * provincia con un solo distrito y nombres que se repiten entre niveles
 * («Lima» es departamento, provincia y distrito a la vez), que es justo lo que
 * rompe una cascada mal hecha.
 *
 * Los códigos son los del INEI y no se inventan: el de la provincia empieza
 * por el del departamento, y el del distrito por el de la provincia.
 */

export const departamentos: Departamento[] = [
  { id: '07', nombre: 'Callao' },
  { id: '08', nombre: 'Cusco' },
  { id: '15', nombre: 'Lima' },
]

export const provincias: Provincia[] = [
  { id: '0701', departamentoId: '07', nombre: 'Callao' },
  { id: '0801', departamentoId: '08', nombre: 'Cusco' },
  { id: '0813', departamentoId: '08', nombre: 'Urubamba' },
  { id: '1501', departamentoId: '15', nombre: 'Lima' },
  { id: '1510', departamentoId: '15', nombre: 'Huaral' },
]

export const distritos: Distrito[] = [
  // Callao · Callao
  { id: '070101', provinciaId: '0701', nombre: 'Callao' },
  { id: '070102', provinciaId: '0701', nombre: 'Bellavista' },
  { id: '070104', provinciaId: '0701', nombre: 'La Perla' },
  { id: '070106', provinciaId: '0701', nombre: 'Ventanilla' },

  // Cusco · Cusco
  { id: '080101', provinciaId: '0801', nombre: 'Cusco' },
  { id: '080105', provinciaId: '0801', nombre: 'San Sebastián' },
  { id: '080108', provinciaId: '0801', nombre: 'Wanchaq' },

  // Cusco · Urubamba
  { id: '081301', provinciaId: '0813', nombre: 'Urubamba' },
  { id: '081304', provinciaId: '0813', nombre: 'Machupicchu' },
  { id: '081306', provinciaId: '0813', nombre: 'Ollantaytambo' },

  // Lima · Lima
  { id: '150101', provinciaId: '1501', nombre: 'Lima' },
  { id: '150104', provinciaId: '1501', nombre: 'Barranco' },
  { id: '150113', provinciaId: '1501', nombre: 'Jesús María' },
  { id: '150116', provinciaId: '1501', nombre: 'Lince' },
  { id: '150122', provinciaId: '1501', nombre: 'Miraflores' },
  { id: '150131', provinciaId: '1501', nombre: 'San Borja' },
  { id: '150132', provinciaId: '1501', nombre: 'San Isidro' },
  { id: '150141', provinciaId: '1501', nombre: 'Santiago de Surco' },
  { id: '150142', provinciaId: '1501', nombre: 'Surquillo' },

  // Lima · Huaral
  { id: '151002', provinciaId: '1510', nombre: 'Chancay' },
]
