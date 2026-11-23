-- =====================================================================
-- Instalación completa de la base de datos (Supabase / PostgreSQL)
--
-- Cómo usarlo: en tu proyecto de Supabase entra a "SQL Editor", pega
-- TODO este archivo y dale "Run". Se puede correr más de una vez.
--
-- Crea: tablas, candados por rol (RLS), roles Admin / Editor / Viewer
-- con permisos por sección, registro de actividad y avisos en vivo.
-- =====================================================================

-- ---------- 1. Tablas ----------
create table if not exists public.giras (
  id bigint not null,
  nombre text not null,
  fecha_inicio date,
  fecha_fin date,
  notas text,
  created_at timestamp with time zone default now(),
  moneda_principal text default 'MXN'::text,
  tipo_cambio_referencia numeric,
  constraint giras_pkey PRIMARY KEY (id)
);
create table if not exists public.eventos (
  id bigint not null,
  nombre text not null,
  fecha date,
  fecha_fin date,
  hora text,
  hora_fin text,
  lugar text,
  aforo integer default 0,
  registrados integer default 0,
  estado text default 'Borrador'::text,
  descripcion text,
  responsable text,
  color text default '#1d4ed8'::text,
  miembros jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  oculto boolean default false,
  gira text,
  gira_id bigint,
  google_event_id text,
  constraint eventos_gira_id_fkey FOREIGN KEY (gira_id) REFERENCES giras(id) ON DELETE SET NULL,
  constraint eventos_pkey PRIMARY KEY (id)
);
create table if not exists public.gastos (
  id bigint not null,
  concepto text not null,
  categoria text,
  otro_detalle text,
  proveedor text,
  notas text,
  monto numeric default 0,
  evento_id bigint,
  comprobantes jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  metodo_pago text,
  moneda text default 'MXN'::text,
  tipo_cambio numeric,
  constraint gastos_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE SET NULL,
  constraint gastos_pkey PRIMARY KEY (id)
);
create table if not exists public.tareas (
  id bigint not null,
  titulo text not null,
  descripcion text,
  estado text default 'Pendiente'::text,
  prioridad text default 'Media'::text,
  fecha_limite date,
  responsable text,
  evento_id bigint,
  created_at timestamp with time zone default now(),
  orden integer,
  constraint tareas_pkey PRIMARY KEY (id),
  constraint tareas_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE SET NULL
);
create table if not exists public.agenda (
  id bigint not null,
  titulo text not null,
  fecha date,
  hora text,
  notas text,
  created_at timestamp with time zone default now(),
  fecha_fin date,
  hora_fin text,
  todo_el_dia boolean default false,
  color text,
  google_event_id text,
  tipo text default 'Recordatorio'::text,
  constraint agenda_pkey PRIMARY KEY (id)
);
create table if not exists public.logistica (
  id bigint not null,
  tipo text default 'Otro'::text not null,
  fecha date not null,
  fecha_fin date,
  hora text,
  hora_fin text,
  nota text,
  creado_en timestamp with time zone default now() not null,
  constraint logistica_pkey PRIMARY KEY (id)
);
create table if not exists public.notas_giras (
  id bigint not null,
  texto text not null,
  creado_en timestamp with time zone default now() not null,
  fecha date,
  constraint notas_giras_pkey PRIMARY KEY (id)
);
create table if not exists public.salones (
  id bigint not null,
  region text,
  ciudad text,
  hotel text,
  contacto text,
  telefonos jsonb default '[]'::jsonb,
  correo text,
  salon text,
  costo numeric,
  personas integer,
  capacidad_maxima integer,
  created_at timestamp with time zone default now(),
  notas text,
  constraint salones_pkey PRIMARY KEY (id)
);
create table if not exists public.aerolineas (
  id bigint not null,
  nombre text not null,
  cuenta text,
  correo text,
  contrasena text,
  maleta_doc1 numeric,
  maleta_doc2 numeric,
  maleta_mano numeric,
  notas text,
  created_at timestamp with time zone default now(),
  constraint aerolineas_pkey PRIMARY KEY (id)
);
create table if not exists public.proveedores (
  id bigint not null,
  nombre text not null,
  categoria text,
  contacto text,
  telefono text,
  email text,
  calificacion integer default 5,
  notas text,
  activo boolean default true,
  created_at timestamp with time zone default now(),
  constraint proveedores_pkey PRIMARY KEY (id)
);
create table if not exists public.equipo (
  id bigint not null,
  nombre text not null,
  rol text,
  email text,
  telefono text,
  departamento text,
  color text default '#1d4ed8'::text,
  iniciales text,
  docs jsonb default '[]'::jsonb,
  pasaporte_numero text,
  pasaporte_expedicion date,
  pasaporte_vencimiento date,
  tiene_visa boolean default false,
  visa_expedicion date,
  visa_vencimiento date,
  created_at timestamp with time zone default now(),
  favorito boolean default false,
  fecha_nacimiento date,
  nacionalidad text,
  visa_numero text,
  constraint equipo_pkey PRIMARY KEY (id)
);
create table if not exists public.integraciones_google (
  id integer default 1 not null,
  access_token text,
  refresh_token text,
  expiry_date bigint,
  connected_email text,
  updated_at timestamp with time zone default now(),
  connected_since timestamp with time zone,
  constraint integraciones_google_pkey PRIMARY KEY (id),
  constraint solo_una_fila CHECK ((id = 1))
);
create table if not exists public.permisos_rol (
  rol text not null,
  seccion text not null,
  ver boolean default false not null,
  editar boolean default false not null,
  constraint permisos_rol_rol_check CHECK ((rol = ANY (ARRAY['editor'::text, 'viewer'::text]))),
  constraint permisos_rol_pkey PRIMARY KEY (rol, seccion)
);
create table if not exists public.actividad (
  id bigserial not null,
  creado_en timestamp with time zone default now() not null,
  usuario_id uuid,
  usuario_nombre text,
  usuario_email text,
  rol text,
  tabla text not null,
  seccion text,
  accion text not null,
  registro_id text,
  descripcion text,
  cambios jsonb,
  leido boolean default false not null,
  constraint actividad_accion_check CHECK ((accion = ANY (ARRAY['agrego'::text, 'edito'::text, 'borro'::text]))),
  constraint actividad_pkey PRIMARY KEY (id)
);
create index if not exists actividad_creado_idx on public.actividad (creado_en desc);

