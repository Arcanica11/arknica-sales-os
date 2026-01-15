-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: generated_assets
create table public.generated_assets (
  id uuid not null default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  place_name text not null,
  type text not null, -- 'demo' or 'proposal'
  content text null,
  meta jsonb null,
  constraint generated_assets_pkey primary key (id)
);

-- Table: leads
create table public.leads (
  id uuid not null default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  name text not null,
  city text not null,
  category text not null,
  status text default 'new', -- 'new', 'contacted', 'closed'
  website text null,
  rating numeric null,
  constraint leads_pkey primary key (id)
);

-- Row Level Security (RLS) - Optional for MVP but good practice
alter table public.generated_assets enable row level security;
alter table public.leads enable row level security;

-- Policy to allow public read access for demo pages (be careful in production)
create policy "Allow public read access to generated_assets"
on public.generated_assets
for select
to public
using (true);

-- Policy to allow insert (for the API, which uses service key usually, but here we use anon key client in some places maybe? 
-- Actually the API route runs on server, so it should use a SERVICE_ROLE key or the client we set up.
-- If using anon key from backend, we need RLS to allow insert or use the secret key.
-- Since I used NEXT_PUBLIC_SUPABASE_ANON_KEY in lib/supabase.ts, the API route is using the ANON key.
-- So we MUST allow inserts from anon (public) or switch to Service Role Key in lib/supabase.ts for the API.
-- For MVP simplicty, I will allow public insert.
create policy "Allow public insert to generated_assets"
on public.generated_assets
for insert
to public
with check (true);
