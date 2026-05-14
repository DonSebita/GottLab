'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getClientes, adminAgregarAlCarrito } from '@/lib/actions/carrito'
import { Search, UserPlus, ShoppingCart, Zap, Check, X, Clock } from 'lucide-react'
import { formatCLP } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

interface Cliente { id_cliente: number; nombre: string; apellido: string; email: string; telefono: string }
interface Producto { id_producto: number; nombre: string; precio_venta: number; stock_total: number; imagenes_productos: { url: string }[] }

export default function AdminLivePage() {
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)

  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [buscandoProductos, setBuscandoProductos] = useState(false)

  const [cantidad, setCantidad] = useState(1)
  const [precioEspecial, setPrecioEspecial] = useState('')
  const [expiracionMin, setExpiracionMin] = useState(60)
  const [agregando, setAgregando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const buscarClientes = async () => {
    if (!busquedaCliente.trim()) return
    setBuscandoClientes(true)
    const data = await getClientes(busquedaCliente.trim())
    setClientes(data as unknown as Cliente[])
    setBuscandoClientes(false)
  }

  const buscarProductos = async () => {
    if (!busquedaProducto.trim()) return
    setBuscandoProductos(true)
    const { data } = await supabase
      .from('productos')
      .select('id_producto, nombre, precio_venta, stock_total, imagenes_productos(url)')
      .eq('estado', 'activo')
      .ilike('nombre', `%${busquedaProducto.trim()}%`)
      .order('nombre')
      .limit(20)
    setProductos(data || [])
    setBuscandoProductos(false)
  }

  const handleAgregar = async (producto: Producto) => {
    if (!clienteSeleccionado) return
    setAgregando(true)
    setMensaje(null)

    const precio = precioEspecial ? Number(precioEspecial) : null
    const resultado = await adminAgregarAlCarrito(
      clienteSeleccionado.id_cliente,
      producto.id_producto,
      cantidad,
      precio,
      'live',
      expiracionMin
    )

    setMensaje({
      tipo: resultado.success ? 'ok' : 'error',
      texto: resultado.message || resultado.error || ''
    })
    setAgregando(false)
    if (resultado.success) {
      setCantidad(1)
      setPrecioEspecial('')
      setTimeout(() => setMensaje(null), 3000)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" /> Ventas Live
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            Agrega productos al carrito de clientes durante lives de TikTok
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─── Panel izquierdo: Cliente ──────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5">
            <h2 className="font-semibold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-500" /> Cliente
            </h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={busquedaCliente}
                onChange={e => setBusquedaCliente(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarClientes()}
                className="flex-1 px-3 py-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={buscarClientes}
                disabled={buscandoClientes}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            {clienteSeleccionado && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">{clienteSeleccionado.nombre} {clienteSeleccionado.apellido || ''}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{clienteSeleccionado.email}</p>
                </div>
                <button onClick={() => setClienteSeleccionado(null)} className="text-emerald-600 hover:text-emerald-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {clientes.map(c => (
                <button
                  key={c.id_cliente}
                  onClick={() => { setClienteSeleccionado(c); setClientes([]); setBusquedaCliente('') }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    clienteSeleccionado?.id_cliente === c.id_cliente
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="font-medium text-stone-900 dark:text-white">{c.nombre} {c.apellido || ''}</span>
                  <span className="text-stone-400 ml-2 text-xs">{c.email}</span>
                </button>
              ))}
              {buscandoClientes && <p className="text-xs text-stone-400 p-3">Buscando...</p>}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5">
            <h2 className="font-semibold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Configuracion
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Cantidad</label>
                <input
                  type="number" min={1}
                  value={cantidad}
                  onChange={e => setCantidad(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Expira en (min)</label>
                <input
                  type="number" min={5} max={240}
                  value={expiracionMin}
                  onChange={e => setExpiracionMin(Math.max(5, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                Precio especial (vacio = precio web)
              </label>
              <input
                type="number"
                placeholder="Dejar vacio para usar precio normal"
                value={precioEspecial}
                onChange={e => setPrecioEspecial(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* ─── Panel derecho: Productos ──────────────────────────────────────── */}
        <div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5">
            <h2 className="font-semibold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-purple-500" /> Productos
            </h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busquedaProducto}
                onChange={e => setBusquedaProducto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarProductos()}
                className="flex-1 px-3 py-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={buscarProductos}
                disabled={buscandoProductos}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            {mensaje && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                mensaje.tipo === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {mensaje.tipo === 'ok' ? <Check className="h-4 w-4 inline mr-1" /> : <X className="h-4 w-4 inline mr-1" />}
                {mensaje.texto}
              </div>
            )}

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {productos.map(p => (
                <div key={p.id_producto} className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0">
                    {p.imagenes_productos?.[0]?.url ? (
                      <Image src={p.imagenes_productos[0].url} alt={p.nombre} width={48} height={48} className="object-cover w-full h-full" />
                    ) : (
                      <ShoppingCart className="h-5 w-5 text-stone-400 m-auto mt-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 dark:text-white text-sm line-clamp-1">{p.nombre}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {formatCLP(p.precio_venta)} · Stock: {p.stock_total}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAgregar(p)}
                    disabled={agregando || !clienteSeleccionado}
                    title={!clienteSeleccionado ? 'Selecciona un cliente primero' : `Agregar al carrito de ${clienteSeleccionado.nombre}`}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 flex-shrink-0"
                  >
                    <Zap className="h-3 w-3" />
                    Live
                  </button>
                </div>
              ))}
              {buscandoProductos && <p className="text-xs text-stone-400 p-3">Buscando...</p>}
              {!buscandoProductos && productos.length === 0 && busquedaProducto && (
                <p className="text-xs text-stone-400 p-3">Sin resultados. Busca un producto.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
