-- =====================================================================
-- Paso 2: carpetas iniciales del espacio Personal
--
-- Correr en Supabase → SQL Editor (como postgres).
-- Es seguro correrlo varias veces: no duplica carpetas ni triggers.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Función que crea las carpetas iniciales en un espacio.
--    Solo inserta las que todavía no existen (mismo espacio y nombre).
-- ---------------------------------------------------------------------
create or replace function public.crear_carpetas_iniciales(p_espacio_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.carpetas (espacio_id, nombre, tipo, prioridad, orden)
  select p_espacio_id, v.nombre, v.tipo, v.prioridad, v.orden
  from (values
    ('Recibos',             'fijo',       'alta',  1),
    ('Préstamos',           'fijo',       'alta',  2),
    ('Súper',               'variable',   'alta',  3),
    ('Comida fuera',        'variable',   'baja',  4),
    ('Gasolina',            'variable',   'media', 5),
    ('Ahorros',             'ahorro',     'media', 6),
    ('Fondo de emergencia', 'emergencia', 'alta',  7)
  ) as v(nombre, tipo, prioridad, orden)
  where not exists (
    select 1
    from public.carpetas c
    where c.espacio_id = p_espacio_id
      and c.nombre = v.nombre
  );
$$;

-- Nadie puede llamarla desde la app (evita que alguien cree carpetas en
-- espacios ajenos vía RPC). Solo la usan este script y el trigger.
revoke all on function public.crear_carpetas_iniciales(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Trigger: al crearse un espacio Personal (usuario nuevo),
--    se le crean las carpetas iniciales automáticamente.
-- ---------------------------------------------------------------------
create or replace function public.trg_carpetas_espacio_personal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.crear_carpetas_iniciales(new.id);
  return new;
end;
$$;

revoke all on function public.trg_carpetas_espacio_personal() from public, anon, authenticated;

drop trigger if exists carpetas_iniciales_personal on public.espacios;

create trigger carpetas_iniciales_personal
  after insert on public.espacios
  for each row
  when (new.tipo = 'personal')
  execute function public.trg_carpetas_espacio_personal();

-- ---------------------------------------------------------------------
-- 3. Carpetas para todos los espacios Personal que ya existen.
-- ---------------------------------------------------------------------
select public.crear_carpetas_iniciales(e.id)
from public.espacios e
where e.tipo = 'personal';

commit;

-- ---------------------------------------------------------------------
-- Verificación (opcional): debería mostrar 7 carpetas por espacio Personal.
-- ---------------------------------------------------------------------
select e.nombre as espacio, e.creado_por, count(c.id) as carpetas
from public.espacios e
left join public.carpetas c on c.espacio_id = e.id
where e.tipo = 'personal'
group by e.id, e.nombre, e.creado_por;
