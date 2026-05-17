import type { EstadoEnvio, EventoHistorialEnvio, COURIER_DEFAULT } from "@/types/pedidos"

export const COURIER_NOMBRE: typeof COURIER_DEFAULT = "Correos de Chile"

// ─── Formato Correos de Chile: [CD|CE|EM|CP|RR] + 9 dígitos + CL ─────────────
// Ejemplo: CD483920111CL (13 caracteres)
const PREFIJOS_CORREOS_CL = ["CD", "CE", "EM", "CP", "RR"] as const

export function generarTrackingCorreosCL(): string {
  const prefijo = PREFIJOS_CORREOS_CL[Math.floor(Math.random() * PREFIJOS_CORREOS_CL.length)]
  const numero  = Math.floor(100_000_000 + Math.random() * 900_000_000).toString()
  return `${prefijo}${numero}CL`
}

export function esTrackingCorreosCL(codigo: string): boolean {
  return /^(CD|CE|EM|CP|RR)\d{9}CL$/.test(codigo)
}

// ─── Estados ─────────────────────────────────────────────────────────────────

const DESCRIPCION_ESTADO: Record<EstadoEnvio, string> = {
  pendiente:   "Pedido confirmado, esperando despacho del próximo martes.",
  preparando:  "Paquete en preparación en bodega para despacho.",
  despachado:  "Paquete entregado a Correos de Chile.",
  en_transito: "Paquete en tránsito por la red de Correos de Chile.",
  entregado:   "Paquete entregado exitosamente.",
}

export function crearEvento(
  estado: EstadoEnvio,
  ciudad?: string,
  descripcionCustom?: string
): EventoHistorialEnvio {
  return {
    estado,
    descripcion: descripcionCustom ?? DESCRIPCION_ESTADO[estado],
    timestamp:   new Date().toISOString(),
    ...(ciudad ? { ciudad } : {}),
  }
}

export function crearHistorialInicial(): EventoHistorialEnvio[] {
  return [crearEvento("pendiente")]
}

// ─── Secuencia ────────────────────────────────────────────────────────────────

export const SECUENCIA_ENVIO: EstadoEnvio[] = [
  "pendiente",
  "preparando",
  "despachado",
  "en_transito",
  "entregado",
]

export function siguienteEstadoEnvio(actual: EstadoEnvio): EstadoEnvio | null {
  const idx = SECUENCIA_ENVIO.indexOf(actual)
  if (idx === -1 || idx === SECUENCIA_ENVIO.length - 1) return null
  return SECUENCIA_ENVIO[idx + 1]
}

// ─── Días estimados ───────────────────────────────────────────────────────────

const DIAS_POR_REGION: Record<string, [number, number]> = {
  "Región Metropolitana de Santiago": [3, 5],
  "Metropolitana de Santiago":        [3, 5],
  "Valparaíso":   [4, 6],
  "O'Higgins":    [4, 6],
  "Maule":        [4, 6],
  "Ñuble":        [5, 7],
  "Biobío":       [5, 7],
  "La Araucanía": [5, 8],
  "Los Ríos":     [5, 8],
  "Los Lagos":    [6, 9],
  "Coquimbo":     [5, 7],
  "Atacama":      [6, 9],
  "Antofagasta":  [7, 10],
  "Tarapacá":     [7, 10],
  "Arica y Parinacota": [8, 12],
  "Aysén":        [8, 12],
  "Magallanes":   [10, 15],
}

export function calcularDiasEstimados(region: string | null | undefined): [number, number] {
  return (region ? DIAS_POR_REGION[region] : undefined) ?? [5, 8]
}

export function diasEstimadosTexto(region: string | null | undefined): string {
  const [min, max] = calcularDiasEstimados(region)
  return `${min}-${max} días hábiles`
}
