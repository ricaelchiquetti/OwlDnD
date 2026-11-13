# Fichas em banco externo (Supabase), isoladas por sala

## Problema
A metadata da sala aceita 16 kB no total (~11,5 kB no teste real) e uma ficha preenchida tem ~13 kB. Quase nenhuma ficha cabe. Alternativa a `spec-persistencia-mestre.md` (localStorage do mestre): aqui a fonte durável é um banco externo, sem depender do navegador do mestre.

## Decisão
- **Só as fichas** saem da metadata da sala. O Diário (`owldnd/journal`) e o vínculo token→ficha continuam onde estão (poucos bytes).
- **Banco:** Supabase (Postgres + Realtime), acessado direto do front com a chave anônima. Sem API própria.
- **Chave composta `(room_id, id)`:** `room_id` vem de `OBR.room.id`; `id` é o id da ficha do Diário. Uma sala nunca vê nem grava ficha de outra.
- **Isolamento imposto no banco (RLS):** o front envia o header `x-room-id`; a policy só permite linhas com `room_id` igual ao header. Não é autenticação (quem souber o id de outra sala consegue acessá-la); ver Riscos.

## Contratos
Tabela:

```sql
create table sheets (
  room_id    text not null,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (room_id, id)
);
alter table sheets enable row level security;
-- policy: using / with check (room_id = current_setting('request.headers', true)::json->>'x-room-id')
```

Config (variáveis de ambiente do build, nunca no repositório): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Funções em `src/store.js` (assinaturas atuais mantidas):
- `saveSheet(id, sheet)` → upsert `(roomId, id, data)` com `onConflict: "room_id,id"`. Erro: lança e a UI mostra; o estado local não é descartado.
- `readSheets` → `select` filtrado por `room_id`; devolve `{ [id]: data }`.
- `deleteItem(id)` → remove a entrada do Diário (metadata) e a linha da ficha (banco).
- Tempo real: canal com filtro `room_id=eq.<roomId>`; evento insert/update/delete atualiza `sheets.value`.

## Critérios de aceite
- CA1 Ao abrir, a extensão carrega só as fichas da sala atual (`room_id = OBR.room.id`).
- CA2 Duas salas com o mesmo `id` de ficha guardam fichas distintas e não se enxergam (mesma `id`, `room_id` diferentes).
- CA3 Editar uma ficha grava só aquela linha (upsert por `(room_id, id)`); nunca regrava as outras.
- CA4 Uma edição feita por um jogador aparece para os demais da mesma sala em tempo real; não chega a quem está em outra sala.
- CA5 O banco recusa leitura e gravação quando o header `x-room-id` não bate com o `room_id` da linha (testado direto contra a API, sem passar pelo front).
- CA6 `isVisible` continua filtrando a lista exibida (regra do Diário inalterada).
- CA7 Apagar um personagem remove a entrada do Diário e a linha da ficha. Se a remoção da linha falhar, o erro é mostrado e a entrada do Diário não é removida (evita ficha órfã).
- CA8 Falha de rede ou de gravação é mostrada ao usuário, nunca silenciada; a edição não é perdida na tela.
- CA9 Migração: se a sala ainda tem `owldnd/sheet/*` na metadata e o banco não tem essas fichas, o mestre as importa uma vez para o banco e só depois remove as chaves da sala (libera o limite de 16 kB). Se o upsert falhar, nada é removido.
- CA10 Sem `VITE_SUPABASE_*` configurado, a extensão avisa claramente e não quebra o Diário.
- CA11 Nenhum secret no repositório nem em logs; só a chave anônima é usada no front.
- CA12 Banco inacessível (projeto pausado por inatividade, rede fora ou erro 5xx/timeout): ao carregar ou gravar, a tela mostra o aviso "Banco indisponível; se o projeto foi pausado, o dono precisa clicar em Restore no painel do Supabase" e um botão "Tentar de novo". O Diário continua funcionando; a edição pendente fica na tela e é regravada no retry bem-sucedido; ao voltar, as fichas carregam sem recarregar a página.

## Fora de escopo
Login de usuário, autenticação do jogador no servidor, criptografia dos dados, edição offline, histórico/versões de ficha, exportar/importar fichas em JSON (backup), mover o Diário ou o chat, dois clientes editando a mesma ficha com merge (continua "última gravação vence").

## Riscos / [A DEFINIR]
- **Sem autenticação real:** o `room_id` funciona como segredo compartilhado. Quem estiver ou já tiver estado na sala conhece o id e pode ler/editar as fichas daquela sala pela API. `isVisible` continua sendo só filtro de tela. **Decidido:** aceito, o uso é só entre amigos; sem servidor de validação.
- **Dependência externa:** se o Supabase cair, ou pausar o projeto grátis por inatividade, as fichas ficam indisponíveis; tratado em CA12 (os dados não são apagados, o dono restaura pelo painel). A mensagem não consegue distinguir "pausado" de "sem rede", por isso cita as duas causas. **Decidido:** sem backup/exportação nesta entrega (fora de escopo); o risco é aceito.
- **Realtime e RLS:** o filtro do canal é por `room_id`, mas o Realtime não aplica a policy por header da mesma forma que o REST. [A DEFINIR] validar na prática (CA4/CA5) e, se não isolar, usar só polling ou broadcast.
- **Privacidade:** os dados dos jogadores passam a ficar fora do Owlbear; avisar no README.
- **`deleteItem` deixa de ser atômico** (metadata + banco); tratado em CA7.
- Toca `store.js` (`saveSheet`, `deleteItem`, `applyMetadata`), `journal.js` (`readSheets`, `sheetKey`) e possivelmente `hpOverlay.js` se ele lê a ficha pela sala. README ("Onde cada coisa é salva") precisa ser atualizado.
- CORS e CSP: o domínio do Supabase precisa estar permitido; nada de wildcard.
