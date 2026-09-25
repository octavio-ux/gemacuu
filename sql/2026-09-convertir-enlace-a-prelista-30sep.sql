-- ════════════════════════════════════════════════════════════════════
-- GEMACUU · Pasar a la PRELISTA lo que los líderes capturaron como "asistencia"
-- en el evento "PRELISTA 30 SEPTIEMBRE" (2026-09-30), que es un evento futuro.
--
-- Se corre en Supabase → SQL Editor, en 3 PASOS, cada uno en su propia consulta.
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- PASO 1 · VISTA PREVIA (solo lee, no cambia nada)
-- Debe salir: evento_encontrado = 1. Revisa los conteos por estado.
-- "ya_tienen_prelista" = personas que YA tienen algo capturado en la prelista
-- (Confirmado / No asistirá); a esas NO se les cambia la prelista.
-- ────────────────────────────────────────────────────────────────────
with ev as (
  select e.id from public.eventos e
  where upper(trim(e.nombre)) = 'PRELISTA 30 SEPTIEMBRE' and e.fecha = '2026-09-30'
)
select
  (select count(*) from ev)                                                             as evento_encontrado,
  (select count(*) from public.asistencia_eventos a join ev on a.evento_id = ev.id)      as filas_en_asistencia,
  (select count(*) from public.asistencia_eventos a join ev on a.evento_id = ev.id where a.estado = 'ASISTENCIA')  as asistencia_a_confirmado,
  (select count(*) from public.asistencia_eventos a join ev on a.evento_id = ev.id where a.estado = 'VACACIONES')  as vacaciones,
  (select count(*) from public.asistencia_eventos a join ev on a.evento_id = ev.id where a.estado = 'INCAPACIDAD') as incapacidad,
  (select count(*) from public.asistencia_eventos a join ev on a.evento_id = ev.id where a.estado = 'FALTA')       as falta_a_otro,
  (select count(*) from public.asistencia_eventos a join ev on a.evento_id = ev.id where a.estado is null)         as sin_estado,
  (select count(*) from public.asistencia_eventos a join ev on a.evento_id = ev.id
     join public.prelista p on p.evento_id = a.evento_id and p.personal_id = a.personal_id
     where a.estado is not null and p.estado <> 'PENDIENTE')                              as ya_tienen_prelista;


-- ────────────────────────────────────────────────────────────────────
-- PASO 2 · RESPALDO (copia las filas de asistencia de ese evento a una tabla aparte,
-- por si algo sale mal). No cambia nada más. Protegida: no se puede leer desde la app.
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.respaldo_asistencia_prelista_30sep as
  select a.*, now() as respaldado_en
  from public.asistencia_eventos a
  join public.eventos e on e.id = a.evento_id
  where upper(trim(e.nombre)) = 'PRELISTA 30 SEPTIEMBRE' and e.fecha = '2026-09-30';
alter table public.respaldo_asistencia_prelista_30sep enable row level security;
select count(*) as filas_respaldadas from public.respaldo_asistencia_prelista_30sep;


-- ────────────────────────────────────────────────────────────────────
-- PASO 3 · CONVERSIÓN (una sola instrucción: o se hace todo, o no se hace nada)
--   ASISTENCIA  → CONFIRMADO
--   VACACIONES  → NO_ASISTE, motivo VACACIONES
--   INCAPACIDAD → NO_ASISTE, motivo INCAPACIDAD
--   FALTA       → NO_ASISTE, motivo OTRO (detalle: "Marcado como Falta en el enlace de asistencia")
-- Cada cambio queda en prelista_historial con modificado_por = 'Conversión enlace'.
-- Si una persona YA tenía prelista capturada (Confirmado / No asistirá), se respeta esa.
-- Al final borra TODAS las filas de asistencia_eventos de ese evento (el evento queda
-- sin asistencia real). Si no encuentra exactamente 1 evento, no hace nada.
-- ────────────────────────────────────────────────────────────────────
with ev as (
  select e.id from public.eventos e
  where upper(trim(e.nombre)) = 'PRELISTA 30 SEPTIEMBRE' and e.fecha = '2026-09-30'
    and (select count(*) from public.eventos x
         where upper(trim(x.nombre)) = 'PRELISTA 30 SEPTIEMBRE' and x.fecha = '2026-09-30') = 1
),
origen as (
  select a.evento_id, a.personal_id,
         case a.estado when 'ASISTENCIA' then 'CONFIRMADO' else 'NO_ASISTE' end as estado,
         case a.estado when 'VACACIONES'  then 'VACACIONES'
                       when 'INCAPACIDAD' then 'INCAPACIDAD'
                       when 'FALTA'       then 'OTRO' end                      as motivo,
         case a.estado when 'FALTA' then 'Marcado como Falta en el enlace de asistencia' end as motivo_detalle
  from public.asistencia_eventos a
  join ev on a.evento_id = ev.id
  where a.estado in ('ASISTENCIA','VACACIONES','INCAPACIDAD','FALTA')
),
a_convertir as (
  select o.*, p.estado as estado_anterior, p.motivo as motivo_anterior
  from origen o
  left join public.prelista p on p.evento_id = o.evento_id and p.personal_id = o.personal_id
  where p.personal_id is null or p.estado = 'PENDIENTE'
),
insertadas as (
  insert into public.prelista (evento_id, personal_id, estado, motivo, motivo_detalle, capturado_por, fecha_captura)
  select evento_id, personal_id, estado, motivo, motivo_detalle, 'Conversión enlace', now()
  from a_convertir
  on conflict (evento_id, personal_id) do update
    set estado = excluded.estado, motivo = excluded.motivo, motivo_detalle = excluded.motivo_detalle,
        capturado_por = excluded.capturado_por, fecha_captura = excluded.fecha_captura
    where public.prelista.estado = 'PENDIENTE'
  returning personal_id
),
historial as (
  insert into public.prelista_historial
    (evento_id, personal_id, estado_anterior, motivo_anterior, estado_nuevo, motivo_nuevo, motivo_detalle, modificado_por)
  select c.evento_id, c.personal_id, coalesce(c.estado_anterior, 'PENDIENTE'), c.motivo_anterior,
         c.estado, c.motivo, c.motivo_detalle, 'Conversión enlace'
  from a_convertir c
  where c.personal_id in (select personal_id from insertadas)
  returning 1
),
borradas as (
  delete from public.asistencia_eventos a
  using ev
  where a.evento_id = ev.id
  returning 1
)
select
  (select count(*) from ev)                                             as evento_encontrado,
  (select count(*) from origen)                                         as filas_con_estado,
  (select count(*) from insertadas)                                     as pasadas_a_prelista,
  (select count(*) from historial)                                      as registradas_en_historial,
  (select count(*) from origen) - (select count(*) from insertadas)     as respetadas_por_ya_tener_prelista,
  (select count(*) from borradas)                                       as borradas_de_asistencia;


-- ────────────────────────────────────────────────────────────────────
-- (Opcional, días después, cuando ya confirmaste que todo quedó bien)
-- Borrar el respaldo:
--   drop table public.respaldo_asistencia_prelista_30sep;
-- ────────────────────────────────────────────────────────────────────
