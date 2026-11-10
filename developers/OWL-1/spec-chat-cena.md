# Chat salvo na cena (um chat novo por cena)

## Objetivo
O histórico do chat passa do localStorage de cada navegador para a metadata da CENA. Cada cena tem o seu chat; trocar de cena mostra o chat daquela cena (vazio se for nova). Todos veem o mesmo histórico.

## Desenho
- Uma chave por mensagem: `owldnd/chat/<id>` (o `id` já existe em cada mensagem). Não há array único, então duas pessoas escrevendo ao mesmo tempo não se sobrescrevem.
- Ordem pela `time` da mensagem. Limite de 50: ao passar, apaga as mais antigas (chaves → `undefined`).
- Leitura: `OBR.scene.getMetadata()` ao abrir/trocar de cena e `OBR.scene.onMetadataChange`. O envio por broadcast deixa de existir (a metadata já sincroniza).
- Sem cena aberta: o chat mostra aviso e não envia.
- O localStorage antigo (`owldnd.chat`) é simplesmente apagado (CA6).
- As chaves usam o mesmo prefixo `owldnd/chat/` que o chat antigo usava na SALA; a limpeza da sala (`legacyChatKeys`) continua só na sala e não toca na cena.

## Critérios de aceite
- CA1 Enviar mensagem grava `owldnd/chat/<id>` na metadata da cena; todos os clientes a veem.
- CA2 Trocar de cena troca o histórico; cena sem mensagens mostra "sem mensagens".
- CA3 O histórico mostra no máximo 50 mensagens, em ordem de `time`; passando disso as mais antigas são removidas da cena.
- CA4 Chaves de outras extensões e outras chaves `owldnd/*` da cena não são lidas como mensagem nem apagadas.
- CA5 Metadata inválida (fora do formato `isMessage`) é ignorada, sem quebrar o chat.
- CA6 O histórico antigo (`owldnd.chat` no localStorage) é descartado: a chave é removida, nada é migrado (decisão do usuário).
- CA7 Sem cena (`scene.isReady() = false`): aviso "abra uma cena" e envio bloqueado.
- CA8 Falha de gravação (sem permissão) mostra erro ao usuário, sem silenciar.

## Fora de escopo
Apagar o chat manualmente, exportar, mensagens privadas (sussurros), paginação.

## Riscos
- **Permissão:** premissa do usuário: todos sempre podem escrever na metadata da cena. Se isso não for verdade, a falha aparece como erro (CA8).
- **Desfazer:** segundo a documentação, alterações na metadata da cena entram na pilha de desfazer (Ctrl+Z) de quem as fez; pode desfazer mensagens.
- Cota: a metadata da cena usa a cota de armazenamento do usuário que grava (mestre ou jogador).
- Cada cena duplicada leva o chat junto.
- Mudança em `store.js` (`remember`, `publish`, `receiveChat`) e `background.js` (escuta do broadcast).
