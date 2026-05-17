'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cambiarEstadoPedido } from '@/lib/actions/pedidos'
import { avanzarEstadoEnvio } from '@/lib/actions/envios'
import type { EstadoPedido, EstadoEnvio } from '@/types/pedidos'

// ─── Labels ───────────────────────────────────────────────────────────────────

const LABEL_PEDIDO: Record<EstadoPedido, string> = {
  pendiente:      'Pendiente',
  confirmado:     'Confirmado',
  en_preparacion: 'En preparación',
  despachado:     'Despachado',
  entregado:      'Entregado',
  cancelado:      'Cancelado',
}

const LABEL_ENVIO: Record<EstadoEnvio, string> = {
  pendiente:   'Esperando despacho',
  preparando:  'Preparando',
  despachado:  'Despachado',
  en_transito: 'En tránsito',
  entregado:   'Entregado',
}

// ─── Feedback inline ──────────────────────────────────────────────────────────

function Feedback({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs mt-2 ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
      {ok
        ? <CheckCircle className="h-3.5 w-3.5" />
        : <XCircle className="h-3.5 w-3.5" />
      }
      {msg}
    </p>
  )
}

// ─── Avanzar estado pedido ────────────────────────────────────────────────────

export function AvanzarEstadoPedido({
  idPedido,
  estadoActual,
  estadoSiguiente,
}: {
  idPedido:       number
  estadoActual:   EstadoPedido
  estadoSiguiente: EstadoPedido
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleClick() {
    setFeedback(null)
    start(async () => {
      const res = await cambiarEstadoPedido(idPedido, estadoSiguiente)
      if (res.success) {
        setFeedback({ ok: true, msg: `Estado actualizado a "${LABEL_PEDIDO[estadoSiguiente]}"` })
        router.refresh()
      } else {
        setFeedback({ ok: false, msg: res.error ?? 'Error desconocido' })
      }
    })
  }

  return (
    <div>
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
        Estado pedido: <strong className="text-stone-700 dark:text-stone-200">{LABEL_PEDIDO[estadoActual]}</strong>
      </p>
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
      >
        {pending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <ArrowRight className="h-4 w-4" />
        }
        Marcar como {LABEL_PEDIDO[estadoSiguiente]}
      </button>
      {feedback && <Feedback {...feedback} />}
    </div>
  )
}

// ─── Avanzar estado envío ─────────────────────────────────────────────────────

export function AvanzarEstadoEnvio({
  idEnvio,
  estadoActual,
  estadoSiguiente,
}: {
  idEnvio:         number
  estadoActual:    EstadoEnvio
  estadoSiguiente: EstadoEnvio
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleClick() {
    setFeedback(null)
    start(async () => {
      const res = await avanzarEstadoEnvio(idEnvio)
      if (res.success) {
        setFeedback({ ok: true, msg: `Envío → "${LABEL_ENVIO[estadoSiguiente]}"` })
        router.refresh()
      } else {
        setFeedback({ ok: false, msg: res.error ?? 'Error desconocido' })
      }
    })
  }

  return (
    <div>
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
        Estado envío: <strong className="text-stone-700 dark:text-stone-200">{LABEL_ENVIO[estadoActual]}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleClick}
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {pending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <ArrowRight className="h-4 w-4" />
          }
          Avanzar a {LABEL_ENVIO[estadoSiguiente]}
        </button>
      </div>
      {feedback && <Feedback {...feedback} />}
    </div>
  )
}
