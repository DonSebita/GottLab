'use client'

import { useState, useEffect, useRef } from 'react'

export default function CategoriaDropdown({ categorias, valor, onSelect, onClose }: {
  categorias: { id_categoria: number; nombre: string }[]
  valor: string | null
  onSelect: (id: string | null, nombre: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filtradas = categorias.filter(c =>
    c.nombre.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div ref={ref} className="absolute z-30 mt-1 w-52 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-xl shadow-xl overflow-hidden">
      <div className="p-2 border-b border-stone-100 dark:border-stone-700">
        <input
          autoFocus
          type="text"
          placeholder="Buscar categoría..."
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && onClose()}
          className="w-full px-2 py-1.5 text-xs bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        <button
          onClick={() => onSelect(null, '—')}
          className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors ${
            !valor ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-stone-500 dark:text-stone-400'
          }`}
        >
          Sin categoría
        </button>
        {filtradas.map(c => (
          <button
            key={c.id_categoria}
            onClick={() => onSelect(String(c.id_categoria), c.nombre)}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors capitalize ${
              String(c.id_categoria) === valor ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-stone-700 dark:text-stone-200'
            }`}
          >
            {c.nombre}
          </button>
        ))}
        {filtradas.length === 0 && (
          <p className="px-3 py-3 text-xs text-stone-400 text-center">Sin resultados</p>
        )}
      </div>
    </div>
  )
}
