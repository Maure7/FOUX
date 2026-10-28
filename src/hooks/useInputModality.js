import { useEffect } from 'react';

export default function useInputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const onKey = (event) => {
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) root.dataset.input = 'keyboard';
    };
    const onPointer = () => { root.dataset.input = 'pointer'; };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
      delete root.dataset.input;
    };
  }, []);
}
