'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  getClientes,
  adminAgregarAlCarrito,
  adminGetCarrito,
  adminEditarReserva,
  adminEliminarReserva,
} from '@/lib/actions/carrito'
import {
  Search, ShoppingCart, Zap, Check, X, Clock,
  Pencil, Trash2, Timer, Package, Minus, Plus,
  User, Mail, Phone, AlertCircle, RefreshCw, ChevronRight,
} from 'lucide-react'
import { formatCLP } from '@/lib/utils'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Cliente {
  id_cliente: number; nombre: string; apellido: string; email: string
  telefono: string | null
}

interface CartItem {
  id_reserva: number; id_producto: number; cantidad: number
  fecha_expiracion: string; precio_especial: number | null; origen: string | null
  productos: {
    nombre: string; nombre_cientifico: string; precio_venta: number
    stock_total: number; imagenes_productos: { url: string }[]
  } | null
}

interface Producto {
  id_producto: number; nombre: string; precio_venta: number
  stock_total: number; imagenes_productos: { url: string }[]
}

interface QuickAddState {
  cantidad: number
  precioEspecial: string
  expiracionMin: number
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(targetDate: string | null) {
  const [segundos, setSegundos] = useState(0)
  useEffect(() => {
    if (!targetDate) return
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000))
      setSegundos(remaining)
    }
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [targetDate])
  const min = Math.floor(segundos / 60)
  const sec = segundos % 60
  return { segundos, min, sec, urgent: segundos < 300 }
}

// ─── Timer display component ─────────────────────────────────────────────────
function CountdownBadge({ fecha, className = '' }: { fecha: string; className?: string }) {
  const { min, sec, urgent } = useCountdown(fecha)
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] tabular-nums ${urgent ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full' : 'text-amber-600 dark:text-amber-400'} ${className}`}>
      <Clock className="h-3 w-3" />
      {min}:{sec.toString().padStart(2, '0')}
    </span>
  )
}

