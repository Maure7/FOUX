import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { TOUR_STEPS } from '../../utils/tutorialTour';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/TutorialTour.css';

export default function TutorialTour({ stepIndex, onStepChange, onFinish }) {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  const cardRef = useRef(null);
  const [geometry, setGeometry] = useState(null);
  const step = TOUR_STEPS[stepIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
      else document.querySelector('.editor-header__tutorial-btn')?.focus();
    };
  }, []);

  useEffect(() => {
    let frame;
    const target = document.querySelector(`[data-tour="${step.id}"]`);
    const scroller = target?.closest('.sidebar-content');
    const previousScroll = scroller?.scrollTop;
    if (scroller && target) {
      scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8;
    }
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = target?.getBoundingClientRect();
        const bounds = scroller?.getBoundingClientRect();
        const width = window.innerWidth;
        const height = window.innerHeight;
        const top = Math.max(8, rect?.top ?? 8, bounds?.top ?? 8);
        const bottom = Math.min(height - 8, rect?.bottom ?? height - 8, bounds?.bottom ?? height - 8);
        const left = Math.max(8, (rect?.left ?? 8) - 4);
        const right = Math.min(width - 8, (rect?.right ?? width - 8) + 4);
        const cardWidth = cardRef.current?.offsetWidth || 320;
        const cardHeight = cardRef.current?.offsetHeight || 290;
        let cardLeft = left - cardWidth - 20;
        let cardTop = top;
        if (cardLeft < 12) {
          cardLeft = Math.max(12, (width - cardWidth) / 2);
          cardTop = bottom + 16;
          if (cardTop + cardHeight > height - 12) cardTop = top - cardHeight - 16;
        }
        setGeometry({
          spotlight: { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) },
          card: { left: cardLeft, top: Math.max(12, Math.min(height - cardHeight - 12, cardTop)) },
        });
      });
    };
    const observer = new ResizeObserver(measure);
    if (target) observer.observe(target);
    observer.observe(cardRef.current);
    measure();
    window.addEventListener('resize', measure);
    document.addEventListener('scroll', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('scroll', measure, true);
      cancelAnimationFrame(frame);
      if (scroller) scroller.scrollTop = previousScroll;
    };
  }, [step.id, t]);

  return createPortal(
    <dialog ref={dialogRef} className="tutorial-tour" aria-labelledby="tour-title" aria-describedby="tour-description"
      onCancel={(event) => { event.preventDefault(); onFinish(); }}>
      {geometry && <div className="tutorial-tour__spotlight" style={geometry.spotlight} aria-hidden="true" />}
      <div ref={cardRef} className="tutorial-tour__card" style={geometry?.card}>
        <div className="tutorial-tour__header">
          <span className="tutorial-tour__progress" aria-live="polite">{t('tour.progress', { current: stepIndex + 1, total: TOUR_STEPS.length })}</span>
          <button type="button" className="tutorial-tour__close" aria-label={t('tour.close')} onClick={onFinish}><X size={18} /></button>
        </div>
        <div key={step.id} aria-live="polite" aria-atomic="true">
          <h2 id="tour-title">{t(`tour.steps.${step.id}.title`)}</h2>
          <p id="tour-description">{t(`tour.steps.${step.id}.description`)}</p>
        </div>
        {step.id === 'spacing' && <div className="tutorial-tour__box-model" aria-hidden="true">
          <span>margin</span><div><span>padding</span><strong>{t('tour.content')}</strong></div>
        </div>}
        <div className="tutorial-tour__navigation">
          {stepIndex > 0 && <button type="button" onClick={() => onStepChange(stepIndex - 1)}><ArrowLeft size={14} />{t('tour.previous')}</button>}
          <button type="button" className="tutorial-tour__next" autoFocus onClick={() => stepIndex === TOUR_STEPS.length - 1 ? onFinish() : onStepChange(stepIndex + 1)}>
            {t(stepIndex === TOUR_STEPS.length - 1 ? 'tour.finish' : 'tour.next')}<ArrowRight size={14} />
          </button>
        </div>
        <button type="button" className="tutorial-tour__skip" onClick={onFinish}>{t('tour.skip')}</button>
        <p className="tutorial-tour__hint">{t('tour.restartHint')}</p>
      </div>
    </dialog>, document.body,
  );
}
