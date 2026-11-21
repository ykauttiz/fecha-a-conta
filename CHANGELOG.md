# Changelog

## 2026-11-21

Um ID de evento repetido dentro do mesmo extrato mantém as linhas na memória de cálculo e leva o grupo para revisão.

## 2026-11-20 · Conciliação por lançamentos e lotes

- Prévia de CSV e mapeamento de colunas, centavos exatos, comissão contratual por venda, subsídios, estornos e depósitos divididos.
- Filtros por loja, plataforma, data e situação, com memória de cálculo por arquivo e linha.
- Importação incremental, retirada de arquivos, anotações de revisão, backup JSON, evidências CSV e impressão para PDF.
- Novo painel adaptável, casos financeiros fictícios reproduzíveis e testes automatizados do motor e da interface.

## 2026-11-20 · Busca e paginação

Digite parte do número do pedido para localizar lançamentos. Combine a busca com a caixa de pendências. A lista mostra até 50 linhas por página; o resumo financeiro continua considerando a conferência completa.

## 2026-11-20 · Fechamento por divergência

Depois de carregar os CSVs, marque **Mostrar somente pedidos para revisar**. O resumo mantém o total da conferência e separa quanto foi recebido a menos e a mais nos pares únicos. Pedidos ausentes e duplicatas entram na fila de revisão, sem entrar nos totais monetários.
