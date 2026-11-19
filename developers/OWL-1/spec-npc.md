# NPC: remover Nota e trocar por ficha de NPC (tela própria)

## Objetivo
Remover "Create Note" e adicionar "Create NPC". O NPC segue o fluxo do Character (asset picker → entrada no Diário → ficha), mas abre uma tela própria em estilo "stat block", com edição liberada pela engrenagem do topo.

## Decisões (confirmadas)
- Visibilidade igual ao Character (`Visibility` GM / PLAYERS / ALL), padrão GM.
- Ações são simples (ver Contratos); não usam o modelo de `attacks` do Character.
- PV: **dois campos**: `hp` (valor fixo, vira o máximo) e `hpFormula` (dados, opcional, só para o mestre rolar).
- A ficha do NPC **não guarda PV atual**: barra do token usa `hp` como máximo.

## Contratos
`Kind.NPC = 3` (Kind.NOTE removido). Ficha em `sheets[id]` (mesmo banco/store), normalizada por `normalizeNpc` (reusa `withDefaults`).

```
npc = {
  type, combat{ac, acType, speed, hpMax(=PV fixo), hpCurrent, hpTemp, hpFormula},
  abilities{str..cha}, saves{str..cha}, skills{18 perícias: number},
  vulnerabilities, resistances, damageImmunities, conditionImmunities,
  senses, languages, challenge, xp, proficiencyBonus, tokenSize,
  isCaster, hasBonusAction, hasReactions, legendaryActions:number, hasMythic, mythicText,
  actions[], bonusActions[], reactions[], legendary[]   // Action
}
Action = { name, attack:bool, kind:"melee"|"ranged", reach, toHit:number, target,
           damage1:{dice,type}, damage2:{dice,type}, description }
```
Modificador de atributo = `floor((score-10)/2)`. Perícia/salvaguarda mostram o valor digitado.

## Critérios de aceite
- CA1 Diário não tem mais "Create Note" nem `Kind.NOTE`; botão "Create NPC" existe (PT: "Criar NPC") e abre o asset picker.
- CA2 Criar NPC gera entrada `Kind.NPC` (GM) e ficha padrão; vários tokens → várias fichas.
- CA3 Item `Kind.NPC` abre `NpcSheet` (não a ficha de Character), com abas Ficha/Configurações (visibilidade, excluir).
- CA4 Modo leitura mostra: nome, tipo, CA, PV (+ fórmula entre parênteses se houver), deslocamento, 6 atributos com modificador, perícias com valor ≠ 0, sentidos, idiomas, desafio (XP). Campos vazios/zero são omitidos.
- CA5 Engrenagem do topo alterna modo edição: o formulário completo (imagem 2) fica editável; fora dele, tudo somente leitura. Quem não pode editar não vê a engrenagem.
- CA6 Seções Ações e Ação Bônus sempre; Reações só se `hasReactions`; Lendárias só se `legendaryActions>0`; Míticas só se `hasMythic`. `hasBonusAction=false` oculta Ação Bônus.
- CA7 Cada seção usa `EditableList` (`+` adiciona, 🔒 libera remoção). Cada ação tem sua engrenagem que abre o editor daquela ação.
- CA8 Editor com "Ataque" marcado: tipo (corpo a corpo/distância), alcance, para atingir, alvo, ao atingir 1 e 2 (dados + tipo), descrição (Mostrar/Ocultar). Desmarcado: nome, descrição e dano (dados + tipo).
- CA9 Texto da ação: "Nome." em negrito; se ataque, "Melee Weapon Attack: +4, Reach 5ft" (rótulo por tipo); "Dano: <média> (<dados>) <tipo>"; descrição.
- CA10 Rolls no chat (mesmo `sendSheetRoll`, Shift = vantagem, Ctrl = desvantagem): clique no atributo rola d20+mod; na salvaguarda d20+valor; na perícia d20+valor; no bônus de ataque d20+`toHit`; no dano rola os dados (1 e 2). Dado inválido não rola e avisa.
- CA11 Botão INIT usa o mesmo fluxo do Character (d20 + mod DES, entra no tracker).
- CA12 Botão da fórmula de PV rola `hpFormula` no chat; só para quem edita; oculto se vazio.
- CA13 Botão de imprimir da descrição manda a ação ao chat (`printFeature`).
- CA14 Token vinculado a NPC usa `hp` como máximo na barra; a ficha nunca é gravada ao mudar o PV atual (fica no token).
- CA15 NPC aparece no LinkModal para vincular token.
- CA16 Fichas antigas/parciais abrem sem quebrar (defaults).

## Fora de escopo
Migração de notas existentes (ficam ocultas), import de bestiário/SRD, cálculo automático de CR/XP, magias do NPC, regras de ações lendárias/míticas (só texto).

## Riscos / [A DEFINIR]
- Resolvido: a barra lê `combat.hpMax/hpCurrent/hpTemp`; digitar o PV na ficha preenche também `hpCurrent`, então nada precisa ser ajustado à mão. (antes: [A DEFINIR] Como a barra de PV do token lê hp máximo hoje (`hp.js`/`hpOverlay.js`): preciso checar e adaptar para NPC sem PV atual na ficha; depois confirmo o CA14.
- Notas antigas permanecem em metadata do Diário (poucos bytes), invisíveis.
- Toca `journal.js`, `characters.js`, `Journal.vue`, `ItemModal.vue`, `i18n.js`, `LinkModal`, hp.
