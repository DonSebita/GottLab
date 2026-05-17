// @ts-nocheck
"use server";

import { createClient } from "../supabase/server";

const EXPIRACION_MINUTOS = 15;

async function getClienteIdOrThrow(): Promise<number> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("No autorizado — inicia sesion");

  const { data: cliente, error: clientError } = await supabase
    .from("clientes")
    .select("id_cliente")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (clientError || !cliente) throw new Error("No autorizado — solo clientes pueden usar el carrito");
  return (cliente as any).id_cliente as number;
}

async function limpiarReservasExpiradas(supabase: any) {
  const ahora = new Date();
  const tiempoExpiracion = new Date(ahora.getTime() - EXPIRACION_MINUTOS * 60000);
  await supabase.from("reservas").delete().lt("fecha_expiracion", tiempoExpiracion.toISOString());
}

export async function getCarrito() {
  const supabase = await createClient();
  const idCliente = await getClienteIdOrThrow();
  await limpiarReservasExpiradas(supabase);
  const { data, error } = await supabase
    .from("reservas")
    .select(`id_reserva, id_producto, cantidad, fecha_expiracion, precio_especial, origen, productos!fk_reservas_producto (nombre, nombre_cientifico, precio_venta, stock_total, imagenes_productos (url))`)
    .eq("id_cliente", idCliente)
    .gt("fecha_expiracion", new Date().toISOString());
  if (error) { console.error("Error obteniendo carrito:", error); return []; }
  return data || [];
}

// Single call that returns items + count — avoids duplicate auth + cleanup queries
export async function getCarritoCompleto() {
  const supabase = await createClient();
  const idCliente = await getClienteIdOrThrow();
  await limpiarReservasExpiradas(supabase);
  const { data, error } = await supabase
    .from("reservas")
    .select(`id_reserva, id_producto, cantidad, fecha_expiracion, precio_especial, origen, productos!fk_reservas_producto (nombre, nombre_cientifico, precio_venta, stock_total, imagenes_productos (url))`)
    .eq("id_cliente", idCliente)
    .gt("fecha_expiracion", new Date().toISOString());
  if (error) { console.error("Error obteniendo carrito:", error); return { items: [], contador: 0 }; }
  const items = data || [];
  const contador = items.reduce((sum: number, r: any) => sum + (r.cantidad || 0), 0);
  return { items, contador };
}
export async function agregarAlCarrito(idProducto: number, cantidad = 1) {
  const supabase = await createClient();
  const idCliente = await getClienteIdOrThrow();
  await limpiarReservasExpiradas(supabase);

  const { data: producto } = await supabase.from("productos").select("stock_total").eq("id_producto", idProducto).maybeSingle();
  if (!producto) return { success: false, error: "Producto no encontrado" };

  const { data: reservasActivas } = await supabase.from("reservas").select("cantidad").eq("id_producto", idProducto).gt("fecha_expiracion", new Date().toISOString());
  const stockReservado = reservasActivas?.reduce((sum: number, r: any) => sum + r.cantidad, 0) || 0;
  const stockDisponible = (producto as any).stock_total - stockReservado;

  if (cantidad > stockDisponible) return { success: false, error: `Solo hay ${stockDisponible} unidades disponibles` };

  const { data: reservaExistente, error: findError } = await supabase
    .from("reservas")
    .select("id_reserva, cantidad")
    .eq("id_cliente", idCliente)
    .eq("id_producto", idProducto)
    .gt("fecha_expiracion", new Date().toISOString())
    .maybeSingle();

  if (findError) return { success: false, error: "Error al verificar el carrito" };

  const fechaExpiracion = new Date(Date.now() + EXPIRACION_MINUTOS * 60000);

  if (reservaExistente) {
    const nuevaCantidad = reservaExistente.cantidad + cantidad;
    if (nuevaCantidad > stockDisponible) return { success: false, error: `Solo puedes agregar ${stockDisponible - reservaExistente.cantidad} unidades mas` };
    const { error } = await supabase.from("reservas").update({ cantidad: nuevaCantidad, fecha_expiracion: fechaExpiracion.toISOString() }).eq("id_reserva", reservaExistente.id_reserva);
    if (error) return { success: false, error: "Error al actualizar el carrito" };
    return { success: true, message: "Cantidad actualizada" };
  }

  const { error } = await supabase.from("reservas").insert({ id_cliente: idCliente, id_producto: idProducto, cantidad, fecha_expiracion: fechaExpiracion.toISOString() });
  if (error) return { success: false, error: "Error al agregar al carrito" };
  return { success: true, message: "Producto agregado al carrito" };
}

