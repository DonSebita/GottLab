import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, ChevronRight, Calendar, Truck, CheckCircle } from 'lucide-react'
import { getPedidosByCliente } from '@/lib/actions/pedidos'
import type { PedidoResumen } from '@/types/pedidos'

// ─── Helpers de formato ───────────────────────────────────────────────────────

function clp(n: number) { return `$${Number(n).toLocaleString('es-CL')}` }
function fecha(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}
function padId(id: number) { return `#${String(id).padStart(6, '0')}` }

// ─── Badge helpers ────────────────────────────────────────────────────────────

type BadgeVariant = 'green' | 'yellow' | 'blue' | 'purple' | 'red' | 'gray'
function badge(label: string, variant: BadgeVariant) {
  const cls: Record<BadgeVariant, string> = {
    green:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
    blue:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
    red:    'bg-red-50 text-red-700 ring-1 ring-red-200',
    gray:   'bg-stone-100 text-stone-500 ring-1 ring-stone-200',
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls[variant]}`}>{label}</span>
}

function badgePedido(estado: string) {
  const map: Record<string, [string, BadgeVariant]> = {
    pendiente:      ['Pendiente',      'yellow'],
    confirmado:     ['Confirmado',     'blue'],
    en_preparacion: ['En preparación', 'purple'],
    despachado:     ['Despachado',     'purple'],
    entregado:      ['Entregado',      'green'],
    cancelado:      ['Cancelado',      'red'],
  }
  const [label, v] = map[estado] ?? [estado, 'gray']
  return badge(label, v)
}

function badgePago(estado: string | null | undefined) {
  if (!estado) return badge('Sin pago', 'gray')
  const map: Record<string, [string, BadgeVariant]> = {
    pagado:   ['Pagado', 'green'],
    pendiente: ['Pago pendiente', 'yellow'],
    rechazado: ['Rechazado', 'red'],
  }
  const [label, v] = map[estado] ?? [estado, 'gray']
  return badge(label, v)
}

function badgeEnvio(estado: string | null | undefined) {
  if (!estado) return null
  const map: Record<string, [string, BadgeVariant]> = {
    pendiente:   ['Esperando despacho', 'yellow'],
    preparando:  ['Preparando',         'blue'],
    despachado:  ['Despachado',         'purple'],
    en_transito: ['En tránsito',        'purple'],
    entregado:   ['Entregado',          'green'],
  }
  const [label, v] = map[estado] ?? [estado, 'gray']
  return badge(label, v)
}

// ─── Card de pedido ───────────────────────────────────────────────────────────

function PedidoCard({ p }: { p: PedidoResumen }) {
  const grupo      = p.grupos_envio
  const envio      = grupo?.envios?.[0] ?? null
  const estadoPago = p.estado_pago

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow bg-white">
      {/* Cabecera */}
      <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-stone-900">{padId(p.id_pedido)}</span>
            {badgePedido(p.estado)}
            {badgePago(estadoPago)}
          </div>
          <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />{fecha(p.fecha)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-stone-900">{clp(p.total)}</p>
          {((p.subtotal ?? 0) > 0 && (p.costo_envio ?? 0) > 0) && (
            <p className="text-xs text-stone-400">
              {clp(p.subtotal ?? 0)} + {clp(p.costo_envio ?? 0)} envío
            </p>
          )}
        </div>
      </div>

      {/* Info envío + despacho */}
      <div className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-500">
        {envio && (
          <span className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-stone-400" />
            {badgeEnvio(envio.estado)}
            {envio.codigo_seguimiento && (
              <code className="ml-1 font-mono bg-stone-50 px-1.5 py-0.5 rounded text-stone-600 border border-stone-200">
                {envio.codigo_seguimiento}
              </code>
            )}
          </span>
        )}
        {grupo && (
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-stone-400" />
            Despacho: <strong className="text-stone-700">{fecha(grupo.fecha_despacho)}</strong>
          </span>
        )}
        {envio?.fecha_entrega && (
          <span className="flex items-center gap-1.5">
            Entrega estimada: <strong className="text-stone-700">{fecha(envio.fecha_entrega)}</strong>
          </span>
        )}
      </div>

      {/* Productos (resumen) */}
      {p.detallepedido.length > 0 && (
        <div className="px-5 py-3 border-t border-stone-50 text-xs text-stone-500">
          {p.detallepedido.slice(0, 2).map((d, i) => (
            <span key={i} className="mr-3">
              {d.cantidad}× <span className="text-stone-700">{(d as unknown as { productos?: { nombre: string } }).productos?.nombre ?? `Producto #${d.id_producto}`}</span>
            </span>
          ))}
          {p.detallepedido.length > 2 && <span>+{p.detallepedido.length - 2} más</span>}
        </div>
      )}

      {/* Pie */}
      <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50">
        <Link
          href={`/mi-cuenta/pedidos/${p.id_pedido}`}
          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
        >
          Ver detalle completo <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function PedidosPage() {
  const result = await getPedidosByCliente()

  if (!result.success) {
    redirect('/login?redirect=/mi-cuenta/pedidos')
  }

  const pedidos = result.data?.items ?? []

  if (pedidos.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold text-stone-900 mb-6">Mis Pedidos</h2>
        <div className="text-center py-16 text-stone-400">
          <Package className="h-12 w-12 mx-auto mb-3 text-stone-300" />
          <p className="font-medium text-stone-500">Aún no tienes pedidos</p>
          <p className="text-sm mt-1 mb-5">Explora nuestros productos y haz tu primera compra</p>
          <Link href="/productos" className="inline-block px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
            Ver Productos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-stone-900">Mis Pedidos</h2>
        <span className="text-sm text-stone-400">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-4">
        {pedidos.map(p => <PedidoCard key={p.id_pedido} p={p} />)}
      </div>
    </div>
  )
}

// Re-export helpers for use in detail page
export { clp, fecha, padId, badge, badgePedido, badgePago, badgeEnvio }
export type { BadgeVariant }
