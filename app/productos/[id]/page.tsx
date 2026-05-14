import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductoById, getProductos } from '@/lib/actions/productos'
import { Leaf, Truck, Shield, Package, ArrowLeft, BadgeCheck, Droplets, Sun, Thermometer } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import PageTransition from '@/components/PageTransition'
import AgregarAlCarritoBtn from '@/components/AgregarAlCarritoBtn'

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const producto = await getProductoById(id)

  if (!producto) {
    notFound()
  }

  const stock = producto.stock_total ?? 0
  const enStock = stock > 0
  const stockBajo = stock > 0 && stock <= 5
  const cats = producto.categorias as any
  const categoria = Array.isArray(cats) ? (cats[0]?.nombre || '') : (cats?.nombre || '')
  const imagenPrincipal = producto.imagenes_productos?.find((img: any) => img.es_principal)?.url
    || producto.imagenes_productos?.[0]?.url
    || '/placeholder.avif'
  const imagenes = producto.imagenes_productos?.length > 0
    ? producto.imagenes_productos.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
    : [{ url: '/placeholder.avif' }]

  // Productos relacionados (misma categoría)
  const { productos: relacionados } = await getProductos({
    categoria,
    porPagina: 4,
  })
  const relacionadosFiltrados = relacionados.filter((p: any) => p.id_producto !== producto.id_producto).slice(0, 4)

  return (
    <PageTransition>
    <div className="min-h-screen bg-white dark:bg-stone-950">
      {/* Top bar */}
      <div className="border-b border-gray-100 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 pt-20">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/productos" className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
            <span>/</span>
            <span className="capitalize">{categoria}</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-stone-200 font-medium truncate">{producto.nombre}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-16">

          {/* GALERÍA */}
          <div className="space-y-3 sm:space-y-4">
            <div className="relative aspect-square sm:aspect-[4/5] bg-stone-50 rounded-2xl sm:rounded-3xl overflow-hidden">
              <Image
                src={'/placeholder.avif'}
                alt={producto.nombre}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              {stockBajo && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
                  ¡Últimas {producto.stock_total} unidades!
                </div>
              )}
              {!enStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-white text-black font-bold text-lg px-6 py-3 rounded-full">
                    Agotado
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {imagenes.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {imagenes.slice(0, 4).map((img: any, i: number) => (
                  <div key={i} className="relative aspect-square bg-stone-50 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-emerald-500 transition-colors cursor-pointer">
                    <Image
                      src={'/placeholder.avif'}
                      alt={`${producto.nombre} - ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="flex flex-col justify-center space-y-4 sm:space-y-6">
            {/* Categoría badge */}
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                <Leaf className="h-3.5 w-3.5" />
                {categoria}
              </span>
            </div>

            {/* Nombre */}
            <div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-black dark:text-white leading-tight">
                {producto.nombre}
              </h1>
              {producto.nombre_cientifico && (
                <p className="text-lg text-gray-400 italic mt-2">{producto.nombre_cientifico}</p>
              )}
            </div>

            {/* Precio */}
            <div className="flex items-end gap-3">
              <span className="text-3xl sm:text-5xl font-black text-black dark:text-white">
                ${Number(producto.precio_venta).toLocaleString('es-CL')}
              </span>
              {producto.tipo_venta && (
                <span className="text-sm text-gray-400 mb-2">/ {producto.tipo_venta}</span>
              )}
            </div>

            {/* Disponibilidad */}
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${enStock ? 'bg-emerald-500' : 'bg-red-400'}`} />
              <span className={`text-sm font-medium ${enStock ? 'text-emerald-700' : 'text-red-600'}`}>
                {enStock ? `En stock — ${producto.stock_total} disponibles` : 'Agotado'}
              </span>
            </div>

            {/* Descripción */}
            {producto.descripcion && (
              <p className="text-gray-600 dark:text-stone-400 text-base leading-relaxed border-l-4 border-emerald-200 dark:border-emerald-700 pl-4">
                {producto.descripcion}
              </p>
            )}

            {/* CTA */}
            <div className="pt-2 space-y-3">
              <AgregarAlCarritoBtn idProducto={producto.id_producto} enStock={enStock} />

              <Link
                href={`/productos/${producto.id_producto}/consulta`}
                className="w-full py-3.5 px-8 rounded-2xl text-base font-semibold border-2 border-gray-200 dark:border-stone-600 text-gray-700 dark:text-stone-300 hover:border-emerald-500 hover:text-emerald-600 transition-all text-center block"
              >
                Consultar sobre esta planta
              </Link>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Truck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">Envío seguro</p>
                  <p className="text-xs text-gray-400">A todo Chile</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Shield className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">Garantía</p>
                  <p className="text-xs text-gray-400">Planta saludable</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Package className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">Empaque premium</p>
                  <p className="text-xs text-gray-400">Protección extra</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <BadgeCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">Cultivo in vitro</p>
                  <p className="text-xs text-gray-400">Libre de plagas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE INFO ADICIONAL */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-stone-50 dark:bg-stone-900 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Sun className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-black dark:text-white">Iluminación</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-stone-400">Luz indirecta brillante. Evitar sol directo prolongado.</p>
          </div>
          <div className="bg-stone-50 dark:bg-stone-900 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Droplets className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-black dark:text-white">Riego</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-stone-400">Riego moderado. Mantener sustrato húmedo sin encharcar.</p>
          </div>
          <div className="bg-stone-50 dark:bg-stone-900 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Thermometer className="h-5 w-5 text-red-400" />
              <h3 className="font-bold text-black dark:text-white">Temperatura</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-stone-400">Entre 18°C y 28°C. Proteger de heladas y corrientes frías.</p>
          </div>
        </div>

        {/* PRODUCTOS RELACIONADOS */}
        {relacionadosFiltrados.length > 0 && (
          <div className="mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-8">
              <h2 className="text-2xl font-bold text-black dark:text-white">También te puede interesar</h2>
              <Link href={`/productos?categoria=${categoria}`} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                Ver más →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {relacionadosFiltrados.map((rel: any) => (
                <ProductCard key={rel.id_producto} producto={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  )
}
