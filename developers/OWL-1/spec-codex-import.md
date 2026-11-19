# Códice: importar magias do 5etools por URL

## Objetivo
Na aba **Códice** (hoje vazia), o usuário informa uma URL base de dados do 5etools, escolhe as fontes (livros) e baixa as magias para o navegador, convertidas para o formato `Spell` da ficha. Nada do conteúdo vai embutido no app.

## Contratos
- `DEFAULT_BASE_URL = "https://cdn.jsdelivr.net/gh/5etools-mirror-3/5etools-src@main/data/"` (campo editável).
- `fetchSources(baseUrl) -> string[]`: lê `{base}spells/index.json` (mapa `fonte -> arquivo`) e devolve as chaves.
- `fetchSpells(baseUrl, sources) -> Spell[]`: baixa `{base}spells/{arquivo}` de cada fonte escolhida e concatena `spell[]`.
- `convertSpell(raw5e) -> { level: 0..9, spell: Spell }` (puro). Mapeia: nome, `school` (código → nome), `meta.ritual`, `time`, `range`, `components` (v/s/m + materiais), `duration` (+ concentração), `entries`/`entriesHigherLevel` → texto com markup `{@...}` reduzido a texto puro (`{@dice 1d6}` → `1d6`, `{@spell fireball}` → `fireball`; demais tags → só o primeiro campo).
- `compendium.spells`: lista guardada em `localStorage`/IndexedDB (chave própria), `[{ level, source, spell }]`.
- Erros: URL inválida/não-http(s), falha de rede, resposta não-JSON ou sem `spell[]`: mensagem na tela, nada é gravado, dados anteriores preservados.

## Critérios de aceite
- CA1 `convertSpell` converte magia simples (nível, escola, tempo, alcance, duração) para `Spell` completo (`newSpell()` + campos preenchidos).
- CA2 Componentes: `{v,s,m}` → flags; `m` string/objeto → `materials`.
- CA3 Duração com `concentration` → `concentration = true` e `duration` sem repetir "Concentração".
- CA4 `entries` com texto, listas e tags `{@...}` viram texto puro legível; `entriesHigherLevel` → `higherLevels`.
- CA5 Nível 0 → truque; 1–9 → nível correspondente.
- CA6 `fetchSources` lista as fontes do `index.json`; URL sem `http(s)` é rejeitada antes de qualquer fetch.
- CA7 `fetchSpells` baixa só as fontes escolhidas, uma requisição por fonte; falha de uma fonte aborta e não grava nada.
- CA8 Aba Códice: campo de URL (com padrão), botão "Carregar fontes", lista de fontes com checkbox, botão "Importar" e estado de carregando/erro/sucesso (nº de magias).
- CA9 Magias importadas persistem no navegador e reaparecem ao reabrir; reimportar a mesma fonte substitui (sem duplicar).
- CA10 Códice lista as magias importadas com busca por nome e filtro por nível; clicar mostra o detalhe.
- CA11 Textos novos em `i18n` (en e pt-BR).

- CA12 Preparado para tradução (sem traduzir agora): `convertSpell(raw, terms = EN_TERMS)` recebe um dicionário de termos (escolas, unidades de tempo/alcance/duração) com o inglês como padrão; nenhum texto de conteúdo fica fixo dentro da lógica. Trocar o idioma depois = passar outro dicionário (ex.: glossário PT-BR) e/ou outra URL base, sem mexer no conversor. Teste: um dicionário de teste muda o nome da escola no resultado.

## Fora de escopo
Tradução do conteúdo (glossário PT-BR ou IA; só o ponto de extensão do CA12);
Itens, monstros e demais categorias; sincronizar com Supabase; botão "adicionar à ficha" (próximo passo); renderização rica do markup (tabelas, imagens); atualização automática; embutir qualquer dado do 5etools no app.

## Riscos/impactos
- **Licença:** conteúdo WotC; fica só no dispositivo de quem importa.
- **CORS:** servidores sem CORS falham; o padrão é o jsDelivr.
- Mirror pode sair do ar: por isso a URL é configurável (self-host).
- Armazenamento local limitado (~5 MB em localStorage): usar IndexedDB se passar disso. [A DEFINIR na implementação]

## Salvaguarda, ataque, dano e cura (importação)
- CA16 `savingThrow` do 5etools marca `hasSave` e `save.ability`; o efeito "Half damage" entra quando o texto diz "half as much damage".
- CA17 `spellAttack` (M/R) define `attackType`; dano em `{@damage}` (até 2 linhas; truques só 1) com tipos de `damageInflict`; `{@scaledamage}` preenche `damagePerLevel`.
- CA18 `miscTags` com "HL" preenche `healing` com o primeiro `{@dice}`.
- CA19 `output = attack` se há ataque, dano ou cura; senão `sheet`.
- CA13–CA15 Adicionar à ficha: copia a magia para a lista do nível (truques no 0), sem duplicar o mesmo nome; aceita objeto reativo; aviso pela notificação do Owlbear.
