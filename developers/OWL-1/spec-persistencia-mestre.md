# Persistência das fichas no navegador do mestre

## Problema
O metadata da sala aceita só ~11,5 kB (uma ficha preenchida tem ~13 kB). São 5 jogadores + 50 NPCs. O teste de armazenamento mostrou: cena, token e jogador sem limite até 256 kB; sala quase cheia.

## Decisão
- **Fonte durável:** localStorage do navegador do MESTRE (`owldnd.data`: `{ items, sheets }`).
- **Cópia ao vivo:** metadata do jogador MESTRE, uma chave por ficha (`owldnd/sheet/<id>`) mais `owldnd/journal`. Os outros jogadores leem via `OBR.party`. Metadata de jogador é por conexão: some ao reconectar, então o mestre republica a partir do localStorage.
- O vínculo token→ficha continua na metadata do token (poucos bytes).

## Critérios de aceite
- CA1 Mestre abre a extensão: lê o localStorage e publica Diário + fichas na sua metadata de jogador. Fichas e Diário aparecem como hoje.
- CA2 Mestre edita ficha/Diário: grava no localStorage e atualiza só a chave da ficha alterada na metadata (nunca regrava todas).
- CA3 Jogador abre: lê Diário e fichas da metadata do mestre (via `party`), filtrando por `isVisible`. Sem mestre conectado: mostra aviso "mestre offline" e nada é editável.
- CA4 Jogador edita a ficha que pode editar: envia mensagem (broadcast) ao mestre, que valida (`isVisible` + dono), grava e republica.
- CA5 Mestre atualiza a página/reconecta: tudo é republicado a partir do localStorage (nada se perde).
- CA6 Migração: se o localStorage está vazio e a sala ainda tem `owldnd/journal` e `owldnd/sheet/*`, importa para o localStorage uma vez e depois remove essas chaves da sala (libera o limite de 16 kB).
- CA7 Exportar e importar tudo em arquivo JSON (backup contra limpeza de cache); importar valida o formato antes de substituir.
- CA8 Erro de gravação (localStorage cheio/bloqueado) é mostrado ao mestre, não silenciado.
- CA9 Apagar personagem remove do localStorage e das chaves de metadata.

## Fora de escopo
Dois mestres simultâneos, sincronização entre navegadores do mesmo mestre, criptografia, filtrar o que cada jogador recebe (a metadata de jogador é legível por todos, igual à da sala hoje).

## Riscos / [A DEFINIR]
- Tudo depende do navegador do mestre (cache apagado sem backup = perda; mitigado por CA7).
- Tamanho total publicado (~55 fichas): o teste não achou teto até 256 kB por valor, mas a doc fala em 64 kB por update; por isso uma chave por ficha e publicação em lotes pequenos.
- Mensagem de jogador pode se perder se o mestre estiver offline (CA3 bloqueia a edição).
- Muda `store.js` (saveItems, saveSheet, deleteItem, applyMetadata), o que toca a ficha, o Diário e o overlay de vida (`hpOverlay.js` lê a sala).
