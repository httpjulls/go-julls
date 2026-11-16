-- Go, Julls! — esquema inicial (Supabase / Postgres)
-- Rode no SQL Editor do Supabase, uma vez, na ordem dos arquivos de migrations/.
--
-- Modelo: todas as tabelas de dados têm as mesmas colunas de sincronização e o conteúdo em `data` (jsonb).
--   chave primária (user_id, id) — id gerado no cliente (UUID ou id fixo do seed)
--   updated_at  — relógio do aparelho que editou (regra "último updated_at vence")
--   server_ts   — carimbo do servidor, usado como cursor para baixar alterações
-- Row Level Security: cada usuário só enxerga e altera as próprias linhas.

create extension if not exists pgcrypto;

-- Perfil (criado automaticamente no cadastro)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "perfil: dono lê" on public.profiles for select using (id = auth.uid());
create policy "perfil: dono altera" on public.profiles for update using (id = auth.uid());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Carimbo do servidor em toda escrita
create or replace function public.gj_set_server_ts() returns trigger
language plpgsql as $$
begin
  new.server_ts := clock_timestamp();
  return new;
end $$;

-- Último updated_at vence: ignora (silenciosamente) atualizações mais antigas que a versão do servidor
create or replace function public.gj_lww() returns trigger
language plpgsql as $$
begin
  if new.updated_at < old.updated_at
     or (new.updated_at = old.updated_at and new.device_id <= old.device_id and new.data = old.data and new.deleted = old.deleted) then
    return null;
  end if;
  return new;
end $$;

-- Append-only: registros nunca são sobrescritos
create or replace function public.gj_append_only() returns trigger
language plpgsql as $$
begin
  return null;
end $$;

do $$
declare
  t text;
  mutable text[] := array[
    'settings','subjects','topics','plan_items','questions','flashcards','notes','essays',
    'essay_themes','repertoire','mock_exams','goals','student_courses','student_events'];
  append_only text[] := array[
    'study_sessions','mastery_log','error_log','question_attempts','flashcard_reviews','achievements'];
begin
  foreach t in array mutable || append_only loop
    execute format($f$
      create table if not exists public.%1$I (
        user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
        id         text not null,
        updated_at timestamptz not null,
        device_id  text not null,
        deleted    boolean not null default false,
        data       jsonb not null default '{}'::jsonb,
        server_ts  timestamptz not null default clock_timestamp(),
        primary key (user_id, id)
      );
      create index if not exists %1$s_server_ts_idx on public.%1$I (user_id, server_ts);
      alter table public.%1$I enable row level security;
      drop policy if exists "dono lê" on public.%1$I;
      drop policy if exists "dono insere" on public.%1$I;
      create policy "dono lê" on public.%1$I for select using (user_id = auth.uid());
      create policy "dono insere" on public.%1$I for insert with check (user_id = auth.uid());
      drop trigger if exists gj_server_ts on public.%1$I;
      create trigger gj_server_ts before insert or update on public.%1$I
        for each row execute function public.gj_set_server_ts();
    $f$, t);
  end loop;

  foreach t in array mutable loop
    execute format($f$
      drop policy if exists "dono altera" on public.%1$I;
      drop policy if exists "dono apaga" on public.%1$I;
      create policy "dono altera" on public.%1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid());
      create policy "dono apaga" on public.%1$I for delete using (user_id = auth.uid());
      drop trigger if exists gj_lww on public.%1$I;
      create trigger gj_lww before update on public.%1$I
        for each row execute function public.gj_lww();
    $f$, t);
  end loop;

  foreach t in array append_only loop
    -- sem policy de update/delete: o cliente não consegue sobrescrever nem apagar histórico
    execute format($f$
      drop trigger if exists gj_append_only on public.%1$I;
      create trigger gj_append_only before update on public.%1$I
        for each row execute function public.gj_append_only();
    $f$, t);
  end loop;
end $$;

-- O trigger de server_ts precisa rodar DEPOIS do LWW (ordem alfabética: gj_lww < gj_server_ts). OK.

-- Fotos das anotações: bucket privado, cada usuário só acessa a própria pasta (<user_id>/arquivo.jpg)
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "anexos: dono lê" on storage.objects;
drop policy if exists "anexos: dono envia" on storage.objects;
drop policy if exists "anexos: dono altera" on storage.objects;
drop policy if exists "anexos: dono apaga" on storage.objects;
create policy "anexos: dono lê" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "anexos: dono envia" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "anexos: dono altera" on storage.objects for update
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "anexos: dono apaga" on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
