"use server";

import { createClient } from "@/lib/supabase/server";

async function getSupabase() {
  return await createClient();
}

const PRODUCTO_SELECT = `
  id_producto, nombre, nombre_cientifico, descripcion, precio_venta,
  stock_total, estado, destacado, nuevo, prioridad, id_categoria,
  categorias (nombre), imagenes_productos (url)
`;

const uniqueById = (items: any[] = []) => {
  const map = new Map();
  items.forEach((item) => { if (!map.has(item.id_producto)) map.set(item.id_producto, item); });
  return Array.from(map.values());
};

const toNumber = (value: any): number => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortNuevoPrimero = (items: any[] = []) => {
  return [...items].sort((a, b) => {
    const nuevoDiff = Number(Boolean(b?.nuevo)) - Number(Boolean(a?.nuevo));
    if (nuevoDiff !== 0) return nuevoDiff;
    const prioridadDiff = toNumber(b?.prioridad) - toNumber(a?.prioridad);
    if (prioridadDiff !== 0) return prioridadDiff;
    const destacadoDiff = Number(Boolean(b?.destacado)) - Number(Boolean(a?.destacado));
    if (destacadoDiff !== 0) return destacadoDiff;
    return (a?.nombre || "").localeCompare(b?.nombre || "");
  });
};

interface GetProductosParams {
  pagina?: number;
  porPagina?: number;
  categoria?: string;
  busqueda?: string;
  precio?: string;
  disponibilidad?: string;
}

export async function getProductos({ pagina = 1, porPagina = 12, categoria = "", busqueda = "", precio = "", disponibilidad = "" }: GetProductosParams = {}) {
  const desde = (pagina - 1) * porPagina;
  const hasta = desde + porPagina - 1;
  let query = (await getSupabase()).from("productos").select(PRODUCTO_SELECT, { count: "exact" }).eq("estado", "activo");

  if (categoria && categoria !== "todas") {
    const nombres = categoria.split(',').map(c => c.trim()).filter(Boolean);
    if (nombres.length === 1) {
      const { data: cat } = await (await getSupabase()).from("categorias").select("id_categoria").eq("nombre", nombres[0]).single();
      if (cat) query = query.eq("id_categoria", cat.id_categoria);
    } else if (nombres.length > 1) {
      const { data: cats } = await (await getSupabase()).from("categorias").select("id_categoria").in("nombre", nombres);
      if (cats && cats.length > 0) query = query.in("id_categoria", cats.map(c => c.id_categoria));
    }
  }
  if (busqueda) query = query.or(`nombre.ilike.%${busqueda}%,nombre_cientifico.ilike.%${busqueda}%`);
  if (disponibilidad === "stock") query = query.gt("stock_total", 0);
  else if (disponibilidad === "agotado") query = query.eq("stock_total", 0);
  if (precio === "0-5000") query = query.lte("precio_venta", 5000);
  else if (precio === "5000-15000") query = query.gt("precio_venta", 5000).lte("precio_venta", 15000);
  else if (precio === "15000-30000") query = query.gt("precio_venta", 15000).lte("precio_venta", 30000);
  else if (precio === "30000+") query = query.gt("precio_venta", 30000);

  query = query.order("destacado", { ascending: false }).order("prioridad", { ascending: false }).range(desde, hasta);
  const { data, error, count } = await query;
  if (error) { console.error(error); return { productos: [], total: 0 }; }
  return { productos: data, total: count || 0 };
}

export async function getCategorias() {
  const { data, error } = await (await getSupabase()).from("categorias").select("nombre");
  if (error) { console.error(error); return []; }
  const nombres = data.map((c: any) => c.nombre?.trim()).filter(Boolean);
  return [...new Set(nombres)].sort();
}

export async function getDestacados(limit = 4) {
  const { data, error } = await (await getSupabase()).from("productos").select(PRODUCTO_SELECT).eq("estado", "activo").eq("destacado", true).order("prioridad", { ascending: false }).limit(limit);
  if (error) return [];
  let resultado = uniqueById(data);
  if (resultado.length < limit) {
    const ids = resultado.map((p: any) => p.id_producto);
    let extrasQuery = (await getSupabase()).from("productos").select(PRODUCTO_SELECT).eq("estado", "activo").order("destacado", { ascending: false }).order("prioridad", { ascending: false }).limit(limit - resultado.length);
    if (ids.length > 0) extrasQuery = extrasQuery.not("id_producto", "in", `(${ids.join(",")})`);
    const { data: extras } = await extrasQuery;
    if (extras) resultado = uniqueById([...resultado, ...extras]);
  }
  return sortNuevoPrimero(resultado).slice(0, limit);
}

export async function getNuevos(limit = 6) {
  const { data, error } = await (await getSupabase()).from("productos").select(PRODUCTO_SELECT).eq("estado", "activo").eq("nuevo", true).order("prioridad", { ascending: false }).limit(limit);
  if (error) return [];
  let resultado = uniqueById(data);
  if (resultado.length < limit) {
    const ids = resultado.map((p: any) => p.id_producto);
    let extrasQuery = (await getSupabase()).from("productos").select(PRODUCTO_SELECT).eq("estado", "activo").eq("nuevo", false).order("destacado", { ascending: false }).order("prioridad", { ascending: false }).limit(limit - resultado.length);
    if (ids.length > 0) extrasQuery = extrasQuery.not("id_producto", "in", `(${ids.join(",")})`);
    const { data: extras } = await extrasQuery;
    if (extras) resultado = uniqueById([...resultado, ...extras]);
  }
  return sortNuevoPrimero(resultado).slice(0, limit);
}

export async function getHeroProductos(limit = 4) {
  const { data, error } = await (await getSupabase()).from("productos").select(PRODUCTO_SELECT).eq("estado", "activo").or("destacado.eq.true,nuevo.eq.true,prioridad.gte.10").order("destacado", { ascending: false }).order("nuevo", { ascending: false }).order("prioridad", { ascending: false }).limit(limit * 2);
  if (error) return [];
  let resultado = uniqueById(data).slice(0, limit);
  if (resultado.length < limit) {
    const ids = resultado.map((p: any) => p.id_producto);
    let extrasQuery = (await getSupabase()).from("productos").select(PRODUCTO_SELECT).eq("estado", "activo").order("prioridad", { ascending: false }).limit(limit - resultado.length);
    if (ids.length > 0) extrasQuery = extrasQuery.not("id_producto", "in", `(${ids.join(",")})`);
    const { data: extras } = await extrasQuery;
    if (extras) resultado = uniqueById([...resultado, ...extras]).slice(0, limit);
  }
  return sortNuevoPrimero(resultado).slice(0, limit);
}

export async function getProductoById(id: string) {
  const { data, error } = await (await getSupabase()).from("productos").select(`id_producto, nombre, nombre_cientifico, descripcion, precio_venta, precio_costo, stock_total, estado, tipo_venta, id_categoria, categorias (nombre), imagenes_productos (url, es_principal, orden)`).eq("id_producto", Number(id)).single();
  if (error) { console.error(error); return null; }
  return data;
}
