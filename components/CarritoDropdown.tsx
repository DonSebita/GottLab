'use client'

import { useState, useEffect, useRef } from 'react'
import { useCarrito } from '@/contexts/CarritoContext'
import { useTheme } from '@/components/ThemeProvider'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  isMobile?: boolean
}

export default function CarritoDropdown({ isMobile = false }: Props) {
  const { items, contador, loading, eliminarProducto } = useCarrito()
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme } = useTheme()
  const pathname = usePathname()

  // Detectar scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Determinar colores según contexto
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isPreventasPage = pathname === '/preventas'
  const isHome = pathname === '/'
  const isWhite = isAuthPage || isScrolled
  const useWhiteText = isPreventasPage && !isScrolled

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!isMobile) {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isMobile])

  // En mobile, redirigir a página completa
  const handleClick = () => {
    if (isMobile) {
      router.push('/carrito')
    } else {
      setIsOpen(!isOpen)
    }
  }

  const subtotal = items.reduce((sum, item) => {
    const precio = item.precio_especial ?? item.productos?.precio_venta ?? 0
    return sum + precio * item.cantidad
  }, 0)

  const formatCLP = (n: number) => `$${Number(n).toLocaleString('es-CL')}`

  const iconColor = isWhite 
    ? (theme === 'dark' ? 'text-white hover:text-green-400' : 'text-stone-700 hover:text-green-600')
    : (useWhiteText || (!isHome && theme === 'dark'))
      ? 'text-white/90 hover:text-green-400'
      : 'text-stone-800 hover:text-green-700'

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón del carrito */}
      <button
        onClick={handleClick}
        className="relative p-2 transition-colors"
      >
        <ShoppingCart className={`h-5 w-5 ${iconColor}`} />
        {contador > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {contador}
          </span>
        )}
      </button>

      {/* Dropdown - Solo desktop */}
      {!isMobile && isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-stone-700 z-50 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-stone-700">
            <h3 className="font-bold text-lg text-black dark:text-white">
              Carrito ({contador})
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items */}
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-stone-400">
              Cargando...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 dark:text-stone-600 mb-3" />
              <p className="text-gray-500 dark:text-stone-400 text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                {items.map((item) => {
                  const producto = item.productos
                  if (!producto) return null

                  const imagen = producto.imagenes_productos?.[0]?.url || '/placeholder.avif'

                  return (
                    <div
                      key={item.id_reserva}
                      className="flex gap-3 p-4 border-b border-gray-100 dark:border-stone-800 hover:bg-gray-50 dark:hover:bg-stone-800/50 transition-colors"
                    >
                      {/* Imagen */}
                      <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-stone-800 rounded-lg overflow-hidden">
                        <Image
                          src={imagen}
                          alt={producto.nombre}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-black dark:text-white line-clamp-1">
                          {producto.nombre}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-stone-400 line-clamp-1">
                          {producto.nombre_cientifico}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-bold text-black dark:text-white">
                            {formatCLP(item.precio_especial ?? producto.precio_venta)}
                          </span>
                          {item.precio_especial && item.precio_especial < producto.precio_venta && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatCLP(producto.precio_venta)}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-stone-400">
                            x{item.cantidad}
                          </span>
                        </div>
                      </div>

                      {/* Eliminar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          eliminarProducto(item.id_reserva)
                        }}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors self-start"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 dark:bg-stone-800/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-black dark:text-white">Subtotal</span>
                  <span className="font-bold text-lg text-black dark:text-white">
                    {formatCLP(subtotal)}
                  </span>
                </div>
                <Link
                  href="/carrito"
                  onClick={() => setIsOpen(false)}
                  className="block w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-center rounded-xl font-bold transition-all"
                >
                  Ver carrito completo
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