-- ---------- 2. Funciones de permisos ----------
CREATE OR REPLACE FUNCTION public.mi_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select u.raw_app_meta_data ->> 'acceso' from auth.users u where u.id = auth.uid()
$function$;
CREATE OR REPLACE FUNCTION public.tiene_acceso()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(public.mi_rol() in ('admin','editor','viewer'), false)
$function$;
CREATE OR REPLACE FUNCTION public.puede(p_seccion text, p_accion text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when public.mi_rol() = 'admin' then true
    when public.mi_rol() in ('editor','viewer') then coalesce((
      select case when p_accion = 'editar' then pr.editar else (pr.ver or pr.editar) end
      from public.permisos_rol pr where pr.rol = public.mi_rol() and pr.seccion = p_seccion
    ), false)
    else false
  end
$function$;
CREATE OR REPLACE FUNCTION public.registrar_actividad()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  fila jsonb;
  antes jsonb;
  v_accion text;
  v_cambios jsonb := null;
  v_desc text;
  v_nombre text;
  v_email text;
  v_rol text;
  k text;
  ignorar text[] := array['created_at','creado_en','google_event_id','orden','id'];
  ocultar text[] := array['contrasena','pasaporte_numero','visa_numero'];
  pesados text[] := array['comprobantes','docs'];
  txt_antes text;
  txt_despues text;
begin
  if tg_op = 'DELETE' then fila := to_jsonb(old); v_accion := 'borro';
  elsif tg_op = 'INSERT' then fila := to_jsonb(new); v_accion := 'agrego';
  else
    fila := to_jsonb(new); antes := to_jsonb(old); v_accion := 'edito';
    v_cambios := '{}'::jsonb;
    for k in select jsonb_object_keys(fila) loop
      continue when k = any(ignorar);
      if (fila -> k) is distinct from (antes -> k) then
        if k = any(ocultar) then
          v_cambios := v_cambios || jsonb_build_object(k, jsonb_build_object('oculto', true));
        elsif k = any(pesados) then
          v_cambios := v_cambios || jsonb_build_object(k, jsonb_build_object(
            'antes', coalesce(jsonb_array_length(case when jsonb_typeof(antes->k)='array' then antes->k else '[]' end),0) || ' archivo(s)',
            'despues', coalesce(jsonb_array_length(case when jsonb_typeof(fila->k)='array' then fila->k else '[]' end),0) || ' archivo(s)'));
        else
          txt_antes := left(coalesce(antes ->> k, ''), 160);
          txt_despues := left(coalesce(fila ->> k, ''), 160);
          v_cambios := v_cambios || jsonb_build_object(k, jsonb_build_object('antes', txt_antes, 'despues', txt_despues));
        end if;
      end if;
    end loop;
    -- Cambios solo de orden o de enlace con Google: no se anotan.
    if v_cambios = '{}'::jsonb then return null; end if;
  end if;

  v_desc := case tg_table_name
    when 'gastos' then concat_ws(' · ', nullif(fila->>'concepto',''), case when fila->>'monto' is not null then '$' || to_char((fila->>'monto')::numeric, 'FM999,999,990.00') || coalesce(' ' || nullif(fila->>'moneda',''), '') end)
    when 'salones' then concat_ws(' · ', nullif(fila->>'hotel',''), nullif(fila->>'salon',''), nullif(fila->>'ciudad',''))
    when 'logistica' then concat_ws(' · ', fila->>'tipo', to_char((fila->>'fecha')::date, 'DD/MM/YYYY'), nullif(left(fila->>'nota', 80),''))
    when 'notas_giras' then left(fila->>'texto', 100)
    when 'tareas' then fila->>'titulo'
    when 'agenda' then concat_ws(' · ', fila->>'titulo', to_char((fila->>'fecha')::date, 'DD/MM/YYYY'))
    else coalesce(fila->>'nombre', fila->>'titulo', fila->>'concepto')
  end;

  if auth.uid() is not null then
    select coalesce(nullif(u.raw_user_meta_data->>'nombre',''), split_part(u.email,'@',1)), u.email, u.raw_app_meta_data->>'acceso'
      into v_nombre, v_email, v_rol
      from auth.users u where u.id = auth.uid();
  else
    v_nombre := 'Sincronización con Google Calendar';
    v_rol := 'sistema';
  end if;

  insert into public.actividad (usuario_id, usuario_nombre, usuario_email, rol, tabla, seccion, accion, registro_id, descripcion, cambios, leido)
  values (auth.uid(), v_nombre, v_email, v_rol, tg_table_name,
    case tg_table_name when 'agenda' then 'calendario' when 'logistica' then 'calendario' when 'notas_giras' then 'calendario'
      when 'tareas' then 'checklist' when 'proveedores' then 'salones' else tg_table_name end,
    v_accion, fila->>'id', nullif(v_desc,''), v_cambios,
    coalesce(v_rol, '') = 'admin');
  return null;
end $function$;

revoke all on function public.mi_rol() from public, anon;
grant execute on function public.mi_rol() to authenticated;
revoke all on function public.puede(text, text) from public, anon;
grant execute on function public.puede(text, text) to authenticated;
revoke all on function public.tiene_acceso() from public, anon;
grant execute on function public.tiene_acceso() to authenticated;
revoke all on function public.registrar_actividad() from public, anon, authenticated;

-- Consulta mínima para el "keepalive" (evita que Supabase pause el proyecto gratis).
create or replace function public.ping() returns int language sql stable as $$ select 1 $$;
grant execute on function public.ping() to anon, authenticated;

-- ---------- 3. Permisos por rol (valores iniciales) ----------
-- Editor: ve y edita todo (menos Equipo, que solo edita la admin). Viewer: solo ve.
-- Después se cambian desde la app en Usuarios > Permisos por rol.
insert into public.permisos_rol (rol, seccion, ver, editar)
select r, s, true, (r = 'editor' and s <> 'equipo')
from unnest(array['editor','viewer']) r,
     unnest(array['dashboard','calendario','giras','eventos','gastos','equipo','checklist','aerolineas','salones']) s
on conflict do nothing;

-- ---------- 4. Candados (RLS) ----------
alter table public.giras enable row level security;
revoke all on public.giras from anon;
alter table public.eventos enable row level security;
revoke all on public.eventos from anon;
alter table public.gastos enable row level security;
revoke all on public.gastos from anon;
alter table public.tareas enable row level security;
revoke all on public.tareas from anon;
alter table public.agenda enable row level security;
revoke all on public.agenda from anon;
alter table public.logistica enable row level security;
revoke all on public.logistica from anon;
alter table public.notas_giras enable row level security;
revoke all on public.notas_giras from anon;
alter table public.salones enable row level security;
revoke all on public.salones from anon;
alter table public.aerolineas enable row level security;
revoke all on public.aerolineas from anon;
alter table public.proveedores enable row level security;
revoke all on public.proveedores from anon;
alter table public.equipo enable row level security;
revoke all on public.equipo from anon;
alter table public.integraciones_google enable row level security;
revoke all on public.integraciones_google from anon;
alter table public.permisos_rol enable row level security;
revoke all on public.permisos_rol from anon;
alter table public.actividad enable row level security;
revoke all on public.actividad from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on public.integraciones_google from authenticated;  -- solo el servidor (service_role)
revoke insert on public.actividad from authenticated;           -- solo la llena el trigger

drop policy if exists "admin borra actividad" on public.actividad;
create policy "admin borra actividad" on public.actividad for delete to authenticated using ((( SELECT mi_rol() AS mi_rol) = 'admin'::text));
drop policy if exists "admin marca leido" on public.actividad;
create policy "admin marca leido" on public.actividad for update to authenticated using ((( SELECT mi_rol() AS mi_rol) = 'admin'::text)) with check ((( SELECT mi_rol() AS mi_rol) = 'admin'::text));
drop policy if exists "admin ve actividad" on public.actividad;
create policy "admin ve actividad" on public.actividad for select to authenticated using ((( SELECT mi_rol() AS mi_rol) = 'admin'::text));
drop policy if exists "agregar segun rol" on public.aerolineas;
create policy "agregar segun rol" on public.aerolineas for insert to authenticated with check (( SELECT puede('aerolineas'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.aerolineas;
create policy "borrar segun rol" on public.aerolineas for delete to authenticated using (( SELECT puede('aerolineas'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.aerolineas;
create policy "cambiar segun rol" on public.aerolineas for update to authenticated using (( SELECT puede('aerolineas'::text, 'editar'::text) AS puede)) with check (( SELECT puede('aerolineas'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.aerolineas;
create policy "ver segun rol" on public.aerolineas for select to authenticated using (( SELECT puede('aerolineas'::text, 'ver'::text) AS puede));
drop policy if exists "agregar segun rol" on public.agenda;
create policy "agregar segun rol" on public.agenda for insert to authenticated with check (( SELECT puede('calendario'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.agenda;
create policy "borrar segun rol" on public.agenda for delete to authenticated using (( SELECT puede('calendario'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.agenda;
create policy "cambiar segun rol" on public.agenda for update to authenticated using (( SELECT puede('calendario'::text, 'editar'::text) AS puede)) with check (( SELECT puede('calendario'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.agenda;
create policy "ver segun rol" on public.agenda for select to authenticated using (( SELECT puede('calendario'::text, 'ver'::text) AS puede));
drop policy if exists "solo admin" on public.equipo;
create policy "solo admin" on public.equipo for all to authenticated using ((( SELECT mi_rol() AS mi_rol) = 'admin'::text)) with check ((( SELECT mi_rol() AS mi_rol) = 'admin'::text));
drop policy if exists "agregar segun rol" on public.eventos;
create policy "agregar segun rol" on public.eventos for insert to authenticated with check (( SELECT puede('eventos'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.eventos;
create policy "borrar segun rol" on public.eventos for delete to authenticated using (( SELECT puede('eventos'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.eventos;
create policy "cambiar segun rol" on public.eventos for update to authenticated using (( SELECT puede('eventos'::text, 'editar'::text) AS puede)) with check (( SELECT puede('eventos'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.eventos;
create policy "ver segun rol" on public.eventos for select to authenticated using (( SELECT puede('eventos'::text, 'ver'::text) AS puede));
drop policy if exists "agregar segun rol" on public.gastos;
create policy "agregar segun rol" on public.gastos for insert to authenticated with check (( SELECT puede('gastos'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.gastos;
create policy "borrar segun rol" on public.gastos for delete to authenticated using (( SELECT puede('gastos'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.gastos;
create policy "cambiar segun rol" on public.gastos for update to authenticated using (( SELECT puede('gastos'::text, 'editar'::text) AS puede)) with check (( SELECT puede('gastos'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.gastos;
create policy "ver segun rol" on public.gastos for select to authenticated using (( SELECT puede('gastos'::text, 'ver'::text) AS puede));
drop policy if exists "agregar segun rol" on public.giras;
create policy "agregar segun rol" on public.giras for insert to authenticated with check (( SELECT puede('giras'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.giras;
create policy "borrar segun rol" on public.giras for delete to authenticated using (( SELECT puede('giras'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.giras;
create policy "cambiar segun rol" on public.giras for update to authenticated using (( SELECT puede('giras'::text, 'editar'::text) AS puede)) with check (( SELECT puede('giras'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.giras;
create policy "ver segun rol" on public.giras for select to authenticated using (( SELECT puede('giras'::text, 'ver'::text) AS puede));
drop policy if exists "agregar segun rol" on public.logistica;
create policy "agregar segun rol" on public.logistica for insert to authenticated with check (( SELECT puede('calendario'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.logistica;
create policy "borrar segun rol" on public.logistica for delete to authenticated using (( SELECT puede('calendario'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.logistica;
create policy "cambiar segun rol" on public.logistica for update to authenticated using (( SELECT puede('calendario'::text, 'editar'::text) AS puede)) with check (( SELECT puede('calendario'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.logistica;
create policy "ver segun rol" on public.logistica for select to authenticated using (( SELECT puede('calendario'::text, 'ver'::text) AS puede));
drop policy if exists "agregar segun rol" on public.notas_giras;
create policy "agregar segun rol" on public.notas_giras for insert to authenticated with check (( SELECT puede('calendario'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.notas_giras;
create policy "borrar segun rol" on public.notas_giras for delete to authenticated using (( SELECT puede('calendario'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.notas_giras;
create policy "cambiar segun rol" on public.notas_giras for update to authenticated using (( SELECT puede('calendario'::text, 'editar'::text) AS puede)) with check (( SELECT puede('calendario'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.notas_giras;
create policy "ver segun rol" on public.notas_giras for select to authenticated using (( SELECT puede('calendario'::text, 'ver'::text) AS puede));
drop policy if exists "admin cambia permisos" on public.permisos_rol;
create policy "admin cambia permisos" on public.permisos_rol for all to authenticated using ((( SELECT mi_rol() AS mi_rol) = 'admin'::text)) with check ((( SELECT mi_rol() AS mi_rol) = 'admin'::text));
drop policy if exists "leer permisos" on public.permisos_rol;
create policy "leer permisos" on public.permisos_rol for select to authenticated using (( SELECT tiene_acceso() AS tiene_acceso));
drop policy if exists "agregar segun rol" on public.proveedores;
create policy "agregar segun rol" on public.proveedores for insert to authenticated with check (( SELECT puede('salones'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.proveedores;
create policy "borrar segun rol" on public.proveedores for delete to authenticated using (( SELECT puede('salones'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.proveedores;
create policy "cambiar segun rol" on public.proveedores for update to authenticated using (( SELECT puede('salones'::text, 'editar'::text) AS puede)) with check (( SELECT puede('salones'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.proveedores;
create policy "ver segun rol" on public.proveedores for select to authenticated using (( SELECT puede('salones'::text, 'ver'::text) AS puede));
drop policy if exists "agregar segun rol" on public.salones;
create policy "agregar segun rol" on public.salones for insert to authenticated with check (( SELECT puede('salones'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.salones;
create policy "borrar segun rol" on public.salones for delete to authenticated using (( SELECT puede('salones'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.salones;
create policy "cambiar segun rol" on public.salones for update to authenticated using (( SELECT puede('salones'::text, 'editar'::text) AS puede)) with check (( SELECT puede('salones'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.salones;
create policy "ver segun rol" on public.salones for select to authenticated using (( SELECT puede('salones'::text, 'ver'::text) AS puede));
drop policy if exists "agregar segun rol" on public.tareas;
create policy "agregar segun rol" on public.tareas for insert to authenticated with check (( SELECT puede('checklist'::text, 'editar'::text) AS puede));
drop policy if exists "borrar segun rol" on public.tareas;
create policy "borrar segun rol" on public.tareas for delete to authenticated using (( SELECT puede('checklist'::text, 'editar'::text) AS puede));
drop policy if exists "cambiar segun rol" on public.tareas;
create policy "cambiar segun rol" on public.tareas for update to authenticated using (( SELECT puede('checklist'::text, 'editar'::text) AS puede)) with check (( SELECT puede('checklist'::text, 'editar'::text) AS puede));
drop policy if exists "ver segun rol" on public.tareas;
create policy "ver segun rol" on public.tareas for select to authenticated using (( SELECT puede('checklist'::text, 'ver'::text) AS puede));

-- ---------- 5. Equipo sin datos personales para Editor y Viewer ----------
-- La tabla completa de equipo (correo, teléfono, pasaporte, visa, documentos)
-- solo la lee la admin. Los demás roles solo ven nombre, área, color e iniciales.
create or replace view public.equipo_publico with (security_invoker = false) as
  select id, nombre, rol, departamento, color, iniciales, favorito
  from public.equipo
  where (select public.puede('equipo', 'ver')) or (select public.puede('eventos', 'ver'));
revoke all on public.equipo_publico from anon, public;
grant select on public.equipo_publico to authenticated;

-- ---------- 6. Registro de actividad ----------
do $$
declare t text;
begin
  foreach t in array array['eventos','giras','gastos','tareas','agenda','logistica','notas_giras','salones','aerolineas','proveedores','equipo'] loop
    execute format('drop trigger if exists anotar_actividad on public.%I', t);
    execute format('create trigger anotar_actividad after insert or update or delete on public.%I for each row execute function public.registrar_actividad()', t);
  end loop;
end $$;

-- Avisos en vivo para la admin.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'actividad') then
    alter publication supabase_realtime add table public.actividad;
  end if;
end $$;

notify pgrst, 'reload schema';

-- =====================================================================
-- Último paso: crea tu cuenta de admin (ver README, "Paso 3").
-- =====================================================================
