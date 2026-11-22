# Como contribuir com Fecha a Conta

Obrigado pelo interesse. Fecha a Conta é um projeto pessoal e pequeno. Relatos de problemas e sugestões com um exemplo fictício ajudam mais do que código sem contexto.

## Antes de começar

- Procure uma [issue](https://github.com/ykauttiz/fecha-a-conta/issues) existente ou abra uma com os formulários de relato ou melhoria.
- Para mudanças maiores, abra a issue antes e combine o escopo.
- Licença: ainda não declarada pelo autor. Converse na issue antes de enviar código.

## Dados

Use somente dados fictícios ou anonimizados em issues, testes e capturas. Não envie extratos, pedidos ou repasses reais de lojas e clientes. Use as amostras fictícias de `exemplos/` ou valores inventados.

## Rodar os testes

Requisitos: Node 22 ou 24 (a CI usa essas versões).

```sh
node --test
```

Para o teste de navegador, use Python 3 com `python3 -m pip install playwright==1.55.0` e rode `python3 tests/browser.py` (use `ENGINE=firefox` para o Firefox, depois de `python3 -m playwright install firefox`).

Ao editar `style.css`, atualize o parâmetro `?v=` em `index.html` com os 12 primeiros caracteres de `sha256sum style.css`.

## Pull requests

1. Crie uma branch a partir da `main`. Não reescreva o histórico.
2. Faça uma mudança de cada vez, com um teste que falhe sem ela e passe com ela.
3. Atualize README e CHANGELOG quando o comportamento mudar.
4. Preencha o modelo do pull request com os comandos executados e os resultados reais.
5. A CI (Conferência financeira) precisa passar. Uma entrega marcada usa um commit `release(vAAAA.MM.DD) Título`, feito pelo mantenedor.

## Estilo e acessibilidade

O `.editorconfig` define codificação, quebras de linha e indentação. Em mudanças de interface, confira navegação por teclado, foco visível, contraste nos temas claro e escuro, telas de 320 px e `prefers-reduced-motion`.

## Camada de experiência

`style.css` contém a base da interface; `experience.css` contém a navegação aprimorada, os componentes de investigação e o motion design. Ao editar a segunda folha de estilos, atualize o parâmetro `?v=` da referência correspondente em `index.html`. A interface dinâmica usa `experience.js` e a API somente de interface exposta por `app.js`; o motor monetário permanece em `book.js`.
