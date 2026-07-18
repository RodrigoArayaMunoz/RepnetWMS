-- Repnet WMS: credenciales QR estaticas y sesiones sin expiracion automatica.
-- Ejecutar una sola vez en una base de datos nueva mediante Supabase migrations.

create extension if not exists pgcrypto with schema extensions;

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  display_name text not null,
  warehouse_id uuid not null references public.warehouses(id),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operator_roles (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id),
  role_code text not null check (role_code in ('colaborador', 'supervisor', 'administrador')),
  created_at timestamptz not null default now(),
  unique (operator_id, warehouse_id, role_code)
);

create table public.operator_credentials (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  token_hash char(64) not null unique,
  label text not null default 'Credencial QR',
  status text not null default 'active' check (status in ('active', 'revoked')),
  valid_from timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > valid_from)
);

create table public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  credential_id uuid not null references public.operator_credentials(id),
  session_token_hash char(64) not null unique,
  scan_source text not null check (scan_source in ('camera', 'pda_imager')),
  status text not null default 'active' check (status in ('active', 'closed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  created_at timestamptz not null default now(),
  check ((status = 'active' and ended_at is null) or (status = 'closed' and ended_at is not null))
);

create unique index work_sessions_one_active_operator
  on public.work_sessions (operator_id)
  where status = 'active';

create table public.auth_events (
  id bigint generated always as identity primary key,
  event_type text not null check (
    event_type in ('login_succeeded', 'login_rejected', 'logout', 'credential_revoked')
  ),
  success boolean not null,
  operator_id uuid references public.operators(id),
  credential_id uuid references public.operator_credentials(id),
  session_id uuid references public.work_sessions(id),
  scan_source text check (scan_source in ('camera', 'pda_imager')),
  reason_code text,
  created_at timestamptz not null default now()
);

create index operator_credentials_operator_id_idx on public.operator_credentials(operator_id);
create index operator_credentials_active_idx on public.operator_credentials(token_hash) where status = 'active';
create index operator_roles_operator_warehouse_idx on public.operator_roles(operator_id, warehouse_id);
create index work_sessions_active_idx on public.work_sessions(session_token_hash) where status = 'active';
create index auth_events_operator_created_idx on public.auth_events(operator_id, created_at desc);

-- Devuelve el valor que debe codificarse en el QR solo en este momento.
-- La tabla guarda exclusivamente su hash SHA-256.
create or replace function public.issue_qr_credential(
  p_operator_id uuid,
  p_label text default 'Credencial QR'
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  raw_secret text;
  qr_value text;
begin
  if not exists (
    select 1
    from public.operators
    where id = p_operator_id
      and status = 'active'
  ) then
    raise exception 'El operador no existe o no esta activo.';
  end if;

  raw_secret := encode(extensions.gen_random_bytes(32), 'hex');
  qr_value := 'repnet:v1:' || raw_secret;

  insert into public.operator_credentials (operator_id, token_hash, label)
  values (
    p_operator_id,
    encode(extensions.digest(raw_secret, 'sha256'), 'hex'),
    coalesce(nullif(trim(p_label), ''), 'Credencial QR')
  );

  return qr_value;
end;
$$;

alter table public.warehouses enable row level security;
alter table public.operators enable row level security;
alter table public.operator_roles enable row level security;
alter table public.operator_credentials enable row level security;
alter table public.work_sessions enable row level security;
alter table public.auth_events enable row level security;

revoke all on table public.warehouses, public.operators, public.operator_roles,
  public.operator_credentials, public.work_sessions, public.auth_events
  from anon, authenticated;
revoke all on function public.issue_qr_credential(uuid, text) from public, anon, authenticated;
grant execute on function public.issue_qr_credential(uuid, text) to service_role;
