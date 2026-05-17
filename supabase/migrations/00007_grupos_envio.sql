-- GottLab — Migration 007: grupos_envio + extensiones pedidos/envios
-- Modelo: muchos pedidos → 1 grupo_envio → 1 despacho real (martes)
-- Ejecutar en Supabase SQL Editor antes de desplegar.

-- ─── 1. Tabla grupos_envio ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grupos_envio (
  id_grupo_envio  SERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  fecha_despacho  DATE NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'abierto'
                  CHECK (estado IN ('abierto', 'cerrado', 'en_preparacion', 'despachado', 'finalizado')),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.grupos_envio                IS 'Lotes de despacho semanal. Despacho siempre los martes.';
COMMENT ON COLUMN public.grupos_envio.fecha_despacho IS 'Siempre un martes. Validar en aplicación.';
COMMENT ON COLUMN public.grupos_envio.estado         IS 'abierto→cerrado→en_preparacion→despachado→finalizado';

-- ─── 2. Extender pedidos ─────────────────────────────────────────────────────
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS id_grupo_envio INTEGER
    REFERENCES public.grupos_envio(id_grupo_envio) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_direccion INTEGER
    REFERENCES public.direcciones(id_direccion) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notas  TEXT,
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'web'
    CHECK (origen IN ('web', 'live'));

COMMENT ON COLUMN public.pedidos.id_grupo_envio IS 'Grupo de envío asignado. NULL = sin asignar aún.';
COMMENT ON COLUMN public.pedidos.id_direccion   IS 'Dirección de entrega elegida al hacer el pedido.';
COMMENT ON COLUMN public.pedidos.origen         IS 'web = tienda online, live = venta en vivo.';

-- ─── 3. Extender envios ──────────────────────────────────────────────────────
ALTER TABLE public.envios
  ADD COLUMN IF NOT EXISTS id_grupo_envio         INTEGER
    REFERENCES public.grupos_envio(id_grupo_envio) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS historial              JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fecha_estimada_entrega DATE;

COMMENT ON COLUMN public.envios.historial              IS 'Array JSON de EventoHistorialEnvio: [{estado, descripcion, timestamp, ciudad?}]';
COMMENT ON COLUMN public.envios.fecha_estimada_entrega IS 'Calculada al crear el envío fake (despacho + días hábiles).';

-- ─── 4. Índices ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pedidos_grupo      ON public.pedidos(id_grupo_envio);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado     ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente    ON public.pedidos(id_cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_origen     ON public.pedidos(origen);
CREATE INDEX IF NOT EXISTS idx_grupos_estado      ON public.grupos_envio(estado);
CREATE INDEX IF NOT EXISTS idx_grupos_fecha       ON public.grupos_envio(fecha_despacho);
CREATE INDEX IF NOT EXISTS idx_envios_grupo       ON public.envios(id_grupo_envio);
CREATE INDEX IF NOT EXISTS idx_envios_pedido      ON public.envios(id_pedido);

-- ─── 5. RLS grupos_envio ─────────────────────────────────────────────────────
ALTER TABLE public.grupos_envio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_grupos      ON public.grupos_envio;
DROP POLICY IF EXISTS cliente_read_grupos   ON public.grupos_envio;

CREATE POLICY admin_all_grupos ON public.grupos_envio
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY cliente_read_grupos ON public.grupos_envio
  FOR SELECT
  USING (
    id_grupo_envio IN (
      SELECT p.id_grupo_envio
      FROM   public.pedidos  p
      JOIN   public.clientes c ON c.id_cliente = p.id_cliente
      WHERE  c.auth_id = auth.uid()
        AND  p.id_grupo_envio IS NOT NULL
    )
  );
