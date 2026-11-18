import { useEffect, useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import useModal from '../../../hooks/useModal';
import { formatDuration } from '../../../challenges/records.js';
import '../../../styles/challenges.css';

const AUTO_CLOSE_MS = 30000;
const CONFETTI = Array.from({ length: 14 }, (_, index) => index);

export default function ChallengeVictory({ result, onClose, t }) {
  const isOpen = !!result;
  const { modalRef, present } = useModal(isOpen);
  // Mantém o resultado na tela enquanto a transição de saída acontece.
  const [shown, setShown] = useState(result);
  if (result && result !== shown) setShown(result);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!present || !shown) return null;

  return (
    <div className="modal-overlay" data-state={isOpen ? 'open' : 'closed'} inert={!isOpen} onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-card challenge-victory"
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-victory-title"
        aria-describedby="challenge-victory-time"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="challenge-victory__countdown" aria-hidden="true">
          <span style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }} />
        </div>
        <div className="challenge-victory__confetti" aria-hidden="true">
          {CONFETTI.map((index) => <i key={index} style={{ '--i': index }} />)}
        </div>
        <div className="challenge-victory__icon"><Trophy size={30} aria-hidden="true" /></div>
        <h2 className="modal-title" id="challenge-victory-title">{t('challenges.victoryTitle')}</h2>
        <p className="challenge-victory__label">{t('challenges.totalTime')}</p>
        <strong className="challenge-victory__time" id="challenge-victory-time">{formatDuration(shown.ms)}</strong>
        {shown.isRecord && (
          <span className="challenge-victory__record">
            <Sparkles size={14} aria-hidden="true" />
            {t('challenges.newRecord')}
          </span>
        )}
        <button type="button" className="modal-create-btn challenge-victory__done" onClick={onClose}>
          {t('challenges.finish')}
        </button>
      </div>
    </div>
  );
}
