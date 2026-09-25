-- ════════════════════════════════════════════════════════════════════
-- GEMACUU · Prelista de asistencia
-- Correr UNA vez en Supabase → SQL Editor → New query → Run.
-- Es idempotente: si se corre dos veces no rompe nada.
-- ════════════════════════════════════════════════════════════════════

-- Los tipos de eventos.id y personal.id se leen de la base real (uuid, bigint, etc.)
-- para que las llaves foráneas coincidan sin tener que adivinarlos.
do $$
declare
  t_evento   text;
  t_personal text;
begin
  select format_type(a.atttypid, a.atttypmod) into t_evento
    from pg_attribute a where a.attrelid = 'public.eventos'::regclass and a.attname = 'id';
  select format_type(a.atttypid, a.atttypmod) into t_personal
    from pg_attribute a where a.attrelid = 'public.personal'::regclass and a.attname = 'id';

  -- Estado de la prelista por persona y evento (una fila por persona; sin fila = PENDIENTE).
  execute format($f$
    create table if not exists public.prelista (
      id             uuid primary key default gen_random_uuid(),
      evento_id      %1$s not null references public.eventos(id) on delete cascade,
      personal_id    %2$s not null references public.personal(id) on delete cascade,
      estado         text not null default 'PENDIENTE'
                     check (estado in ('CONFIRMADO','NO_ASISTE','PENDIENTE')),
      motivo         text check (motivo in ('VACACIONES','INCAPACIDAD','OTRO')),
      motivo_detalle text,
      capturado_por  text,
      fecha_captura  timestamptz not null default now(),
      unique (evento_id, personal_id),
      -- motivo solo aplica (y es obligatorio) cuando la persona no asistirá
      check ((estado = 'NO_ASISTE') = (motivo is not null))
    )$f$, t_evento, t_personal);

  -- Bitácora de cambios de la prelista (se muestra en "Historial de cambios").
  -- Sin llaves foráneas a propósito, igual que asistencia_historial: el rastro sobrevive
  -- aunque la persona se dé de baja.
  execute format($f$
    create table if not exists public.prelista_historial (
      id              uuid primary key default gen_random_uuid(),
      evento_id       %1$s not null,
      personal_id     %2$s not null,
      estado_anterior text,
      motivo_anterior text,
      estado_nuevo    text not null,
      motivo_nuevo    text,
      motivo_detalle  text,
      modificado_por  text,
      modificado_en   timestamptz not null default now()
    )$f$, t_evento, t_personal);
end $$;

create index if not exists prelista_evento_idx           on public.prelista (evento_id);
create index if not exists prelista_historial_evento_idx on public.prelista_historial (evento_id);
create index if not exists prelista_historial_fecha_idx  on public.prelista_historial (modificado_en desc);

-- Acceso: la app usa la llave anon (igual que asistencia_eventos / asistencia_historial),
-- así que se le da el mismo nivel de acceso.
alter table public.prelista           enable row level security;
alter table public.prelista_historial enable row level security;

drop policy if exists prelista_anon_all           on public.prelista;
drop policy if exists prelista_historial_anon_all on public.prelista_historial;
create policy prelista_anon_all           on public.prelista           for all to anon, authenticated using (true) with check (true);
create policy prelista_historial_anon_all on public.prelista_historial for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.prelista           to anon, authenticated;
grant select, insert, update, delete on public.prelista_historial to anon, authenticated;
