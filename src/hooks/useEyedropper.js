import { createContext, useCallback, useMemo, useRef, useState } from 'react';

// Ponte entre os ColorFields (quem pede a cor) e o overlay sobre o canvas (quem amostra).
export const EyedropperContext = createContext(null);

// Uma sessão por vez: { id do ColorField, callback que aplica a cor }. O valor do
// contexto só muda quando a sessão começa ou termina.
export default function useEyedropper() {
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);

  const update = useCallback((next) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const start = useCallback((id, onPick) => update({ id, onPick }), [update]);
  // Com `id`, só encerra se a sessão ativa for daquele campo (desmontar outro campo não a cancela).
  const cancel = useCallback((id) => {
    if (!sessionRef.current || (id && sessionRef.current.id !== id)) return;
    update(null);
  }, [update]);
  const pick = useCallback((hex) => {
    const current = sessionRef.current;
    update(null);
    current?.onPick(hex);
  }, [update]);

  const context = useMemo(() => ({ activeId: session?.id ?? null, start, cancel }), [session, start, cancel]);
  return { active: !!session, context, pick, cancel };
}
