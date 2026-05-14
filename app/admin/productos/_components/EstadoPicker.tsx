'use client'

import { useEffect, useRef } from 'react'

export default function EstadoPicker({ valor, onSelect, onClose }: {
  valor: string
  onSelect: (v: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const opciones = [
    { value: 'activo',   label: 'Activo',   cls: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50' },
    { value: 'inactivo', label: 'Inactivo', cls: 'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700' },
  ]

  return (
    <div ref={ref} className="absolute z-30 top-full mt-1 left-1/2 -translate-x-1/2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-xl shadow-xl overflow-hidden w-32">
      {opciones.map(o => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold hover:opacity-80 transition-opacity ${
            valor === o.value ? 'opacity-100' : 'opacity-60'
          }`}
        >
          <span className={`px-2 py-0.5 rounded-full ${o.cls}`}>{o.label}</span>
          {valor === o.value && <span className="text-emerald-500">✓</span>}
        </button>
      ))}
    </div>
  )
}
