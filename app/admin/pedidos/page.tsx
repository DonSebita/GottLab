import { Suspense } from 'react'
import Link from 'next/link'
import { ShoppingCart, ChevronRight, Package } from 'lucide-react'
import { getPedidosAdmin } from '@/lib/actions/pedidos'
import FiltrosAdmin from './_components/FiltrosAdmin'
import type { EstadoPedido, PedidoCompleto } from '@/types/pedidos'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clp(n: number | null | undefined) {
  return n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—'
}
function shortDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

type BV = 'green' | 'yellow' | 'blue' | 'purple' | 'red' | 'gray' | 'orange'
function badge(label: string, v: BV) {
  const cls: Record<BV, string> = {
    green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    gray:   'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${cls[v]}`}>{label}</span>
}

function badgePedido(e: string) {
  const m: Record<string, [string, BV]> = {
    pendiente: ['Pendiente', 'yellow'], confirmado: ['Confirmado', 'blue'],
    en_preparacion: ['Preparación', 'orange'], despachado: ['Despachado', 'purple'],
    entregado: ['Entregado', 'green'], cancelado: ['Cancelado', 'red'],
  }
  const [l, v] = m[e] ?? [e, 'gray']
  return badge(l, v)
}

function badgePago(e: string | null | undefined) {
  if (!e) return badge('Sin pago', 'gray')
  const m: Record<string, [string, BV]> = {
    pagado: ['Pagado', 'green'], pendiente: ['Pendiente', 'yellow'], rechazado: ['Rechazado', 'red'],
  }
  const [l, v] = m[e] ?? [e, 'gray']
  return badge(l, v)
}

function badgeEnvio(e: string | null | undefined) {
  if (!e) return badge('—', 'gray')
  const m: Record<string, [string, BV]> = {
    pendiente:   ['Esperando',   'yellow'],
    preparando:  ['Preparando',  'blue'],
    despachado:  ['Despachado',  'purple'],
    en_transito: ['Tránsito',    'purple'],
    entregado:   ['Entregado',   'green'],
  }
  const [l, v] = m[e] ?? [e, 'gray']
  return badge(l, v)
}

// ─── Fila de tabla ────────────────────────────────────────────────────────────

function FilaPedido({ p }: { p: PedidoCompleto }) {
  const grupo      = p.grupos_envio
  const envio       = grupo?.envios?.[0] ?? null
  const estadoPago  = p.estado_pago
  const c      = p.clientes
  const nombre = c ? [c.nombre, c.apellido].filter(Boolean).join(' ') || c.email : `#${p.id_cliente}`
  const nItems = p.detallepedido.length

  return (
    <tr className="border-t border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
      <td className="px-4 py-3 text-sm font-mono text-stone-600 dark:text-stone-400 whitespace-nowrap">
        #{String(p.id_pedido).padStart(6, '0')}
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate max-w-[160px]">{nombre}</p>
        {c?.email && <p className="text-xs text-stone-400 truncate max-w-[160px]">{c.email}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
        {shortDate(p.fecha)}
      </td>
      <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400">
        {nItems} ítem{nItems !== 1 ? 's' : ''}
      </td>
      <td className="px-4 py-3">{badgePedido(p.estado)}</td>
      <td className="px-4 py-3">{badgePago(estadoPago)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {badgeEnvio(envio?.estado)}
          {envio?.codigo_seguimiento && (
            <code className="text-[10px] font-mono text-stone-400 dark:text-stone-500 tracking-wide">
              {envio.codigo_seguimiento}
            </code>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {grupo
          ? <span className="text-xs text-stone-600 dark:text-stone-300 whitespace-nowrap">{shortDate(grupo.fecha_despacho)}</span>
          : <span className="text-xs text-stone-300 dark:text-stone-600">—</span>
        }
      </td>
      <td className="px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-200 text-right whitespace-nowrap">
        {clp(p.total)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/pedidos/${p.id_pedido}`}
          className="inline-flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-500 font-medium"
        >
          Ver <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp      = await searchParams
  const estado  = (Array.isArray(sp.estado)   ? sp.estado[0]   : sp.estado)   as EstadoPedido | undefined
  const sinGrupo = sp.sin_grupo === 'true'
  const pagina  = parseInt(String(sp.pagina ?? '1'), 10)

  const result = await getPedidosAdmin({
    pagina,
    porPagina: 25,
    estado:    estado || undefined,
    sin_grupo: sinGrupo || undefined,
  })

  const pedidos = result.success ? result.data?.items ?? [] : []
  const total   = result.success ? (result.data?.total ?? 0) : 0

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white">Logística · Pedidos</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            {total} pedido{total !== 1 ? 's' : ''} en total
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-5 py-4 mb-4">
        <Suspense>
          <FiltrosAdmin />
        </Suspense>
      </div>

      {/* Tabla */}
      {!result.success ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-8 text-center text-sm text-red-500">
          {result.error}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex flex-col items-center justify-center py-20">
          <ShoppingCart className="h-10 w-10 text-stone-300 dark:text-stone-700 mb-3" />
          <p className="text-stone-500 dark:text-stone-400 text-sm">Sin resultados con los filtros aplicados</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/60 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                  <th className="px-4 py-3">#ID</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Ítems</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3">Envío / Tracking</th>
                  <th className="px-4 py-3">Despacho</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pedidos.map(p => <FilaPedido key={p.id_pedido} p={p} />)}
              </tbody>
            </table>
          </div>

          {/* Paginación simple */}
          {total > 25 && (
            <div className="px-5 py-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
              <span>Página {pagina} · {total} totales</span>
              <div className="flex gap-2">
                {pagina > 1 && (
                  <Link
                    href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).map(([k,v]) => [k, String(v)])), pagina: String(pagina - 1) })}`}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs"
                  >
                    ← Anterior
                  </Link>
                )}
                {pagina * 25 < total && (
                  <Link
                    href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).map(([k,v]) => [k, String(v)])), pagina: String(pagina + 1) })}`}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
