import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Package, CreditCard, Truck, MapPin, Calendar, Box } from 'lucide-react'
import { getPedidoByIdAdmin } from '@/lib/actions/pedidos'
import { AvanzarEstadoPedido, AvanzarEstadoEnvio } from './_components/AccionesPedidoAdmin'
import EnvioTimeline from '@/components/EnvioTimeline'
import { TRANSICIONES_PEDIDO } from '@/types/pedidos'
import { siguienteEstadoEnvio } from '@/lib/helpers/tracking'
import type { PedidoCompleto, EstadoPedido, EstadoEnvio, DireccionSnapshot } from '@/types/pedidos'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clp(n: number | null | undefined) {
  return n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—'
}
function fmtFecha(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', opts ?? { day: 'numeric', month: 'long', year: 'numeric' })
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
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cls[v]}`}>{label}</span>
}

function badgePedido(e: string) {
  const m: Record<string, [string, BV]> = {
    pendiente: ['Pendiente', 'yellow'], confirmado: ['Confirmado', 'blue'],
    en_preparacion: ['En preparación', 'orange'], despachado: ['Despachado', 'purple'],
    entregado: ['Entregado', 'green'], cancelado: ['Cancelado', 'red'],
  }
  const [l, vv] = m[e] ?? [e, 'gray']
  return badge(l, vv)
}
function badgePago(e: string | null | undefined) {
  if (!e) return badge('Sin pago', 'gray')
  const m: Record<string, [string, BV]> = {
    pagado: ['Pagado', 'green'], pendiente: ['Pendiente', 'yellow'], rechazado: ['Rechazado', 'red'],
  }
  const [l, vv] = m[e] ?? [e, 'gray']
  return badge(l, vv)
}
function badgeEnvio(e: string | null | undefined) {
  if (!e) return null
  const m: Record<string, [string, BV]> = {
    pendiente:   ['Esperando despacho', 'yellow'],
    preparando:  ['En preparación',    'blue'],
    despachado:  ['Despachado',         'purple'],
    en_transito: ['En tránsito',       'purple'],
    entregado:   ['Entregado',          'green'],
  }
  const [l, vv] = m[e] ?? [e, 'gray']
  return badge(l, vv)
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, aside }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{title}</h3>
        </div>
        {aside && <div>{aside}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1.5">
      <dt className="text-sm text-stone-500 dark:text-stone-400 w-36 shrink-0">{label}</dt>
      <dd className="text-sm text-stone-800 dark:text-stone-200 flex-1">{children}</dd>
    </div>
  )
}

// ─── Sección cliente ──────────────────────────────────────────────────────────

function ClienteSection({ p }: { p: PedidoCompleto }) {
  const c = p.clientes
  if (!c) return null
  return (
    <Section title="Cliente" icon={User}>
      <dl>
        <Row label="Nombre">{[c.nombre, c.apellido].filter(Boolean).join(' ') || '—'}</Row>
        <Row label="Email">{c.email ?? '—'}</Row>
        {c.telefono && <Row label="Teléfono">{c.telefono}</Row>}
      </dl>
    </Section>
  )
}

// ─── Sección productos ────────────────────────────────────────────────────────

function ProductosSection({ p }: { p: PedidoCompleto }) {
  return (
    <Section title="Productos" icon={Package}>
      <div className="space-y-3">
        {p.detallepedido.map(d => (
          <div key={d.id_detalle} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                {d.productos?.nombre ?? `Producto #${d.id_producto}`}
              </p>
              {d.productos?.nombre_cientifico && (
                <p className="text-xs text-stone-400 italic">{d.productos.nombre_cientifico}</p>
              )}
            </div>
            <div className="text-right shrink-0 text-sm">
              <span className="text-stone-500 dark:text-stone-400">{d.cantidad} × {clp(d.precio_unitario)}</span>
              <span className="ml-3 font-medium text-stone-800 dark:text-stone-200">{clp(d.cantidad * d.precio_unitario)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 space-y-1.5 text-sm">
        <div className="flex justify-between text-stone-500 dark:text-stone-400">
          <span>Subtotal</span><span>{clp(p.subtotal)}</span>
        </div>
        <div className="flex justify-between text-stone-500 dark:text-stone-400">
          <span>Envío</span><span>{clp(p.costo_envio)}</span>
        </div>
        <div className="flex justify-between font-semibold text-stone-900 dark:text-white text-base pt-1 border-t border-stone-100 dark:border-stone-800">
          <span>Total</span><span>{clp(p.total)}</span>
        </div>
      </div>
    </Section>
  )
}

// ─── Sección pago ─────────────────────────────────────────────────────────────

function PagoSection({ estadoPago, total }: { estadoPago: string | null; total: number | null }) {
  return (
    <Section title="Pago" icon={CreditCard}>
      <dl>
        <Row label="Estado">{badgePago(estadoPago)}</Row>
        <Row label="Total">{clp(total)}</Row>
      </dl>
    </Section>
  )
}

// ─── Sección envío ────────────────────────────────────────────────────────────

