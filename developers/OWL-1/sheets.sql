-- Fichas do OwlDnD, isoladas por sala. Cole no SQL Editor do Supabase e rode uma vez.
-- Spec: developers/OWL-1/spec-fichas-banco.md

create table if not exists public.sheets (
  room_id    text        not null check (length(room_id) between 1 and 200),
  id         text        not null check (length(id) between 1 and 100),
  data       jsonb       not null check (octet_length(data::text) <= 100000), -- teto por ficha (a chave anônima é pública)
  updated_at timestamptz not null default now(),
  primary key (room_id, id)
);

-- Mantém updated_at honesto nos upserts.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists sheets_touch_updated_at on public.sheets;
create trigger sheets_touch_updated_at
  before update on public.sheets
  for each row execute function public.touch_updated_at();

-- RLS: o front manda o header x-room-id; só enxerga/grava linhas dessa sala.
-- Sem o header, a comparação dá NULL e nada passa.
alter table public.sheets enable row level security;

create or replace function public.request_room_id() returns text
language sql stable as $$
  select current_setting('request.headers', true)::json ->> 'x-room-id'
$$;

drop policy if exists sheets_select on public.sheets;
drop policy if exists sheets_insert on public.sheets;
drop policy if exists sheets_update on public.sheets;
drop policy if exists sheets_delete on public.sheets;

create policy sheets_select on public.sheets for select to anon
  using (room_id = public.request_room_id());
create policy sheets_insert on public.sheets for insert to anon
  with check (room_id = public.request_room_id());
create policy sheets_update on public.sheets for update to anon
  using (room_id = public.request_room_id())
  with check (room_id = public.request_room_id());
create policy sheets_delete on public.sheets for delete to anon
  using (room_id = public.request_room_id());

grant select, insert, update, delete on public.sheets to anon;

-- Tempo real (CA4): só ative depois de testar. O Realtime não vê o header x-room-id,
-- então com esta policy ele provavelmente NÃO entrega eventos; nesse caso use polling.
-- alter publication supabase_realtime add table public.sheets;

-- Teste rápido do isolamento (CA5), rodando como anon pela API REST:
--   curl "$URL/rest/v1/sheets?select=*" -H "apikey: $ANON"                       -> []
--   curl "$URL/rest/v1/sheets?select=*" -H "apikey: $ANON" -H "x-room-id: sala-a" -> só as da sala-a
