-- GottLab — Migration 008: campos de checkout en pedidos
-- Agrega desglose financiero y snapshot de dirección al momento de compra.
-- Los valores son inmutables post-creación: representan el estado en la compra.

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS subtotal          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_envio       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direccion_snapshot JSONB;

COMMENT ON COLUMN public.pedidos.subtotal           IS 'Suma de (cantidad × precio_unitario) de todos los ítems, sin envío.';
COMMENT ON COLUMN public.pedidos.costo_envio        IS 'Costo de envío calculado al momento del checkout (fake hasta integrar courier).';
COMMENT ON COLUMN public.pedidos.direccion_snapshot IS 'Copia inmutable de la dirección al momento de la compra. Formato: {alias,tipo,direccion,ciudad,comuna,region,pais,codigo_postal}.';

-- pagos: agregar índice para búsqueda por pedido
CREATE INDEX IF NOT EXISTS idx_pagos_id_pedido ON public.pagos(id_pedido);
