'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Check, Images } from 'lucide-react'
import ImagenesModal from './ImagenesModal'

function prioridadLabel(v: number) {
  if (v <= 3) return { label: 'Baja', color: 'text-red-500' }
  if (v <= 6) return { label: 'Media', color: 'text-amber-500' }
  return { label: 'Alta', color: 'text-emerald-500' }
}

function prioridadBg(v: number) {
  const r = Math.round(255 * (1 - v / 10))
  const g = Math.round(180 * (v / 10))
  return `rgb(${r},${g},60)`
}

export default function EditarModal({ producto, categorias, onClose, onGuardado }: {
  producto: Record<string, unknown> | null
  categorias: { id_categoria: number; nombre: string }[]
  onClose: () => void
  onGuardado: () => void
}) {
  const esNuevo = !producto?.id_producto
  const [form, setForm] = useState({
    nombre: (producto?.nombre as string) || '',
    nombre_cientifico: (producto?.nombre_cientifico as string) || '',
    descripcion: (producto?.descripcion as string) || '',
    precio_venta: (producto?.precio_venta ?? '') as string | number,
    precio_costo: (producto?.precio_costo ?? '') as string | number,
    stock_total: (producto?.stock_total ?? 0) as number,
    id_categoria: (producto?.id_categoria ?? '') as string | number,
    tipo_venta: (producto?.tipo_venta as string) || 'normal',
    estado: (producto?.estado as string) || 'activo',
    destacado: (producto?.destacado as boolean) || false,
    nuevo: (producto?.nuevo as boolean) || false,
    prioridad: (producto?.prioridad ?? 0) as number,
  })
  const [guardando, setGuardando] = useState(false)
  const [verImagenes, setVerImagenes] = useState(false)
  const [nuevoId, setNuevoId] = useState<number | null>(null)
  const prio = prioridadLabel(form.prioridad)

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    setGuardando(true)
    const payload = {
      nombre: form.nombre,
      nombre_cientifico: form.nombre_cientifico || null,
      descripcion: form.descripcion || null,
      precio_venta: Number(form.precio_venta),
      precio_costo: form.precio_costo ? Number(form.precio_costo) : null,
      stock_total: Number(form.stock_total),
      id_categoria: form.id_categoria || null,
      tipo_venta: form.tipo_venta,
      estado: form.estado,
      destacado: form.destacado,
      nuevo: form.nuevo,
      prioridad: Number(form.prioridad),
    }
    if (esNuevo) {
      const { data } = await supabase.from('productos').insert(payload).select('id_producto').single()
      if (data?.id_producto) {
        setNuevoId(data.id_producto)
        setVerImagenes(true)
      }
    } else {
      await supabase.from('productos').update(payload).eq('id_producto', producto!.id_producto as number)
    }
    setGuardando(false)
    onGuardado()
    if (!esNuevo) onClose()
  }

  const inputCls = "w-full px-3 py-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const labelCls = "block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1"

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700 flex-shrink-0">
            <h2 className="font-semibold text-stone-900 dark:text-white">{esNuevo ? 'Nuevo producto' : 'Editar producto'}</h2>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Nombre científico</label>
                <input className={inputCls} value={form.nombre_cientifico} onChange={e => set('nombre_cientifico', e.target.value)} placeholder="Ej: Monstera deliciosa" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Descripción</label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Precio venta</label>
                <input type="number" className={inputCls} value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Precio costo</label>
                <input type="number" className={inputCls} value={form.precio_costo} onChange={e => set('precio_costo', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Stock</label>
                <input type="number" className={inputCls} value={form.stock_total} onChange={e => set('stock_total', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Categoría</label>
                <select className={inputCls} value={form.id_categoria} onChange={e => set('id_categoria', e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tipo venta</label>
                <select className={inputCls} value={form.tipo_venta} onChange={e => set('tipo_venta', e.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="preventa">Preventa</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Estado</label>
                <select className={inputCls} value={form.estado} onChange={e => set('estado', e.target.value)}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls + ' mb-0'}>Prioridad</label>
                <span className={`text-xs font-semibold ${prio.color}`}>
                  {form.prioridad} / 10 · {prio.label}
                </span>
              </div>
              <div className="relative h-6 flex items-center">
                <div className="absolute w-full h-2 rounded-full overflow-hidden"
                  style={{ background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)' }} />
                <input
                  type="range" min={0} max={10} step={1}
                  value={form.prioridad}
                  onChange={e => set('prioridad', Number(e.target.value))}
                  className="relative w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                  style={{ '--thumb-color': prioridadBg(form.prioridad) } as Record<string, string>}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 mt-1 px-0.5">
                {[0,1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.destacado} onChange={e => set('destacado', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">Destacado</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.nuevo} onChange={e => set('nuevo', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">Nuevo</span>
                </label>
              </div>
              <button
                onClick={() => setVerImagenes(true)}
                disabled={esNuevo && !nuevoId}
                title={esNuevo && !nuevoId ? 'Crea el producto primero' : undefined}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Images className="h-4 w-4" />
                Gestionar imágenes
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-stone-700 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
              {esNuevo && nuevoId ? 'Cerrar' : 'Cancelar'}
            </button>
            {(!esNuevo || !nuevoId) && (
              <button
                onClick={guardar}
                disabled={guardando || !form.nombre.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {guardando ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                {esNuevo ? 'Crear producto' : 'Guardar cambios'}
              </button>
            )}
            {esNuevo && nuevoId && (
              <button
                onClick={() => setVerImagenes(true)}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Images className="h-4 w-4" />
                Añadir imágenes
              </button>
            )}
          </div>
        </div>
      </div>
      {verImagenes && <ImagenesModal productoId={nuevoId ?? (producto?.id_producto as number)} onClose={() => setVerImagenes(false)} />}
    </>
  )
}
