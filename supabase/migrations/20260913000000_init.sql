-- Sprout: account data (optional sign-in). Guests keep data on device; signed-in users mirror it here.
-- One row per (user, key) holding the same JSON the app keeps locally, so the client store stays the source of truth
-- and sync is a simple last-write-wins merge. Keys mirror src/lib/store.ts KEYS.
create table if not exists public.user_data (
  user_id    uuid not null references auth.users (id) on delete cascade,
  key        text not null check (key in ('profile', 'milestones', 'memos', 'settings', 'acks', 'language')),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.user_data enable row level security;
drop policy if exists "own rows" on public.user_data;
create policy "own rows" on public.user_data
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Web push subscriptions (site + installed web app). Guests may subscribe (user_id null). The profile snapshot
-- columns let the weekly job pick month-appropriate content without a sign-in; the client refreshes them on load.
create table if not exists public.push_subscriptions (
  endpoint       text primary key,
  user_id        uuid references auth.users (id) on delete cascade,
  p256dh         text not null,
  auth           text not null,
  lang           text not null default 'en' check (lang in ('en', 'ko')),
  tz             text not null default 'UTC',
  name           text,
  birth_date     date,
  due_date       date,
  weekly_enabled boolean not null default true,
  last_weekly_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
-- No client policies on purpose: every read/write goes through server routes using the service role.

-- keep updated_at honest
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before update on public.user_data for each row execute function public.touch_updated_at();
drop trigger if exists push_subscriptions_touch on public.push_subscriptions;
create trigger push_subscriptions_touch before update on public.push_subscriptions for each row execute function public.touch_updated_at();
