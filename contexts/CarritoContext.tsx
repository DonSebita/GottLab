'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { getCarrito, agregarAlCarrito as agregarAlCarritoAction, actualizarCantidad as actualizarCantidadAction, eliminarDelCarrito as eliminarDelCarritoAction, vaciarCarrito as vaciarCarritoAction, getContadorCarrito } from '@/lib/actions/carrito'

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
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const puedeUsarCarrito = isCliente && !!profile && !authLoading

  const cargarCarrito = useCallback(async () => {
    if (authLoading) return
    if (!isCliente || !profile) { setItems([]); setContador(0); setLoading(false); return }
    setLoading(true)
    try {
      const [d, c] = await Promise.all([getCarrito(), getContadorCarrito()])
      setItems(d as unknown as CarritoItem[])
      setContador(c)
    } catch (_e) { /* auth error — silently empty cart */ }
    finally { setLoading(false) }
  }, [isCliente, profile, authLoading])

  // ─── Real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!puedeUsarCarrito || !profile) return

    // Subscribe to reservas changes for this client
    // We can't filter by id_cliente in the channel, so we reload on any change
    const channel = supabase
      .channel('carrito-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        () => { cargarCarrito() }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [puedeUsarCarrito, profile, cargarCarrito])

  // Periodic refresh as fallback (every 30s)
  useEffect(() => {
    if (!puedeUsarCarrito) return
    cargarCarrito()
    const i = setInterval(cargarCarrito, 30000)
    return () => clearInterval(i)
  }, [cargarCarrito, puedeUsarCarrito])

  const agregarProducto = async (idProducto: number, cantidad = 1) => {
    if (!puedeUsarCarrito) return { success: false, error: 'Debes iniciar sesion como cliente para agregar al carrito' }
    const r = await agregarAlCarritoAction(idProducto, cantidad)
    if (r.success) cargarCarrito()
    return r
  }

  const actualizarCantidad = async (idReserva: number, cantidad: number) => {
    // Optimistic update
    setItems(p => p.map(i => i.id_reserva === idReserva ? { ...i, cantidad } : i))
    const el = items.find(i => i.id_reserva === idReserva)
    setContador(p => el ? p - el.cantidad + cantidad : p)
    const r = await actualizarCantidadAction(idReserva, cantidad)
    if (!r.success) cargarCarrito()
  }

  const eliminarProducto = async (idReserva: number) => {
    const el = items.find(i => i.id_reserva === idReserva)
    setItems(p => p.filter(i => i.id_reserva !== idReserva))
    if (el) setContador(p => p - el.cantidad)
    const r = await eliminarDelCarritoAction(idReserva)
    if (!r.success) cargarCarrito()
  }

  const vaciar = async () => {
    if (!puedeUsarCarrito) return
    setItems([]); setContador(0)
    const r = await vaciarCarritoAction()
    if (!r.success) cargarCarrito()
  }

  return (
    <CarritoContext.Provider value={{
      items, contador, loading, puedeUsarCarrito,
      agregarProducto, actualizarCantidad, eliminarProducto, vaciar,
      refrescar: cargarCarrito
    }}>
      {children}
    </CarritoContext.Provider>
  )
}
