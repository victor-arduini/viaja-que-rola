-- Execute este script no SQL Editor do Supabase (Project > SQL Editor > New query)

create table if not exists app_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_data enable row level security;

create policy "usuário lê apenas seus próprios dados"
  on app_data for select
  using (auth.uid() = user_id);

create policy "usuário insere apenas seus próprios dados"
  on app_data for insert
  with check (auth.uid() = user_id);

create policy "usuário atualiza apenas seus próprios dados"
  on app_data for update
  using (auth.uid() = user_id);
