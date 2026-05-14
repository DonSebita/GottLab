'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { LayoutDashboard, Package, ShoppingCart, Users, Tag, Settings, LogOut, Leaf, ChevronRight, Menu, X, Moon, Sun, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin/live', label: 'Ventas Live', icon: Zap },
  { href: '/admin/usuarios', label: 'Empleados', icon: Users, adminOnly: true },
  { href: '/admin/categorias', label: 'Categorias', icon: Tag },
  { href: '/admin/configuracion', label: 'Configuracion', icon: Settings, adminOnly: true },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const displayNombre = profile?.nombre ?? user?.email ?? 'Admin'
  const displayCargo = (profile && 'cargo' in profile ? profile.cargo : null) ?? profile?.role ?? 'admin'

  // Proxy.ts already validates auth + role server-side.
  // Only redirect if auth state resolves to non-admin (edge case: session expired between proxy and render).
  useEffect(() => { if (!loading && !user) router.replace('/login?redirect=/admin') }, [loading, user, router])
  useEffect(() => { if (!loading && user && !isAdmin) router.replace('/') }, [loading, user, isAdmin, router])

  // Show sidebar skeleton immediately — no spinner. Proxy.ts already verified the session.
  // If auth context hasn't resolved yet, show skeleton quickly which will update in-place.
  if (loading) {
    return (
      <div className="h-screen bg-stone-100 dark:bg-stone-950 flex overflow-hidden">
        <aside className="w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col flex-shrink-0">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-stone-200 dark:border-stone-800">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center"><Leaf className="h-4 w-4 text-white" /></div>
            <span className="font-bold text-stone-900 dark:text-white">GottLab</span>
            <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null
              return (
                <div key={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-300 dark:text-stone-600">
                  <item.icon className="h-4 w-4 flex-shrink-0" />{item.label}
                </div>
              )
            })}
          </nav>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    )
  }

  const isActive = (item: typeof navItems[0]) => item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <div className="h-screen bg-stone-100 dark:bg-stone-950 flex overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto lg:h-full`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center"><Leaf className="h-4 w-4 text-white" /></div>
            <span className="font-bold text-stone-900 dark:text-white">GottLab</span>
            <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-stone-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null
            const active = isActive(item)
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-emerald-600 text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'}`}>
                <item.icon className="h-4 w-4 flex-shrink-0" />{item.label}{active && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase">{displayNombre?.[0]}</span></div>
            <div className="flex-1 min-w-0"><p className="text-xs font-medium text-stone-900 dark:text-white truncate">{displayNombre}</p><p className="text-[10px] text-emerald-600 dark:text-emerald-400 capitalize">{displayCargo}</p></div>
          </div>
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors mb-1">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</button>
          <button onClick={async () => { await signOut(); router.push('/') }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"><LogOut className="h-4 w-4" />Cerrar sesion</button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800"><button onClick={() => setSidebarOpen(true)} className="text-stone-400 hover:text-white"><Menu className="h-5 w-5" /></button><span className="text-stone-900 dark:text-white font-semibold text-sm">Panel Admin</span></header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
