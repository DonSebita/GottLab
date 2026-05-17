/**
 * lib/services/grupo_envio_resolver.ts
 *
 * Servicio interno de servidor (sin "use server").
 * Solo importar desde Server Actions o server-only modules.
 *
 * Responsabilidad única:
 *   Dado el momento actual, devolver el grupo_envio "abierto" vigente
 *   o crear uno nuevo para el próximo martes disponible.
 *
 * Usa createAdminClient() (service_role) para los writes, porque:
 *   - RLS solo permite a clientes ver grupos de sus propios pedidos
 *   - La creación de grupos es una operación de sistema, no de usuario
 */

import { createAdminClient } from "@/lib/supabase/server"
import {
  calcularProximoMartes,
  fechaToISODate,
  generarNombreGrupo,
} from "@/lib/helpers/fechas"
import type { GrupoEnvio } from "@/types/pedidos"

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface ResolverResult {
  grupo: GrupoEnvio
  fueCreadoAhora: boolean
}

// ─── API pública del módulo ───────────────────────────────────────────────────

/**
 * Devuelve el grupo_envio abierto vigente o crea uno para el próximo martes.
 * Antes de buscar, cierra automáticamente grupos "abiertos" con fecha vencida.
 *
 * Llamar desde crearPedido() u otros flujos de checkout.
 */
export async function resolverGrupoEnvio(): Promise<ResolverResult> {
  const supabase = await createAdminClient()
  const hoy = fechaToISODate(new Date())

  await _cerrarGruposVencidos(supabase, hoy)

  const existente = await _buscarGrupoVigente(supabase, hoy)
  if (existente) return { grupo: existente, fueCreadoAhora: false }

  const nuevo = await _crearGrupoParaSiguienteMartes(supabase)
  return { grupo: nuevo, fueCreadoAhora: true }
}

/**
 * Devuelve el grupo abierto vigente sin crear uno nuevo.
 * Devuelve null si no hay ninguno.
 * Llamar cuando solo se necesita mostrar info de próximo despacho.
 */
export async function obtenerGrupoAbierto(): Promise<GrupoEnvio | null> {
  const supabase = await createAdminClient()
  const hoy = fechaToISODate(new Date())
  return _buscarGrupoVigente(supabase, hoy)
}

// ─── Internos ─────────────────────────────────────────────────────────────────

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

const GRUPO_SELECT =
  "id_grupo_envio, codigo, fecha_despacho, fecha_cierre, estado, courier, tracking_general, costo_total_envio, tipo_despacho, id_cliente, created_at"

/**
 * Busca el grupo abierto más próximo cuya fecha_despacho >= hoy.
 * Ignora grupos stale (fecha pasada) que deberían haberse cerrado.
 */
async function _buscarGrupoVigente(
  supabase: AdminClient,
  hoy: string
): Promise<GrupoEnvio | null> {
  const { data, error } = await supabase
    .from("grupos_envio")
    .select(GRUPO_SELECT)
    .eq("estado", "abierto")
    .gte("fecha_despacho", hoy)
    .order("fecha_despacho", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data
}

/**
 * Cierra automáticamente grupos "abiertos" cuya fecha_despacho ya pasó.
 * Los pone en 'cerrado' (no en 'finalizado') para que el admin los vea
 * como grupos pendientes de gestionar en el panel.
 */
async function _cerrarGruposVencidos(
  supabase: AdminClient,
  hoy: string
): Promise<void> {
  await supabase
    .from("grupos_envio")
    .update({ estado: "cerrado" })
    .eq("estado", "abierto")
    .lt("fecha_despacho", hoy)
}

/**
 * Crea un nuevo grupo para el primer martes futuro disponible.
 * "Disponible" = sin grupo activo (abierto | cerrado | en_preparacion) en esa fecha.
 */
async function _crearGrupoParaSiguienteMartes(
  supabase: AdminClient
): Promise<GrupoEnvio> {
  const fechaDespacho = await _resolverFechaLibre(supabase)

  const { data, error } = await supabase
    .from("grupos_envio")
    .insert({
      codigo:         generarNombreGrupo(fechaDespacho),
      fecha_despacho: fechaDespacho,
      estado:         "abierto",
    })
    .select(GRUPO_SELECT)
    .single()

  if (error || !data) {
    // Race condition: otro proceso lo creó en paralelo → buscar el que quedó
    const recuperado = await supabase
      .from("grupos_envio")
      .select(GRUPO_SELECT)
      .eq("estado", "abierto")
      .gte("fecha_despacho", fechaToISODate(new Date()))
      .order("fecha_despacho", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (recuperado.data) return recuperado.data
    throw new Error(`No se pudo crear el grupo de envío: ${error?.message ?? "error desconocido"}`)
  }

  return data
}

/**
 * Encuentra el primer martes futuro sin grupo activo.
 * Salta fechas que ya tienen grupos en estado abierto | cerrado | en_preparacion.
 * Permite reutilizar fechas de grupos "despachados" o "finalizados"
 * si el negocio decidiera hacer dos despachos en el mismo martes (poco probable).
 */
async function _resolverFechaLibre(supabase: AdminClient): Promise<string> {
  let candidata = fechaToISODate(calcularProximoMartes())

  for (let semana = 0; semana < 8; semana++) {
    const { data } = await supabase
      .from("grupos_envio")
      .select("id_grupo_envio")
      .eq("fecha_despacho", candidata)
      .in("estado", ["abierto", "cerrado", "en_preparacion"])
      .maybeSingle()

    if (!data) return candidata

    candidata = _avanzarSemana(candidata)
  }

  // Fallback extremo: devolver la candidata actual aunque ya tenga grupo
  return candidata
}

function _avanzarSemana(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const siguiente = new Date(y, m - 1, d + 7)
  return fechaToISODate(siguiente)
}
