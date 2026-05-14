'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export interface ClienteProfile {
  id_cliente: number; nombre: string | null; apellido: string | null
  email: string | null; telefono: string | null; rut: string | null; role: 'cliente'
}

export interface EmpleadoProfile {
  id_empleado: number; nombre: string | null; apellido: string | null
  email: string | null; telefono: string | null; rut: string | null
  cargo: string | null; estado: string | null; role: 'admin' | 'empleado'
}

export type AuthProfile = ClienteProfile | EmpleadoProfile

interface AuthContextType {
  user: User | null; session: Session | null; profile: AuthProfile | null; loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (data: { email: string; password: string; nombre: string; apellido: string; rut?: string; telefono?: string }) => Promise<{ error: string | null; success: boolean }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  isAdmin: boolean; isEmpleado: boolean; isCliente: boolean
  perfilId: number | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: cliente } = await supabase.from('clientes')
      .select('id_cliente, nombre, apellido, email, telefono, rut')
      .eq('auth_id', userId).maybeSingle()
    if (cliente) return { ...cliente, role: 'cliente' as const } as ClienteProfile

    const { data: empleado } = await supabase.from('empleados')
      .select('id_empleado, nombre, apellido, email, telefono, rut, cargo, estado')
      .eq('auth_id', userId).maybeSingle()
    if (empleado) {
      const role = empleado.cargo?.toLowerCase() === 'admin' ? 'admin' as const : 'empleado' as const
      return { ...empleado, role } as EmpleadoProfile
    }
    return null
  }, [supabase])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!mounted) return
      if (s?.user) { setUser(s.user); setSession(s); setProfile(await fetchProfile(s.user.id)) }
      setLoading(false)
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, s) => {
      if (!mounted) return
      if (s?.user) { setUser(s.user); setSession(s); setProfile(await fetchProfile(s.user.id)) }
      else { setUser(null); setSession(null); setProfile(null) }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [supabase, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (data: { email: string; password: string; nombre: string; apellido: string; rut?: string; telefono?: string }) => {
    const { error } = await supabase.auth.signUp({
      email: data.email, password: data.password,
      options: { data: { nombre: data.nombre, apellido: data.apellido, rut: data.rut ?? null, telefono: data.telefono ?? null, role: 'cliente' } },
    })
    if (error) return { error: error.message, success: false }
    return { error: null, success: true }
  }

  const signOut = async () => { await supabase.auth.signOut() }
  const refresh = async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    if (s?.user) { setUser(s.user); setSession(s); setProfile(await fetchProfile(s.user.id)) }
  }

  const role = profile?.role ?? null
  const perfilClienteId = profile && 'id_cliente' in profile ? profile.id_cliente : null
  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, signIn, signUp, signOut, refresh,
      isAdmin: role === 'admin', isEmpleado: role === 'empleado', isCliente: role === 'cliente',
      perfilId: perfilClienteId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
