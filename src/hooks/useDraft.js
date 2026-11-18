import { useState } from 'react';

// Os valores da sidebar vêm dos estilos computados, relidos uma vez por frame. Nesse
// intervalo o input controlado não pode voltar ao valor antigo (o seletor de cor pularia
// sob o cursor), então mostra o valor do usuário até a fonte alcançar.
// Uma escrita que não muda o computado (largura além do max-width) nunca alcança a fonte;
// por isso o rascunho também cai quando `resetKey` (o elemento selecionado) muda.
export default function useDraft(value, resetKey) {
  const [draft, setDraft] = useState(null);
  const [source, setSource] = useState({ value, resetKey });
  if (!Object.is(source.value, value) || source.resetKey !== resetKey) {
    setSource({ value, resetKey });
    setDraft(null);
  }
  return [draft ?? value, setDraft];
}
