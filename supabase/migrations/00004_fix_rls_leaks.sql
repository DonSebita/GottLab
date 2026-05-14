-- GottLab — Migration 004: Fix RLS data leaks
-- Scopes empleados_read_auth to only own row + admin override
-- Removes the blanket "any authenticated user can read all empleados" hole

-- Fix: only admin can read all empleados. Regular users see only themselves.
DROP POLICY IF EXISTS empleados_read_auth ON public.empleados;
CREATE POLICY empleados_read_auth ON public.empleados
  FOR SELECT USING (
    auth.uid() = auth_id
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
  );

-- Grant admin write access to productos/categorias/imagenes_productos
-- (so admin can CRUD from browser client without needing service_role)
DROP POLICY IF EXISTS admin_write_productos ON public.productos;
CREATE POLICY admin_write_productos ON public.productos
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS admin_write_categorias ON public.categorias;
CREATE POLICY admin_write_categorias ON public.categorias
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS admin_write_imagenes_productos ON public.imagenes_productos;
CREATE POLICY admin_write_imagenes_productos ON public.imagenes_productos
  FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
