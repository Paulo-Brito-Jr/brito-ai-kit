-- Migração canônica para projetos Supabase.
-- Cria tabelas conversations e messages com schema do brito-ai-kit.
-- Salve como NNNN_chat.sql na pasta supabase/migrations/ do projeto.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null default 'Nova conversa',
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_owner_updated_idx
  on public.conversations (owner_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_calls jsonb,
  tool_call_id text,
  model text,
  tokens_in int,
  tokens_out int,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- RLS — descomentar e adaptar conforme o auth do projeto.
-- O kit usa store.appendMessage via service_role server-side, então RLS pode
-- ser estrito. As policies abaixo permitem que o owner leia suas próprias
-- conversas (útil pra chamadas client-side de leitura).

-- alter table public.conversations enable row level security;
-- alter table public.messages enable row level security;

-- create policy "owner can read own conversations"
--   on public.conversations for select
--   using (auth.uid() = owner_id);

-- create policy "owner can read messages of own conversations"
--   on public.messages for select
--   using (
--     exists (
--       select 1 from public.conversations c
--       where c.id = messages.conversation_id and c.owner_id = auth.uid()
--     )
--   );