export async function actualizarCantidad(idReserva: number, nuevaCantidad: number) {
  const supabase = await createClient();
  await getClienteIdOrThrow(); // validates auth
  if (nuevaCantidad < 1) return eliminarDelCarrito(idReserva);

  const { data: reserva } = await supabase.from("reservas").select("id_producto, cantidad").eq("id_reserva", idReserva).maybeSingle();
  if (!reserva) return { success: false, error: "Reserva no encontrada" };

  const { data: producto } = await supabase.from("productos").select("stock_total").eq("id_producto", reserva.id_producto).maybeSingle();
  if (!producto) return { success: false, error: "Producto no encontrado" };

  const { data: otrasReservas } = await supabase.from("reservas").select("cantidad").eq("id_producto", reserva.id_producto).neq("id_reserva", idReserva).gt("fecha_expiracion", new Date().toISOString());
  const stockReservadoPorOtros = otrasReservas?.reduce((sum: number, r: any) => sum + r.cantidad, 0) || 0;
  const stockDisponible = (producto as any).stock_total - stockReservadoPorOtros;
  if (nuevaCantidad > stockDisponible) return { success: false, error: `Solo hay ${stockDisponible} unidades disponibles` };

  const fechaExpiracion = new Date(Date.now() + EXPIRACION_MINUTOS * 60000);
  const { error } = await supabase.from("reservas").update({ cantidad: nuevaCantidad, fecha_expiracion: fechaExpiracion.toISOString() }).eq("id_reserva", idReserva);
  if (error) return { success: false, error: "Error al actualizar cantidad" };
  return { success: true, message: "Cantidad actualizada" };
}

export async function eliminarDelCarrito(idReserva: number) {
  const supabase = await createClient();
  await getClienteIdOrThrow();
  const { error } = await supabase.from("reservas").delete().eq("id_reserva", idReserva);
  if (error) return { success: false, error: "Error al eliminar del carrito" };
  return { success: true, message: "Producto eliminado del carrito" };
}

export async function vaciarCarrito() {
  const supabase = await createClient();
  const idCliente = await getClienteIdOrThrow();
  const { error } = await supabase.from("reservas").delete().eq("id_cliente", idCliente);
  if (error) return { success: false, error: "Error al vaciar el carrito" };
  return { success: true, message: "Carrito vaciado" };
}

export async function getContadorCarrito() {
  const supabase = await createClient();
  const idCliente = await getClienteIdOrThrow();
  await limpiarReservasExpiradas(supabase);
  const { data, error } = await supabase.from("reservas").select("cantidad").eq("id_cliente", idCliente).gt("fecha_expiracion", new Date().toISOString());
  if (error) return 0;
  return data?.reduce((sum: number, r: any) => sum + r.cantidad, 0) || 0;
}

export async function validarCarritoParaCheckout() {
  const supabase = await createClient();
  const idCliente = await getClienteIdOrThrow();
  await limpiarReservasExpiradas(supabase);
  const { data: reservas, error } = await supabase
    .from("reservas")
    .select(`id_reserva, id_producto, cantidad, fecha_expiracion, productos!fk_reservas_producto (nombre, precio_venta, stock_total, estado)`)
    .eq("id_cliente", idCliente)
    .gt("fecha_expiracion", new Date().toISOString());
  if (error) return { valido: false, errores: ["Error al validar el carrito"], items: [] };
  if (!reservas || reservas.length === 0) return { valido: false, errores: ["El carrito esta vacio"], items: [] };

  const errores: string[] = [];
  const itemsValidados: any[] = [];
  for (const reserva of reservas as any[]) {
    const producto = reserva.productos as any;
    if (!producto) { errores.push(`Producto ${reserva.id_producto} no encontrado`); continue; }
    if ((producto as any).estado !== 'activo') { errores.push(`${producto.nombre} ya no esta disponible`); continue; }
    const { data: otrasReservas } = await supabase.from("reservas").select("cantidad").eq("id_producto", reserva.id_producto).neq("id_reserva", reserva.id_reserva).gt("fecha_expiracion", new Date().toISOString());
    const stockReservadoPorOtros = otrasReservas?.reduce((sum: number, r: any) => sum + r.cantidad, 0) || 0;
    const stockDisponible = (producto as any).stock_total - stockReservadoPorOtros;
    if (reserva.cantidad > stockDisponible) {
      if (stockDisponible > 0) errores.push(`${producto.nombre}: solo quedan ${stockDisponible} unidades disponibles`);
      else errores.push(`${producto.nombre} esta agotado`);
      continue;
    }
    itemsValidados.push({ id_reserva: reserva.id_reserva, id_producto: reserva.id_producto, nombre: producto.nombre, cantidad: reserva.cantidad, precio_unitario: producto.precio_venta, subtotal: reserva.cantidad * producto.precio_venta });
  }
  const total = itemsValidados.reduce((sum: number, item: any) => sum + item.subtotal, 0);
  return { valido: errores.length === 0, errores, items: itemsValidados, total, cantidadItems: itemsValidados.reduce((sum: number, item: any) => sum + item.cantidad, 0) };
}

