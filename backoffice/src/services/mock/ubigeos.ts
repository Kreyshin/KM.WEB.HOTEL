import type { Ubigeo } from '@/types'

/**
 * Padrón de ubigeos del INEI.
 *
 * El real tiene 1 874 distritos y vive en el núcleo, compartido por las tres
 * verticales: la dirección de una sede, la de un proveedor y la de un huésped
 * apuntan todas aquí. Este archivo trae un extracto de trabajo —Lima y los
 * destinos donde hay hoteles— para que la cascada se pueda usar de verdad
 * mientras no esté cargada la tabla completa.
 *
 * El código son seis dígitos: departamento, provincia y distrito. No se inventa
 * ni se recalcula; es el mismo que declara SUNAT.
 */
const filas: [string, string, string, string][] = [
  // ── Lima ────────────────────────────────────────────────────────────────
  ['150101', 'Lima', 'Lima', 'Lima'],
  ['150104', 'Lima', 'Lima', 'Barranco'],
  ['150105', 'Lima', 'Lima', 'Breña'],
  ['150108', 'Lima', 'Lima', 'Chorrillos'],
  ['150113', 'Lima', 'Lima', 'Jesús María'],
  ['150114', 'Lima', 'Lima', 'La Molina'],
  ['150115', 'Lima', 'Lima', 'La Victoria'],
  ['150116', 'Lima', 'Lima', 'Lince'],
  ['150120', 'Lima', 'Lima', 'Magdalena del Mar'],
  ['150121', 'Lima', 'Lima', 'Pueblo Libre'],
  ['150122', 'Lima', 'Lima', 'Miraflores'],
  ['150131', 'Lima', 'Lima', 'San Borja'],
  ['150132', 'Lima', 'Lima', 'San Isidro'],
  ['150136', 'Lima', 'Lima', 'San Martín de Porres'],
  ['150137', 'Lima', 'Lima', 'San Miguel'],
  ['150141', 'Lima', 'Lima', 'Santiago de Surco'],
  ['150142', 'Lima', 'Lima', 'Surquillo'],
  ['151002', 'Lima', 'Huaral', 'Chancay'],

  // ── Callao ──────────────────────────────────────────────────────────────
  ['070101', 'Callao', 'Callao', 'Callao'],
  ['070102', 'Callao', 'Callao', 'Bellavista'],
  ['070106', 'Callao', 'Callao', 'Ventanilla'],

  // ── Cusco ───────────────────────────────────────────────────────────────
  ['080101', 'Cusco', 'Cusco', 'Cusco'],
  ['080105', 'Cusco', 'Cusco', 'San Sebastián'],
  ['080108', 'Cusco', 'Cusco', 'Wanchaq'],
  ['081301', 'Cusco', 'Urubamba', 'Urubamba'],
  ['081304', 'Cusco', 'Urubamba', 'Machupicchu'],
  ['081306', 'Cusco', 'Urubamba', 'Ollantaytambo'],

  // ── Arequipa ────────────────────────────────────────────────────────────
  ['040101', 'Arequipa', 'Arequipa', 'Arequipa'],
  ['040103', 'Arequipa', 'Arequipa', 'Cayma'],
  ['040129', 'Arequipa', 'Arequipa', 'Yanahuara'],

  // ── La Libertad ─────────────────────────────────────────────────────────
  ['130101', 'La Libertad', 'Trujillo', 'Trujillo'],
  ['130104', 'La Libertad', 'Trujillo', 'Huanchaco'],

  // ── Piura ───────────────────────────────────────────────────────────────
  ['200101', 'Piura', 'Piura', 'Piura'],
  ['200701', 'Piura', 'Talara', 'Pariñas'],
  ['200704', 'Piura', 'Talara', 'Máncora'],

  // ── Ica ─────────────────────────────────────────────────────────────────
  ['110101', 'Ica', 'Ica', 'Ica'],
  ['110401', 'Ica', 'Nasca', 'Nasca'],
  ['110501', 'Ica', 'Pisco', 'Pisco'],
  ['110505', 'Ica', 'Pisco', 'Paracas'],

  // ── Áncash ──────────────────────────────────────────────────────────────
  ['020101', 'Áncash', 'Huaraz', 'Huaraz'],

  // ── Puno ────────────────────────────────────────────────────────────────
  ['210101', 'Puno', 'Puno', 'Puno'],

  // ── Loreto ──────────────────────────────────────────────────────────────
  ['160101', 'Loreto', 'Maynas', 'Iquitos'],
  ['160108', 'Loreto', 'Maynas', 'Punchana'],

  // ── Madre de Dios ───────────────────────────────────────────────────────
  ['170101', 'Madre de Dios', 'Tambopata', 'Tambopata'],

  // ── Lambayeque ──────────────────────────────────────────────────────────
  ['140101', 'Lambayeque', 'Chiclayo', 'Chiclayo'],
]

export const ubigeos: Ubigeo[] = filas.map(([id, departamento, provincia, distrito]) => ({
  id,
  departamento,
  provincia,
  distrito,
}))
