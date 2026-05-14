'use client'

import { useState, useEffect } from 'react'
import { useCarrito } from '@/contexts/CarritoContext'
import { useAuth } from '@/contexts/AuthContext'
import { validarCarritoParaCheckout } from '@/lib/actions/carrito'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ArrowLeft, AlertCircle, Phone, IdCard, User, LogIn, Clock, Zap } from 'lucide-react'
import { formatCLP } from '@/lib/utils'

function CountdownTimer({ fechaExpiracion }: { fechaExpiracion: string }) {
  const [segundos, setSegundos] = useState(0)

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(fechaExpiracion).getTime() - Date.now()) / 1000))
      setSegundos(remaining)
    }
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [fechaExpiracion])

  const min = Math.floor(segundos / 60)
  const sec = segundos % 60
  const urgent = segundos < 300 // < 5 min

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono ${urgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
      <Clock className="h-3 w-3" />
      {min}:{sec.toString().padStart(2, '0')}
    </span>
  )
}

export default function CarritoPage() {
  const { items, loading, actualizarCantidad, eliminarProducto, vaciar, puedeUsarCarrito } = useCarrito()
  const { isCliente, profile } = useAuth()
  const [validando, setValidando] = useState(false)
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([])

  const tieneTelefono = !!profile?.telefono?.trim()
  const tieneRut = !!profile?.rut?.trim()
  const datosCompletos = tieneTelefono && tieneRut

  const handleProcederAlPago = async () => {
    if (!isCliente) return
    setValidando(true)
    setErroresValidacion([])

    if (!datosCompletos) {
      const errs = []
      if (!tieneTelefono) errs.push('Debes completar tu telefono en Mi Cuenta para proceder con la compra')
      if (!tieneRut) errs.push('Debes completar tu RUT en Mi Cuenta para proceder con la compra')
      setErroresValidacion(errs)
      setValidando(false)
      return
    }

    const resultado = await validarCarritoParaCheckout()
    if (!resultado.valido) { setErroresValidacion(resultado.errores); setValidando(false); return }

    // TODO: Redirect to checkout page
    setValidando(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center"><p className="text-gray-500 dark:text-stone-400">Cargando carrito...</p></div>
  }

  if (!isCliente) {
    return (
      <div className="min-h-screen bg-white dark:bg-stone-950 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold text-black dark:text-white mb-4">Inicia sesion para ver tu carrito</h1>
            <p className="text-gray-600 dark:text-stone-400 mb-8">Necesitas una cuenta para comprar en GottLab</p>
            <Link href="/login?redirect=/carrito" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-medium transition-all">
              <LogIn className="h-5 w-5" /> Iniciar sesion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-stone-950 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold text-black dark:text-white mb-4">Tu carrito esta vacio</h1>
            <p className="text-gray-600 dark:text-stone-400 mb-8">Agrega productos para comenzar tu compra</p>
            <Link href="/productos" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-medium transition-all">
              <ArrowLeft className="h-5 w-5" /> Ver productos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const subtotal = items.reduce((sum, item) => {
    const precio = item.precio_especial ?? item.productos?.precio_venta ?? 0
    return sum + precio * item.cantidad
  }, 0)

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">Carrito de Compras</h1>
            <p className="text-gray-600 dark:text-stone-400 mt-1">{items.length} {items.length === 1 ? 'producto' : 'productos'}</p>
          </div>
          <button onClick={vaciar} className="text-sm text-red-600 hover:text-red-700 font-medium">Vaciar carrito</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const producto = item.productos
              if (!producto) return null
              const img = producto.imagenes_productos?.[0]?.url || '/placeholder.avif'
              const precio = item.precio_especial ?? producto.precio_venta
              const tieneDescuento = item.precio_especial && item.precio_especial < producto.precio_venta
              const esLive = item.origen === 'live'

              return (
                <div key={item.id_reserva} className="bg-stone-50 dark:bg-stone-900 rounded-2xl p-4 flex gap-4">
                  <div className="relative w-24 h-24 flex-shrink-0 bg-white dark:bg-stone-800 rounded-xl overflow-hidden">
                    <Image src={img} alt={producto.nombre} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/productos/${item.id_producto}`}>
                        <h3 className="font-bold text-black dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors line-clamp-1">
                          {producto.nombre}
                        </h3>
                      </Link>
                      {esLive && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                          <Zap className="h-2.5 w-2.5" /> LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-stone-400 italic line-clamp-1">{producto.nombre_cientifico}</p>
                    <div className="mt-1">
                      {tieneDescuento ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-black dark:text-white">{formatCLP(precio)}</span>
                          <span className="text-sm text-gray-400 line-through">{formatCLP(producto.precio_venta)}</span>
                        </div>
                      ) : (
                        <p className="text-lg font-black text-black dark:text-white">{formatCLP(precio)}</p>
                      )}
                    </div>
                    <div className="mt-1">
                      <CountdownTimer fechaExpiracion={item.fecha_expiracion} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => eliminarProducto(item.id_reserva)} className="text-red-600 hover:text-red-700 p-1"><Trash2 className="h-5 w-5" /></button>
                    <div className="flex items-center gap-2 bg-white dark:bg-stone-800 rounded-lg border border-gray-200 dark:border-stone-700">
                      <button onClick={() => actualizarCantidad(item.id_reserva, item.cantidad - 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-stone-700 rounded-l-lg"><Minus className="h-4 w-4" /></button>
                      <span className="w-8 text-center font-medium dark:text-white">{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(item.id_reserva, item.cantidad + 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-stone-700 rounded-r-lg" disabled={item.cantidad >= (producto.stock_total || 0)}><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="lg:col-span-1">
            <div className="bg-stone-50 dark:bg-stone-900 rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-black dark:text-white mb-4">Resumen</h2>

              {!datosCompletos && (
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2"><User className="h-4 w-4" />Datos requeridos para comprar</p>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
                    {!tieneTelefono && <li className="flex items-center gap-1"><Phone className="h-3 w-3" />Falta telefono</li>}
                    {!tieneRut && <li className="flex items-center gap-1"><IdCard className="h-3 w-3" />Falta RUT</li>}
                  </ul>
                  <Link href="/mi-cuenta" className="mt-3 inline-block text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline">Completar datos en Mi Cuenta →</Link>
                </div>
              )}

              {erroresValidacion.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1"><p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Problemas con tu carrito:</p>
                      <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">{erroresValidacion.map((e, i) => <li key={i}>• {e}</li>)}</ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600 dark:text-stone-400"><span>Subtotal</span><span className="font-medium">{formatCLP(subtotal)}</span></div>
                <div className="flex justify-between text-gray-600 dark:text-stone-400"><span>Envio</span><span className="font-medium">A calcular</span></div>
                <div className="border-t border-gray-200 dark:border-stone-700 pt-3 flex justify-between text-lg font-bold text-black dark:text-white"><span>Total</span><span>{formatCLP(subtotal)}</span></div>
              </div>

              <button onClick={handleProcederAlPago} disabled={validando} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl">
                {validando ? 'Validando...' : 'Proceder al pago'}
              </button>
              <Link href="/productos" className="block text-center mt-4 text-sm text-gray-600 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">← Continuar comprando</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
