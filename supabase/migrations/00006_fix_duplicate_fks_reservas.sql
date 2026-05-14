-- GottLab — Migration 006: Fix duplicate FKs causing PGRST201 embedding errors
-- reservas_id_producto_fkey duplicates fk_reservas_producto → causes PostgREST
-- "Could not embed because more than one relationship was found" on getCarrito()

ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS reservas_id_producto_fkey;
