# Fecha a Conta

[Experimentar no navegador](https://ykauttiz.github.io/fecha-a-conta/)

O pedido 102 deveria render R$ 24,00. O extrato mostra R$ 23,80. Abra **index.html**, clique em **Abrir exemplo** e encontre a diferença de vinte centavos.

Para usar seus dados, baixe a pasta e escolha dois CSVs UTF-8 separados por ponto e vírgula. O primeiro tem as colunas `pedido;previsto`, o segundo `pedido;recebido`. Informe uma linha por pedido em cada arquivo, com o líquido esperado já calculado. Há exemplos em pedidos.csv e repasses.csv. Os arquivos ficam no navegador.

O código converte os valores em centavos inteiros e compara IDs como texto para preservar zeros à esquerda. Mais de uma linha com o mesmo ID exige revisão, inclusive em parcelamentos ou ajustes legítimos. Repasses agrupados precisam ser detalhados por pedido antes da importação.

Execute `node --test` com Node 20+ para conferir estornos, ausência de pares, duplicatas, leitura de CSV e centavos.

## Fechamento por divergência

Depois de carregar os CSVs, marque **Mostrar somente pedidos para revisar**. O resumo mantém o total da conferência e separa quanto foi recebido a menos e a mais nos pares únicos. Pedidos ausentes e duplicatas entram na fila de revisão, sem entrar nos totais monetários.
