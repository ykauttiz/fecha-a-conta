# Fecha a Conta · Dashboard premium e insights financeiros

## O que mudou

- Interface totalmente refinada com identidade tecnológica, cartões, tabelas, formulários, navegação e temas claro/escuro.
- Animações de entrada e microinterações com respeito a movimento reduzido.
- Novo painel de análise dos **grupos filtrados**, com distribuição de situação, eventos por data, encargos tipificados e motivos das pendências.
- Exportação do resumo analítico em CSV, preservando a distinção entre contagem de eventos e dados monetários.
- Sugestão conservadora de cabeçalhos genéricos na importação, com confirmação manual nos casos ambíguos.
- Ajustes de responsividade, cabeçalho compacto e orientação de rolagem horizontal para tabelas em telas pequenas.
- Correções de contraste do tema escuro e ampliação de testes de navegador e unidade.

## Experimente

1. Abra [a demonstração](https://ykauttiz.github.io/fecha-a-conta/).
2. Selecione **Abrir exemplo fictício** e acompanhe os indicadores e gráficos de situação.
3. Verifique a diferença de **R$ 1,50** no pedido **0019**.
4. Explore **Por que há pendências?** e utilize **Examinar pendências**.
5. Utilize **Baixar análise CSV** para exportar os indicadores da seleção.
6. Teste os temas, filtros, importação e restauração de um backup.

## Limitações transparentes

- Os gráficos e os indicadores da demo usam apenas dados fictícios.
- A importação ainda utiliza arquivos CSV fornecidos pelo usuário; não existe conexão automática com contas de iFood ou 99Food.
- Valores informados no CSV de recebimentos **não equivalem a depósitos bancários verificados automaticamente**.
- Compatibilidade com layouts oficiais específicos depende de exemplos autorizados e testes próprios.
- Nenhum cálculo de conciliação é alterado pelos componentes de análise visual.

## Validação da entrega

O workflow `Conferência financeira` executa a suíte Node e os testes de interface com Chromium e Firefox. As capturas de telas completas podem ser consultadas nos artefatos da execução.

[Repositório](https://github.com/ykauttiz/fecha-a-conta) · [Demonstração](https://ykauttiz.github.io/fecha-a-conta/) · [Changelog](CHANGELOG.md)
