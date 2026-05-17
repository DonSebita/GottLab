"use server"

import { createClient } from "@/lib/supabase/server"
import { getClienteIdOrThrow } from "@/lib/helpers/auth"
import {
  validarCrearDireccion,
  validarActualizarDireccion,
  erroresAMensaje,
} from "@/lib/validations/pedidos"
import type { ActionResult, CrearDireccionPayload, ActualizarDireccionPayload, Direccion } from "@/types/pedidos"

const DIRECCION_SELECT = `
  id_direccion, id_cliente, alias, tipo,
  direccion, ciudad, comuna, region, pais, codigo_postal, referencias, sucursal
`

export async function getDireccionesByCliente(): Promise<ActionResult<Direccion[]>> {
  try {
    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const { data, error } = await supabase
      .from("direcciones")
      .select(DIRECCION_SELECT)
      .eq("id_cliente", idCliente)
      .order("id_direccion", { ascending: true })

    if (error) return { success: false, error: "Error al obtener direcciones" }
    return { success: true, data: data ?? [] }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getDireccionById(idDireccion: number): Promise<ActionResult<Direccion>> {
  try {
    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const { data, error } = await supabase
      .from("direcciones")
      .select(DIRECCION_SELECT)
      .eq("id_direccion", idDireccion)
      .eq("id_cliente", idCliente)
      .maybeSingle()

    if (error) return { success: false, error: "Error al obtener dirección" }
    if (!data) return { success: false, error: "Dirección no encontrada" }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function crearDireccion(payload: CrearDireccionPayload): Promise<ActionResult<Direccion>> {
  try {
    const errores = validarCrearDireccion(payload)
    if (errores.length > 0) return { success: false, error: erroresAMensaje(errores) }

    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const { data, error } = await supabase
      .from("direcciones")
      .insert({
        id_cliente:    idCliente,
        alias:         payload.alias?.trim() ?? null,
        tipo:          payload.tipo ?? "casa",
        direccion:     payload.direccion.trim(),
        ciudad:        payload.ciudad?.trim() ?? null,
        comuna:        payload.comuna.trim(),
        region:        payload.region.trim(),
        pais:          payload.pais?.trim() ?? "Chile",
        codigo_postal: payload.codigo_postal?.trim() ?? null,
      })
      .select(DIRECCION_SELECT)
      .single()

    if (error) return { success: false, error: "Error al crear dirección" }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function actualizarDireccion(payload: ActualizarDireccionPayload): Promise<ActionResult<Direccion>> {
  try {
    const errores = validarActualizarDireccion(payload)
    if (errores.length > 0) return { success: false, error: erroresAMensaje(errores) }

    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const { data: existente } = await supabase
      .from("direcciones")
      .select("id_direccion")
      .eq("id_direccion", payload.id_direccion)
      .eq("id_cliente", idCliente)
      .maybeSingle()

    if (!existente) return { success: false, error: "Dirección no encontrada" }

    const updates: import("@/types/supabase").TablesUpdate<"direcciones"> = {
      ...(payload.alias      !== undefined && { alias:         payload.alias?.trim() ?? null }),
      ...(payload.tipo       !== undefined && { tipo:          payload.tipo }),
      ...(payload.direccion  !== undefined && { direccion:     payload.direccion.trim() }),
      ...(payload.ciudad     !== undefined && { ciudad:        payload.ciudad?.trim() ?? null }),
      ...(payload.comuna     !== undefined && { comuna:        payload.comuna.trim() }),
      ...(payload.region     !== undefined && { region:        payload.region.trim() }),
      ...(payload.pais       !== undefined && { pais:          payload.pais?.trim() ?? null }),
      ...(payload.codigo_postal !== undefined && { codigo_postal: payload.codigo_postal?.trim() ?? null }),
    }

    const { data, error } = await supabase
      .from("direcciones")
      .update(updates)
      .eq("id_direccion", payload.id_direccion)
      .select(DIRECCION_SELECT)
      .single()

    if (error) return { success: false, error: "Error al actualizar dirección" }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function eliminarDireccion(idDireccion: number): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const idCliente = await getClienteIdOrThrow()

    const { data: existente } = await supabase
      .from("direcciones")
      .select("id_direccion")
      .eq("id_direccion", idDireccion)
      .eq("id_cliente", idCliente)
      .maybeSingle()

    if (!existente) return { success: false, error: "Dirección no encontrada" }

    const { error } = await supabase
      .from("direcciones")
      .delete()
      .eq("id_direccion", idDireccion)

    if (error) return { success: false, error: "Error al eliminar dirección" }
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
