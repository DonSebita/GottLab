"use server"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/helpers/auth"
import {
  validarCrearGrupo,
  validarTransicionGrupo,
  erroresAMensaje,
} from "@/lib/validations/pedidos"
import {
  calcularProximoMartes,
  fechaToISODate,
  generarNombreGrupo,
} from "@/lib/helpers/fechas"
import { crearEnviosFakeParaGrupo } from "@/lib/actions/envios"
import type {
  ActionResult,
  PaginatedResult,
  CrearGrupoEnvioPayload,
  EstadoGrupoEnvio,
  GetGruposParams,
  GrupoEnvio,
  GrupoEnvioCompleto,
  GrupoEnvioConConteo,
  PedidoResumen,
} from "@/types/pedidos"

const GRUPO_SELECT = `
  id_grupo_envio, codigo, fecha_despacho, fecha_cierre, estado, courier, tracking_general,
  costo_total_envio, tipo_despacho, id_cliente, created_at
`

// ─── Consultas ────────────────────────────────────────────────────────────────
export async function getGruposEnvio(
  params: GetGruposParams = {}
): Promise<ActionResult<PaginatedResult<GrupoEnvioConConteo>>> {
  try {
    await requireAdmin()
    const { pagina = 1, porPagina = 20, estado } = params
    const supabase = await createClient()

    const desde = (pagina - 1) * porPagina
    const hasta = desde + porPagina - 1

    let query = supabase
      .from("grupos_envio")
      .select(GRUPO_SELECT, { count: "exact" })
      .order("fecha_despacho", { ascending: false })
      .range(desde, hasta)

    if (estado) query = query.eq("estado", estado)

    const { data: grupos, error, count } = await query
    if (error) return { success: false, error: "Error al obtener grupos de envío" }

    const ids = (grupos ?? []).map((g: GrupoEnvio) => g.id_grupo_envio)

    let conteoPorGrupo: Record<number, number> = {}
    if (ids.length > 0) {
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id_grupo_envio")
        .in("id_grupo_envio", ids)

      for (const p of pedidos ?? []) {
        if (p.id_grupo_envio !== null) {
          conteoPorGrupo[p.id_grupo_envio] = (conteoPorGrupo[p.id_grupo_envio] ?? 0) + 1
        }
      }
    }

    const items: GrupoEnvioConConteo[] = (grupos ?? []).map((g: GrupoEnvio) => ({
      ...g,
      pedido_count: conteoPorGrupo[g.id_grupo_envio] ?? 0,
      total_items:  0,
    }))

    return {
      success: true,
      data: { items, total: count ?? 0, pagina, porPagina },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getGrupoEnvioById(
  idGrupo: number
): Promise<ActionResult<GrupoEnvioCompleto>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: grupo, error } = await supabase
      .from("grupos_envio")
      .select(GRUPO_SELECT)
      .eq("id_grupo_envio", idGrupo)
      .maybeSingle()

    if (error) return { success: false, error: "Error al obtener grupo" }
    if (!grupo) return { success: false, error: "Grupo no encontrado" }

    const { data: pedidos } = await supabase
      .from("pedidos")
      .select(`
        id_pedido, id_cliente, estado, fecha, total, observaciones,
        detallepedido (id_detalle, id_producto, cantidad, precio_unitario)
      `)
      .eq("id_grupo_envio", idGrupo)
      .order("fecha", { ascending: true })

    return {
      success: true,
      data: {
        ...grupo,
        pedidos: (pedidos ?? []) as unknown as PedidoResumen[],
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getGrupoEnvioActivo(): Promise<ActionResult<GrupoEnvio | null>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("grupos_envio")
      .select(GRUPO_SELECT)
      .eq("estado", "abierto")
      .order("fecha_despacho", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) return { success: false, error: "Error al obtener grupo activo" }
    return { success: true, data: data ?? null }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Mutaciones ───────────────────────────────────────────────────────────────
export async function crearGrupoEnvio(
  payload: CrearGrupoEnvioPayload
): Promise<ActionResult<GrupoEnvio>> {
  try {
    await requireAdmin()
    const errores = validarCrearGrupo(payload)
    if (errores.length > 0) return { success: false, error: erroresAMensaje(errores) }

    const supabase = await createClient()

    const { data: existente } = await supabase
      .from("grupos_envio")
      .select("id_grupo_envio")
      .eq("estado", "abierto")
      .maybeSingle()

    if (existente)
      return { success: false, error: "Ya existe un grupo de envío abierto. Ciérralo antes de crear uno nuevo." }

    const { data, error } = await supabase
      .from("grupos_envio")
      .insert({
        codigo:         payload.codigo?.trim() ?? null,
        fecha_despacho: payload.fecha_despacho,
        estado:         "abierto",
      })
      .select(GRUPO_SELECT)
      .single()

    if (error) return { success: false, error: "Error al crear grupo de envío" }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function crearGrupoParaProximoMartes(): Promise<ActionResult<GrupoEnvio>> {
  const fechaDespacho = fechaToISODate(calcularProximoMartes())
  const codigo = generarNombreGrupo(fechaDespacho)
  return crearGrupoEnvio({ codigo, fecha_despacho: fechaDespacho })
}

export async function cambiarEstadoGrupo(
  idGrupo: number,
  estadoNuevo: EstadoGrupoEnvio
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: grupo } = await supabase
      .from("grupos_envio")
      .select("estado")
      .eq("id_grupo_envio", idGrupo)
      .maybeSingle()

    if (!grupo) return { success: false, error: "Grupo no encontrado" }

    const errores = validarTransicionGrupo(
      grupo.estado as EstadoGrupoEnvio,
      estadoNuevo
    )
    if (errores.length > 0) return { success: false, error: erroresAMensaje(errores) }

    const { error } = await supabase
      .from("grupos_envio")
      .update({ estado: estadoNuevo })
      .eq("id_grupo_envio", idGrupo)

    if (error) return { success: false, error: "Error al actualizar estado del grupo" }
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function despacharGrupo(idGrupo: number): Promise<ActionResult<{ envios_creados: number }>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: grupo } = await supabase
      .from("grupos_envio")
      .select("estado, fecha_despacho")
      .eq("id_grupo_envio", idGrupo)
      .maybeSingle()

    if (!grupo) return { success: false, error: "Grupo no encontrado" }

    const errores = validarTransicionGrupo(grupo.estado as EstadoGrupoEnvio, "despachado")
    if (errores.length > 0) return { success: false, error: erroresAMensaje(errores) }

    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("id_pedido, id_direccion, estado")
      .eq("id_grupo_envio", idGrupo)
      .not("estado", "in", "(cancelado,entregado,despachado)")

    if (!pedidos || pedidos.length === 0)
      return { success: false, error: "El grupo no tiene pedidos asignables para despachar" }

    if (!grupo.fecha_despacho)
      return { success: false, error: "El grupo no tiene fecha de despacho" }

    const resultado = await crearEnviosFakeParaGrupo(
      idGrupo,
      grupo.fecha_despacho,
      pedidos as { id_pedido: number; id_direccion: number | null }[]
    )

    if (!resultado.success) return resultado

    await supabase
      .from("grupos_envio")
      .update({ estado: "despachado" })
      .eq("id_grupo_envio", idGrupo)

    await supabase
      .from("pedidos")
      .update({ estado: "despachado" })
      .eq("id_grupo_envio", idGrupo)
      .not("estado", "in", "(cancelado,entregado)")

    return { success: true, data: resultado.data }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Admin: utilidades de mantenimiento ──────────────────────────────────────

/**
 * Cierra todos los grupos "abiertos" cuya fecha_despacho ya pasó.
 * Útil como acción manual del admin si el resolver automático no los cerró.
 * Devuelve cuántos grupos fueron cerrados.
 */
export async function cerrarGruposVencidos(): Promise<ActionResult<{ cerrados: number }>> {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const hoy = new Date().toISOString().split("T")[0]

    const { data: vencidos } = await supabase
      .from("grupos_envio")
      .select("id_grupo_envio")
      .eq("estado", "abierto")
      .lt("fecha_despacho", hoy)

    if (!vencidos || vencidos.length === 0)
      return { success: true, data: { cerrados: 0 } }

    const ids = vencidos.map((g: { id_grupo_envio: number }) => g.id_grupo_envio)

    const { error } = await supabase
      .from("grupos_envio")
      .update({ estado: "cerrado" })
      .in("id_grupo_envio", ids)

    if (error) return { success: false, error: "Error al cerrar grupos vencidos" }
    return { success: true, data: { cerrados: ids.length } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Público (cliente autenticado): info de próximo despacho ─────────────────

/**
 * Devuelve la fecha del próximo despacho (del grupo abierto vigente)
 * sin exponer datos del grupo. Usable desde páginas de cliente.
 */
export async function obtenerProximoDespachoCliente(): Promise<
  ActionResult<{ fecha_despacho: string; codigo: string | null } | null>
> {
  try {
    const supabase = await createClient()
    const hoy = new Date().toISOString().split("T")[0]

    const { data, error } = await supabase
      .from("grupos_envio")
      .select("codigo, fecha_despacho")
      .eq("estado", "abierto")
      .gte("fecha_despacho", hoy)
      .order("fecha_despacho", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) return { success: false, error: "Error al consultar fecha de despacho" }
    return {
      success: true,
      data: data ? { fecha_despacho: data.fecha_despacho ?? "", codigo: data.codigo } : null,
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
