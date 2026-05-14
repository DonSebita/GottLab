'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Leaf, ShoppingCart, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const gradients = [
  "from-green-50 via-emerald-100 to-green-200",
  "from-emerald-100 via-teal-200 to-green-300",
  "from-lime-50 via-green-100 to-emerald-200",
  "from-teal-50 via-emerald-100 to-green-200",
]

export default function HeroCarousel({ productos }: { productos: any[] }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const slides = productos.slice(0, 4)
  const total = slides.length
  const minSwipeDistance = 50

  const restartTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (total === 0) return
    timerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % total)
    }, 3500)
  }, [total])

  useEffect(() => {
    restartTimer()
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [restartTimer])

  useEffect(() => {
    setCurrentSlide(0)
  }, [total])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    restartTimer()
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    restartTimer()
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    restartTimer()
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe) nextSlide()
    if (isRightSwipe) prevSlide()
  }

  if (slides.length === 0) return null

  const current = slides[currentSlide]
  const cats = current.categorias as any
  const categoria = Array.isArray(cats) ? (cats[0]?.nombre || '') : (cats?.nombre || '')
  const imagenPrincipal = current.imagenes_productos?.[0]?.url || "/placeholder.avif"
  const badgeLabel = current.nuevo ? 'Nuevo' : current.destacado ? 'Destacado' : `Prioridad ${current.prioridad ?? ''}`
  const badgeColor = current.nuevo ? 'bg-green-500' : current.destacado ? 'bg-emerald-600' : 'bg-stone-700'

  return (
    <div 
      className={`relative h-[80svh] sm:h-[82svh] lg:h-[86svh] overflow-hidden touch-pan-y bg-gradient-to-br ${gradients[currentSlide % gradients.length]}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Overlay Pattern */}
      <div className="absolute inset-0 bg-white/10" />
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-30">
        <div style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          position: "absolute",
          inset: 0
        }} />
      </div>
      </div>

      {/* Slides */}
      <div className="relative h-full">
        {slides.map((slide: any, index: number) => (
          <div
            key={slide.id_producto}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === currentSlide
                ? 'opacity-100 z-10 scale-100'
                : 'opacity-0 z-0 scale-[0.985]'
            }`}
          >
            {/* Content Container - Desktop */}
            <div className="hidden lg:flex relative z-10 h-full items-center px-12">
              <div className="w-full max-w-7xl mx-auto flex flex-row items-center gap-8">
                {/* Text Content - Desktop */}
                <div className="w-[55%] text-green-900 space-y-4">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-6 h-5 text-green-600" />
                    <span className="text-base font-semibold uppercase tracking-widest text-green-700">
                      {categoria || 'Nueva llegada'}
                    </span>
                  </div>
                  
                  <h1 className="text-7xl xl:text-8xl font-black leading-[1.05] bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent">
                    {slide.nombre}
                  </h1>

                  {slide.nombre_cientifico && (
                    <p className="text-base text-green-700/70 italic">{slide.nombre_cientifico}</p>
                  )}
                  
                  {slide.descripcion && (
                    <p className="text-lg text-green-800/90 max-w-lg leading-relaxed line-clamp-2">
                      {slide.descripcion}
                    </p>
                  )}
                  
                  {/* Feature Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-8">
                    {slide.stock_total > 0 && (
                      <span className="bg-white/90 backdrop-blur-sm border border-green-200 px-4 py-2 rounded-full text-sm font-medium text-green-700 shadow-sm">
                        En Stock
                      </span>
                    )}
                    <span className="bg-white/90 backdrop-blur-sm border border-green-200 px-4 py-2 rounded-full text-sm font-medium text-green-700 shadow-sm">
                      Envío seguro
                    </span>
                    <span className="bg-white/90 backdrop-blur-sm border border-green-200 px-4 py-2 rounded-full text-sm font-medium text-green-700 shadow-sm">
                      Cultivo in vitro
                    </span>
                  </div>

                  {/* Desktop Buttons */}
                  <div className="mt-4 flex min-h-[72px] items-end gap-4">
                    <Link 
                      href={`/productos/${slide.id_producto}`}
                      className="inline-flex items-center justify-center px-8 py-4 bg-stone-800 text-white font-semibold rounded-xl hover:bg-stone-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Ver Producto
                    </Link>
                    <Link 
                      href="/productos"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white/80 backdrop-blur-sm text-stone-800 font-semibold rounded-xl border-2 border-stone-200 hover:bg-white hover:border-stone-300 transition-all"
                    >
                      Ver Catálogo
                    </Link>
                  </div>
                </div>

                {/* Product Card - Desktop */}
                <div className="w-[45%] flex justify-center">
                  <div className="relative w-full max-w-md">
                    <div className="absolute inset-0 -m-8">
                      <div className="absolute inset-0 bg-gradient-radial from-white/60 via-white/30 to-transparent rounded-3xl blur-2xl" />
                      <div className="absolute top-1/4 left-0 w-32 h-16 bg-white/40 rounded-full blur-xl" />
                      <div className="absolute top-1/3 right-0 w-24 h-12 bg-white/30 rounded-full blur-xl" />
                      <div className="absolute bottom-1/4 left-1/4 w-40 h-20 bg-white/50 rounded-full blur-2xl" />
                    </div>
                    
                    <div className="relative bg-white/20 backdrop-blur-md rounded-3xl p-4 shadow-[0_40px_120px_rgba(16,24,40,0.25)]">
                      {/* Badge */}
                      <div className={`absolute -top-4 -right-4 ${badgeColor} text-white px-4 py-1.5 rounded-full font-semibold text-sm shadow-lg flex items-center gap-1 z-20`}>
                        <Sparkles className="w-4 h-4" />
                        {badgeLabel}
                      </div>
                      
                      <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-b from-stone-100/60 to-stone-200/60">
                        <Image
                          src={imagenPrincipal}
                          alt={slide.nombre}
                          fill
                          className="object-cover"
                          priority={index === 0}
                          sizes="400px"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Container - Mobile */}
            <div className="lg:hidden relative z-10 h-full flex flex-col gap-6">
              {/* Title Section - Centered vertically in available space */}
              <div className="flex-1 min-h-0 flex items-center px-5 pt-12 sm:pt-16">
                <div className="text-green-900 space-y-3">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-semibold uppercase tracking-widest text-green-700">
                      {categoria || 'Nueva llegada'}
                    </span>
                  </div>
                  
                  <h1 className="text-4xl sm:text-5xl font-black leading-[1.05] line-clamp-2 bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent">
                    {slide.nombre}
                  </h1>

                  {slide.nombre_cientifico && (
                    <p className="text-sm text-green-700/70 italic">{slide.nombre_cientifico}</p>
                  )}
                  
                  {/* Feature Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {slide.stock_total > 0 && (
                      <span className="bg-white/90 backdrop-blur-sm border border-green-200 px-3 py-1 rounded-full text-xs font-medium text-green-700 shadow-sm">
                        En Stock
                      </span>
                    )}
                    <span className="bg-white/90 backdrop-blur-sm border border-green-200 px-3 py-1 rounded-full text-xs font-medium text-green-700 shadow-sm">
                      Envío seguro
                    </span>
                    <span className="bg-white/90 backdrop-blur-sm border border-green-200 px-3 py-1 rounded-full text-xs font-medium text-green-700 shadow-sm">
                      Cultivo in vitro
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Image and Buttons fixed at bottom */}
              <div className="px-5 pb-8 mt-auto">
                {/* Product Image */}
                <div className="relative w-full max-w-[280px] sm:max-w-sm mx-auto mb-4">
                  <div className="relative bg-white/30 backdrop-blur-md rounded-2xl p-3 shadow-[0_24px_60px_rgba(16,24,40,0.25)]">
                    {/* Badge */}
                    <div className={`absolute -top-2 -right-2 ${badgeColor} text-white px-3 py-1 rounded-full font-semibold text-xs shadow-lg flex items-center gap-1 z-20`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      {badgeLabel}
                    </div>
                    
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-b from-stone-100/60 to-stone-200/60">
                      <Image
                        src={imagenPrincipal}
                        alt={slide.nombre}
                        fill
                        className="object-cover"
                        priority={index === 0}
                        sizes="320px"
                      />
                    </div>
                  </div>

                  {/* Slide Indicators */}
                  <div className="flex justify-center gap-2 mt-3">
                    {slides.map((_: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => goToSlide(idx)}
                        className={`transition-all duration-300 rounded-full ${
                          idx === currentSlide 
                            ? 'w-6 h-2 bg-stone-700' 
                            : 'w-2 h-2 bg-stone-400/60 hover:bg-stone-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Action Buttons - Large and prominent */}
                <div className="flex gap-3 w-full">
                  <Link 
                    href={`/productos/${slide.id_producto}`}
                    className="flex items-center justify-center flex-1 px-5 py-4 bg-stone-800 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-transform text-base"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Ver Producto
                  </Link>
                  <Link 
                    href="/productos"
                    className="flex items-center justify-center flex-1 px-5 py-4 bg-white/90 backdrop-blur-sm text-stone-800 font-bold rounded-2xl border-2 border-stone-300 active:scale-[0.98] transition-transform text-base"
                  >
                    Catálogo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="hidden lg:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/80 backdrop-blur-sm text-stone-700 rounded-full items-center justify-center hover:bg-white hover:shadow-lg transition-all border border-stone-200"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/80 backdrop-blur-sm text-stone-700 rounded-full items-center justify-center hover:bg-white hover:shadow-lg transition-all border border-stone-200"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Desktop Slide Indicators */}
      <div className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-20 gap-2">
        {slides.map((_: any, index: number) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentSlide 
                ? 'w-8 h-2 bg-stone-700' 
                : 'w-2 h-2 bg-stone-400/60 hover:bg-stone-500'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
