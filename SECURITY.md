# Política de segurança

## Versões cobertas

Só a versão da branch `main`, publicada na [demonstração](https://ykauttiz.github.io/fecha-a-conta/), recebe correções. Fecha a Conta é um projeto pessoal mantido por uma pessoa, e não há prazo garantido de resposta.

## Como relatar

1. Se a aba **Security** do repositório tiver o botão **Report a vulnerability**, use-o. O relato fica privado.
2. Se o botão não estiver disponível, abra uma [issue](https://github.com/ykauttiz/fecha-a-conta/issues/new/choose) com o título "Segurança: resumo", descrevendo o **impacto** e sem o passo a passo de exploração nem dados reais. O mantenedor combina um canal privado antes de qualquer detalhe técnico.

Nunca publique tokens, senhas ou dados de terceiros em um relato.

## O que interessa

- Um CSV ou backup que consiga injetar HTML ou fórmulas de planilha nas exportações e na impressão.
- Qualquer caminho em que dados financeiros saiam do navegador sem ação do usuário.
- Uma falha que apague ou altere um fechamento ou uma revisão sem aviso.

## Fora de escopo

- Pedidos de recurso e erros de cálculo sem impacto de segurança: use [Relatar um problema](https://github.com/ykauttiz/fecha-a-conta/issues/new/choose).
- Falhas em serviços de terceiros (GitHub, Discord, plataformas de delivery): relate ao serviço.

## O que o código faz com os dados

O código do aplicativo não usa telemetria nem scripts de terceiros e não envia os dados do usuário a um servidor. A hospedagem na GitHub Pages registra acessos como qualquer site estático. Ausência de alertas não prova ausência de falhas.
