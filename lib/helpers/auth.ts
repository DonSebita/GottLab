import { createClient } from "@/lib/supabase/server"

export async function getClienteIdOrThrow(): Promise<number> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("No autorizado — inicia sesión")

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id_cliente")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (!cliente) throw new Error("No autorizado — perfil de cliente no encontrado")
  return (cliente as { id_cliente: number }).id_cliente
}

export async function requireAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("No autorizado")
  const role = user.user_metadata?.role ?? user.app_metadata?.role
  if (role !== "admin") throw new Error("Solo administradores pueden realizar esta acción")
}

export async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getRoleOrThrow(): Promise<string> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("No autorizado")
  return user.user_metadata?.role ?? user.app_metadata?.role ?? "cliente"
}
