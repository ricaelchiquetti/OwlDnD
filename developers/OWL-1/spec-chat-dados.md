# OWL-1 — Chat e rolador de dados
Referência: docs.owlbear.rodeo/extensions/examples/dice é um rolador 3D (Three.js + Rapier, sincronizado). Aqui o escopo pedido é por TEXTO no chat; dados 3D ficam fora de escopo.
Comandos: `/r EXPR` ou `/roll EXPR`. EXPR = termos `NdM` (N opcional, padrão 1) e números inteiros ligados por + ou -, com pelo menos um dado. Ex.: d4+3 (1d4 mais 3), 2d6, 1d20+5-2, 2d8+1d4+3.
Limites: 1–100 dados no total, d2 a d1000, modificador até 5 dígitos, sem sinal no início.
CA1 `/r d4+3` rola 1d4 e soma 3; `/r 2d6` rola dois d6; o resultado entra no chat para todos (dados, modificador e total).
CA2 Texto sem `/` é mensagem comum. Comando desconhecido ou rolagem inválida mostra erro local e NÃO envia nada.
CA3 Histórico no metadata da sala, uma chave por mensagem (owldnd/chat/<id>): sem sobrescrita entre envios simultâneos; só as 100 mais recentes ficam (as antigas são apagadas no envio).
Fora de escopo: dados 3D, rolagem privada (só mestre), vantagem/desvantagem (kh/kl), rolagens a partir da ficha (exceto a iniciativa já existente).
Testes: parseDice, rollDice, describeRoll, parseCommand, buildMessage, readMessages, staleKeys (src/chat.test.js).

## Alteração: rolagens a partir da ficha, todas no chat
- Valores clicáveis na ficha (só para quem pode editá-la): modificador de cada atributo (teste de atributo), resistências, perícias, bônus de ferramenta (quando o atributo é fixo), ataque e dano de cada ataque, teste contra a morte e iniciativa.
- Teste = 1d20 + bônus (d20Check). Dano = os dados do próprio campo + modificador (damageExpression, sem o tipo; cada linha de dano vira uma mensagem, com o tipo no rótulo).
- Cada rolagem vira uma mensagem de chat com rótulo "Personagem: o que foi rolado" (message.label) e também um aviso (toast) para quem rolou.
- Iniciativa: o MESMO d20 vai para o chat e para a ordem (não rola duas vezes). Sem token na cena, avisa e não rola.
- Removido: rollInitiative (initiative.js); agora o chat é quem rola.
- Fora de escopo: vantagem/desvantagem, crítico automático, gastar dado de vida, magias.

## Alteração: cartão de rolagem da ficha, com vantagem/desvantagem
- Rolagens da ficha viram mensagens kind "sheet": { character, label, check?: { modifier, mode, rolls, kept, total }, damage?: [{ expression, type, total, detail }] }. As rolagens digitadas (/r) continuam kind "roll".
- Vantagem: Shift + clique. Desvantagem: Ctrl/Cmd + clique. Os dois juntos se anulam. Rola dois d20 e fica o maior (vantagem) ou o menor (desvantagem); no empate vale o primeiro.
- Ataque: clicar no NOME rola ataque + dano no mesmo cartão; no bônus rola só o ataque; no dano rola só o dano. Cada linha de dano é uma caixa.
- Cartão no chat (estilo da ficha): caixas vital-top / vital-mid / vital-bottom sobre fundo branco; o d20 descartado em cinza à esquerda e o que vale em destaque à direita; legenda "Nome (+5) · Vantagem"; dano com o tipo em itálico. Passar o mouse nos números mostra a conta (describeCheck / detail).
- Cabeçalho: autor com "(GM)" para o mestre, e o nome do personagem.
- A iniciativa também aceita vantagem; o total do cartão é o valor que entra na ordem.
- Removidos: d20Check e buildRollMessage (substituídos por buildSheetMessage).

## Alteração: onde clicar para rolar e imprimir característica no chat
- Resistências e perícias: a linha inteira (número + nome) rola; a caixa de proficiência só é marcada clicando nela (a linha deixou de ser um <label>).
- Ferramentas: clicar no nome OU no número rola (quando o atributo é fixo).
- Testes contra a morte: clicar no texto "Death Saves" rola d20 + bônus de morte (o botão de dado foi removido).
- Dado de vida: clicar no "D*" entre parênteses rola 1dN + mod. de Constituição, como "Cura". Com multiclasse cada D* é clicável. NÃO desconta o contador de dados de vida.
- Características: botão 💬 ao lado da engrenagem envia nome, origem e descrição como mensagem kind "feature" (descrição limitada a 2000 caracteres); aparece no chat no estilo do livro.
- Testes: hitDiceExpression e buildFeatureMessage.

## Alteração: o chat sai do metadata da sala (limite de 16 kB)
- Erro real do Owlbear: "Unable to update metadata: over size limit of 16 kB". O metadata da sala é compartilhado por journal, fichas e chat; o chat estourou o limite.
- O histórico do chat agora fica no localStorage de cada navegador (chave owldnd.chat, até 200 mensagens). Cada mensagem é entregue aos outros jogadores por OBR.broadcast (destino REMOTE); o background de cada jogador a grava, mesmo com o popover fechado.
- Consequências: o histórico é por navegador; quem estava desconectado perde as mensagens daquele período; limpar os dados do navegador apaga o histórico.
- Limpeza: o mestre remove uma vez as chaves antigas owldnd/chat/* do metadata da sala.
- Removidos: chatKey, readMessages, staleKeys.
- ATENÇÃO (fora desta mudança): as fichas ainda moram no mesmo metadata da sala. Uma ficha preenchida tem ~13 KB (vazia ~1,5 KB). Ver decisão pendente sobre o armazenamento das fichas.

## Alteração: crítico dobra os dados de dano
- CC1 Ataque da ficha (d20 + dano na mesma rolagem) em que o d20 mantido é maior ou igual ao alcance de crítico da arma (`critRange`, padrão 20) é crítico: os DADOS de cada linha de dano dobram (`2d6+3` rola `4d6+3`); o valor fixo não dobra.
- CC2 Abaixo do alcance, o dano é normal. Alcance inválido ou ausente vale 20.
- CC3 Com vantagem/desvantagem vale o d20 mantido (o descartado não conta).
- CC4 Só dano (sem d20): nunca é crítico.
- CC5 O cartão marca "Crítico!" e o detalhe do dano mostra os dados dobrados.
- Fora de escopo: o campo "Crítico" de cada linha de dano (dados extras) continua sem uso; resistência/vulnerabilidade; confirmação de crítico.
