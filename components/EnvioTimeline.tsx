import { Clock, Box, SendHorizontal, Truck, CheckCircle2, Circle } from 'lucide-react'
import type { EstadoEnvio, EventoHistorialEnvio } from '@/types/pedidos'

// ─── Configuración de estados ─────────────────────────────────────────────────

interface EstadoConfig {
  label:       string
  descripcion: string
  icon:        React.ElementType
}

const ESTADOS: Record<EstadoEnvio, EstadoConfig> = {
  pendiente:   { label: 'Pendiente',        descripcion: 'Pedido confirmado, esperando despacho.',         icon: Clock         },
  preparando:  { label: 'En preparación',   descripcion: 'Paquete en preparación en bodega.',              icon: Box           },
  despachado:  { label: 'Despachado',       descripcion: 'Paquete entregado a Correos de Chile.',          icon: SendHorizontal },
  en_transito: { label: 'En tránsito',      descripcion: 'En ruta por la red de Correos de Chile.',        icon: Truck         },
  entregado:   { label: 'Entregado',        descripcion: 'Paquete entregado al destinatario.',             icon: CheckCircle2  },
}

const SECUENCIA: EstadoEnvio[] = [
  'pendiente', 'preparando', 'despachado', 'en_transito', 'entregado',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(ts: string) {
  return new Date(ts).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
function fmtHora(ts: string) {
  return new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EnvioTimelineProps {
  /** Array de eventos ya ocurridos (del campo historial del envío). */
  historial:     EventoHistorialEnvio[]
  /** Estado actual del envío (para resaltar el paso activo). */
  estadoActual:  EstadoEnvio | string | null | undefined
  /** Texto opcional del courier, mostrado en el paso despachado. */
  courier?:      string
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EnvioTimeline({
  historial,
  estadoActual,
  courier,
}: EnvioTimelineProps) {
  // Mapear historial por estado para acceso O(1)
  const porEstado = new Map<string, EventoHistorialEnvio>()
  for (const ev of historial) {
    if (!porEstado.has(ev.estado)) porEstado.set(ev.estado, ev)
  }

  const curIdx = estadoActual ? SECUENCIA.indexOf(estadoActual as EstadoEnvio) : -1

  return (
    <ol className="relative">
      {SECUENCIA.map((estado, idx) => {
        const cfg      = ESTADOS[estado]
        const Icon     = cfg.icon
        const evento   = porEstado.get(estado)
        const isPast   = idx < curIdx
        const isCurrent = idx === curIdx
        const isFuture  = idx > curIdx
        const isLast    = idx === SECUENCIA.length - 1

        // ─ Dot colors
        const dotClass = isFuture
          ? 'bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700'
          : isCurrent
            ? 'bg-emerald-500 dark:bg-emerald-500 shadow-md shadow-emerald-200 dark:shadow-emerald-900'
            : 'bg-emerald-100 dark:bg-emerald-900/50 border-2 border-emerald-300 dark:border-emerald-700'

        const iconClass = isFuture
          ? 'text-stone-300 dark:text-stone-600'
          : isCurrent
            ? 'text-white'
            : 'text-emerald-600 dark:text-emerald-400'

        // ─ Text colors
        const labelClass = isCurrent
          ? 'text-stone-900 dark:text-white font-semibold'
          : isPast
            ? 'text-stone-600 dark:text-stone-300 font-medium'
            : 'text-stone-400 dark:text-stone-500 font-medium'

        const descClass = isCurrent
          ? 'text-stone-600 dark:text-stone-300'
          : isPast
            ? 'text-stone-400 dark:text-stone-500'
            : 'text-stone-300 dark:text-stone-600'

        // ─ Line color
        const lineClass = isPast
          ? 'bg-emerald-200 dark:bg-emerald-800'
          : 'bg-stone-100 dark:bg-stone-800'

        return (
          <li key={estado} className="flex gap-4">
            {/* Columna izquierda: dot + línea vertical */}
            <div className="flex flex-col items-center w-8 shrink-0">
              {/* Dot */}
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-full z-10 shrink-0 ${dotClass}`}>
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-30" />
                )}
                <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
              </div>
              {/* Línea hacia el siguiente */}
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1 min-h-[1.5rem] ${lineClass}`} />
              )}
            </div>

            {/* Columna derecha: contenido */}
            <div className={`pb-5 ${isLast ? '' : ''} min-w-0`}>
              <p className={`text-sm leading-none ${labelClass}`}>
                {cfg.label}
              </p>

              {/* Descripción del evento real o del config */}
              <p className={`text-xs mt-0.5 ${descClass}`}>
                {evento?.descripcion ?? cfg.descripcion}
                {estado === 'despachado' && courier && !evento && (
                  <span className="ml-1 text-stone-400 dark:text-stone-500">· {courier}</span>
                )}
              </p>

              {/* Timestamp del evento */}
              {evento && (
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1 flex flex-wrap gap-x-1.5 items-center">
                  <span>{fmtFecha(evento.timestamp)}</span>
                  <span>·</span>
                  <span>{fmtHora(evento.timestamp)}</span>
                  {evento.ciudad && (
                    <>
                      <span>·</span>
                      <span>{evento.ciudad}</span>
                    </>
                  )}
                </p>
              )}

              {/* "Pendiente" label para estados futuros */}
              {isFuture && (
                <p className="text-[11px] text-stone-300 dark:text-stone-600 mt-1">Pendiente</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
