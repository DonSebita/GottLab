"use server"

import { createClient } from "@/lib/supabase/server"
import { getClienteIdOrThrow, requireAdmin } from "@/lib/helpers/auth"
import {
  validarCrearPedido,
  validarTransicionPedido,
  erroresAMensaje,
} from "@/lib/validations/pedidos"
import { resolverGrupoEnvio } from "@/lib/services/grupo_envio_resolver"
import type {
  ActionResult,
  PaginatedResult,
  CrearPedidoPayload,
  EstadoPedido,
  GetPedidosParams,
  PedidoCompleto,
  PedidoResumen,
} from "@/types/pedidos"

const PEDIDO_SELECT_CLIENTE = `
  id_pedido, id_cliente, id_direccion, id_grupo_envio,
  estado, estado_pago, estado_envio,
  fecha, total, subtotal, costo_envio, descuentos, observaciones, codigo_pedido, direccion_snapshot,
  detallepedido (
    id_detalle, id_producto, cantidad, precio_unitario,
    productos (nombre, nombre_cientifico, imagenes_productos (url))
  ),
  grupos_envio (
    id_grupo_envio, codigo, fecha_despacho, fecha_cierre, estado, courier, tracking_general,
    envios (id_envio, estado, codigo_seguimiento, courier, fecha_entrega, dias_estimados)
  )
`

const PEDIDO_SELECT_ADMIN = `
  id_pedido, id_cliente, id_direccion, id_grupo_envio,
  estado, estado_pago, estado_envio,
  fecha, total, subtotal, costo_envio, descuentos, observaciones, codigo_pedido, direccion_snapshot,
  clientes (nombre, apellido, email, telefono),
  detallepedido (
    id_detalle, id_producto, cantidad, precio_unitario,
    productos (nombre, nombre_cientifico, imagenes_productos (url))
  ),
  grupos_envio (
    id_grupo_envio, codigo, fecha_despacho, fecha_cierre, estado, courier, tracking_general,
    envios (id_envio, estado, codigo_seguimiento, courier, fecha_entrega, dias_estimados)
  ),
  direcciones (id_direccion, alias, direccion, ciudad, comuna, region, referencias)
`

