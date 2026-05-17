/**
 * Calcula el costo de envío fake por región (Chile).
 * Reemplazar con integración real a Correos de Chile / Chilexpress cuando esté disponible.
 */

// Costos base en CLP por región, agrupados en zonas logísticas.
// Zonas: Centro (RM), Norte Chico, Sur Chico, Norte Extremo, Sur Extremo.
const COSTO_POR_REGION: Record<string, number> = {
  // ─── Centro ──────────────────────────────────────────────────────────────────
  "Región Metropolitana de Santiago": 3_500,
  "Metropolitana de Santiago":        3_500,
  "RM":                               3_500,

  // ─── Norte Chico ──────────────────────────────────────────────────────────────
  "Coquimbo":  4_500,
  "Atacama":   5_000,

  // ─── Centro Extendido ─────────────────────────────────────────────────────────
  "Valparaíso":      4_000,
  "O'Higgins":       4_000,
  "Libertador General Bernardo O'Higgins": 4_000,
  "Maule":           4_000,
  "Ñuble":           4_500,
  "Biobío":          4_500,

  // ─── Sur Chico ────────────────────────────────────────────────────────────────
  "La Araucanía":    5_000,
  "Los Ríos":        5_000,
  "Los Lagos":       5_500,

  // ─── Norte Extremo ────────────────────────────────────────────────────────────
  "Tarapacá":              6_000,
  "Antofagasta":           6_000,
  "Arica y Parinacota":    6_500,

  // ─── Sur Extremo ──────────────────────────────────────────────────────────────
  "Aysén del General Carlos Ibáñez del Campo": 7_000,
  "Aysén":      7_000,
  "Magallanes y de la Antártica Chilena":      7_500,
  "Magallanes": 7_500,
}

const COSTO_DEFAULT = 5_500

// Cargo adicional por unidades sobre el umbral (productos grandes como macetas).
const UMBRAL_UNIDADES    = 5
const CARGO_EXTRA_UNIDAD = 300

export function calcularCostoEnvioFake(
  region: string | null | undefined,
  totalUnidades: number
): number {
  const base = (region ? (COSTO_POR_REGION[region] ?? COSTO_DEFAULT) : COSTO_DEFAULT)
  const extra = Math.max(0, totalUnidades - UMBRAL_UNIDADES) * CARGO_EXTRA_UNIDAD
  return base + extra
}

export interface DesgloseCostoEnvio {
  region:         string
  base:           number
  extra_unidades: number
  total:          number
}

export function desglosarCostoEnvio(
  region: string | null | undefined,
  totalUnidades: number
): DesgloseCostoEnvio {
  const regionNormalizada = region ?? "desconocida"
  const base = COSTO_POR_REGION[regionNormalizada] ?? COSTO_DEFAULT
  const extra = Math.max(0, totalUnidades - UMBRAL_UNIDADES) * CARGO_EXTRA_UNIDAD
  return {
    region:         regionNormalizada,
    base,
    extra_unidades: extra,
    total:          base + extra,
  }
}
