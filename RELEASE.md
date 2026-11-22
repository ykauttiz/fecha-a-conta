# Fecha a Conta · Auditoria de integridade e segurança

## Correções verificadas

- Conflitos de ID de evento isolados por origem financeira: previsão, repasse declarado e depósito bancário.
- Conflitos no repasse declarado bloqueiam os dois níveis de comparação, em vez de permitir resultados indevidamente conclusivos.
- Valores de comparação e estados bancários expostos separadamente na tabela e no painel de investigação.
- Filtro de situação bancária e comando contextual para investigar depósitos com diferença.
- Mapeamento de colunas canônicas normalizadas duplicadas agora exige seleção manual.
- CSV exportado recebe proteção reforçada contra fórmulas com prefixos invisíveis e Unicode.
- Backups com revisões malformadas ou excessivamente longas são rejeitados sem sobrescrever a sessão.
- Changelog corrigido, testes de regressão e navegação ampliados.

## Testar na demonstração

1. Abra [o Fecha a Conta](https://ykauttiz.github.io/fecha-a-conta/).
2. Carregue o exemplo fictício, observe a separação entre o estado da plataforma e o estado bancário.
3. Filtre por situação bancária e abra a central de comandos para investigar diferenças.
4. Confira registros, valores e suas origens antes de concluir um fechamento.

## Restrições

O site não acessa contas bancárias nem marketplaces automaticamente. A correspondência depende de identificadores presentes nos CSVs importados. Testes automatizados não substituem auditoria independente com extratos reais autorizados.

[Histórico de mudanças](CHANGELOG.md) · [Repositório](https://github.com/ykauttiz/fecha-a-conta)
