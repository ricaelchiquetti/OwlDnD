# OWL-1 — Teste de armazenamento (Configurações)
Motivo: o metadata da sala tem limite de 16 kB (erro real: "Unable to update metadata: over size limit of 16 kB"); uma ficha preenchida tem ~13 KB. É preciso saber os limites das outras áreas (cena, token, jogador) para decidir onde guardar as fichas.
Importante: o teste anterior (gravar até 128 KB e ver se a chamada falhava) era inválido — uma gravação recusada NÃO falha na chamada, o erro aparece no console do Owlbear. O teste correto grava um valor e LÊ DE VOLTA.
Método: busca binária do maior valor aceito (256 B a 256 KB, resolução 256 B) em: sala, cena, UM token (o primeiro da cena) e jogador. Depois grava um valor-base de 4 KB e mede de novo: se o espaço livre cai ~4 KB o limite é COMPARTILHADO por tudo; se não muda é POR VALOR; se não acha limite até 256 KB é "sem limite".
Só o mestre roda (escreve no metadata da sala). Remove os valores de teste no final. Rodar sem ninguém editando; o Owlbear pode registrar erros no console dele durante o teste.
Onde: Configurações > "Teste de armazenamento" (src/views/Settings.vue; lógica em src/probe.js e src/storageProbe.js).
Testes: findLimit, metadataSize, withoutKey, limitSummary, formatKb (src/probe.test.js).
