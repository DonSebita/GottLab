'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Leaf, Mail, Lock, User, Eye, EyeOff, IdCard, Phone } from 'lucide-react'

export default function RegisterPage() {
  const { signUp, signIn } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', rut: '', telefono: '', terms: false })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const set = (field: string, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (form.password.length < 8) { setError('La contrasena debe tener al menos 8 caracteres'); setLoading(false); return }
    if (!form.terms) { setError('Debes aceptar los terminos y condiciones'); setLoading(false); return }

    const { error: err } = await signUp({
      email: form.email.trim().toLowerCase(), password: form.password,
      nombre: form.nombre.trim(), apellido: form.apellido.trim(),
      rut: form.rut.trim() || undefined, telefono: form.telefono.trim() || undefined,
    })
    if (err) { setError(err); setLoading(false); return }

    // Auto-login and redirect to complete profile (preserving Seba's flow)
    const { error: loginErr } = await signIn(form.email.trim().toLowerCase(), form.password)
    if (!loginErr) {
      router.push('/mi-cuenta?completar=true')
    } else {
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-black dark:text-white">GottLab</span>
          </Link>
          <h1 className="text-2xl font-bold text-black dark:text-white">Crear cuenta</h1>
          <p className="text-gray-600 dark:text-stone-400 mt-1">Unete a la comunidad de cultivadores</p>
        </div>
        {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Nombre</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-stone-500" />
                <input type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Tu nombre" required
                  className="w-full pl-10 pr-3 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Apellido</label>
              <input type="text" value={form.apellido} onChange={(e) => set('apellido', e.target.value)} placeholder="Tu apellido" required
                className="w-full px-3 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Correo electronico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-stone-500" />
              <input type="text" inputMode="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@correo.com" required autoComplete="email"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Contrasena</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-stone-500" />
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Minimo 8 caracteres" required minLength={8} autoComplete="new-password"
                className="w-full pl-10 pr-12 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-stone-300">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">RUT (opcional)</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-stone-500" />
                <input type="text" value={form.rut} onChange={(e) => set('rut', e.target.value)} placeholder="12.345.678-9"
                  className="w-full pl-10 pr-3 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Telefono (opcional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-stone-500" />
                <input type="tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+56 9..."
                  className="w-full pl-10 pr-3 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
              </div>
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.terms} onChange={(e) => set('terms', e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-600 rounded" />
            <span className="text-sm text-gray-600 dark:text-stone-400">Acepto los <Link href="/terminos" className="text-emerald-600 hover:text-emerald-500 underline">terminos y condiciones</Link> y la <Link href="/privacidad" className="text-emerald-600 hover:text-emerald-500 underline">politica de privacidad</Link></span>
          </label>
          <button type="submit" disabled={loading || !form.nombre || !form.apellido || !form.email || !form.password}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl">
            {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creando cuenta...</span> : 'Crear cuenta'}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-gray-600 dark:text-stone-400">
          Ya tienes cuenta? <Link href="/login" className="text-emerald-600 hover:text-emerald-500 font-medium">Inicia sesion</Link>
        </p>
      </div>
    </div>
  )
}
