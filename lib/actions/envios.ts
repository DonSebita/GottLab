"use server"

import { createClient } from "@/lib/supabase/server"
import { getClienteIdOrThrow, requireAdmin } from "@/lib/helpers/auth"
import { calcularFechaEstimadaEntrega } from "@/lib/helpers/fechas"
import {
  generarTrackingCorreosCL,
  siguienteEstadoEnvio,
  COURIER_NOMBRE,
} from "@/lib/helpers/tracking"
import type {
  ActionResult,
  Envio,
  EstadoEnvio,
} from "@/types/pedidos"

const ENVIO_SELECT = `
  id_envio, id_grupo_envio, estado, codigo_seguimiento, courier,
  fecha, fecha_envio, fecha_entrega, costo, dias_estimados,
  direccion_snapshot, codigo_servicio, distancia_km
`

// ─── Cliente: consultas propias ───────────────────────────────────────────────
export async function getEnviosByCliente(): Promise<ActionResult<Envio[]>> {
  try {
    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("id_grupo_envio")
      .eq("id_cliente", idCliente)
      .not("id_grupo_envio", "is", null)

    const grupoIds = [...new Set(
      (pedidos ?? [])
        .map(p => p.id_grupo_envio)
        .filter((id): id is number => id !== null)
    )]

    if (grupoIds.length === 0) return { success: true, data: [] }

    const { data, error } = await supabase
      .from("envios")
      .select(ENVIO_SELECT)
      .in("id_grupo_envio", grupoIds)
      .order("fecha", { ascending: false })

    if (error) return { success: false, error: "Error al obtener envíos" }
    return { success: true, data: (data ?? []) as Envio[] }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getEnvioByGrupo(
  idGrupo: number
): Promise<ActionResult<Envio | null>> {
  try {
    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const { data: pedido } = await supabase
      .from("pedidos")
      .select("id_cliente")
      .eq("id_grupo_envio", idGrupo)
      .eq("id_cliente", idCliente)
      .limit(1)
      .maybeSingle()

    if (!pedido) return { success: false, error: "Grupo no asociado a este cliente" }

    const { data, error } = await supabase
      .from("envios")
      .select(ENVIO_SELECT)
      .eq("id_grupo_envio", idGrupo)
      .order("id_envio", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) return { success: false, error: "Error al obtener envío" }
    return { success: true, data: (data ?? null) as Envio | null }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Admin: consultas ─────────────────────────────────────────────────────────
export async function getEnviosByGrupo(
  idGrupo: number
): Promise<ActionResult<Envio[]>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("envios")
      .select(ENVIO_SELECT)
      .eq("id_grupo_envio", idGrupo)
      .order("id_envio", { ascending: true })

    if (error) return { success: false, error: "Error al obtener envíos del grupo" }
    return { success: true, data: (data ?? []) as Envio[] }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getEnvioByIdAdmin(
  idEnvio: number
): Promise<ActionResult<Envio>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("envios")
      .select(ENVIO_SELECT)
      .eq("id_envio", idEnvio)
      .maybeSingle()

    if (error) return { success: false, error: "Error al obtener envío" }
    if (!data) return { success: false, error: "Envío no encontrado" }
    return { success: true, data: data as Envio }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Admin: crear envío fake para un grupo ───────────────────────────────────
export async function crearEnviosFakeParaGrupo(
  idGrupo: number,
  fechaDespacho: string,
  _pedidos: { id_pedido: number; id_direccion: number | null }[]
): Promise<ActionResult<{ envios_creados: number }>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: existentes } = await supabase
      .from("envios")
      .select("id_envio, estado")
      .eq("id_grupo_envio", idGrupo)

    if (existentes && existentes.length > 0) {
      const pendientes = existentes
        .filter(e => e.estado === "pendiente")
        .map(e => e.id_envio)
      if (pendientes.length > 0) {
        await supabase
          .from("envios")
          .update({ estado: "preparando", fecha_envio: new Date().toISOString() })
          .in("id_envio", pendientes)
      }
      return { success: true, data: { envios_creados: 0 } }
    }

    const fechaEntrega = calcularFechaEstimadaEntrega(fechaDespacho)

    const { error } = await supabase
      .from("envios")
      .insert({
        id_grupo_envio:     idGrupo,
        estado:             "preparando" satisfies EstadoEnvio,
        courier:            COURIER_NOMBRE,
        codigo_seguimiento: generarTrackingCorreosCL(),
        fecha:              new Date().toISOString(),
        fecha_envio:        new Date().toISOString(),
        fecha_entrega:      fechaEntrega,
        dias_estimados:     5,
        costo:              0,
      })

    if (error) return { success: false, error: "Error al crear envío del grupo" }
    return { success: true, data: { envios_creados: 1 } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Admin: avanzar estado del envío ─────────────────────────────────────────
export async function avanzarEstadoEnvio(
  idEnvio: number
): Promise<ActionResult<{ estado_nuevo: EstadoEnvio }>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: envio } = await supabase
      .from("envios")
      .select("estado, id_grupo_envio")
      .eq("id_envio", idEnvio)
      .maybeSingle()

    if (!envio) return { success: false, error: "Envío no encontrado" }

    const estadoActual = envio.estado as EstadoEnvio
    const estadoNuevo = siguienteEstadoEnvio(estadoActual)

    if (!estadoNuevo)
      return { success: false, error: `El envío ya está en estado final: '${estadoActual}'` }

    const ahora = new Date().toISOString()
    const { error } = await supabase
      .from("envios")
      .update({
        estado: estadoNuevo,
        ...(estadoNuevo === "despachado" ? { fecha_envio:   ahora } : {}),
        ...(estadoNuevo === "entregado"  ? { fecha_entrega: ahora } : {}),
      })
      .eq("id_envio", idEnvio)

    if (error) return { success: false, error: "Error al avanzar estado del envío" }

    if (envio.id_grupo_envio) {
      await supabase
        .from("pedidos")
        .update({
          estado_envio: estadoNuevo,
          ...(estadoNuevo === "entregado" ? { estado: "entregado" } : {}),
        })
        .eq("id_grupo_envio", envio.id_grupo_envio)
        .not("estado", "in", "(cancelado)")

      if (estadoNuevo === "entregado") {
        await supabase
          .from("grupos_envio")
          .update({ estado: "finalizado" })
          .eq("id_grupo_envio", envio.id_grupo_envio)
      }
    }

    return { success: true, data: { estado_nuevo: estadoNuevo } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
