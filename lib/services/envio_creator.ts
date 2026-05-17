/**
 * lib/services/envio_creator.ts
 *
 * Servicio interno (sin "use server") — importar solo desde Server Actions.
 *
 * Crea el envío fake al momento de despachar el grupo (no al crear el pedido).
 * Usa createAdminClient() para bypasear RLS en la tabla envios.
 *
 * Relación: envios → grupos_envio (no a pedidos individualmente).
 */

import { createAdminClient } from "@/lib/supabase/server"
import { calcularFechaEstimadaEntrega } from "@/lib/helpers/fechas"
import {
  generarTrackingCorreosCL,
  COURIER_NOMBRE,
} from "@/lib/helpers/tracking"
import type { EstadoEnvio, InfoEnvioCheckout } from "@/types/pedidos"
import type { Json } from "@/types/supabase"

// ─── Parámetros de entrada ────────────────────────────────────────────────────

export interface CrearEnvioParams {
  id_grupo_envio:     number | null
  fecha_despacho:     string | null
  region?:            string | null
  direccion_snapshot?: Json | null
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Crea el registro de envío al despachar el grupo.
 *
 * - codigo_seguimiento: formato Correos de Chile (e.g. CD483920111CL)
 * - Courier:  "Correos de Chile" (fake hasta integrar API)
 * - Estado:   "preparando" (se creó al momento de despachar)
 * - fecha_entrega: calculada desde fecha_despacho + días hábiles por región
 *
 * Devuelve null si hay error.
 */
export async function crearEnvioParaGrupo(
  params: CrearEnvioParams
): Promise<InfoEnvioCheckout | null> {
  try {
    const supabase = await createAdminClient()

    const codigo_seguimiento  = generarTrackingCorreosCL()
    const diasEstimados       = _diasHabilesDesdeRegion(params.region)
    const fecha_despacho      = params.fecha_despacho ?? _proximoMartesISO()
    const fecha_entrega       = calcularFechaEstimadaEntrega(fecha_despacho, diasEstimados)

    const { data, error } = await supabase
      .from("envios")
      .insert({
        id_grupo_envio:     params.id_grupo_envio,
        estado:             "preparando" satisfies EstadoEnvio,
        courier:            COURIER_NOMBRE,
        codigo_seguimiento,
        fecha:              new Date().toISOString(),
        fecha_envio:        new Date().toISOString(),
        fecha_entrega,
        dias_estimados:     diasEstimados,
        costo:              0,
        direccion_snapshot: params.direccion_snapshot ?? null,
      })
      .select("id_envio, estado, codigo_seguimiento, courier, fecha_entrega, dias_estimados")
      .single()

    if (error || !data) return null

    return {
      id_envio:           data.id_envio,
      codigo_seguimiento: data.codigo_seguimiento ?? codigo_seguimiento,
      courier:            data.courier            ?? COURIER_NOMBRE,
      estado:             (data.estado            ?? "preparando") as EstadoEnvio,
      fecha_entrega:      data.fecha_entrega,
      dias_estimados:     data.dias_estimados,
    }
  } catch {
    return null
  }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function _diasHabilesDesdeRegion(region: string | null | undefined): number {
  if (!region) return 5
  const RM = ["Región Metropolitana de Santiago", "Metropolitana de Santiago"]
  if (RM.includes(region)) return 3
  if (["Valparaíso", "O'Higgins", "Maule"].includes(region)) return 4
  if (["Arica y Parinacota", "Aysén", "Magallanes"].includes(region)) return 9
  return 5
}

function _proximoMartesISO(): string {
  const d = new Date()
  const dia = d.getDay()
  const diasHasta = dia === 2 ? 7 : (2 - dia + 7) % 7
  d.setDate(d.getDate() + diasHasta)
  return d.toISOString().split("T")[0]
}
