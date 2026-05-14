'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { getCarritoCompleto, agregarAlCarrito as agregarAlCarritoAction, actualizarCantidad as actualizarCantidadAction, eliminarDelCarrito as eliminarDelCarritoAction, vaciarCarrito as vaciarCarritoAction } from '@/lib/actions/carrito'

interface CarritoItem {
  id_reserva: number
  id_producto: number
  cantidad: number
  fecha_expiracion: string
  precio_especial: number | null
  origen: string | null
  productos: {
    nombre: string
    nombre_cientifico: string
    precio_venta: number
    stock_total: number
    imagenes_productos: { url: string }[]
  } | null
}

interface CarritoContextType {
  items: CarritoItem[]
  contador: number
  loading: boolean
  puedeUsarCarrito: boolean
  agregarProducto: (idProducto: number, cantidad?: number) => Promise<{ success: boolean; error?: string; message?: string }>
  actualizarCantidad: (idReserva: number, cantidad: number) => Promise<void>
  eliminarProducto: (idReserva: number) => Promise<void>
  vaciar: () => Promise<void>
  refrescar: () => Promise<void>
}

const CarritoContext = createContext<CarritoContextType>({
  items: [], contador: 0, loading: false, puedeUsarCarrito: false,
  agregarProducto: async () => ({ success: false }),
  actualizarCantidad: async () => {}, eliminarProducto: async () => {},
  vaciar: async () => {}, refrescar: async () => {}
})

export function useCarrito() { return useContext(CarritoContext) }

export default function CarritoProvider({ children }: { children: React.ReactNode }) {
  const { profile, isCliente, loading: authLoading } = useAuth()
  const [items, setItems] = useState<CarritoItem[]>([])
  const [contador, setContador] = useState(0)
  const [loading, setLoading] = useState(true) // true only for initial load
  const puedeUsarCarrito = isCliente && !!profile && !authLoading
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadDone = useRef(false)

  // Single fetch — replaces getCarrito() + getContadorCarrito() (was 8 queries, now 4)
  const cargarCarrito = useCallback(async (isInitial = false) => {
    if (authLoading) return
    if (!isCliente || !profile) { setItems([]); setContador(0); setLoading(false); return }

    // Only show loading spinner on very first load. Background refreshes are silent.
    if (isInitial) setLoading(true)

    try {
      const { items: data, contador: count } = await getCarritoCompleto() as { items: CarritoItem[]; contador: number }
      setItems(data)
      setContador(count)
    } catch (_e) { /* auth error — silently keep stale data */ }
    finally { if (isInitial) setLoading(false) }
  }, [isCliente, profile, authLoading])

  // Initial load — only once when auth resolves
  useEffect(() => {
    if (!puedeUsarCarrito) return
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    cargarCarrito(true)
  }, [puedeUsarCarrito, cargarCarrito])

  // ─── Real-time subscription (debounced — max 1 reload per 2 seconds) ─────
  useEffect(() => {
    if (!puedeUsarCarrito || !profile) return

    const channel = supabase
      .channel('carrito-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        () => {
          // Debounce: clear any pending reload, schedule one for 2s from now
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            cargarCarrito(false) // background refresh — no loading flash
          }, 2000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [puedeUsarCarrito, profile, cargarCarrito])

  // ─── Safety-net polling (every 60s — only if page is visible) ────────────
  useEffect(() => {
    if (!puedeUsarCarrito) return
    const i = setInterval(() => {
      if (document.visibilityState === 'visible') cargarCarrito(false)
    }, 60000)
    return () => clearInterval(i)
  }, [cargarCarrito, puedeUsarCarrito])

  // ─── Refresh on tab focus ────────────────────────────────────────────────
  useEffect(() => {
    if (!puedeUsarCarrito) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') cargarCarrito(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [cargarCarrito, puedeUsarCarrito])

  // ─── Actions ─────────────────────────────────────────────────────────────
  const agregarProducto = async (idProducto: number, cantidad = 1) => {
    if (!puedeUsarCarrito) return { success: false, error: 'Debes iniciar sesion como cliente para agregar al carrito' }
    const r = await agregarAlCarritoAction(idProducto, cantidad)
    if (r.success) cargarCarrito(false)
    return r
  }

  const actualizarCantidad = async (idReserva: number, cantidad: number) => {
    // Optimistic
    setItems(p => p.map(i => i.id_reserva === idReserva ? { ...i, cantidad } : i))
    const el = items.find(i => i.id_reserva === idReserva)
    setContador(p => el ? p - el.cantidad + cantidad : p)
    const r = await actualizarCantidadAction(idReserva, cantidad)
    if (!r.success) cargarCarrito(false)
  }

  const eliminarProducto = async (idReserva: number) => {
    const el = items.find(i => i.id_reserva === idReserva)
    setItems(p => p.filter(i => i.id_reserva !== idReserva))
    if (el) setContador(p => p - el.cantidad)
    const r = await eliminarDelCarritoAction(idReserva)
    if (!r.success) cargarCarrito(false)
  }

  const vaciar = async () => {
    if (!puedeUsarCarrito) return
    setItems([]); setContador(0)
    const r = await vaciarCarritoAction()
    if (!r.success) cargarCarrito(false)
  }

  return (
    <CarritoContext.Provider value={{
      items, contador, loading, puedeUsarCarrito,
      agregarProducto, actualizarCantidad, eliminarProducto, vaciar,
      refrescar: () => cargarCarrito(false)
    }}>
      {children}
    </CarritoContext.Provider>
  )
}
