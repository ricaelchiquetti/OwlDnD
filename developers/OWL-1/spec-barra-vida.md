# Barra de vida sobre o token

Selecionar um token vinculado a uma ficha abre, sobre a cabeça dele, uma barra de vida ligada a `combat.hpCurrent` / `hpMax` da ficha. Com `hpTemp > 0`, uma segunda barra aparece embaixo.

## Critérios de aceite
- CA1 Um token vinculado selecionado (só um) mostra a barra com "atual / máx". Sem vínculo, vários selecionados ou desmarcado: sem barra.
- CA2 (removido a pedido do usuário) A edição pela barra/menu do token foi retirada; a vida só se altera na ficha. `applyHpInput`/`applyTempInput` ficam em `src/hp.js`, sem uso por enquanto.
- CA3 Dano (`-n`) consome primeiro a vida temporária e só o resto vai à vida atual (mínimo 0).
- CA4 Texto inválido (vazio, letras, `+`, `1.5`) não altera nada.
- CA5 A barra grava na ficha; editar a vida na ficha atualiza a barra aberta.
- CA6 `hpTemp > 0`: segunda barra embaixo com o valor temporário; clicar permite `+n`, `-n` ou `n` (mínimo 0). `hpTemp = 0`: sem segunda barra.
- CA7 `hpMax = 0`: mostra "—", sem edição.
- CA8 Só quem enxerga a ficha (`isVisible`) vê a barra.

## Fora de escopo
Cores por faixa de vida, animação, barra permanente em todos os tokens, edição do máximo pela barra.
