'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCarrito, agregarAlCarrito as agregarAlCarritoAction, actualizarCantidad as actualizarCantidadAction, eliminarDelCarrito as eliminarDelCarritoAction, vaciarCarrito as vaciarCarritoAction, getContadorCarrito } from '@/lib/actions/carrito'

interface CarritoItem { id_reserva: number; id_producto: number; cantidad: number; fecha_expiracion: string; productos: { nombre: string; nombre_cientifico: string; precio_venta: number; stock_total: number; imagenes_productos: { url: string }[] } | null }
interface CarritoContextType { items: CarritoItem[]; contador: number; loading: boolean; puedeUsarCarrito: boolean; agregarProducto: (idProducto: number, cantidad?: number) => Promise<{ success: boolean; error?: string; message?: string }>; actualizarCantidad: (idReserva: number, cantidad: number) => Promise<void>; eliminarProducto: (idReserva: number) => Promise<void>; vaciar: () => Promise<void>; refrescar: () => Promise<void> }

const CarritoContext = createContext<CarritoContextType>({ items: [], contador: 0, loading: false, puedeUsarCarrito: false, agregarProducto: async () => ({ success: false }), actualizarCantidad: async () => {}, eliminarProducto: async () => {}, vaciar: async () => {}, refrescar: async () => {} })
export function useCarrito() { return useContext(CarritoContext) }

export default function CarritoProvider({ children }: { children: React.ReactNode }) {
  const { profile, isCliente, loading: authLoading } = useAuth()
  const [items, setItems] = useState<CarritoItem[]>([])
  const [contador, setContador] = useState(0)
  const [loading, setLoading] = useState(true)
  const puedeUsarCarrito = isCliente && !!profile && !authLoading

  const cargarCarrito = useCallback(async () => {
    if (authLoading) return
    if (!isCliente || !profile) { setItems([]); setContador(0); setLoading(false); return }
    setLoading(true)
    try {
      const [d, c] = await Promise.all([getCarrito(), getContadorCarrito()])
      setItems(d as unknown as CarritoItem[]); setContador(c)
    } catch (e) { /* auth error — silently empty cart */ }
    finally { setLoading(false) }
  }, [isCliente, profile, authLoading])

  useEffect(() => { cargarCarrito(); const i = setInterval(cargarCarrito, 60000); return () => clearInterval(i) }, [cargarCarrito])

  const agregarProducto = async (idProducto: number, cantidad = 1) => {
    if (!puedeUsarCarrito) return { success: false, error: 'Debes iniciar sesion como cliente para agregar al carrito' }
    const r = await agregarAlCarritoAction(idProducto, cantidad)
    if (r.success) cargarCarrito()
    return r
  }
  const actualizarCantidad = async (idReserva: number, cantidad: number) => {
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
  const vaciar = async () => { if (!puedeUsarCarrito) return; setItems([]); setContador(0); const r = await vaciarCarritoAction(); if (!r.success) cargarCarrito() }

  return <CarritoContext.Provider value={{ items, contador, loading, puedeUsarCarrito, agregarProducto, actualizarCantidad, eliminarProducto, vaciar, refrescar: cargarCarrito }}>{children}</CarritoContext.Provider>
}
