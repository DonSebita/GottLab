-- GottLab — Migration 005: Live sales support
-- Enables admin to add products to any customer's cart with custom pricing
-- Tracks sale origin (web vs live) for analytics and shipping consolidation

-- Add special price column (NULL = use web price)
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS precio_especial integer;

-- Add origin column to distinguish web vs live sales
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS origen text DEFAULT 'web' CHECK (origen IN ('web', 'live'));

-- Admin policy: allows admin to insert/update any customer's reservations
DROP POLICY IF EXISTS admin_manage_reservas ON public.reservas;
CREATE POLICY admin_manage_reservas ON public.reservas
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

COMMENT ON COLUMN public.reservas.precio_especial IS 'Custom price set by admin (live sales). NULL = default product price';
COMMENT ON COLUMN public.reservas.origen IS 'Sale origin: web (normal browsing) or live (TikTok live sale)';