function EnvioSection({ p, siguienteEnvio }: {
  p: PedidoCompleto
  siguienteEnvio: EstadoEnvio | null
}) {
  const grupo = p.grupos_envio
  const envio = grupo?.envios?.[0] ?? null
  if (!envio && !grupo) return null

  return (
    <Section
      title="Envío"
      icon={Truck}
      aside={
        envio && siguienteEnvio
          ? <AvanzarEstadoEnvio
              idEnvio={envio.id_envio}
              estadoActual={envio.estado as EstadoEnvio}
              estadoSiguiente={siguienteEnvio}
            />
          : null
      }
    >
      {envio && (
        <dl className="mb-5">
          <Row label="Estado">{badgeEnvio(envio.estado)}</Row>
          {envio.courier && <Row label="Courier">{envio.courier}</Row>}
          {envio.codigo_seguimiento && (
            <Row label="Seguimiento">
              <code className="font-mono text-base font-semibold tracking-widest text-stone-900 dark:text-white">
                {envio.codigo_seguimiento}
              </code>
            </Row>
          )}
          {grupo && (
            <>
              <Row label="Grupo">{grupo.codigo ?? 'Grupo de envío'}</Row>
              <Row label="Despacho">{fmtFecha(grupo.fecha_despacho)}</Row>
            </>
          )}
          {envio.fecha_entrega && (
            <Row label="Entrega est.">{fmtFecha(envio.fecha_entrega)}</Row>
          )}
        </dl>
      )}

      <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
        <p className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-4">Seguimiento</p>
        <EnvioTimeline
          historial={[]}
          estadoActual={envio?.estado ?? grupo?.estado}
          courier={envio?.courier ?? undefined}
        />
      </div>

      {!envio && grupo && (
        <p className="text-sm text-stone-400 dark:text-stone-500 mt-3">
          El pedido está asignado al grupo <strong className="text-stone-600 dark:text-stone-300">{grupo.codigo ?? 'de envío'}</strong> pero aún no tiene envío generado.
        </p>
      )}
    </Section>
  )
}

// ─── Sección dirección ────────────────────────────────────────────────────────

function DireccionSection({ p }: { p: PedidoCompleto }) {
  const snap = p.direccion_snapshot as DireccionSnapshot | null
  const dir  = p.direcciones
  const lineas: string[] = []
  if (snap) {
    if (snap.direccion) lineas.push(snap.direccion)
    const loc = [snap.ciudad, snap.comuna].filter(Boolean).join(', ')
    if (loc) lineas.push(loc)
    if (snap.region) lineas.push(snap.region)
  } else if (dir) {
    if (dir.direccion) lineas.push(dir.direccion)
    const loc = [dir.ciudad, dir.comuna].filter(Boolean).join(', ')
    if (loc) lineas.push(loc)
    if (dir.region) lineas.push(dir.region)
  }
  if (lineas.length === 0) return null
  return (
    <Section title="Dirección de entrega" icon={MapPin}>
      {(snap?.alias ?? snap?.tipo) && (
        <p className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
          {snap?.alias ?? snap?.tipo}
        </p>
      )}
      <address className="not-italic text-sm text-stone-700 dark:text-stone-300 space-y-0.5">
        {lineas.map((l, i) => <p key={i}>{l}</p>)}
      </address>
      {snap && (
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">Snapshot al momento del pedido</p>
      )}
    </Section>
  )
}

// ─── Panel de acciones ────────────────────────────────────────────────────────

function AccionesPanel({ p, siguientePedido }: {
  p: PedidoCompleto
  siguientePedido: EstadoPedido | null
}) {
  const hayCambios = siguientePedido

  if (!hayCambios) return null

  return (
    <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-2">
        <Box className="h-4 w-4 text-stone-400" /> Acciones del pedido
      </h3>
      <div className="space-y-4">
        {siguientePedido && (
          <AvanzarEstadoPedido
            idPedido={p.id_pedido}
            estadoActual={p.estado as EstadoPedido}
            estadoSiguiente={siguientePedido}
          />
        )}
      </div>
    </section>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function AdminDetallePedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idPedido = parseInt(id, 10)
  if (isNaN(idPedido)) notFound()

  const result = await getPedidoByIdAdmin(idPedido)
  if (!result.success || !result.data) notFound()

  const p = result.data

  // Calcular próximos estados server-side
  const transicionesPedido = TRANSICIONES_PEDIDO[p.estado as EstadoPedido] ?? []
  const siguientePedido    = transicionesPedido[0] ?? null

  const envioEstado     = p.grupos_envio?.envios?.[0]?.estado as EstadoEnvio | null | undefined
  const siguienteEnvio  = envioEstado ? siguienteEstadoEnvio(envioEstado) : null

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Cabecera */}
      <div className="mb-6">
        <Link
          href="/admin/pedidos"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Todos los pedidos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-white">
              Pedido #{String(p.id_pedido).padStart(6, '0')}
            </h1>
            <p className="text-stone-400 dark:text-stone-500 text-sm flex items-center gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {fmtFecha(p.fecha)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {badgePedido(p.estado)}
            {badgePago(p.estado_pago)}
          </div>
        </div>
      </div>

      {/* Grid de secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-5">
          <ProductosSection p={p} />
          <EnvioSection p={p} siguienteEnvio={siguienteEnvio} />
          <DireccionSection p={p} />
          {p.observaciones && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Observaciones</p>
              <p className="text-sm text-stone-700 dark:text-stone-300">{p.observaciones}</p>
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          <AccionesPanel p={p} siguientePedido={siguientePedido} />
          <ClienteSection p={p} />
          <PagoSection estadoPago={p.estado_pago} total={p.total} />
        </div>
      </div>
    </div>
  )
}
