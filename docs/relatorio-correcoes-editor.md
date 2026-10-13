# Correções do editor FOUX

Foram corrigidos o desligamento da escala no hover e o arredondamento de bordas
com gradiente. A parte do artigo foi excluída conforme a orientação posterior.

## Hover de escala

Em `src/hooks/useIframeInspector.js`, `injectHoverStyles` e `getHoverRules`
passaram a usar o parser CSS do navegador (`CSSOM`). A expressão regular anterior
incluía o comentário inicial da folha no primeiro seletor, deixando uma regra
antiga ativa quando o controle era atualizado.

A atualização reconstrói imediatamente `foux-user-hover-rules` a partir do mapa
de seletores. Desativar a escala exclui `transform` da regra daquele elemento;
desativar todos os efeitos exclui a regra inteira. Regras antigas por ID ou
`data-foux-id` são migradas para a classe do elemento, sem alterar outros alvos.
O slider mantém seu valor e o transform original volta a prevalecer na cascata.

## Borda gradiente

`src/utils/gradientBorder.js` centraliza a composição do fundo e da borda.
`setGradientBorder` substitui `border-image` por camadas de fundo com recorte
`padding-box`/`border-box` e borda sólida transparente, respeitando `border-radius`.
O fundo existente e os parâmetros de suas imagens são preservados na composição.

O estado e as declarações anteriores ficam no documento para permitir salvar,
reabrir e desfazer/refazer. `updateGradientBorderBackground` recompõe as camadas
quando o fundo é editado. Desligar o gradiente restaura a borda sólida e mantém
as alterações de fundo feitas durante sua utilização.

`src/components/SidebarEstilos.jsx` usa essa API, restaura os controles ao trocar
de seleção e compõe os fundos de hover com a borda. Gradientes antigos gerados
com `border-image` são migrados ao selecionar o elemento. A leitura de cores e
gradientes também aceita a normalização para `rgb()` feita pelo navegador.

Para fundos translúcidos, o recorte `border-area` é usado quando o navegador
oferece suporte. Em navegadores sem esse recurso, a técnica clássica de camadas
requer um preenchimento interno opaco para impedir a passagem visual do gradiente.

## Validação

- `npm.cmd run build`: aprovado.
- ESLint nos três arquivos de produção alterados: aprovado.
- `node scripts/test_editor.mjs`: aprovado, incluindo os novos testes de
  `scripts/test_style_regressions.mjs`.
- `git diff --check`: aprovado.

Os testes no Chromium exercitam os controles reais de escala, sombra, gradiente
e raio; a restauração do transform original; a migração de seletores e bordas
antigas; a independência entre elementos; a persistência e a exportação.
Capturas de tela são verificadas por pixels para confirmar cantos arredondados,
preenchimento interno e transparência. A suíte existente de exportação e tela
cheia também passou.
