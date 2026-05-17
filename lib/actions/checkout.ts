"use server"

import { createClient } from "@/lib/supabase/server"
import { getClienteIdOrThrow } from "@/lib/helpers/auth"
import { calcularCostoEnvioFake } from "@/lib/helpers/envio_costo"
import { resolverGrupoEnvio } from "@/lib/services/grupo_envio_resolver"
import { vaciarCarrito } from "@/lib/actions/carrito"
import { validarCheckoutPayload, erroresAMensaje } from "@/lib/validations/pedidos"
import type { Json } from "@/types/supabase"
import type {
  ActionResult,
  CheckoutPayload,
  CheckoutResult,
  DireccionSnapshot,
  ItemCheckout,
  EstadoPedido,
} from "@/types/pedidos"

// ─── Checkout principal ───────────────────────────────────────────────────────

/**
 * Ejecuta el flujo completo de checkout desde el carrito activo del cliente.
 *
 * Pasos:
 *  1. Validar payload
 *  2. Verificar dirección pertenece al cliente
 *  3. Leer carrito con precios reales (incl. precio_especial de live sales)
 *  4. Validar productos: activos + stock real en tiempo real
 *  5. Calcular subtotal, costo_envio fake y total
 *  6. Resolver grupo_envio (reutilizar o crear para próximo martes)
 *  7. Crear snapshot de dirección
 *  8. INSERT pedido
 *  9. INSERT detallepedido (rollback pedido si falla)
 * 10. (estado_pago se persiste directamente en pedido)
 * 11. Vaciar carrito (silencioso si falla)
 * 12. Retornar CheckoutResult
 */
