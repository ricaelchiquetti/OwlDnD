# OWL-1 — Menu superior, Journal e i18n
Objetivo: index com menu (Chat/Journal/Codex/Settings), idioma EN/PT-BR, Journal com Create Character/Note salvo em OBR.room metadata (`owldnd/journal`).
Modelo: { id, kind: Kind{CHARACTER:1,NOTE:2}, title, owner, visibility: Visibility{GM:1,PLAYERS:2,ALL:3}, players[] }
Visível p/ u: GM | dono | ALL | PLAYERS e u in players. Só dono/GM alteram visibilidade.
CA1 menu 4 abas EN | CA2 aba ativa | CA3 idioma troca + localStorage | CA4 Codex vazio
CA5 criar item (visibility GM, owner atual, título "New Note 1") | CA6 persiste no room metadata + onMetadataChange
CA7 lista filtrada | CA8 seletor de visibilidade (+ jogadores do party) | CA9 só dono/GM veem seletor | CA10 sem OBR: Journal vazio + aviso
Fora de escopo: editar/excluir, formulários, chat/codex. Permissão só de UI.
Alteração: Journal = só lista; clicar em item abre modal (<dialog> nativo) com título e seletor de visibilidade (CA8/CA9 valem no modal).
Alteração 2: modal via OBR.modal.open (modal.html?id=...), não <dialog> interno.
