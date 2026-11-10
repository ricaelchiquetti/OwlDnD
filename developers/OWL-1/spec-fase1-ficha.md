# OWL-1 Fase 1 — Ficha D&D 5e (2014), página 1
Escopo desta etapa: lógica pura de cálculo (src/sheet.js). Depois: vínculo token-ficha, Create Character (downloadImages + addItems), UI da página 1.
Armazenamento (decidido): room metadata, uma chave por ficha (owldnd/sheet/<id>); lista leve em owldnd/journal; token guarda só o id da ficha. Teste: 128KB ok em room e item.
Modelo: { level, abilities:{str,dex,con,int,wis,cha}, saveProf:{<ability>:bool}, skillProf:{<skill>:bool} }
CA-F1 modificador = floor((valor-10)/2)
CA-F2 bônus de proficiência = 2 + floor((nível-1)/4), nível limitado a 1..20
CA-F3 resistência = mod + (proficiente ? bônus : 0)
CA-F4 perícia (18, cada uma ligada a um atributo) = mod + (proficiente ? bônus : 0)
CA-F5 percepção passiva = 10 + bônus de Percepção
CA-F6 iniciativa = mod de Destreza
CA-F7 ficha nova: nível 1, atributos 10, sem proficiências
Fora de escopo (fases 2/3): página 2, conjuração, expertise, rolagens.

## Implementado (Fase 1)
- Create Character: downloadImages(CHARACTER) -> item no Journal + ficha (owldnd/sheet/<id>) + token na cena com metadata owldnd/sheet = id (src/characters.js)
- Menu de contexto "Open sheet" em tokens CHARACTER vinculados (background.html + src/background.js, manifest background_url)
- Modal da ficha 760x820 (src/itemModal.js); página 1 em src/views/SheetPage1.vue; só dono/GM editam
- Rótulos EN/PT-BR (termos oficiais); teste garante paridade das chaves

## Alteração: vínculo pelo token
- Create Character: só cria item + ficha (sem token na cena).
- Menu de contexto do token (camada CHARACTER): "Link character" abre modal pequeno (link.html?token=id, 360x420) com os personagens visíveis; escolher grava metadata owldnd/sheet no token. "Open sheet" segue para tokens já vinculados.
- Fora de escopo: desvincular (revincular substitui).

## Alteração: excluir
- Botão Delete no modal do item (personagem ou nota), só dono/GM, com confirmação. Remove o item da lista e a chave owldnd/sheet/<id> numa única gravação.
- Tokens que apontavam para a ficha ficam com vínculo órfão: "Open sheet" abre o modal, que se fecha sozinho por não achar o item.

## Alteração: ficha em popover (substitui modal e janelas flutuantes)
- Modal em tela cheia deixou a tela preta; modal padrão não move/redimensiona. Agora: OBR.popover (id owldnd/item/<id>/<slot>), disableClickAway, mapa livre, uma ficha por popover (várias ao mesmo tempo).
- Várias fichas: uma por popover, abertura escalonada (cascata).
- Redimensionar: alça no canto, ao vivo (popover.setWidth/setHeight).
- Mover: arrastar a barra de título; ao soltar abre o mesmo item no outro slot (a/b) na nova posição e fecha o antigo (API não move popover).
- SEM TESTES (decisão do usuário). Não verificado na sala: pointer capture fora do iframe, open/close sem piscar, limites de tamanho do popover.

## Alteração: ficha em 3 abas (referência: 3 imagens do usuário) — Entrega 1
Abas do popover: Ficha | Detalhes | Magias (entregas 2 e 3) | Configurações (visibilidade + Delete; notas só têm Configurações). Aba ativa guardada por ficha (sessionStorage).
Decisões: cadeado nas listas libera botões de apagar (travado por padrão); SEM descansos; recursos = lista de blocos {nome, total (pequeno), atual (grande)}; magia preparada = marca opcional; arte/logotipo fora de escopo.
Entrega 1 (aba Ficha): cabeçalho (classe+nível, antecedente, raça, tendência, XP — sem "nome do jogador"), atributos, resistências, perícias, percepção passiva, ferramentas (nome/pro/atributo), proficiências (tipo/nome), CA/iniciativa/deslocamento, PV, dado de vida {total, atual, tipo}, testes contra a morte (3 círculos), ataques, moedas, equipamento {equipado, qtd, nome, peso} + peso total + carga (>5xFOR sobrecarregado, >10xFOR pesadamente), traços/ideais/vínculos/defeitos, recursos, características (nome, origem, descrição, filtro).
Testes: totalWeight, encumbrance, featureIndexes, withDefaults. Fichas antigas: campos ausentes assumem o padrão; campos removidos (text.equipment etc.) são descartados no primeiro salvamento.

## Alteração: opções do personagem (aba Configurações da ficha)
- Multiclasse: extraClasses[{name, level}]; nível total = nível principal + extras; bônus de proficiência usa o nível total. Linhas extras aparecem no cabeçalho.
- Especialização: expertise{perícia}; dobra o bônus e implica proficiência (caixa travada na ficha, marca ★).
- Pau pra Toda Obra (jackOfAllTrades): metade (↓) da proficiência em perícias, iniciativa e ferramentas sem proficiência.
- Dado de vida: lista d4–d12 (hitDice.die); a ficha só exibe.
- Rastrear CA: Automático (10 + Des; equipamento ainda sem dados de armadura), Manual (padrão, valor digitado), Personalizado (10 + atributo + atributo). Escudo é editável só no modo Manual.

## Alteração: tipo e descrição do item de equipamento
- Engrenagem à direita de cada item abre o editor: tipo (item/arma/armadura/escudo), tipo de armadura (leve/média/pesada), CA base (armadura) ou bônus de CA (escudo), bônus mágico e descrição (efeito de item mágico).
- CA Automática: armadura equipada substitui 10+Des (leve: Des inteiro; média: Des até +2; pesada: sem Des); melhor escudo equipado soma; só itens com "equipado" marcado contam. Manual/Personalizado ignoram o equipamento.
- Arma por ora só classifica o item (sem efeito em ataques).

## Alteração: tipo "Magic Item" com efeitos de atributo
- Novo tipo de item (EquipmentKind.MAGIC). No editor da engrenagem aparece a lista de efeitos [{atributo, modo, valor}] com "Definir para" (só ajuda se maior que o atual) e "Somar".
- Só vale com o item equipado. Cálculo: base -> maior "definir para" -> soma de todos os "somar" -> teto 30. Efeitos em itens que não são Magic Item são ignorados.
- Todos os cálculos usam o valor efetivo (abilityScore): modificadores, resistências, perícias, iniciativa, CA automática, ataques, CD, carga (Força). Cartão de atributo mostra o efetivo com ★; ao focar o campo mostra o base para editar.
- Fora de escopo: sintonização (limite de 3), efeitos que não sejam atributo (CA de anel, deslocamento).

## Alteração: efeitos de item também em resistências e CA
- Cada efeito do Magic Item tem um alvo (EffectTarget): ABILITY (definir para / somar), SAVE (bônus em um atributo ou em todas as resistências) e AC (bônus de CA).
- Resistência: bônus soma ao teste de resistência do atributo escolhido ("todas" vale para os seis). CA: soma nos modos Automático e Personalizado; Manual ignora (é o valor final digitado).
- Só vale com o item equipado. Efeitos antigos (sem alvo) viram ABILITY na normalização.
- Teste contra a morte: o alvo Resistência tem a opção "Morte" (DEATH_SAVE); "Todas" também vale nele. O bônus aparece no bloco dos testes contra a morte quando diferente de zero.
