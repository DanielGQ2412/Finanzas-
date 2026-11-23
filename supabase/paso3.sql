-- =====================================================================
-- Paso 3: gastos fijos
--
-- Correr en Supabase → SQL Editor (como postgres).
-- Es seguro correrlo varias veces.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Arreglo: permitir borrar usuarios sin errores.
--    Quita NOT NULL de creado_por en movimientos y movimientos_stock.
--    (Si una tabla no existe, se salta sin error.)
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.movimientos') is not null then
    alter table public.movimientos alter column creado_por drop not null;
  end if;
  if to_regclass('public.movimientos_stock') is not null then
    alter table public.movimientos_stock alter column creado_por drop not null;
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- B) DATOS DE EJEMPLO (OPCIONAL)
--    Para activarlos: borrá la línea "/*" y la línea "*/" de abajo
--    y corré el script otra vez. No duplica: solo inserta un pago si
--    no existe uno con el mismo nombre en el mismo espacio.
--    Se crean en TODOS los espacios Personal.
--    No se fija "frecuencia" ni "avisos_dias": quedan con su valor por defecto.
-- ---------------------------------------------------------------------
/*
insert into public.pagos_fijos (espacio_id, carpeta_id, nombre, monto, dia_pago, prioridad, activo)
select c.espacio_id, c.id, v.nombre, v.monto, v.dia_pago, v.prioridad, true
from (values
  ('Recibos',   'Luz',            25000, 10, 'alta'),
  ('Recibos',   'Agua',            8000, 12, 'alta'),
  ('Recibos',   'Internet',       22000, 15, 'media'),
  ('Préstamos', 'Préstamo carro', 150000, 5, 'alta')
) as v(carpeta, nombre, monto, dia_pago, prioridad)
join public.carpetas c on c.nombre = v.carpeta
join public.espacios e on e.id = c.espacio_id and e.tipo = 'personal'
where not exists (
  select 1 from public.pagos_fijos p
  where p.espacio_id = c.espacio_id and p.nombre = v.nombre
);
*/


-- ---------------------------------------------------------------------
-- Verificación (opcional)
-- ---------------------------------------------------------------------
select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('movimientos', 'movimientos_stock')
  and column_name = 'creado_por';
