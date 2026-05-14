'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { formatCLP } from '@/lib/utils'
import { Plus, Search, Pencil, Trash2, Package, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import ImagenesModal from './_components/ImagenesModal'
import EditarModal from './_components/EditarModal'
import EstadoPicker from './_components/EstadoPicker'
import CategoriaDropdown from './_components/CategoriaDropdown'

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

type InlineCell =
  | { id: number; field: 'nombre' | 'precio_venta' | 'stock_total'; value: string }
  | { id: number; field: 'prioridad'; value: number }
  | { id: number; field: 'id_categoria'; value: string | null }
  | { id: number; field: 'estado'; value: string }
  | { id: number; field: 'imagenes' }

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminProductos() {
  const [productos, setProductos] = useState<Record<string, unknown>[]>([])
  const [categorias, setCategorias] = useState<{ id_categoria: number; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [eliminando, setEliminando] = useState<number | null>(null)
  const [editando, setEditando] = useState<Record<string, unknown> | null>(null)
  const [creando, setCreando] = useState(false)
  const [inline, setInline] = useState<InlineCell | null>(null)
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 50
  const [sortCol, setSortCol] = useState<'nombre' | 'categoria' | 'precio_venta' | 'stock_total' | 'prioridad' | 'estado' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [sortKey, setSortKey] = useState(0)

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setSortKey(k => k + 1)
    setPagina(1)
  }

  const cargar = async () => {
    setLoading(true)
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('productos').select('id_producto, nombre, nombre_cientifico, descripcion, precio_venta, precio_costo, stock_total, estado, destacado, nuevo, prioridad, id_categoria, tipo_venta, categorias(id_categoria, nombre), imagenes_productos(id_imagen, url)').order('prioridad', { ascending: false }),
      supabase.from('categorias').select('id_categoria, nombre').order('nombre'),
    ])
    setProductos(prods || [])
    setCategorias(cats || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return
    setEliminando(id)
    await supabase.from('productos').delete().eq('id_producto', id)
    await cargar()
    setEliminando(null)
  }

  const guardarInline = async (id: number, field: string, value: unknown) => {
    await supabase.from('productos').update({ [field]: value }).eq('id_producto', id)
    setProductos(prev => prev.map(p => p.id_producto === id ? { ...p, [field]: value } : p))
    setInline(null)
  }

  const filtrados = productos
    .filter(p => (p.nombre as string)?.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      if (!sortCol) return 0
      let va: string | number = 0; let vb: string | number = 0
      if (sortCol === 'nombre') {
        va = ((a.nombre as string) || '').toLowerCase(); vb = ((b.nombre as string) || '').toLowerCase()
        return sortDir === 'asc' ? (va as string).localeCompare(vb as string, 'es') : (vb as string).localeCompare(va as string, 'es')
      }
      if (sortCol === 'categoria') {
        const ac = a.categorias; const bc = b.categorias
        va = ((Array.isArray(ac) ? (ac[0] as Record<string,unknown>)?.nombre : (ac as Record<string,unknown>)?.nombre) || '').toString().toLowerCase()
        vb = ((Array.isArray(bc) ? (bc[0] as Record<string,unknown>)?.nombre : (bc as Record<string,unknown>)?.nombre) || '').toString().toLowerCase()
        return sortDir === 'asc' ? (va as string).localeCompare(vb as string, 'es') : (vb as string).localeCompare(va as string, 'es')
      }
      if (sortCol === 'estado') {
        va = ((a.estado as string) || '').toLowerCase(); vb = ((b.estado as string) || '').toLowerCase()
        return sortDir === 'asc' ? (va as string).localeCompare(vb as string, 'es') : (vb as string).localeCompare(va as string, 'es')
      }
      va = Number(a[sortCol] ?? 0); vb = Number(b[sortCol] ?? 0)
      return sortDir === 'asc' ? va - vb : vb - va
    })

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const inlineTxtCls = "w-full px-2 py-1 text-sm bg-white dark:bg-stone-800 border border-emerald-500 rounded-md text-stone-900 dark:text-white focus:outline-none"

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white">Productos</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">{productos.length} productos en total</p>
        </div>
        <button
          onClick={() => setCreando(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-10 w-10 text-stone-300 dark:text-stone-700 mb-3" />
          <p className="text-stone-500 dark:text-stone-400">No se encontraron productos</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
          <p className="text-[11px] text-stone-400 px-4 pt-2 pb-1 italic">Doble clic sobre nombre, precio, stock o prioridad para editar directo</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                {([
                  { col: 'nombre',       label: 'Producto',  align: 'left',   cls: '' },
                  { col: 'categoria',    label: 'Categoría', align: 'left',   cls: 'hidden sm:table-cell' },
                  { col: 'precio_venta', label: 'Precio',    align: 'right',  cls: '' },
                  { col: 'stock_total',  label: 'Stock',     align: 'right',  cls: 'hidden md:table-cell' },
                  { col: 'prioridad',    label: 'Prioridad', align: 'center', cls: 'hidden lg:table-cell' },
                  { col: 'estado',       label: 'Estado',    align: 'center', cls: 'hidden md:table-cell' },
                ] as const).map(({ col, label, align, cls }) => (
                  <th key={col} className={`px-4 py-3 font-medium ${cls}`}>
                    <button
                      onClick={() => toggleSort(col)}
                      className={`flex items-center gap-1 focus:outline-none rounded ${
                        align === 'right' ? 'ml-auto' : align === 'center' ? 'mx-auto' : ''
                      } ${
                        sortCol === col
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                      } transition-colors`}
                    >
                      {label}
                      <span className="transition-transform duration-200">
                        {sortCol === col
                          ? sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody key={sortKey} className="divide-y divide-stone-100 dark:divide-stone-800">
              {paginados.map((p) => {
                const img = (p.imagenes_productos as { url: string }[])?.[0]?.url
                const acat = p.categorias
                const cat = Array.isArray(acat) ? (acat[0] as { nombre: string })?.nombre : (acat as { nombre: string })?.nombre
                const prio = prioridadLabel((p.prioridad as number) ?? 0)
                const isNombre  = inline?.id === p.id_producto && inline?.field === 'nombre'
                const isPrecio  = inline?.id === p.id_producto && inline?.field === 'precio_venta'
                const isStock   = inline?.id === p.id_producto && inline?.field === 'stock_total'
                const isPrio    = inline?.id === p.id_producto && inline?.field === 'prioridad'
                const isImgs    = inline?.id === p.id_producto && inline?.field === 'imagenes'
                const isCat     = inline?.id === p.id_producto && inline?.field === 'id_categoria'
                const isEstado  = inline?.id === p.id_producto && inline?.field === 'estado'

                return (
                  <tr key={p.id_producto as number} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          onDoubleClick={() => setInline({ id: p.id_producto as number, field: 'imagenes' })}
                          className="w-9 h-9 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0 cursor-pointer ring-0 hover:ring-2 hover:ring-emerald-400 transition-all"
                          title="Doble clic para editar imágenes"
                        >
                          {img
                            ? <Image src={img} alt={p.nombre as string} width={36} height={36} className="object-cover w-full h-full" />
                            : <Package className="h-4 w-4 text-stone-400 m-auto mt-2.5" />
                          }
                        </div>
                        {isNombre ? (
                          <input
                            autoFocus
                            className={inlineTxtCls}
                            value={inline?.value as string}
                            onChange={e => setInline({ id: p.id_producto as number, field: 'nombre', value: e.target.value })}
                            onBlur={() => guardarInline(p.id_producto as number, 'nombre', inline?.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') guardarInline(p.id_producto as number, 'nombre', inline?.value)
                              if (e.key === 'Escape') setInline(null)
                            }}
                          />
                        ) : (
                          <span
                            onDoubleClick={() => setInline({ id: p.id_producto as number, field: 'nombre', value: p.nombre as string })}
                            className="text-stone-900 dark:text-white font-medium line-clamp-1 cursor-text select-none"
                            title="Doble clic para editar"
                          >
                            {p.nombre as string}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 capitalize hidden sm:table-cell">
                      <div className="relative">
                        <span
                          onDoubleClick={() => setInline({ id: p.id_producto as number, field: 'id_categoria', value: p.id_categoria ? String(p.id_categoria) : null })}
                          className="text-stone-500 dark:text-stone-400 cursor-pointer select-none hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                          title="Doble clic para cambiar categoría"
                        >
                          {cat || '—'}
                        </span>
                        {isCat && (
                          <CategoriaDropdown
                            categorias={categorias}
                            valor={inline?.value as string | null}
                            onSelect={(id, nombre) => {
                              guardarInline(p.id_producto as number, 'id_categoria', id ? Number(id) : null)
                              setProductos(prev => prev.map(x =>
                                x.id_producto === p.id_producto
                                  ? { ...x, categorias: id ? [{ id_categoria: Number(id), nombre }] : [] }
                                  : x
                              ))
                            }}
                            onClose={() => setInline(null)}
                          />
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap w-[140px]">
                      {isPrecio ? (
                        <input
                          autoFocus
                          type="number"
                          inputMode="decimal"
                          className={inlineTxtCls + ' text-right w-28 ml-auto no-spin'}
                          value={inline?.value as string}
                          onChange={e => setInline({ id: p.id_producto as number, field: 'precio_venta', value: e.target.value })}
                          onBlur={() => guardarInline(p.id_producto as number, 'precio_venta', Number(inline?.value))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') guardarInline(p.id_producto as number, 'precio_venta', Number(inline?.value))
                            if (e.key === 'Escape') setInline(null)
                          }}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => setInline({ id: p.id_producto as number, field: 'precio_venta', value: String(p.precio_venta) })}
                          className="text-stone-900 dark:text-white cursor-text select-none"
                          title="Doble clic para editar"
                        >
                          {formatCLP(p.precio_venta as number)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap hidden md:table-cell w-[110px]">
                      {isStock ? (
                        <input
                          autoFocus
                          type="number"
                          inputMode="numeric"
                          className={inlineTxtCls + ' text-right w-20 ml-auto no-spin'}
                          value={inline?.value as string}
                          onChange={e => setInline({ id: p.id_producto as number, field: 'stock_total', value: e.target.value })}
                          onBlur={() => guardarInline(p.id_producto as number, 'stock_total', Number(inline?.value))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') guardarInline(p.id_producto as number, 'stock_total', Number(inline?.value))
                            if (e.key === 'Escape') setInline(null)
                          }}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => setInline({ id: p.id_producto as number, field: 'stock_total', value: String(p.stock_total) })}
                          className={`cursor-text select-none ${(p.stock_total as number) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                          title="Doble clic para editar"
                        >
                          {p.stock_total as number}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 hidden lg:table-cell min-w-[140px]">
                      {isPrio ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px] text-stone-400">
                            <span>0</span>
                            <span className={`font-semibold ${prioridadLabel(inline?.value as number).color}`}>
                              {inline?.value as number} · {prioridadLabel(inline?.value as number).label}
                            </span>
                            <span>10</span>
                          </div>
                          <div className="relative h-5 flex items-center">
                            <div className="absolute w-full h-2 rounded-full" style={{ background: 'linear-gradient(to right,#ef4444,#f59e0b,#22c55e)' }} />
                            <input
                              autoFocus
                              type="range" min={0} max={10} step={1}
                              value={inline?.value as number}
                              onChange={e => setInline({ id: p.id_producto as number, field: 'prioridad', value: Number(e.target.value) })}
                              onBlur={() => guardarInline(p.id_producto as number, 'prioridad', inline?.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') guardarInline(p.id_producto as number, 'prioridad', inline?.value)
                                if (e.key === 'Escape') setInline(null)
                              }}
                              className="relative w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-stone-400 [&::-webkit-slider-thumb]:shadow"
                            />
                          </div>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={() => setInline({ id: p.id_producto as number, field: 'prioridad', value: (p.prioridad ?? 0) as number })}
                          className="flex items-center gap-2 cursor-pointer"
                          title="Doble clic para editar prioridad"
                        >
                          <div className="flex-1 h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${((p.prioridad ?? 0) as number) * 10}%`, background: prioridadBg((p.prioridad ?? 0) as number) }} />
                          </div>
                          <span className={`text-[11px] font-semibold w-10 ${prio.color}`}>{prio.label}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <div className="relative inline-block">
                        <span
                          onDoubleClick={() => setInline({ id: p.id_producto as number, field: 'estado', value: p.estado as string })}
                          title="Doble clic para cambiar estado"
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer select-none ${
                            p.estado === 'activo'
                              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                              : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                          }`}
                        >
                          {p.estado as string}
                        </span>
                        {isEstado && (
                          <EstadoPicker
                            valor={p.estado as string}
                            onSelect={v => guardarInline(p.id_producto as number, 'estado', v)}
                            onClose={() => setInline(null)}
                          />
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditando(p)}
                          className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                          title="Editar todo"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => eliminar(p.id_producto as number)}
                          disabled={eliminando === p.id_producto}
                          className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-800">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtrados.length)} de {filtrados.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(1)}
                  disabled={pagina === 1}
                  className="px-2 py-1 text-xs rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >«</button>
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-2.5 py-1 text-xs rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >‹</button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1)
                  .reduce<(number | '...')[]>((acc, n, i, arr) => {
                    if (i > 0 && (n as number) - (arr[i - 1] as number) > 1) acc.push('...')
                    acc.push(n)
                    return acc
                  }, [])
                  .map((n, i) =>
                    n === '...' ? (
                      <span key={`e${i}`} className="px-1 text-stone-400 text-xs">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPagina(n as number)}
                        className={`min-w-[28px] px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                          pagina === n
                            ? 'bg-emerald-600 text-white'
                            : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >{n}</button>
                    )
                  )}
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-2.5 py-1 text-xs rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >›</button>
                <button
                  onClick={() => setPagina(totalPaginas)}
                  disabled={pagina === totalPaginas}
                  className="px-2 py-1 text-xs rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {editando && (
        <EditarModal
          producto={editando}
          categorias={categorias}
          onClose={() => setEditando(null)}
          onGuardado={cargar}
        />
      )}

      {creando && (
        <EditarModal
          producto={null}
          categorias={categorias}
          onClose={() => setCreando(false)}
          onGuardado={cargar}
        />
      )}

      {inline?.field === 'imagenes' && (
        <ImagenesModal
          productoId={inline.id}
          onClose={() => { setInline(null); cargar() }}
        />
      )}
    </div>
  )
}
