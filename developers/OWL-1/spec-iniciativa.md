# OWL-1 — Iniciativa (baseada no tutorial initiative-tracker do Owlbear)
Referência: docs.owlbear.rodeo/extensions/tutorial-initiative-tracker (lido via espelho owlbear-docs.pages.dev; o site oficial devolve 403 a leitores automáticos).
Dados: metadata do token `owldnd/initiative` = { value, bonus }; turno/rodada no metadata da cena `owldnd/turn` = { current, round }.
CA1 Popover separado (tracker.html), SEM aba no menu: lista ordenada (maior primeiro; empate: maior bônus, depois nome), turno atual destacado, rodada.
CA2 Menu de contexto do token (CHARACTER): "Add to initiative" adiciona direto com valor 0 (sem modal e sem rolar; o mestre edita o valor na lista) e "Remove from initiative".
CA3 Clicar na Iniciativa da ficha rola d20 + bônus da ficha (Des, Pau pra Toda Obra, efeitos de item) e adiciona o token: o token de onde a ficha foi aberta ou, sem token de origem, todos os tokens vinculados à ficha.
CA4 Só o mestre avança o turno, limpa, remove e edita valores. Próximo turno: segue a ordem; depois do último começa nova rodada; se o atual foi removido, volta ao topo.
Fora de escopo: número da iniciativa flutuando sobre o token; jogadores editarem a ordem; rolagens de dados além do d20 da iniciativa.
Testes: rollInitiative, sortEntries, readEntries, nextTurn, tokensLinkedTo, withoutInitiative (src/initiative.test.js).

## Alteração: popover separado e aberto para todos
- A iniciativa não é uma aba. É um popover próprio (OBR.popover, id owldnd/initiative-tracker, canto superior direito, disableClickAway) com título e botão fechar.
- Só abre por (a) clique na Iniciativa da ficha ou (b) botão na barra de ferramentas lateral (OBR.tool.create com onClick retornando false para não virar a ferramenta ativa).
- Abrir = avisar todos: OBR.broadcast.sendMessage(owldnd/open-tracker, destino ALL); o background de cada cliente abre o popover localmente. Fechar só fecha para quem fechou.
- Qualquer jogador que abra o tracker o abre para todos (leitura literal do pedido). Restringir ao mestre é uma condição no ponto de envio.
- Adicionar pelo menu de contexto do token não abre o tracker.

## Alteração: o menu de contexto não rola
- "Add to initiative" no menu de contexto adiciona os tokens selecionados com valor 0 e bônus 0, sem modal. Só o clique na Iniciativa da ficha rola d20 + bônus automaticamente.
- O modal de iniciativa foi removido (initiative.html, initiative-modal.js, InitiativeModal.vue).

## Alteração: ícone do personagem e botões de turno
- Cada linha mostra o ícone redondo do token (image.url do item da cena); sem imagem, a inicial do nome num círculo.
- Cabeçalho: "Contagem: N" e "Rodada N". Turno atual em verde. Valor grande à direita (mestre edita no próprio número).
- Rodapé (só mestre): ← turno anterior (contorno), lixeira (limpar), → próximo turno (preenchido). Voltar antes do primeiro vai ao último da rodada anterior; na rodada 1 fica no primeiro.
- Testes: previousTurn (inversa de nextTurn) e imagem em readEntries.
