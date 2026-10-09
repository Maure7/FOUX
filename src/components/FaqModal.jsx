import { useEffect } from 'react';
import { BookOpen, HelpCircle, X } from 'lucide-react';

export default function FaqModal({ isOpen, onClose, t }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const questions = Array.from({ length: 6 }, (_, index) => ({
    question: t(`faq.questions.q${index + 1}.question`),
    answer: t(`faq.questions.q${index + 1}.answer`),
  }));

  return (
    <div className="modal-overlay faq-overlay" onClick={onClose}>
      <section
        className="modal-card faq-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-modal-title"
      >
        <button className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          <X size={18} />
        </button>

        <div className="modal-header faq-modal__header">
          <span className="faq-modal__icon"><HelpCircle size={20} /></span>
          <div>
            <h2 className="modal-title" id="faq-modal-title">{t('faq.title')}</h2>
            <p className="modal-subtitle">{t('faq.subtitle')}</p>
          </div>
        </div>

        <div className="faq-modal__questions">
          {questions.map(({ question, answer }, index) => (
            <details className="faq-item" key={question} open={index === 0}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>

        <div className="faq-manual">
          <div className="faq-manual__copy">
            <BookOpen size={18} />
            <span>{t('faq.manualHint')}</span>
          </div>
          <a
            className="faq-manual__button"
            href={`${import.meta.env.BASE_URL}manual-do-usuario-foux.pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('faq.manualButton')}
          </a>
        </div>
      </section>
    </div>
  );
}
