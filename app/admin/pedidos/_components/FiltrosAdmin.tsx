'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Filter, X } from 'lucide-react'

const ESTADOS_PEDIDO = [
  { value: '',              label: 'Todos los estados' },
  { value: 'pendiente',     label: 'Pendiente' },
  { value: 'confirmado',    label: 'Confirmado' },
  { value: 'en_preparacion',label: 'En preparación' },
  { value: 'despachado',    label: 'Despachado' },
  { value: 'entregado',     label: 'Entregado' },
  { value: 'cancelado',     label: 'Cancelado' },
]


export default function FiltrosAdmin() {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const set = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('pagina')
    router.push(`${pathname}?${next.toString()}`)
  }, [params, pathname, router])

  const clear = useCallback(() => {
    router.push(pathname)
  }, [pathname, router])

  const hayFiltros = params.get('estado') || params.get('sin_grupo')

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Filter className="h-4 w-4 text-stone-400 shrink-0" />

      {/* Estado pedido */}
      <select
        value={params.get('estado') ?? ''}
        onChange={e => set('estado', e.target.value)}
        className="text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {ESTADOS_PEDIDO.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Sin grupo */}
      <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={params.get('sin_grupo') === 'true'}
          onChange={e => set('sin_grupo', e.target.checked ? 'true' : '')}
          className="rounded border-stone-300 dark:border-stone-600 accent-emerald-600"
        />
        Sin grupo de envío
      </label>

      {/* Limpiar */}
      {hayFiltros && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Limpiar
        </button>
      )}
    </div>
  )
}
