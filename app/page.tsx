import Link from "next/link";
import { Leaf, Droplets, TrendingUp, BadgeCheck, ArrowRight } from "lucide-react";
import HeroCarousel from "@/components/HeroCarousel";
import ProductCarousel from "@/components/ProductCarousel";
import ProductCard from "@/components/ProductCard";
import { getDestacados, getHeroProductos, getNuevos, getProductos } from "@/lib/actions/productos";
import { formatCLP } from "@/lib/utils";

const HERO_COUNT = 4;
const NUEVOS_COUNT = 4;
const HERO_FETCH = HERO_COUNT + 4;
const NUEVOS_FETCH = NUEVOS_COUNT + 8;
const CATALOGO_FETCH = 30;

export default async function Home() {
  const [heroSource, nuevosSource, catalogoResp] = await Promise.all([
    getHeroProductos(HERO_FETCH),
    getNuevos(NUEVOS_FETCH),
    getProductos({ porPagina: CATALOGO_FETCH })
  ]);

  const usedIds = new Set<number>();

  const takeUnique = (items: any[], count: number) => {
    const result: any[] = [];
    for (const item of items) {
      if (!item) continue;
      if (usedIds.has(item.id_producto)) continue;
      result.push(item);
      usedIds.add(item.id_producto);
      if (result.length === count) break;
    }
    return result;
  };

  const heroItems = takeUnique(heroSource, HERO_COUNT);
  const nuevos = takeUnique(nuevosSource, NUEVOS_COUNT);

  const catalogoRaw = catalogoResp.productos ?? [];
  const catalogo = catalogoRaw.filter((producto: any) => !usedIds.has(producto.id_producto));

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      {/* Hero Carousel */}
      <HeroCarousel productos={heroItems} />

      {/* Features Section */}
      <section className="py-8 md:py-16 bg-white dark:bg-stone-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-xl md:text-3xl font-bold text-black dark:text-white mb-1 md:mb-4">
              ¿Por qué elegir GottLab?
            </h2>
            <p className="text-sm md:text-lg text-gray-500 dark:text-stone-400 max-w-2xl mx-auto">
              Tecnología de vanguardia para cultivar las plantas más exóticas y saludables
            </p>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-8">
            <div className="text-center p-4 md:p-8 bg-stone-50 dark:bg-stone-900 rounded-xl md:rounded-2xl">
              <div className="w-9 h-9 md:w-14 md:h-14 bg-emerald-50 rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-4">
                <Droplets className="h-5 w-5 md:h-7 md:w-7 text-emerald-600" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-black dark:text-white mb-1 md:mb-2">Cultivo In Vitro</h3>
              <p className="text-gray-500 dark:text-stone-400 text-xs md:text-sm hidden md:block">
                Tecnología avanzada que garantiza plantas libres de enfermedades y con crecimiento óptimo
              </p>
            </div>
            
            <div className="text-center p-4 md:p-8 bg-stone-50 dark:bg-stone-900 rounded-xl md:rounded-2xl">
              <div className="w-9 h-9 md:w-14 md:h-14 bg-emerald-50 rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-4">
                <TrendingUp className="h-5 w-5 md:h-7 md:w-7 text-emerald-600" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-black dark:text-white mb-1 md:mb-2">Variedades Exclusivas</h3>
              <p className="text-gray-500 dark:text-stone-400 text-xs md:text-sm hidden md:block">
                Acceso a especies raras y híbridos únicos que no encontrarás en ningún otro lugar
              </p>
            </div>
            
            <div className="text-center p-4 md:p-8 bg-stone-50 dark:bg-stone-900 rounded-xl md:rounded-2xl">
              <div className="w-9 h-9 md:w-14 md:h-14 bg-emerald-50 rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-4">
                <BadgeCheck className="h-5 w-5 md:h-7 md:w-7 text-emerald-600" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-black dark:text-white mb-1 md:mb-2">Calidad Garantizada</h3>
              <p className="text-gray-500 dark:text-stone-400 text-xs md:text-sm hidden md:block">
                Cada planta es inspeccionada y certificada por nuestros expertos botánicos
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Productos Lo Nuevo */}
      <section className="py-16 bg-stone-50 dark:bg-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Título en div café */}
          <div className="bg-stone-800 rounded-2xl px-6 py-5 sm:px-8 sm:py-6 mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Lo Nuevo
              </h2>
              <p className="text-stone-300 text-sm sm:text-base mt-1">
                Las últimas incorporaciones a nuestra colección
              </p>
            </div>
            <Link 
              href="/productos"
              className="hidden sm:flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold text-sm"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {nuevos.map((producto: any) => (
              <ProductCard key={producto.id_producto} producto={producto} />
            ))}
          </div>

          <div className="sm:hidden mt-6 text-center">
            <Link 
              href="/productos"
              className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-sm"
            >
              Ver todos los productos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Destacados / Catálogo por prioridad */}
      {/* Carrusel catálogo */}
      {catalogo.length > 0 && <ProductCarousel productos={catalogo} />}

      {/* CTA Section */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Leaf className="h-10 w-10 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            ¿Listo para empezar tu colección?
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
            Únete a miles de coleccionistas que ya disfrutan de nuestras plantas exclusivas
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/productos"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 transition-colors text-lg"
            >
              Explorar Catálogo
            </Link>
            <Link 
              href="/preventas"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-700 text-white font-semibold rounded-2xl hover:border-gray-500 transition-colors"
            >
              Ver Preventas
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