export default function AdminLivePage() {
  // ── Client state ──────────────────────────────────────────────────────────
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)

  // ── Cart state ────────────────────────────────────────────────────────────
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cargandoCarrito, setCargandoCarrito] = useState(false)

  // ── Product state ─────────────────────────────────────────────────────────
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [buscandoProductos, setBuscandoProductos] = useState(false)
  const [quickAdds, setQuickAdds] = useState<Record<number, QuickAddState>>({})
  const [agregandoProducto, setAgregandoProducto] = useState<number | null>(null)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [editandoPrecio, setEditandoPrecio] = useState<number | null>(null)
  const [precioEditado, setPrecioEditado] = useState('')
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Cargar carrito ────────────────────────────────────────────────────────
  const cargarCarrito = useCallback(async () => {
    if (!clienteSeleccionado) { setCartItems([]); return }
    setCargandoCarrito(true)
    try {
      const data = await adminGetCarrito(clienteSeleccionado.id_cliente)
      setCartItems(data as unknown as CartItem[])
    } catch (_e) { /* silently fail */ }
    finally { setCargandoCarrito(false) }
  }, [clienteSeleccionado])

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!clienteSeleccionado) {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
      setCartItems([])
      return
    }
    cargarCarrito()
    const channel = supabase
      .channel('admin-live-cart')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => cargarCarrito())
      .subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [clienteSeleccionado, cargarCarrito])

  // ── Cargar clientes iniciales ─────────────────────────────────────────────
  const cargarClientesInicial = useCallback(async () => {
    setBuscandoClientes(true)
    const { data, error } = await supabase
      .from('clientes').select('id_cliente, nombre, apellido, email, telefono')
      .order('nombre').limit(50)
    if (!error && data) setClientes(data as unknown as Cliente[])
    setBuscandoClientes(false)
  }, [])

  // ── Cargar productos iniciales ────────────────────────────────────────────
  const cargarProductosInicial = useCallback(async () => {
    setBuscandoProductos(true)
    const { data } = await supabase
      .from('productos')
      .select('id_producto, nombre, precio_venta, stock_total, imagenes_productos(url)')
      .eq('estado', 'activo').order('nombre').limit(40)
    setProductos(data || [])
    setBuscandoProductos(false)
  }, [])

  useEffect(() => { cargarClientesInicial() }, [cargarClientesInicial])
  useEffect(() => { cargarProductosInicial() }, [cargarProductosInicial])

  // ── Buscar clientes ───────────────────────────────────────────────────────
  const buscarClientes = async () => {
    if (!busquedaCliente.trim()) { cargarClientesInicial(); return }
    setBuscandoClientes(true)
    const data = await getClientes(busquedaCliente.trim())
    setClientes(data as unknown as Cliente[])
    setBuscandoClientes(false)
  }

  // ── Buscar productos ──────────────────────────────────────────────────────
  const buscarProductos = async () => {
    if (!busquedaProducto.trim()) { cargarProductosInicial(); return }
    setBuscandoProductos(true)
    const { data } = await supabase
      .from('productos')
      .select('id_producto, nombre, precio_venta, stock_total, imagenes_productos(url)')
      .eq('estado', 'activo').ilike('nombre', `%${busquedaProducto.trim()}%`)
      .order('nombre').limit(30)
    setProductos(data || [])
    setBuscandoProductos(false)
  }

  // ── Mensaje temporal ──────────────────────────────────────────────────────
  const mostrarMensaje = (tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 2500)
  }

  // ── Quick-add ─────────────────────────────────────────────────────────────
  const handleQuickAdd = async (producto: Producto) => {
    if (!clienteSeleccionado) return
    setAgregandoProducto(producto.id_producto)
    const qa = quickAdds[producto.id_producto] || { cantidad: 1, precioEspecial: '', expiracionMin: 60 }
    const precio = qa.precioEspecial ? Number(qa.precioEspecial) : null

    const resultado = await adminAgregarAlCarrito(
      clienteSeleccionado.id_cliente, producto.id_producto,
      qa.cantidad, precio, 'live', qa.expiracionMin
    )

    if (resultado.success) {
      mostrarMensaje('ok', resultado.message || 'Agregado')
      setQuickAdds(p => ({ ...p, [producto.id_producto]: { cantidad: 1, precioEspecial: '', expiracionMin: 60 } }))
      cargarCarrito()
    } else {
      mostrarMensaje('error', resultado.error || 'Error')
    }
    setAgregandoProducto(null)
  }

  // ── Editar precio ─────────────────────────────────────────────────────────
  const handleEditarPrecio = async (idReserva: number, nuevoPrecio: number | null) => {
    const resultado = await adminEditarReserva(idReserva, { precio_especial: nuevoPrecio })
    if (resultado.success) { setEditandoPrecio(null); cargarCarrito() }
    else mostrarMensaje('error', resultado.error || 'Error')
  }

  // ── Cambiar cantidad ──────────────────────────────────────────────────────
  const handleCambiarCantidad = async (idReserva: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return
    const resultado = await adminEditarReserva(idReserva, { cantidad: nuevaCantidad })
    if (resultado.success) cargarCarrito()
    else mostrarMensaje('error', resultado.error || 'Error')
  }

  // ── Extender expiracion ───────────────────────────────────────────────────
  const handleExtender = async (idReserva: number, minutos: number) => {
    const resultado = await adminEditarReserva(idReserva, { expiracion_minutos: minutos })
    if (resultado.success) { mostrarMensaje('ok', `+${minutos}min`); cargarCarrito() }
    else mostrarMensaje('error', resultado.error || 'Error')
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleEliminar = async (idReserva: number) => {
    const resultado = await adminEliminarReserva(idReserva)
    if (resultado.success) { mostrarMensaje('ok', 'Eliminado'); cargarCarrito() }
    else mostrarMensaje('error', resultado.error || 'Error')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateQuickAdd = (idProducto: number, field: keyof QuickAddState, value: string | number) => {
    setQuickAdds(p => ({
      ...p,
      [idProducto]: {
        ...(p[idProducto] || { cantidad: 1, precioEspecial: '', expiracionMin: 60 }),
        [field]: field === 'cantidad' || field === 'expiracionMin' ? Math.max(1, Number(value) || 1) : value,
      },
    }))
  }

  const cartTotal = cartItems.reduce((sum, item) => {
    const precio = item.precio_especial ?? item.productos?.precio_venta ?? 0
    return sum + precio * item.cantidad
  }, 0)

  const cartCount = cartItems.reduce((sum, item) => sum + item.cantidad, 0)

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-stone-50 dark:bg-stone-950">
      {/* ─── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-900 dark:text-white">Ventas Live</h1>
            <p className="text-[10px] text-stone-400">Gestion de carritos en tiempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mensaje && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium animate-in fade-in ${
              mensaje.tipo === 'ok'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {mensaje.tipo === 'ok' ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {mensaje.texto}
            </div>
          )}
          {clienteSeleccionado && (
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg pl-3 pr-1.5 py-1.5">
              <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="text-right leading-tight">
                <p className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">
                  {clienteSeleccionado.nombre} {clienteSeleccionado.apellido || ''}
                </p>
                {cartCount > 0 && (
                  <p className="text-[9px] text-purple-600 dark:text-purple-400">{cartCount} items · {formatCLP(cartTotal)}</p>
                )}
              </div>
              <button onClick={() => setClienteSeleccionado(null)} className="ml-1 p-1 text-purple-400 hover:text-purple-600 rounded">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Client selector bar ─────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 py-2.5 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Filtrar clientes..."
              value={busquedaCliente}
              onChange={e => setBusquedaCliente(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarClientes()}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <button onClick={buscarClientes} className="text-[10px] px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 rounded-lg transition-colors">
            Filtrar
          </button>
          <div className="flex items-center gap-1.5 ml-2 overflow-x-auto flex-1 scrollbar-none">
            {buscandoClientes ? (
              <span className="text-[10px] text-stone-400 px-2">Cargando...</span>
            ) : (
              clientes.map(c => (
                <button key={c.id_cliente}
                  onClick={() => setClienteSeleccionado(c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex-shrink-0 whitespace-nowrap border ${
                    clienteSeleccionado?.id_cliente === c.id_cliente
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}>
                  <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                    {(c.nombre?.[0] || '?').toUpperCase()}
                  </span>
                  {c.nombre} {c.apellido?.charAt(0) || ''}.
                </button>
              ))
            )}
          </div>
          {!clienteSeleccionado && clientes.length > 0 && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full flex-shrink-0">
              Selecciona cliente →
            </span>
          )}
        </div>
      </div>

      {/* ─── Product grid ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Product search */}
        <div className="sticky top-0 z-10 px-4 lg:px-6 py-2.5 bg-stone-50/90 dark:bg-stone-950/90 backdrop-blur-sm border-b border-stone-200/50 dark:border-stone-800/50 flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busquedaProducto}
              onChange={e => setBusquedaProducto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarProductos()}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <button onClick={buscarProductos} className="text-[10px] px-2 py-1 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 rounded transition-colors">
            Buscar
          </button>
          <span className="text-[10px] text-stone-400 ml-auto">{productos.length} productos</span>
        </div>

        {/* Product cards */}
        <div className="p-3 lg:p-4">
          {buscandoProductos ? (
            <div className="text-center py-12 text-xs text-stone-400">Cargando productos...</div>
          ) : productos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-xs text-stone-400">Sin productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {productos.map(p => {
                const qa = quickAdds[p.id_producto] || { cantidad: 1, precioEspecial: '', expiracionMin: 60 }
                const img = p.imagenes_productos?.[0]?.url
                const isAdding = agregandoProducto === p.id_producto
                return (
                  <div key={p.id_producto}
                    className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-purple-300 dark:hover:border-purple-700 p-3 flex flex-col gap-2 transition-all group">
                    {/* Image + name */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0 border border-stone-200 dark:border-stone-700">
                        {img ? (
                          <Image src={img} alt={p.nombre} width={40} height={40} className="object-cover w-full h-full" />
                        ) : (
                          <Package className="h-4 w-4 text-stone-300 m-auto mt-3" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-stone-900 dark:text-white line-clamp-2 leading-tight">{p.nombre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300">{formatCLP(p.precio_venta)}</span>
                          <span className="text-[9px] text-stone-400">· {p.stock_total} und</span>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col gap-1.5 mt-auto">
                      <div className="flex items-center gap-1">
                        {/* Qty */}
                        <div className="flex items-center gap-0 bg-stone-100 dark:bg-stone-800 rounded-md border border-stone-200 dark:border-stone-600 flex-shrink-0">
                          <button onClick={() => updateQuickAdd(p.id_producto, 'cantidad', qa.cantidad - 1)}
                            className="p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-l-md"><Minus className="h-3 w-3 text-stone-500" /></button>
                          <input type="number" min={1} value={qa.cantidad}
                            onChange={e => updateQuickAdd(p.id_producto, 'cantidad', Number(e.target.value))}
                            className="w-7 text-center text-[11px] bg-transparent text-stone-900 dark:text-white font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          <button onClick={() => updateQuickAdd(p.id_producto, 'cantidad', qa.cantidad + 1)}
                            className="p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-r-md"><Plus className="h-3 w-3 text-stone-500" /></button>
                        </div>
                        {/* Price */}
                        <input type="number" placeholder="Precio"
                          value={qa.precioEspecial}
                          onChange={e => updateQuickAdd(p.id_producto, 'precioEspecial', e.target.value)}
                          className="flex-1 min-w-0 px-1.5 py-1 text-[10px] bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-md text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-purple-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        {/* Timeout */}
                        <select value={qa.expiracionMin}
                          onChange={e => updateQuickAdd(p.id_producto, 'expiracionMin', Number(e.target.value))}
                          className="px-1 py-1 text-[10px] bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-md text-stone-600 dark:text-stone-400 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer flex-shrink-0">
                          <option value={15}>15m</option>
                          <option value={30}>30m</option>
                          <option value={45}>45m</option>
                          <option value={60}>60m</option>
                          <option value={90}>90m</option>
                          <option value={120}>2h</option>
                        </select>
                      </div>
                      <button onClick={() => handleQuickAdd(p)}
                        disabled={!clienteSeleccionado || isAdding}
                        className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
                        {isAdding ? (
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><Zap className="h-3 w-3" /> Agregar</>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Cart panel (bottom) ──────────────────────────────────────────── */}
      {clienteSeleccionado && (
        <div className="border-t-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-stone-900 flex-shrink-0 max-h-[40vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-purple-500" />
              <h3 className="text-xs font-bold text-stone-900 dark:text-white">
                Carrito de {clienteSeleccionado.nombre}
              </h3>
              {cartCount > 0 && (
                <span className="text-[10px] text-stone-400">· {cartCount} items · {formatCLP(cartTotal)}</span>
              )}
            </div>
            <button onClick={cargarCarrito} disabled={cargandoCarrito}
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${cargandoCarrito ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cargandoCarrito && cartItems.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-400">Cargando carrito...</div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-6">
                <ShoppingCart className="h-6 w-6 text-stone-300 dark:text-stone-600 mx-auto mb-1" />
                <p className="text-[11px] text-stone-400">Carrito vacio</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {cartItems.map(item => {
                  const producto = item.productos
                  if (!producto) return null
                  const img = producto.imagenes_productos?.[0]?.url || '/placeholder.avif'
                  const precioActual = item.precio_especial ?? producto.precio_venta
                  const tieneDescuento = item.precio_especial && item.precio_especial < producto.precio_venta

                  return (
                    <div key={item.id_reserva} className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                      {/* Image */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0 border border-stone-200 dark:border-stone-700">
                        <Image src={img} alt={producto.nombre} width={40} height={40} className="object-cover w-full h-full" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-stone-900 dark:text-white line-clamp-1">{producto.nombre}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {editandoPrecio === item.id_reserva ? (
                            <div className="flex items-center gap-1">
                              <input type="number" value={precioEditado}
                                onChange={e => setPrecioEditado(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleEditarPrecio(item.id_reserva, precioEditado.trim() === '' ? null : Number(precioEditado)); if (e.key === 'Escape') setEditandoPrecio(null) }}
                                placeholder="Web" autoFocus
                                className="w-16 px-1.5 py-0.5 text-[10px] border border-purple-300 dark:border-purple-700 rounded bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              <button onClick={() => handleEditarPrecio(item.id_reserva, precioEditado.trim() === '' ? null : Number(precioEditado))} className="p-0.5 text-emerald-600"><Check className="h-3 w-3" /></button>
                              <button onClick={() => setEditandoPrecio(null)} className="p-0.5 text-stone-400"><X className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-[11px] font-bold ${tieneDescuento ? 'text-purple-700 dark:text-purple-400' : 'text-stone-900 dark:text-white'}`}>{formatCLP(precioActual)}</span>
                              {tieneDescuento && <span className="text-[9px] text-stone-400 line-through">{formatCLP(producto.precio_venta)}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-0 bg-stone-100 dark:bg-stone-800 rounded-md border border-stone-200 dark:border-stone-600 flex-shrink-0">
                        <button onClick={() => handleCambiarCantidad(item.id_reserva, item.cantidad - 1)}
                          className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-l-md"><Minus className="h-3 w-3 text-stone-500" /></button>
                        <span className="w-6 text-center text-[11px] font-medium text-stone-900 dark:text-white">{item.cantidad}</span>
                        <button onClick={() => handleCambiarCantidad(item.id_reserva, item.cantidad + 1)}
                          className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-r-md"><Plus className="h-3 w-3 text-stone-500" /></button>
                      </div>

                      {/* Timer */}
                      <CountdownBadge fecha={item.fecha_expiracion} className="flex-shrink-0" />

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => { setEditandoPrecio(item.id_reserva); setPrecioEditado(String(item.precio_especial ?? '')) }}
                          className="p-1 text-stone-400 hover:text-purple-600 dark:hover:text-purple-400 rounded" title="Editar precio">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleExtender(item.id_reserva, 15)}
                          className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded" title="+15 min">
                          <Timer className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleEliminar(item.id_reserva)}
                          className="p-1 text-stone-400 hover:text-red-600 dark:hover:text-red-400 rounded" title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
