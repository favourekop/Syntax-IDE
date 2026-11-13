-- SYNTAX IDE initial application data schema.
-- Apply through the Supabase SQL editor or Supabase CLI after reviewing.
-- Never expose the service-role key to browser code.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null default 'pending',
  status text not null default 'stopped'
    check (status in ('pending', 'starting', 'running', 'stopped', 'failed')),
  provider_workspace_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  tier text not null default 'regular'
    check (tier in ('regular', 'geek', 'pro', 'ekop', 'premium')),
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'cancelled')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.workspace_sessions enable row level security;
alter table public.subscriptions enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can manage their own projects"
  on public.projects for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Users can read their own workspace sessions"
  on public.workspace_sessions for select to authenticated
  using (auth.uid() = owner_id);
-- Workspace creation/status updates should be performed by the trusted backend
-- after checking project ownership and provider permissions.

create policy "Users can read their own subscription"
  on public.subscriptions for select to authenticated
  using (auth.uid() = owner_id);
-- Subscription writes are backend/webhook-only; do not grant client write policies.

create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists workspace_sessions_owner_id_idx on public.workspace_sessions(owner_id);


-- Cloud workspace files are stored separately from project metadata.
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  path text not null check (char_length(path) between 1 and 500),
  language text not null default 'plaintext',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

alter table public.project_files enable row level security;

create policy "Users can manage files in their own projects"
  on public.project_files for all to authenticated
  using (
    auth.uid() = owner_id
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    auth.uid() = owner_id
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create index if not exists project_files_project_id_idx on public.project_files(project_id);
