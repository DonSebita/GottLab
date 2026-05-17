import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Truck, CreditCard, MapPin, Calendar } from 'lucide-react'
import { getPedidoByIdCliente } from '@/lib/actions/pedidos'
import EnvioTimeline from '@/components/EnvioTimeline'
import type { PedidoCompleto, DireccionSnapshot } from '@/types/pedidos'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clp(n: number | null | undefined) {
  if (n == null) return '—'
  return `$${Number(n).toLocaleString('es-CL')}`
}

function fmtFecha(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', opts ?? {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}


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

function estadoPedidoBadge(estado: string) {
  const map: Record<string, [string, BadgeVariant]> = {
    pendiente:      ['Pendiente',      'yellow'],
    confirmado:     ['Confirmado',     'blue'],
    en_preparacion: ['En preparación', 'blue'],
    despachado:     ['Despachado',     'purple'],
    entregado:      ['Entregado',      'green'],
    cancelado:      ['Cancelado',      'red'],
  }
  const [l, v] = map[estado] ?? [estado, 'gray']
  return badge(l, v)
}

function estadoEnvioBadge(estado: string | null | undefined) {
  if (!estado) return null
  const map: Record<string, [string, BadgeVariant]> = {
    pendiente:   ['Esperando despacho', 'yellow'],
    preparando:  ['En preparación',     'blue'],
    despachado:  ['Despachado',         'purple'],
    en_transito: ['En tránsito',        'purple'],
    entregado:   ['Entregado',          'green'],
  }
  const [l, v] = map[estado] ?? [estado, 'gray']
  return badge(l, v)
}

function estadoPagoBadge(estado: string | null | undefined) {
  if (!estado) return badge('Sin pago', 'gray')
  const map: Record<string, [string, BadgeVariant]> = {
    pagado:    ['Pagado',   'green'],
    pendiente: ['Pendiente', 'yellow'],
    rechazado: ['Rechazado', 'red'],
  }
  const [l, v] = map[estado] ?? [estado, 'gray']
  return badge(l, v)
}

// ─── Sección wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <section className="border border-stone-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 bg-stone-50 border-b border-stone-200">
        <Icon className="h-4 w-4 text-stone-500" />
        <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ─── Sección productos ────────────────────────────────────────────────────────

function ProductosSection({ pedido }: { pedido: PedidoCompleto }) {
  const subtotal  = pedido.subtotal  ?? 0
  const costoEnvio = pedido.costo_envio ?? 0

  return (
    <Section title="Productos" icon={Package}>
      <div className="space-y-3">
        {pedido.detallepedido.map((d) => (
          <div key={d.id_detalle} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">
                {d.productos?.nombre ?? `Producto #${d.id_producto}`}
              </p>
              {d.productos?.nombre_cientifico && (
                <p className="text-xs text-stone-400 italic">{d.productos.nombre_cientifico}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-stone-600">{d.cantidad} × {clp(d.precio_unitario)}</p>
              <p className="text-sm font-medium text-stone-900">{clp(d.cantidad * d.precio_unitario)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen financiero */}
      <div className="mt-4 pt-4 border-t border-stone-100 space-y-1.5 text-sm">
        <div className="flex justify-between text-stone-500">
          <span>Subtotal productos</span>
          <span>{clp(subtotal)}</span>
        </div>
        <div className="flex justify-between text-stone-500">
          <span>Costo de envío</span>
          <span>{clp(costoEnvio)}</span>
        </div>
        <div className="flex justify-between font-semibold text-stone-900 text-base pt-1 border-t border-stone-100">
          <span>Total</span>
          <span>{clp(pedido.total)}</span>
        </div>
      </div>
    </Section>
  )
}

// ─── Sección pago ─────────────────────────────────────────────────────────────

function PagoSection({ pedido }: { pedido: PedidoCompleto }) {
  return (
    <Section title="Pago" icon={CreditCard}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-stone-500">Estado</dt>
        <dd>{estadoPagoBadge(pedido.estado_pago)}</dd>

        <dt className="text-stone-500">Total</dt>
        <dd className="text-stone-900 font-medium">{clp(pedido.total)}</dd>
      </dl>
    </Section>
  )
}

// ─── Sección envío ────────────────────────────────────────────────────────────

function EnvioSection({ pedido }: { pedido: PedidoCompleto }) {
  const grupo = pedido.grupos_envio
  const envio = grupo?.envios?.[0] ?? null

  if (!envio && !grupo) return null

  return (
    <Section title="Envío" icon={Truck}>
      {envio && (
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {estadoEnvioBadge(envio.estado)}
            {envio.courier && <span className="text-xs text-stone-500">{envio.courier}</span>}
          </div>

          {envio.codigo_seguimiento && (
            <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-lg">
              <span className="text-xs text-stone-500 shrink-0">Seguimiento</span>
              <code className="font-mono text-base font-semibold text-stone-900 tracking-widest">
                {envio.codigo_seguimiento}
              </code>
            </div>
          )}

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {grupo && (
              <>
                <dt className="text-stone-500">Grupo despacho</dt>
                <dd className="text-stone-900 font-medium">{grupo.codigo ?? 'Grupo de envío'}</dd>
                <dt className="text-stone-500">Fecha despacho</dt>
                <dd className="text-stone-900">{fmtFecha(grupo.fecha_despacho)}</dd>
              </>
            )}
            {envio.fecha_entrega && (
              <>
                <dt className="text-stone-500">Entrega estimada</dt>
                <dd className="text-stone-900 font-medium">{fmtFecha(envio.fecha_entrega)}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <div className="border-t border-stone-100 pt-5">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">Seguimiento</p>
        <EnvioTimeline
          historial={[]}
          estadoActual={envio?.estado ?? grupo?.estado}
          courier={envio?.courier ?? undefined}
        />
      </div>
    </Section>
  )
}

// ─── Sección dirección ────────────────────────────────────────────────────────

function DireccionSection({ pedido }: { pedido: PedidoCompleto }) {
  const snap = pedido.direccion_snapshot as DireccionSnapshot | null
  const dir  = pedido.direcciones

  const lineas: string[] = []

  if (snap) {
    if (snap.direccion) lineas.push(snap.direccion)
    const localidad = [snap.ciudad, snap.comuna].filter(Boolean).join(', ')
    if (localidad) lineas.push(localidad)
    if (snap.region) lineas.push(snap.region)
  } else if (dir) {
    if (dir.direccion) lineas.push(dir.direccion)
    const localidad = [dir.ciudad, dir.comuna].filter(Boolean).join(', ')
    if (localidad) lineas.push(localidad)
    if (dir.region) lineas.push(dir.region)
  }

  if (lineas.length === 0) return null

  return (
    <Section title="Dirección de envío" icon={MapPin}>
      <address className="not-italic text-sm text-stone-700 space-y-0.5">
        {(snap?.alias ?? snap?.tipo) && (
          <p className="text-xs font-medium text-stone-500 mb-1 uppercase tracking-wide">
            {snap?.alias ?? snap?.tipo}
          </p>
        )}
        {lineas.map((l, i) => <p key={i}>{l}</p>)}
        {snap?.codigo_postal && <p className="text-stone-400">CP {snap.codigo_postal}</p>}
      </address>
    </Section>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function DetallePedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idPedido = parseInt(id, 10)
  if (isNaN(idPedido)) notFound()

  const result = await getPedidoByIdCliente(idPedido)

  if (!result.success) redirect('/login?redirect=/mi-cuenta/pedidos')
  if (!result.data)    notFound()

  const pedido = result.data

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/mi-cuenta/pedidos"
          className="flex items-center gap-1 text-stone-400 hover:text-stone-600 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Mis Pedidos
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900">
            Pedido #{String(pedido.id_pedido).padStart(6, '0')}
          </h2>
          <p className="text-sm text-stone-400 mt-0.5 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {fmtFecha(pedido.fecha)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {estadoPedidoBadge(pedido.estado)}
          {estadoPagoBadge(pedido.estado_pago)}
        </div>
      </div>

      {/* Secciones */}
      <div className="space-y-5">
        <ProductosSection pedido={pedido} />
        <PagoSection      pedido={pedido} />
        <EnvioSection     pedido={pedido} />
        <DireccionSection pedido={pedido} />

        {pedido.observaciones && (
          <section className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-600">
            <p className="font-medium text-stone-700 mb-1">Observaciones del pedido</p>
            <p>{pedido.observaciones}</p>
          </section>
        )}
      </div>
    </div>
  )
}
