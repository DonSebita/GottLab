import type { Tables } from "@/types/supabase"

// ─── Base DB row types ────────────────────────────────────────────────────────
export type Pedido       = Tables<"pedidos">
export type DetallePedido = Tables<"detallepedido">
export type GrupoEnvio   = Tables<"grupos_envio">
export type Envio        = Tables<"envios">
export type Direccion    = Tables<"direcciones">

// ─── Enums ────────────────────────────────────────────────────────────────────
export type EstadoPedido =
  | "pendiente"
  | "confirmado"
  | "en_preparacion"
  | "despachado"
  | "entregado"
  | "cancelado"

export type EstadoGrupoEnvio =
  | "abierto"
  | "cerrado"
  | "en_preparacion"
  | "despachado"
  | "finalizado"

export type EstadoEnvio =
  | "pendiente"   // creado al hacer el pedido, esperando despacho del martes
  | "preparando"  // empaquetando en bodega
  | "despachado"  // entregado a Correos de Chile
  | "en_transito" // en ruta en red courier
  | "entregado"

export type TipoDireccion = "casa" | "trabajo" | "otro"

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "en_preparacion",
  "despachado",
  "entregado",
  "cancelado",
]

export const ESTADOS_GRUPO: EstadoGrupoEnvio[] = [
  "abierto",
  "cerrado",
  "en_preparacion",
  "despachado",
  "finalizado",
]

export const ESTADOS_ENVIO: EstadoEnvio[] = [
  "pendiente",
  "preparando",
  "despachado",
  "en_transito",
  "entregado",
]

export const COURIER_DEFAULT = "Correos de Chile" as const

// ─── Transiciones válidas de estado ──────────────────────────────────────────
export const TRANSICIONES_PEDIDO: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente:       ["confirmado", "cancelado"],
  confirmado:      ["en_preparacion", "cancelado"],
  en_preparacion:  ["despachado", "cancelado"],
  despachado:      ["entregado"],
  entregado:       [],
  cancelado:       [],
}

export const TRANSICIONES_GRUPO: Record<EstadoGrupoEnvio, EstadoGrupoEnvio[]> = {
  abierto:         ["cerrado"],
  cerrado:         ["en_preparacion", "abierto"],
  en_preparacion:  ["despachado"],
  despachado:      ["finalizado"],
  finalizado:      [],
}

// ─── Tipos con joins (lo que devuelven las queries) ───────────────────────────
export interface DetallePedidoConProducto extends DetallePedido {
  productos: {
    nombre: string
    nombre_cientifico: string | null
    imagenes_productos: { url: string }[]
  } | null
}

/** Un envio tal como llega anidado bajo grupos_envio en la query. */
export interface EnvioResumen {
  id_envio:           number
  estado:             string | null
  codigo_seguimiento: string | null
  courier:            string | null
  fecha_entrega:      string | null
  dias_estimados:     number | null
}

/** Grupo de envío con sus envios anidados. */
export interface GrupoEnvioResumen {
  id_grupo_envio:   number
  codigo:           string | null
  fecha_despacho:   string | null
  fecha_cierre:     string | null
  estado:           string
  courier:          string | null
  tracking_general: string | null
  envios:           EnvioResumen[]
}

export interface PedidoResumen extends Pedido {
  detallepedido: DetallePedido[]
  grupos_envio:  GrupoEnvioResumen | null
}

export interface PedidoCompleto extends Pedido {
  detallepedido: DetallePedidoConProducto[]
  clientes: {
    nombre: string | null
    apellido: string | null
    email: string | null
    telefono: string | null
  } | null
  grupos_envio:  GrupoEnvioResumen | null
  direcciones:   Direccion | null
}

export interface GrupoEnvioConConteo extends GrupoEnvio {
  pedido_count: number
  total_items:  number
}

export interface GrupoEnvioCompleto extends GrupoEnvio {
  pedidos: PedidoResumen[]
}

/** Snapshot de historial de envío (para uso futuro, no almacenado en DB actualmente). */
export interface EventoHistorialEnvio {
  estado:      EstadoEnvio
  descripcion: string
  timestamp:   string
  ciudad?:     string
}

// ─── Payloads de entrada ──────────────────────────────────────────────────────
export interface ItemPedidoPayload {
  id_producto:     number
  nombre:          string
  cantidad:        number
  precio_unitario: number
}

export interface CrearPedidoPayload {
  id_cliente:     number
  id_direccion:   number
  items:          ItemPedidoPayload[]
  observaciones?: string
}

export interface CrearGrupoEnvioPayload {
  codigo?:        string
  fecha_despacho: string
}

export interface CrearDireccionPayload {
  alias?:        string
  tipo?:         TipoDireccion
  direccion:     string
  ciudad?:       string
  comuna:        string
  region:        string
  pais?:         string
  codigo_postal?:string
  referencias?:  string
  sucursal?:     string
}

export interface ActualizarDireccionPayload extends Partial<CrearDireccionPayload> {
  id_direccion: number
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface DireccionSnapshot {
  alias:         string | null
  tipo:          string | null
  direccion:     string | null
  ciudad:        string | null
  comuna:        string
  region:        string
  pais:          string | null
  codigo_postal: string | null
  referencias?:  string | null
  sucursal?:     string | null
}

export interface ItemCheckout {
  id_producto:     number
  nombre:          string
  cantidad:        number
  precio_unitario: number
  subtotal:        number
  precio_especial: boolean
}

export interface CheckoutPayload {
  id_direccion:  number
  observaciones?: string
}

export interface InfoEnvioCheckout {
  id_envio:           number
  codigo_seguimiento: string | null
  courier:            string | null
  estado:             EstadoEnvio
  fecha_entrega:      string | null
  dias_estimados:     number | null
}

export interface CheckoutResult {
  id_pedido:      number
  id_grupo_envio: number | null
  subtotal:       number
  costo_envio:    number
  total:          number
  fecha_despacho: string | null
  items:          ItemCheckout[]
  envio:          InfoEnvioCheckout | null
}

// ─── Query params ─────────────────────────────────────────────────────────────
export interface GetPedidosParams {
  pagina?:         number
  porPagina?:      number
  estado?:         EstadoPedido | ""
  estado_pago?:    string
  id_grupo_envio?: number | null
  sin_grupo?:      boolean
}

export interface GetGruposParams {
  pagina?: number
  porPagina?: number
  estado?: EstadoGrupoEnvio | ""
}

// ─── Result wrappers ──────────────────────────────────────────────────────────
export interface ActionResult<T = undefined> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  pagina: number
  porPagina: number
}