// ─── Admin: buscar clientes ──────────────────────────────────────────────────
export async function getClientes(busqueda: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  // Verify admin role
  const adminCheck = user.user_metadata?.role || user.app_metadata?.role;
  if (adminCheck !== 'admin') throw new Error("Solo administradores");

  const { data, error } = await supabase
    .from("clientes")
    .select("id_cliente, nombre, apellido, email, telefono")
    .or(`nombre.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
    .limit(20);

  if (error) { console.error("Error buscando clientes:", error); return []; }
  // Also get emails from auth.users via clientes relationship
  return data || [];
}

// ─── Admin: agregar al carrito de cualquier cliente ────────────────────────
export async function adminAgregarAlCarrito(
  idCliente: number,
  idProducto: number,
  cantidad: number,
  precioEspecial: number | null,
  origen: 'web' | 'live' = 'live',
  expiracionMinutos: number = 60
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const adminCheck = user.user_metadata?.role || user.app_metadata?.role;
  if (adminCheck !== 'admin') return { success: false, error: "Solo administradores" };

  // Verify cliente exists
  const { data: cliente } = await supabase.from("clientes").select("id_cliente").eq("id_cliente", idCliente).maybeSingle();
  if (!cliente) return { success: false, error: "Cliente no encontrado" };

  // Verify producto exists and is active
  const { data: producto } = await supabase.from("productos").select("stock_total, estado").eq("id_producto", idProducto).maybeSingle();
  if (!producto) return { success: false, error: "Producto no encontrado" };
  if (producto.estado !== 'activo') return { success: false, error: "Producto no disponible" };

  // Check stock (reserved + existing)
  const { data: reservasActivas } = await supabase.from("reservas").select("cantidad").eq("id_producto", idProducto).gt("fecha_expiracion", new Date().toISOString());
  const stockReservado = reservasActivas?.reduce((sum: number, r: any) => sum + r.cantidad, 0) || 0;
  const stockDisponible = producto.stock_total - stockReservado;

  if (cantidad > stockDisponible) {
    return { success: false, error: `Solo hay ${stockDisponible} unidades disponibles` };
  }

  const fechaExpiracion = new Date(Date.now() + expiracionMinutos * 60000);

  // Check if client already has this product reserved
  const { data: existente } = await supabase
    .from("reservas")
    .select("id_reserva, cantidad")
    .eq("id_cliente", idCliente)
    .eq("id_producto", idProducto)
    .gt("fecha_expiracion", new Date().toISOString())
    .maybeSingle();

  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
    const { error } = await supabase
      .from("reservas")
      .update({ cantidad: nuevaCantidad, fecha_expiracion: fechaExpiracion.toISOString(), precio_especial: precioEspecial, origen })
      .eq("id_reserva", existente.id_reserva);
    if (error) return { success: false, error: "Error al actualizar reserva" };
    return { success: true, message: "Cantidad actualizada en carrito del cliente" };
  }

  const { error } = await supabase
    .from("reservas")
    .insert({ id_cliente: idCliente, id_producto: idProducto, cantidad, fecha_expiracion: fechaExpiracion.toISOString(), precio_especial: precioEspecial, origen });

  if (error) return { success: false, error: "Error al agregar al carrito" };
  return { success: true, message: "Producto agregado al carrito del cliente" };
}

// ─── Admin: extender expiración de una reserva ──────────────────────────────
export async function extenderExpiracion(idReserva: number, minutosExtra: number = 30) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const { data: reserva } = await supabase.from("reservas").select("fecha_expiracion").eq("id_reserva", idReserva).maybeSingle();
  if (!reserva) return { success: false, error: "Reserva no encontrada" };

  const nuevaExpiracion = new Date(new Date(reserva.fecha_expiracion).getTime() + minutosExtra * 60000);
  const { error } = await supabase
    .from("reservas")
    .update({ fecha_expiracion: nuevaExpiracion.toISOString() })
    .eq("id_reserva", idReserva);

  if (error) return { success: false, error: "Error al extender expiracion" };
  return { success: true, message: `Expiracion extendida ${minutosExtra} minutos` };
}

// ─── Obtener tiempo restante de una reserva ──────────────────────────────────
export async function getTiempoRestante(idReserva: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("reservas").select("fecha_expiracion").eq("id_reserva", idReserva).maybeSingle();
  if (!data) return null;
  const ahora = Date.now();
  const exp = new Date(data.fecha_expiracion).getTime();
  return Math.max(0, Math.floor((exp - ahora) / 1000)); // seconds remaining
}
// ─── Admin: obtener carrito de un cliente especifico ────────────────────────
export async function adminGetCarrito(idCliente: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const adminCheck = user.user_metadata?.role || user.app_metadata?.role;
  if (adminCheck !== 'admin') throw new Error("Solo administradores");

  // Limpiar expiradas primero
  await limpiarReservasExpiradas(supabase);

  const { data, error } = await supabase
    .from("reservas")
    .select(`id_reserva, id_producto, cantidad, fecha_expiracion, precio_especial, origen, productos!fk_reservas_producto (nombre, nombre_cientifico, precio_venta, stock_total, imagenes_productos (url))`)
    .eq("id_cliente", idCliente)
    .gt("fecha_expiracion", new Date().toISOString())
    .order("fecha_expiracion", { ascending: true });

  if (error) { console.error("Error obteniendo carrito del cliente:", error); return []; }
  return data || [];
}

// ─── Admin: editar una reserva existente ────────────────────────────────────
export async function adminEditarReserva(
  idReserva: number,
  updates: { cantidad?: number; precio_especial?: number | null; expiracion_minutos?: number }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const adminCheck = user.user_metadata?.role || user.app_metadata?.role;
  if (adminCheck !== 'admin') return { success: false, error: "Solo administradores" };

  const updateData: Record<string, any> = {};

  if (updates.cantidad !== undefined) {
    if (updates.cantidad < 1) return { success: false, error: "La cantidad debe ser al menos 1" };
    updateData.cantidad = updates.cantidad;
  }

  if (updates.precio_especial !== undefined) {
    updateData.precio_especial = updates.precio_especial;
  }

  if (updates.expiracion_minutos !== undefined) {
    const { data: reserva } = await supabase.from("reservas").select("fecha_expiracion").eq("id_reserva", idReserva).maybeSingle();
    if (!reserva) return { success: false, error: "Reserva no encontrada" };
    // Extender desde la fecha de expiracion actual (no desde ahora)
    const expActual = new Date(reserva.fecha_expiracion).getTime();
    updateData.fecha_expiracion = new Date(expActual + updates.expiracion_minutos * 60000).toISOString();
  }

  if (Object.keys(updateData).length === 0) return { success: false, error: "Sin cambios" };

  const { error } = await supabase
    .from("reservas")
    .update(updateData)
    .eq("id_reserva", idReserva);

  if (error) return { success: false, error: "Error al editar reserva" };
  return { success: true, message: "Reserva actualizada" };
}

// ─── Admin: eliminar una reserva ────────────────────────────────────────────
export async function adminEliminarReserva(idReserva: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  const adminCheck = user.user_metadata?.role || user.app_metadata?.role;
  if (adminCheck !== 'admin') return { success: false, error: "Solo administradores" };

  const { error } = await supabase
    .from("reservas")
    .delete()
    .eq("id_reserva", idReserva);

  if (error) return { success: false, error: "Error al eliminar reserva" };
  return { success: true, message: "Reserva eliminada" };
}
