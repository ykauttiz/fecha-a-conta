# Changelog

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