// ─── Cliente: consultas propias ───────────────────────────────────────────────
export async function getPedidosByCliente(
  params: GetPedidosParams = {}
): Promise<ActionResult<PaginatedResult<PedidoResumen>>> {
  try {
    const { pagina = 1, porPagina = 10, estado } = params
    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const desde = (pagina - 1) * porPagina
    const hasta = desde + porPagina - 1

    let query = supabase
      .from("pedidos")
      .select(PEDIDO_SELECT_CLIENTE, { count: "exact" })
      .eq("id_cliente", idCliente)
      .order("fecha", { ascending: false })
      .range(desde, hasta)

    if (estado) query = query.eq("estado", estado)

    const { data, error, count } = await query

    if (error) return { success: false, error: "Error al obtener pedidos" }

    return {
      success: true,
      data: {
        items: (data ?? []) as unknown as PedidoResumen[],
        total: count ?? 0,
        pagina,
        porPagina,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getPedidoByIdCliente(
  idPedido: number
): Promise<ActionResult<PedidoCompleto>> {
  try {
    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const { data, error } = await supabase
      .from("pedidos")
      .select(PEDIDO_SELECT_CLIENTE)
      .eq("id_pedido", idPedido)
      .eq("id_cliente", idCliente)
      .maybeSingle()

    if (error) return { success: false, error: "Error al obtener pedido" }
    if (!data) return { success: false, error: "Pedido no encontrado" }

    return { success: true, data: data as unknown as PedidoCompleto }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Cliente: crear pedido ────────────────────────────────────────────────────
export async function crearPedido(
  payload: CrearPedidoPayload
): Promise<ActionResult<{ id_pedido: number; id_grupo_envio: number | null }>> {
  try {
    const errores = validarCrearPedido(payload)
    if (errores.length > 0) return { success: false, error: erroresAMensaje(errores) }

    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    if (payload.id_cliente !== idCliente)
      return { success: false, error: "No autorizado" }

    const { data: direccion } = await supabase
      .from("direcciones")
      .select("id_direccion")
      .eq("id_direccion", payload.id_direccion)
      .eq("id_cliente", idCliente)
      .maybeSingle()

    if (!direccion) return { success: false, error: "Dirección de envío no válida" }

    // Resolver grupo_envio: reutilizar abierto o crear para el próximo martes.
    // Si falla (error de red, DB caído), el pedido se crea sin grupo —
    // el admin lo asignará manualmente desde el panel.
    let id_grupo_envio: number | null = null
    let estadoInicial: EstadoPedido = "pendiente"
    try {
      const { grupo } = await resolverGrupoEnvio()
      id_grupo_envio = grupo.id_grupo_envio
      estadoInicial = "confirmado"
    } catch {
      // Continúa sin grupo; no bloquea la creación del pedido
    }

    const total = payload.items.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario,
      0
    )

    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({
        id_cliente:    idCliente,
        id_direccion:  payload.id_direccion,
        id_grupo_envio,
        estado:        estadoInicial,
        total,
        observaciones: payload.observaciones?.trim() ?? null,
        fecha:         new Date().toISOString(),
      })
      .select("id_pedido")
      .single()

    if (pedidoError || !pedido)
      return { success: false, error: "Error al crear el pedido" }

    const detalles = payload.items.map(item => ({
      id_pedido:       pedido.id_pedido,
      id_producto:     item.id_producto,
      cantidad:        item.cantidad,
      precio_unitario: item.precio_unitario,
    }))

    const { error: detalleError } = await supabase
      .from("detallepedido")
      .insert(detalles)

    if (detalleError) {
      await supabase.from("pedidos").delete().eq("id_pedido", pedido.id_pedido)
      return { success: false, error: "Error al registrar ítems del pedido" }
    }

    return { success: true, data: { id_pedido: pedido.id_pedido, id_grupo_envio } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Admin: consultas ─────────────────────────────────────────────────────────
export async function getPedidosAdmin(
  params: GetPedidosParams = {}
): Promise<ActionResult<PaginatedResult<PedidoCompleto>>> {
  try {
    await requireAdmin()
    const { pagina = 1, porPagina = 20, estado, id_grupo_envio, sin_grupo } = params
    const supabase = await createClient()

    const desde = (pagina - 1) * porPagina
    const hasta = desde + porPagina - 1

    let query = supabase
      .from("pedidos")
      .select(PEDIDO_SELECT_ADMIN, { count: "exact" })
      .order("fecha", { ascending: false })
      .range(desde, hasta)

    if (estado) query = query.eq("estado", estado)
    if (id_grupo_envio !== undefined && id_grupo_envio !== null)
      query = query.eq("id_grupo_envio", id_grupo_envio)
    if (sin_grupo) query = query.is("id_grupo_envio", null)

    const { data, error, count } = await query

    if (error) return { success: false, error: "Error al obtener pedidos" }

    return {
      success: true,
      data: {
        items: (data ?? []) as unknown as PedidoCompleto[],
        total: count ?? 0,
        pagina,
        porPagina,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getPedidoByIdAdmin(
  idPedido: number
): Promise<ActionResult<PedidoCompleto>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("pedidos")
      .select(PEDIDO_SELECT_ADMIN)
      .eq("id_pedido", idPedido)
      .maybeSingle()

    if (error) return { success: false, error: "Error al obtener pedido" }
    if (!data) return { success: false, error: "Pedido no encontrado" }

    return { success: true, data: data as unknown as PedidoCompleto }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Admin: mutaciones ────────────────────────────────────────────────────────
export async function cambiarEstadoPedido(
  idPedido: number,
  estadoNuevo: EstadoPedido
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: pedido } = await supabase
      .from("pedidos")
      .select("estado")
      .eq("id_pedido", idPedido)
      .maybeSingle()

    if (!pedido) return { success: false, error: "Pedido no encontrado" }

    const errores = validarTransicionPedido(
      pedido.estado as EstadoPedido,
      estadoNuevo
    )
    if (errores.length > 0) return { success: false, error: erroresAMensaje(errores) }

    const { error } = await supabase
      .from("pedidos")
      .update({ estado: estadoNuevo })
      .eq("id_pedido", idPedido)

    if (error) return { success: false, error: "Error al actualizar estado" }
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function asignarGrupoEnvio(
  idPedido: number,
  idGrupoEnvio: number
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: pedido } = await supabase
      .from("pedidos")
      .select("estado, id_grupo_envio")
      .eq("id_pedido", idPedido)
      .maybeSingle()

    if (!pedido) return { success: false, error: "Pedido no encontrado" }

    if (["despachado", "entregado", "cancelado"].includes(pedido.estado))
      return { success: false, error: `No se puede asignar grupo a un pedido '${pedido.estado}'` }

    const { data: grupo } = await supabase
      .from("grupos_envio")
      .select("estado")
      .eq("id_grupo_envio", idGrupoEnvio)
      .maybeSingle()

    if (!grupo) return { success: false, error: "Grupo de envío no encontrado" }
    if (!["abierto", "cerrado"].includes(grupo.estado))
      return { success: false, error: `El grupo está '${grupo.estado}', no acepta nuevos pedidos` }

    const { error } = await supabase
      .from("pedidos")
      .update({ id_grupo_envio: idGrupoEnvio, estado: "confirmado" })
      .eq("id_pedido", idPedido)

    if (error) return { success: false, error: "Error al asignar grupo" }
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function quitarGrupoEnvio(idPedido: number): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: pedido } = await supabase
      .from("pedidos")
      .select("estado")
      .eq("id_pedido", idPedido)
      .maybeSingle()

    if (!pedido) return { success: false, error: "Pedido no encontrado" }

    if (["despachado", "entregado"].includes(pedido.estado))
      return { success: false, error: "No se puede quitar el grupo a un pedido ya despachado" }

    const { error } = await supabase
      .from("pedidos")
      .update({ id_grupo_envio: null, estado: "pendiente" })
      .eq("id_pedido", idPedido)

    if (error) return { success: false, error: "Error al quitar grupo" }
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
