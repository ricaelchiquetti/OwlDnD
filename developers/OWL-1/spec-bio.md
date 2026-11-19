# Aba BIO da ficha de Personagem

## Objetivo
Nova aba **Bio** (ao lado de Ficha e Configurações, só para Character) com características físicas e campos de texto, no layout da ficha impressa.

## Contratos
`sheet.bio = { age, size, height, weight, eyes, skin, hair }` (texto). `sheet.text` ganha `appearance`, `allies`, `backstory`, `additionalFeatures`, `treasure` (texto). Fichas antigas abrem com tudo vazio (`withDefaults`).

## Critérios de aceite
- CA1 `createSheet()` traz `bio` e os 5 textos novos, vazios.
- CA2 Ficha salva sem esses campos é normalizada com vazios, sem perder o resto.
- CA3 Item Character mostra a aba Bio; NPC não.
- CA4 Cabeçalho da aba: nome no banner (BioScroll) e campos Idade, Tamanho, Altura, Peso, Olhos, Pele, Cabelo.
- CA5 Abaixo, painéis: Aparência (topo esq.), Aliados & Organizações (topo dir.), História (esq., alto), Características & Traços Adicionais e Tesouro (dir.), cada um com legenda embaixo.
- CA6 Editar grava em `bio.*` / `text.*` pelo mesmo `saveSheet`; sem permissão, somente leitura.

## Fora de escopo
Upload de imagem do personagem, aba Magias (próxima entrega), trava (🔒) por campo.
