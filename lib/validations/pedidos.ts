import type {
  CrearPedidoPayload,
  CrearGrupoEnvioPayload,
  CrearDireccionPayload,
  ActualizarDireccionPayload,
  EstadoPedido,
  EstadoGrupoEnvio,
} from "@/types/pedidos"
import { ESTADOS_PEDIDO, ESTADOS_GRUPO } from "@/types/pedidos"
import { esDiaMartes } from "@/lib/helpers/fechas"

export interface ErrorValidacion {
  campo: string
  mensaje: string
}

// ─── Helpers internos ─────────────────────────────────────────────────────────
function esString(v: unknown): v is string {
  return typeof v === "string"
}

function cadenaValida(v: unknown, minLen = 1): boolean {
  return esString(v) && v.trim().length >= minLen
}

function esEnteroPositivo(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v > 0
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────
export function validarCrearPedido(data: unknown): ErrorValidacion[] {
  const errores: ErrorValidacion[] = []
  if (!data || typeof data !== "object") {
    return [{ campo: "root", mensaje: "Datos inválidos" }]
  }
  const d = data as Partial<CrearPedidoPayload>

  if (!esEnteroPositivo(d.id_cliente as unknown))
    errores.push({ campo: "id_cliente", mensaje: "Cliente inválido" })

  if (!esEnteroPositivo(d.id_direccion as unknown))
    errores.push({ campo: "id_direccion", mensaje: "Dirección de envío requerida" })

  if (!Array.isArray(d.items) || d.items.length === 0) {
    errores.push({ campo: "items", mensaje: "El pedido debe tener al menos un ítem" })
  } else {
    d.items.forEach((item, i) => {
      if (!esEnteroPositivo(item.id_producto))
        errores.push({ campo: `items[${i}].id_producto`, mensaje: "Producto inválido" })
      if (!cadenaValida(item.nombre))
        errores.push({ campo: `items[${i}].nombre`, mensaje: "Nombre del producto requerido" })
      if (!esEnteroPositivo(item.cantidad))
        errores.push({ campo: `items[${i}].cantidad`, mensaje: "Cantidad debe ser mayor a 0" })
      if (typeof item.precio_unitario !== "number" || item.precio_unitario <= 0)
        errores.push({ campo: `items[${i}].precio_unitario`, mensaje: "Precio debe ser mayor a 0" })
    })
  }

  if (d.observaciones !== undefined && d.observaciones !== null && !esString(d.observaciones))
    errores.push({ campo: "observaciones", mensaje: "Observaciones inválidas" })

  return errores
}

export function validarTransicionPedido(
  estadoActual: EstadoPedido,
  estadoNuevo: EstadoPedido
): ErrorValidacion[] {
  if (!ESTADOS_PEDIDO.includes(estadoNuevo))
    return [{ campo: "estado", mensaje: `Estado inválido: ${estadoNuevo}` }]

  const transicionesValidas: Record<EstadoPedido, EstadoPedido[]> = {
    pendiente:      ["confirmado", "cancelado"],
    confirmado:     ["en_preparacion", "cancelado"],
    en_preparacion: ["despachado", "cancelado"],
    despachado:     ["entregado"],
    entregado:      [],
    cancelado:      [],
  }

  if (!transicionesValidas[estadoActual].includes(estadoNuevo))
    return [{
      campo: "estado",
      mensaje: `No se puede pasar de '${estadoActual}' a '${estadoNuevo}'`,
    }]

  return []
}

// ─── Grupos de envío ──────────────────────────────────────────────────────────
export function validarCrearGrupo(data: unknown): ErrorValidacion[] {
  const errores: ErrorValidacion[] = []
  if (!data || typeof data !== "object") {
    return [{ campo: "root", mensaje: "Datos inválidos" }]
  }
  const d = data as Partial<CrearGrupoEnvioPayload>

  if (!cadenaValida(d.fecha_despacho)) {
    errores.push({ campo: "fecha_despacho", mensaje: "Fecha de despacho requerida (YYYY-MM-DD)" })
  } else if (!esDiaMartes(d.fecha_despacho!)) {
    errores.push({ campo: "fecha_despacho", mensaje: "La fecha de despacho debe ser un martes" })
  } else {
    const fecha = new Date(`${d.fecha_despacho}T12:00:00`)
    if (fecha <= new Date())
      errores.push({ campo: "fecha_despacho", mensaje: "La fecha de despacho debe ser futura" })
  }

  return errores
}

export function validarTransicionGrupo(
  estadoActual: EstadoGrupoEnvio,
  estadoNuevo: EstadoGrupoEnvio
): ErrorValidacion[] {
  if (!ESTADOS_GRUPO.includes(estadoNuevo))
    return [{ campo: "estado", mensaje: `Estado inválido: ${estadoNuevo}` }]

  const transicionesValidas: Record<EstadoGrupoEnvio, EstadoGrupoEnvio[]> = {
    abierto:        ["cerrado"],
    cerrado:        ["en_preparacion", "abierto"],
    en_preparacion: ["despachado"],
    despachado:     ["finalizado"],
    finalizado:     [],
  }

  if (!transicionesValidas[estadoActual].includes(estadoNuevo))
    return [{
      campo: "estado",
      mensaje: `No se puede pasar de '${estadoActual}' a '${estadoNuevo}'`,
    }]

  return []
}

// ─── Direcciones ──────────────────────────────────────────────────────────────
export function validarCrearDireccion(data: unknown): ErrorValidacion[] {
  const errores: ErrorValidacion[] = []
  if (!data || typeof data !== "object") {
    return [{ campo: "root", mensaje: "Datos inválidos" }]
  }
  const d = data as Partial<CrearDireccionPayload>

  if (!cadenaValida(d.direccion, 5))
    errores.push({ campo: "direccion", mensaje: "Dirección debe tener al menos 5 caracteres" })

  if (!cadenaValida(d.comuna, 2))
    errores.push({ campo: "comuna", mensaje: "Comuna es requerida" })

  if (!cadenaValida(d.region, 2))
    errores.push({ campo: "region", mensaje: "Región es requerida" })

  if (d.tipo !== undefined && !["casa", "trabajo", "otro"].includes(d.tipo!))
    errores.push({ campo: "tipo", mensaje: "Tipo debe ser 'casa', 'trabajo' u 'otro'" })

  return errores
}

export function validarActualizarDireccion(data: unknown): ErrorValidacion[] {
  const errores: ErrorValidacion[] = []
  if (!data || typeof data !== "object") {
    return [{ campo: "root", mensaje: "Datos inválidos" }]
  }
  const d = data as Partial<ActualizarDireccionPayload>

  if (!esEnteroPositivo(d.id_direccion as unknown))
    errores.push({ campo: "id_direccion", mensaje: "ID de dirección inválido" })

  if (d.direccion !== undefined && !cadenaValida(d.direccion, 5))
    errores.push({ campo: "direccion", mensaje: "Dirección debe tener al menos 5 caracteres" })

  if (d.comuna !== undefined && !cadenaValida(d.comuna, 2))
    errores.push({ campo: "comuna", mensaje: "Comuna inválida" })

  if (d.region !== undefined && !cadenaValida(d.region, 2))
    errores.push({ campo: "region", mensaje: "Región inválida" })

  if (d.tipo !== undefined && !["casa", "trabajo", "otro"].includes(d.tipo!))
    errores.push({ campo: "tipo", mensaje: "Tipo debe ser 'casa', 'trabajo' u 'otro'" })

  return errores
}

// ─── Checkout ─────────────────────────────────────────────────────────────────
export function validarCheckoutPayload(data: unknown): ErrorValidacion[] {
  const errores: ErrorValidacion[] = []
  if (!data || typeof data !== "object") {
    return [{ campo: "root", mensaje: "Datos de checkout inválidos" }]
  }
  const d = data as Record<string, unknown>

  if (!esEnteroPositivo(d.id_direccion))
    errores.push({ campo: "id_direccion", mensaje: "Debes seleccionar una dirección de envío" })

  return errores
}

// ─── Utilidad: errores → mensaje único ───────────────────────────────────────
export function erroresAMensaje(errores: ErrorValidacion[]): string {
  return errores.map(e => e.mensaje).join(". ")
}
