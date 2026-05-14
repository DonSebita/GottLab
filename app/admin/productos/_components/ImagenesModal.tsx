'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { Images, X, ImagePlus, Check } from 'lucide-react'

export default function ImagenesModal({ productoId, onClose }: { productoId: number; onClose: () => void }) {
  const [imagenes, setImagenes] = useState<{ id_imagen: number; url: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [nueva, setNueva] = useState('')
  const [preview, setPreview] = useState('')
  const [previewOk, setPreviewOk] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase.from('imagenes_productos').select('id_imagen, url').eq('id_producto', productoId)
    setImagenes(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [productoId])

  const handleUrlChange = (val: string) => {
    setNueva(val)
    setPreviewOk(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim()) {
      debounceRef.current = setTimeout(() => setPreview(val.trim()), 600)
    } else {
      setPreview('')
    }
  }

  const agregar = async () => {
    if (!nueva.trim() || !previewOk) return
    setGuardando(true)
    await supabase.from('imagenes_productos').insert({ id_producto: productoId, url: nueva.trim() })
    setNueva('')
    setPreview('')
    setPreviewOk(false)
    await cargar()
    setGuardando(false)
  }

  const eliminar = async (id: number) => {
    await supabase.from('imagenes_productos').delete().eq('id_imagen', id)
    await cargar()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700">
          <h3 className="font-semibold text-stone-900 dark:text-white flex items-center gap-2">
            <Images className="h-4 w-4 text-emerald-500" /> Imágenes del producto
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">

          {loading ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {imagenes.map(img => (
                <div key={img.id_imagen} className="relative group aspect-square rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <Image src={img.url} alt="" fill className="object-cover" />
                  <button
                    onClick={() => eliminar(img.id_imagen)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              {imagenes.length === 0 && (
                <p className="col-span-3 text-center text-stone-400 text-sm py-4">Sin imágenes aún</p>
              )}
            </div>
          )}

          <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-3 space-y-3">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Añadir imagen por URL</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={nueva}
                onChange={e => handleUrlChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregar()}
                className="flex-1 px-3 py-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={agregar}
                disabled={guardando || !nueva.trim() || !previewOk}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <ImagePlus className="h-4 w-4" />
                Añadir
              </button>
            </div>

            {preview && (
              <div className="flex items-start gap-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0 border border-stone-200 dark:border-stone-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="preview"
                    className="w-full h-full object-cover"
                    onLoad={() => setPreviewOk(true)}
                    onError={() => { setPreviewOk(false) }}
                  />
                </div>
                <div className="flex-1 pt-1">
                  {previewOk ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> URL válida — listo para añadir
                    </span>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">
                      No se puede cargar esta imagen. Verifica la URL.
                    </span>
                  )}
                  <p className="text-[10px] text-stone-400 mt-1 break-all line-clamp-2">{preview}</p>
                </div>
              </div>
            )}
            {!preview && nueva.trim() && (
              <p className="text-xs text-stone-400 italic">Esperando para previsualizar…</p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
