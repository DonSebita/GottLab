import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductoById } from '@/lib/actions/productos'
import { ArrowLeft, Leaf, MessageCircle, Mail, Phone } from 'lucide-react'

export default async function ConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const producto = await getProductoById(id)

  if (!producto) {
    notFound()
  }

  const cats = producto.categorias as any
  const categoria = Array.isArray(cats) ? (cats[0]?.nombre || '') : (cats?.nombre || '')

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 pt-20">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href={`/productos/${producto.id_producto}`} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium">
              <ArrowLeft className="h-4 w-4" />
              Volver al producto
            </Link>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Ficha del producto */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex gap-5 items-center">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-stone-50 flex-shrink-0">
              <Image
                src={'/placeholder.avif'}
                alt={producto.nombre}
                fill
                className="object-cover"
                sizes="128px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full mb-2">
                <Leaf className="h-3 w-3" />
                {categoria}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-black leading-tight">{producto.nombre}</h1>
              {producto.nombre_cientifico && (
                <p className="text-sm text-gray-400 italic mt-0.5">{producto.nombre_cientifico}</p>
              )}
              <p className="text-2xl font-black text-black mt-2">
                ${Number(producto.precio_venta).toLocaleString('es-CL')}
              </p>
            </div>
          </div>

          {producto.descripcion && (
            <p className="text-gray-600 text-sm leading-relaxed mt-4 border-t border-gray-100 pt-4">
              {producto.descripcion}
            </p>
          )}

          <div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Stock</span>
              <p className="font-semibold text-black">
                {(producto.stock_total ?? 0) > 0 ? `${producto.stock_total} disponibles` : 'Agotado'}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Categoría</span>
              <p className="font-semibold text-black capitalize">{categoria}</p>
            </div>
            {producto.tipo_venta && (
              <div>
                <span className="text-gray-400">Tipo de venta</span>
                <p className="font-semibold text-black capitalize">{producto.tipo_venta}</p>
              </div>
            )}
          </div>
        </div>

        {/* Formulario de consulta */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">Consulta sobre esta planta</h2>
              <p className="text-sm text-gray-400">Te responderemos a la brevedad</p>
            </div>
          </div>

          <form className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono (opcional)</label>
              <input
                type="tel"
                placeholder="+56 9 1234 5678"
                className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensaje</label>
              <textarea
                rows={5}
                placeholder={`Hola, me interesa "${producto.nombre}". Me gustaría saber más sobre...`}
                className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 px-8 bg-black text-white rounded-2xl text-lg font-bold hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-3"
            >
              <Mail className="h-5 w-5" />
              Enviar consulta
            </button>
          </form>

          {/* Contacto directo */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-4">¿Prefieres contactarnos directamente?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://wa.me/56912345678"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-6 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href="tel:+56912345678"
                className="flex items-center justify-center gap-2 py-3 px-6 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-all text-sm"
              >
                <Phone className="h-4 w-4" />
                Llamar
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
