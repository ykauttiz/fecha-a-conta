# Changelog

## 22 de novembro de 2026 · Revisão de estados e backups

- Destaque de investigação prioriza diferenças monetárias tanto do marketplace quanto do arquivo bancário.
- Filtro dedicado ao estado bancário, com acesso pela central de comandos, somente quando há CSV bancário.
- Restauração reforçada: observações inválidas ou excessivamente grandes são rejeitadas sem destruir a sessão atual.

## 22 de novembro de 2026 · Auditoria de integridade e segurança

- Isolamento de inconsistências por origem: problemas somente bancários deixam a conferência da plataforma intacta, e vice-versa.
- Identificadores repetidos nos repasses declarados bloqueiam ambos os níveis para evitar conclusões incorretas.
- Mapeamento conservador de colunas equivalentes normalizadas e melhoria na neutralização de fórmulas CSV Unicode.
- Testes de regressão para os três cenários de conflito e proteção das exportações.
- Correção de título inválido no changelog.

## 22 de novembro de 2026 · Conciliação em três níveis

- Rótulos de datas no gráfico foram abreviados para dia/mês e otimizados para telas estreitas; teste visual verifica sobreposição.

- Importação opcional de CSV com depósitos bancários informados, separada de previsões e repasses declarados.
- Conciliação por identificadores verificáveis, sem distribuição arbitrária de depósitos.
- Painel plataforma × banco, diferenças próprias e evidências/exportações com origem explícita.
- Backups compatíveis com sessões antigas e suporte à nova origem bancária, com testes de unidade e navegador.
- Ícone SVG próprio na aba e validação de metadados no navegador; preserva o trabalho do PR #5 sem substituir o design recente.


## 22 de novembro de 2026 · Interface premium e insights da conciliação

- Tabelas com cabeçalhos íntegros e rolagem horizontal orientada em telas estreitas.
- Cabeçalho mobile compacto e navegação horizontal; CI agora captura a página inteira para revisão visual.

- Nova identidade visual para dashboard, cabeçalho, importação, tabelas, botões e temas, com animações e layouts responsivos.
- Painel de insights de sessão: distribuição de situações, contagem por data de evento e encargos tipificados, atualizados a cada filtro.
- Analytics somente-leitura, sem mudança de cálculos ou dos dados persistidos, com testes de unidade e estados vazios.
- Integração da correção de contraste do PR #2, preservando auditorias no tema claro e escuro.


## 22 de novembro de 2026 · Contraste no tema escuro

- Mensagem de status, selo "Conferido", recibo do exemplo e link "Ir para o fechamento" voltaram a ter contraste legível no tema escuro. O teste de navegador agora mede o contraste do texto visível nos dois temas e falha abaixo de 4,5:1 (3:1 para texto grande).

## 21 de novembro de 2026 · Aparência configurável

- Seletor de tema automático, claro e escuro com preferência local e testes de recarga em navegador.

## 2026-11-21

Navegação visual revista, foco de teclado explícito, link para o portfólio e roteiro curto no README.

Exportações CSV neutralizam também prefixos de controle e variantes Unicode de caracteres que podem iniciar fórmulas em planilhas.

Os testes de interface também exercitam telas de 320 pixels.

Indicadores e impressão mostram um travessão quando falta um grupo comparável. A impressão identifica a loja e a plataforma de cada grupo.

A impressão do fechamento inclui totais comparáveis, diferenças a mais e a menos e quantidade de grupos pendentes, junto das linhas de evidência da seleção.

Na prévia de um CSV, guarde o mapeamento das colunas e reaplique-o quando plataforma, cabeçalho e tipo de arquivo coincidirem. O modelo guarda a correspondência dos campos. O CI disponibiliza capturas em duas larguras.

O resumo por loja ou plataforma exibe até 25 linhas por página. **Baixar comparação CSV** inclui todas as linhas do resumo filtrado.

Em **Comparar repasses**, alterne entre plataforma e loja. O quadro acompanha os filtros e soma apenas os grupos comparáveis. Pedidos e lotes sem comparação aparecem na última coluna. Um travessão indica que nenhum valor pôde ser comparado.

Ordene pedidos e lotes por maior diferença absoluta ou maior repasse recebido. A ordem também vale para o CSV e a impressão. Use **Limpar filtros e ordenação** para voltar à seleção completa.

- Memória de cálculo com composição visual do pedido, importação em duas colunas e tratamento numérico da tabela.

Filtre por tipo de lançamento, sentido da diferença e valor mínimo em reais. O filtro por tipo seleciona o grupo completo: ao procurar comissão, você continua vendo os depósitos e o previsto daquele lote. Os limites em centavos são inclusivos e valem também para os totais, a impressão e o CSV.

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
