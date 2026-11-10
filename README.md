# OwlDnD

Extensão do Owlbear Rodeo para D&D 5e: Diário (personagens e notas), ficha de personagem, chat com dados, iniciativa e barra de vida sobre o token.

## Instalar

No Owlbear Rodeo: Perfil → Extensões → Adicionar extensão, e cole:

```
https://ricaelchiquetti.github.io/OwlDnD/manifest.json
```

O deploy é automático (GitHub Actions) a cada push na `main`.

## Rodar

```bash
npm install
npm run dev      # servidor local (a extensão é carregada pelo manifest em /manifest.json)
npm test         # testes (vitest)
npm run build
```

## Onde cada coisa é salva

| Dado | Onde | Chave | Quem enxerga |
|---|---|---|---|
| Lista do Diário (título, tipo, dono, visibilidade, imagem do personagem) | Metadata da **sala** | `owldnd/journal` | Todos (filtrado por `isVisible` na tela) |
| Fichas dos personagens | Metadata da **sala** | `owldnd/sheet/<id>` | Todos (filtrado por `isVisible`) |
| Vínculo token → ficha | Metadata do **token** | `owldnd/sheet` (guarda o id da ficha) | Todos |
| Iniciativa de cada token | Metadata do **token** | `owldnd/initiative` (`{ value, bonus }`) | Todos |
| Turno e rodada da iniciativa | Metadata da **cena** | `owldnd/turn` | Todos |
| Histórico do chat | Metadata da **cena** (uma chave por mensagem, máx. 50 por cena) | `owldnd/chat/<id>` | Todos na cena |
| Idioma | localStorage | `owldnd.locale` | Só o próprio navegador |
| Tema (claro/escuro) | localStorage | `owldnd.theme` | Só o próprio navegador |
| Barra de vida sobre o token | Itens **locais** da cena (não são salvos) | metadata `owldnd/hp-overlay` | Só quem a vê; é desenhada de novo a cada seleção |

### Limites e consequências

- **Sala: 16 kB no total, compartilhados com todas as extensões.** Uma ficha preenchida tem ~13 kB e uma vazia ~1,5 kB, então hoje só cabem poucas fichas. No teste real, a sala aceitou cerca de 11,5 kB no total.
- **Cena, token e jogador:** sem limite encontrado até 256 kB (Configurações → *Teste de armazenamento*).
- **Metadata do jogador não persiste:** é limpa ao dar F5 ou reconectar (confirmado no teste *A metadata do jogador sobrevive?*). Por isso a extensão não a usa.
- **O chat é por cena:** cada cena tem o seu histórico (cena nova = chat vazio), limitado a 50 mensagens; a 51ª apaga a mais antiga. Sem cena aberta, o chat avisa e não envia. Por ser metadata da cena, pela documentação do Owlbear as mensagens entram na pilha de desfazer (Ctrl+Z) de quem as enviou, e duplicar a cena leva o chat junto. O histórico antigo (localStorage) foi descartado.
- **O vínculo vive no token.** Se o token for apagado ou recriado (outra cena, outra cópia sem a metadata), é preciso vincular de novo pelo menu do token.
- **Apagar um personagem** remove a entrada do Diário e a ficha na mesma gravação.
- Última gravação vence: duas pessoas editando a mesma ficha ao mesmo tempo podem sobrescrever uma à outra.

## Como funciona

### Diário e fichas
- `src/store.js` mantém `items` (Diário) e `sheets` em memória e os sincroniza com a metadata da sala (`room.onMetadataChange`). `saveItems`, `saveSheet` e `deleteItem` gravam.
- Visibilidade (`src/journal.js`): o mestre e o dono sempre veem; `ALL` mostra a todos; `PLAYERS` mostra só aos jogadores escolhidos.
- Criar personagens (`src/characters.js`): o seletor de assets do Owlbear cria uma entrada do Diário por imagem e uma ficha vazia. A URL da imagem fica no item (`image`) e aparece como ícone ao lado do nome. Personagens antigos recebem a imagem quando um token é vinculado a eles.
- A ficha abre num popover (`src/views/ItemModal.vue`) e é editada por `setPath`, sempre gravando a ficha inteira.

### Vincular token e abrir a ficha
Menu de contexto de um token da camada *Personagem* (`src/background.js`): **Link character**, **Open sheet**, **HP temp** (só aparece com vida temporária > 0), **HP** (campo que aceita `-5`, `+5`, `12`), **Add to initiative**, **Remove from initiative**.

### Rolagens
Num ataque da ficha (nome ou bônus + dano), se o d20 mantido atingir o alcance de crítico da arma (padrão 20; um 1 nunca é crítico), os dados de cada linha de dano são rolados em dobro e o cartão mostra "Crítico!"; o valor fixo não dobra. Os botões da ficha (atributos, resistências, perícias, ferramentas, ataques, iniciativa) mandam uma rolagem de d20 ao chat. O seletor **Rolagens** (Vantagem / Normal / Desvantagem), acima de *Características*, define o modo padrão; Shift (vantagem) e Ctrl/Cmd (desvantagem) no clique têm prioridade. A escolha do seletor não é salva.

### Chat
`/r 2d6+3` rola dados; texto simples vai direto ao histórico. As rolagens da ficha viram cartões. Cada mensagem é gravada na metadata da cena (`owldnd/chat/<id>`) e todos a recebem por `scene.onMetadataChange`; não há mais broadcast. A lógica (ordem, corte em 50, ignorar chaves de outras extensões) está em `src/chat.js`.

### Iniciativa
Botão na barra de ferramentas esquerda abre o rastreador para todos. A iniciativa de cada token fica na metadata do token; turno e rodada ficam na metadata da cena.

### Barra de vida
- `src/hpOverlay.js` desenha, com itens locais presos ao token selecionado, uma barra `atual/máx` (e uma segunda, azul, para vida temporária) com o escudo da CA da ficha ao lado. Ela se redesenha quando a seleção, a ficha ou o token mudam. Quem não enxerga a ficha não vê a barra.
- **Clicar na barra para digitar:** segure **Ctrl** e clique na barra de vida. O Owlbear não tem evento de clique em itens da cena, então o clique aparece como a barra sendo *selecionada* (Ctrl permite selecionar itens travados). A extensão devolve a seleção ao token e abre uma caixa (`src/views/HpEdit.vue`) sobre a barra: `-5` dano, `+5` cura (até o máximo), `12` define o valor; Enter aplica. Clicar na barra azul edita a vida temporária (`+n`, `-n` ou `n`). Dano consome a temporária primeiro (`src/hp.js`).

## Estrutura

```
src/background.js     menus de contexto, barra de vida
src/store.js          Diário, fichas e chat (leitura/gravação)
src/journal.js        tipos, visibilidade e chaves de metadata
src/sheet.js          modelo e cálculos da ficha
src/chat.js           dados, rolagens e cartões
src/hp.js, hpOverlay.js, views/HpEdit.vue   barra de vida
src/initiative*.js    iniciativa
developers/OWL-1/     specs (fonte da verdade de cada funcionalidade)
```

## Em andamento

`developers/OWL-1/spec-persistencia-mestre.md` propõe mover Diário e fichas para o localStorage do mestre (com cópia ao vivo na metadata do jogador e backup em arquivo), para sair do limite de 16 kB da sala. **Ainda não implementado**: hoje tudo continua como descrito acima.
