# Fecha a Conta · Conciliação em três níveis

## Mudanças verificáveis

- Entrada opcional de depósitos bancários em CSV, distinguindo **previsão**, **repasse declarado** e **depósito importado**.
- Comparação independente plataforma × banco por pedido ou lote, sem associação por aproximação.
- Painel de conciliação bancária com valores comparáveis e pendências explicitadas.
- Backup, restauração, tabelas, memória de cálculo, impressão e evidências CSV ampliados.
- Regras monetárias usando centavos inteiros e testes para repasses divididos, diferenças e eventos ambíguos.
- Favicon SVG sem dependência externa e apresentação premium preservada.

## Demonstração

Use o exemplo fictício. O lote L01 demonstra dois depósitos que somam o repasse declarado, e o pedido 0019 demonstra uma diferença bancária fictícia de R$ 0,50. Nenhum dado da demo é real.

[Site](https://ykauttiz.github.io/fecha-a-conta/) · [Repositório](https://github.com/ykauttiz/fecha-a-conta)

## Limitações

O aplicativo não acessa contas bancárias e não confirma depósitos automaticamente. A comparação opcional só funciona com CSVs que contenham chaves compatíveis de pedido/lote, loja e plataforma. Integrações oficiais com marketplaces e formatos bancários não validados continuam pendentes.
