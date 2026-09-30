-- Sprout admin tool (admin/, https://sprout-admin-minjae.vercel.app) and iOS remote notifications.
--
-- The consumer app carries no admin code. The admin site's API (admin/server, a Vercel function) uses the service
-- role; every table here is service-role only except the two device RPCs the iOS app calls with the anon key.

-- A short id per web subscription so the admin tool can name one without handling its endpoint.
alter table public.push_subscriptions add column if not exists id bigint generated always as identity;
create unique index if not exists push_subscriptions_id_idx on public.push_subscriptions (id);

-- iOS devices registered for remote (APNs) notifications ("Notes from Sprout"). Guests may register (user_id null).
-- Unlike web push there is no profile snapshot: the iOS app schedules its own reminders on the phone, so nothing
-- about the baby is sent, only the token, language and time zone (privacy policy, "Reminders"). A token is valid
-- only on the APNs host that issued it: Xcode and simulator builds register with the sandbox, TestFlight and App
-- Store builds with production, and the app reports which.
create table if not exists public.push_devices (
  id           bigint generated always as identity unique,
  token        text primary key check (token ~ '^[0-9a-f]{64,200}$'),
  environment  text not null default 'production' check (environment in ('production', 'sandbox')),
  user_id      uuid references auth.users (id) on delete cascade,
  lang         text not null default 'en' check (lang in ('en', 'ko')),
  tz           text not null default 'UTC',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_devices_user_id_idx on public.push_devices (user_id);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;
grant all on public.push_devices to service_role;
drop trigger if exists push_devices_touch on public.push_devices;
create trigger push_devices_touch before update on public.push_devices for each row execute function public.touch_updated_at();

-- The app registers its token (on every launch while notifications are on). A token is one device, so it belongs
-- to whoever registered it last: a signed-in user claims it, a guest leaves it unowned. Security definer because
-- the table has no client policies; the inputs are validated here.
create or replace function public.register_push_device(
  p_token text, p_environment text default 'production', p_lang text default 'en', p_tz text default 'UTC'
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_token text := lower(coalesce(p_token, ''));
  v_tz text := left(coalesce(nullif(trim(p_tz), ''), 'UTC'), 64);
begin
  if v_token !~ '^[0-9a-f]{64,200}$' then raise exception 'bad token'; end if;
  if p_environment not in ('production', 'sandbox') then raise exception 'bad environment'; end if;
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;
  insert into public.push_devices (token, environment, user_id, lang, tz, last_seen_at)
  values (v_token, p_environment, auth.uid(), case when p_lang = 'ko' then 'ko' else 'en' end, v_tz, now())
  on conflict (token) do update set
    environment = excluded.environment, user_id = excluded.user_id, lang = excluded.lang, tz = excluded.tz, last_seen_at = now();
end $$;
revoke all on function public.register_push_device(text, text, text, text) from public;
grant execute on function public.register_push_device(text, text, text, text) to anon, authenticated;

-- Settings > Notes from Sprout: off removes this device. Knowing the token is the permission (it never leaves the
-- device except to us and Apple).
create or replace function public.unregister_push_device(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_devices where token = lower(coalesce(p_token, ''));
$$;
revoke all on function public.unregister_push_device(text) from public;
grant execute on function public.unregister_push_device(text) to anon, authenticated;

-- One row per admin send to one recipient (all of their web subscriptions and iOS devices). dedupe_key makes a
-- send idempotent: a retried request with the same key finds the row and sends nothing.
create table if not exists public.push_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  recipient   text,                          -- user:<uuid> | web:<id> | ios:<id>
  user_id     uuid references auth.users (id) on delete set null,
  kind        text not null,                 -- admin_test | admin_single | admin_broadcast | admin_weekly
  title       text,                          -- weekly notes store a placeholder: the real title names the baby
  body        text,
  link        text,
  status      text not null,                 -- sending | sent | partial | failed | no_devices
  devices     int not null default 0,
  sent        int not null default 0,
  dropped     int not null default 0,        -- dead subscriptions / tokens removed (404, 410, BadDeviceToken)
  error       text,
  results     jsonb,
  dedupe_key  text unique,
  actor_id    uuid
);
create index if not exists push_log_created_idx on public.push_log (created_at desc);
alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;
grant all on public.push_log to service_role;

-- Every admin API call, allowed or refused: who, what, outcome. Rate limits count from here.
create table if not exists public.admin_audit (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  actor_id    uuid,
  actor_email text,
  action      text not null,
  target      text,
  payload     jsonb,
  result      jsonb,
  ok          boolean not null default false
);
create index if not exists admin_audit_actor_idx on public.admin_audit (actor_id, action, created_at desc);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;
grant all on public.admin_audit to service_role;

-- The APNs provider token, reused for up to 40 minutes (Apple answers 429 TooManyProviderTokenUpdates to a sender
-- that changes it more often than every 20). One row.
create table if not exists public.apns_provider_token (
  id         int primary key default 1 check (id = 1),
  key_id     text not null,
  jwt        text not null,
  iat        bigint not null,
  updated_at timestamptz not null default now()
);
alter table public.apns_provider_token enable row level security;
revoke all on public.apns_provider_token from anon, authenticated;
grant all on public.apns_provider_token to service_role;

-- Live settings for the admin API that change without a redeploy (the admin_emails allowlist override), read from
-- Vault. Service role only.
create or replace function public.admin_secret(secret_name text) returns text
language sql security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1;
$$;
revoke all on function public.admin_secret(text) from public, anon, authenticated;
grant execute on function public.admin_secret(text) to service_role;
