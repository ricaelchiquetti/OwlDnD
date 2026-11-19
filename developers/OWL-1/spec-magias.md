# Aba MAGIAS da ficha de Personagem

## Objetivo
Aba **Magias** (só Character) com atributo de conjuração, CD de salvaguarda e bônus de ataque de magia calculados, espaços de magia por nível e listas de magias (truques + níveis 1–9), no layout da ficha impressa.

## Contratos
- `sheet.spellcasting.ability` (já existe): "" ou um atributo.
- `sheet.spells = { cantrips: Spell[], levels: { 1..9: { total, remaining, list: Spell[] } } }`
- `Spell = { name, prepared, school, ritual, castingTime, range, target, v, s, m, materials, concentration, duration, ability ("spell"|atributo), innate, output ("sheet"|"attack"), description, higherLevels, attackType ("", "melee", "ranged"), damage1{dice,type}, damage2{dice,type}, healing, addModifier, hasSave, save{ability,effect}, damagePerLevel, includeDescription }`
- CD = 8 + proficiência + mod do atributo; Ataque = proficiência + mod. Sem atributo escolhido: `null` (mostra "—").

## Critérios de aceite
- CA1 `createSheet()` traz `spells` com truques vazios e níveis 1–9 com total 0, restantes 0 e lista vazia.
- CA2 Ficha antiga sem `spells` abre com defaults; magias salvas sem campos novos são completadas.
- CA3 CD e ataque de magia seguem a fórmula (ex.: nível 1, SAB 16 → CD 13, ataque +5) e acompanham nível/atributos; `null` sem atributo.
- CA4 Aba Magias aparece só no Character, entre Bio e Configurações.
- CA5 Cabeçalho: banner com o nome, seleção do atributo (lista dos 6), CD e bônus de ataque (somente leitura).
- CA6 Cada nível 1–9 tem "espaços totais" e "restantes" editáveis; truques não têm espaços.
- CA7 Cada lista usa `EditableList` (`+` adiciona, 🔒 libera remoção). Linha: marcador de preparada (só níveis 1–9), nome e etiquetas V/S/M/C(concentração)/R(ritual).
- CA8 Engrenagem da linha abre o editor completo (campos do Contratos); botão "Pronto" fecha. Nova magia já abre editando. Saída "Ficha de magia" esconde os campos de ataque; "Ataque" mostra ataque mágico, dano 1/2, cura, adicionar modificador, salvaguarda e efeito, dano por nível e "incluir descrição".
- CA11 Magia de saída "Ataque": clicar no nome rola o d20 (proficiência + mod do atributo da magia; só se há tipo de ataque) e o dano/cura no chat; "adicionar modificador" soma o mod ao primeiro dado; salvaguarda aparece como CD no nome do card; "incluir descrição" manda a descrição depois. Magia de saída "Ficha": nome e descrição.
- CA9 Clicar no nome da magia manda nome e descrição para o chat.
- CA10 Sem permissão, tudo somente leitura.

## Fora de escopo
Biblioteca/SRD de magias, aplicar automaticamente o dano por nível superior (o campo é só informativo), gasto automático de espaço, cálculo de espaços por classe, rolagem de dano de magia.

- CA12 Checkbox "Tem salvaguarda" (em toda magia): marcada, mostra atributo e efeito da salvaguarda e a CD aparece no card do chat (rodapé) e no título da rolagem; desmarcada, nada disso aparece.

## Conjurador (Settings → ao lado do Hit Die)
`sheet.spellcasting.type`: `none | full | half | pact | eldritch | trickster`. Nível usado = nível total do personagem (`characterLevel`).
- CA13 `none`: espaços totais continuam manuais (como hoje).
- CA14 `full`: tabela de conjurador completo (nível 1: 2×1º … nível 20: 4/3/3/3/3/2/2/1/1).
- CA15 `half` (paladino/patrulheiro): nível 1 sem espaços; depois usa a tabela completa com nível ⌈n/2⌉.
- CA16 `eldritch` e `trickster` (cavaleiro místico / trapaceiro arcano): níveis 1–2 sem espaços; depois tabela completa com nível ⌈n/3⌉.
- CA17 `pact` (bruxo): todos os espaços do mesmo círculo: 1×1º, 2×1º, 2×2º, 2×2º, 2×3º... (nível 1–20, tabela do bruxo).
- CA18 Com tipo diferente de `none`, o total de cada círculo é calculado (somente leitura na aba Magias) e acompanha o nível; os "restantes" continuam editáveis.
- CA19 Select "Conjurador" nas Configurações, ao lado do Hit Die; fichas antigas abrem como `none`.
Fora de escopo: multiclasse com conjuradores diferentes (usa só o tipo escolhido e o nível total).

## Multiclasse
Cada classe tem seu tipo de conjurador: a principal em `spellcasting.type` (nível `sheet.level`), as extras em `extraClasses[].caster` (padrão `none`). O select de cada classe fica em Configurações.
- CA20 Só uma classe conjuradora (sem contar Pacto): usa a tabela própria dela com o nível **dessa classe** (não o total).
- CA21 Duas ou mais conjuradoras: nível de conjurador = soma dos níveis das classes completas + ⌊nível/2⌋ das meias + ⌊nível/3⌋ das de terço, lido na tabela de conjurador completo (regra de multiclasse do livro).
- CA22 Magia de Pacto não entra na soma: seus espaços (do círculo de pacto) são somados ao total do círculo correspondente.
- CA23 O total é automático se qualquer classe tiver tipo diferente de `none`; senão continua manual.
- CA24 Classe extra antiga sem `caster` abre como `none`.
(Substitui CA13–CA18 onde usavam o nível total: agora vale o nível da classe.)