export async function ejecutarCheckout(
  payload: CheckoutPayload
): Promise<ActionResult<CheckoutResult>> {
  try {
    // ── 1. Validar payload ──────────────────────────────────────────────────
    const erroresPayload = validarCheckoutPayload(payload)
    if (erroresPayload.length > 0)
      return { success: false, error: erroresAMensaje(erroresPayload) }

    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    // ── 2. Verificar dirección ──────────────────────────────────────────────
    const { data: direccion, error: dirError } = await supabase
      .from("direcciones")
      .select("id_direccion, alias, tipo, direccion, ciudad, comuna, region, pais, codigo_postal, referencias, sucursal")
      .eq("id_direccion", payload.id_direccion)
      .eq("id_cliente", idCliente)
      .maybeSingle()

    if (dirError) return { success: false, error: "Error al verificar la dirección" }
    if (!direccion) return { success: false, error: "Dirección de envío no válida" }

    // ── 3. Leer carrito ─────────────────────────────────────────────────────
    const ahora = new Date().toISOString()
    const { data: reservas, error: carritoError } = await supabase
      .from("reservas")
      .select(`
        id_reserva,
        id_cliente,
        id_producto,
        cantidad,
        precio_especial,
        productos!fk_reservas_producto (
          id_producto,
          nombre,
          precio_venta,
          stock_total,
          estado
        )
      `)
      .eq("id_cliente", idCliente)
      .gt("fecha_expiracion", ahora)

    if (carritoError) return { success: false, error: "Error al leer el carrito" }
    if (!reservas || reservas.length === 0)
      return { success: false, error: "El carrito está vacío o expiró. Agrega productos nuevamente." }

    // ── 4. Validar productos ────────────────────────────────────────────────
    const erroresProducto: string[] = []
    const itemsValidados: ItemCheckout[] = []

    for (const reserva of (reservas as unknown as ReservaConProducto[])) {
      const p = reserva.productos
      if (!p) {
        erroresProducto.push(`Producto #${reserva.id_producto} no encontrado`)
        continue
      }
      if (p.estado !== "activo") {
        erroresProducto.push(`"${p.nombre}" ya no está disponible`)
        continue
      }

      // Stock real: total en DB − reservas vigentes de otros clientes
      const { data: otrasReservas } = await supabase
        .from("reservas")
        .select("cantidad")
        .eq("id_producto", reserva.id_producto)
        .neq("id_reserva", reserva.id_reserva)
        .gt("fecha_expiracion", ahora)

      const reservadoPorOtros = (otrasReservas ?? []).reduce(
        (sum, r: { cantidad: number }) => sum + r.cantidad,
        0
      )
      const stockDisponible = p.stock_total - reservadoPorOtros

      if (reserva.cantidad > stockDisponible) {
        erroresProducto.push(
          stockDisponible > 0
            ? `"${p.nombre}": solo quedan ${stockDisponible} unidades`
            : `"${p.nombre}" está agotado`
        )
        continue
      }

      // precio_especial prevalece (live sales); si no, usa precio normal
      const precioBruto   = p.precio_venta
      const precioFinal   = reserva.precio_especial ?? precioBruto
      const esPrecioEspecial = reserva.precio_especial !== null && reserva.precio_especial !== undefined

      itemsValidados.push({
        id_producto:     p.id_producto,
        nombre:          p.nombre,
        cantidad:        reserva.cantidad,
        precio_unitario: precioFinal,
        subtotal:        reserva.cantidad * precioFinal,
        precio_especial: esPrecioEspecial,
      })
    }

    if (erroresProducto.length > 0)
      return { success: false, error: erroresProducto.join(". ") }

    // ── 5. Calcular totales ─────────────────────────────────────────────────
    const subtotal      = itemsValidados.reduce((s, i) => s + i.subtotal, 0)
    const totalUnidades = itemsValidados.reduce((s, i) => s + i.cantidad, 0)
    const costo_envio   = calcularCostoEnvioFake(direccion.region, totalUnidades)
    const total         = subtotal + costo_envio

    // ── 6. Resolver grupo_envio ─────────────────────────────────────────────
    let id_grupo_envio:  number | null = null
    let fecha_despacho:  string | null = null
    let estadoInicial:   EstadoPedido  = "pendiente"
    try {
      const { grupo } = await resolverGrupoEnvio()
      id_grupo_envio = grupo.id_grupo_envio
      fecha_despacho = grupo.fecha_despacho
      estadoInicial  = "confirmado"
    } catch {
      // Degradación silenciosa: pedido se crea sin grupo, admin lo asigna.
    }

    // ── 7. Snapshot de dirección ────────────────────────────────────────────
    const direccion_snapshot: DireccionSnapshot = {
      alias:         direccion.alias         ?? null,
      tipo:          direccion.tipo          ?? null,
      direccion:     direccion.direccion     ?? null,
      ciudad:        direccion.ciudad        ?? null,
      comuna:        direccion.comuna        ?? "",
      region:        direccion.region        ?? "",
      pais:          direccion.pais          ?? null,
      codigo_postal: direccion.codigo_postal ?? null,
      referencias:   direccion.referencias   ?? null,
      sucursal:      direccion.sucursal      ?? null,
    }

    // ── 8. INSERT pedido ────────────────────────────────────────────────────
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({
        id_cliente:          idCliente,
        id_direccion:        payload.id_direccion,
        id_grupo_envio,
        estado:              estadoInicial,
        subtotal,
        costo_envio,
        total,
        observaciones:       payload.observaciones?.trim() ?? null,
        estado_pago:         "pendiente",
        estado_envio:        "pendiente",
        fecha:               new Date().toISOString(),
        direccion_snapshot: direccion_snapshot as unknown as Json,
      })
      .select("id_pedido")
      .single()

    if (pedidoError || !pedido)
      return { success: false, error: "Error al crear el pedido. Intenta nuevamente." }

    // ── 9. INSERT detallepedido ─────────────────────────────────────────────
    const detalles = itemsValidados.map(item => ({
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
      return { success: false, error: "Error al registrar los productos del pedido" }
    }

    // ── 10. Vacío — estado_pago se guarda en pedido al crearlo

    // ── 11. Vaciar carrito ──────────────────────────────────────────────────
    await vaciarCarrito().catch(() => {
      // No bloquea: la reserva expirará sola si esto falla.
    })

    // ── 12. Resultado ───────────────────────────────────────────────────────
    return {
      success: true,
      data: {
        id_pedido:      pedido.id_pedido,
        id_grupo_envio,
        subtotal,
        costo_envio,
        total,
        fecha_despacho,
        items:          itemsValidados,
        envio:          null,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Lectura: resumen de lo que el cliente está por pagar ────────────────────

/**
 * Previsualiza el checkout sin crearlo: totales, costo envío y fecha despacho.
 * Llamar desde la página de resumen antes del botón "Confirmar pedido".
 */
export async function previsualizarCheckout(
  idDireccion: number
): Promise<ActionResult<Omit<CheckoutResult, "id_pedido"> & { valido: boolean; errores: string[] }>> {
  try {
    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const { data: direccion } = await supabase
      .from("direcciones")
      .select("id_direccion, region, comuna")
      .eq("id_direccion", idDireccion)
      .eq("id_cliente", idCliente)
      .maybeSingle()

    if (!direccion)
      return { success: false, error: "Dirección no válida" }

    const ahora = new Date().toISOString()
    const { data: reservas } = await supabase
      .from("reservas")
      .select(`
        id_reserva, id_producto, cantidad, precio_especial,
        productos!fk_reservas_producto (nombre, precio_venta, stock_total, estado)
      `)
      .eq("id_cliente", idCliente)
      .gt("fecha_expiracion", ahora)

    if (!reservas || reservas.length === 0)
      return { success: false, error: "El carrito está vacío" }

    const errores: string[] = []
    let subtotal      = 0
    let totalUnidades = 0
    const items: ItemCheckout[] = []

    for (const r of (reservas as unknown as ReservaConProducto[])) {
      const p = r.productos
      if (!p || p.estado !== "activo") {
        errores.push(`"${p?.nombre ?? `#${r.id_producto}`}" no disponible`)
        continue
      }
      const precio   = r.precio_especial ?? p.precio_venta
      const lineTotal = r.cantidad * precio
      subtotal       += lineTotal
      totalUnidades  += r.cantidad
      items.push({
        id_producto:     p.id_producto,
        nombre:          p.nombre,
        cantidad:        r.cantidad,
        precio_unitario: precio,
        subtotal:        lineTotal,
        precio_especial: r.precio_especial !== null && r.precio_especial !== undefined,
      })
    }

    const costo_envio = calcularCostoEnvioFake(direccion.region, totalUnidades)
    const total       = subtotal + costo_envio

    const { data: grupoActivo } = await supabase
      .from("grupos_envio")
      .select("fecha_despacho")
      .eq("estado", "abierto")
      .gte("fecha_despacho", ahora.split("T")[0])
      .order("fecha_despacho", { ascending: true })
      .limit(1)
      .maybeSingle()

    return {
      success: true,
      data: {
        id_grupo_envio: null,
        subtotal,
        costo_envio,
        total,
        fecha_despacho: grupoActivo?.fecha_despacho ?? null,
        items,
        envio:   null,
        valido:  errores.length === 0,
        errores,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface ReservaConProducto {
  id_reserva:    number
  id_producto:   number
  cantidad:      number
  precio_especial: number | null
  productos: {
    id_producto: number
    nombre:      string
    precio_venta: number
    stock_total: number
    estado:      string | null
  } | null
}
