-- GottLab — Migration 009: campo courier en envios
-- Permite registrar el servicio de courier asignado al envío fake.

ALTER TABLE public.envios
  ADD COLUMN IF NOT EXISTS courier TEXT NOT NULL DEFAULT 'Correos de Chile';

COMMENT ON COLUMN public.envios.courier IS 'Nombre del courier. Fake hasta integrar API real. Default: Correos de Chile.';
