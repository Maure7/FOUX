import { useId, useState } from 'react';
import { ChevronDown, Sparkles, Timer } from 'lucide-react';
import { formatClock, readChallengeRecords } from '../../challenges/records.js';

const DATE_TIME = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

// Records are written by the editor; the profile only reads them on mount.
export default function ChallengeRecordCard({ t, formatDate }) {
  const [{ best, runs }] = useState(readChallengeRecords);
  const [open, setOpen] = useState(false);
  const regionId = useId();

  return (
    <section className={`profile-card challenge-record ${open ? 'challenge-record--open' : ''}`}>
      <button
        type="button"
        className="challenge-record__summary"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="challenge-record__icon"><Timer size={24} aria-hidden="true" /></span>
        <span className="challenge-record__content">
          <span className="challenge-record__title">{t('profile.bestTimeTitle')}</span>
          <span className="challenge-record__value">{best ? formatClock(best.ms) : '--:--'}</span>
          <span className="challenge-record__meta">
            {best ? t('profile.bestTimeDate', { date: formatDate(best.at, DATE_TIME) }) : t('profile.bestTimeEmpty')}
          </span>
        </span>
        <span className="challenge-record__count">{t('profile.bestTimeRuns', { count: runs.length })}</span>
        <ChevronDown size={18} className="challenge-record__chevron" aria-hidden="true" />
      </button>

      <div id={regionId} className="challenge-record__region" inert={!open} aria-hidden={!open}>
        <div className="challenge-record__clip">
          {runs.length === 0 ? (
            <p className="challenge-record__empty">{t('profile.bestTimeEmptyHistory')}</p>
          ) : (
            <ol className="challenge-record__list">
              {runs.map((run, index) => (
                <li key={`${run.at}-${index}`} className={`challenge-record__run ${run.record ? 'challenge-record__run--record' : ''}`}>
                  <span className="challenge-record__run-date">{formatDate(run.at, DATE_TIME)}</span>
                  <span className="challenge-record__run-time">{formatClock(run.ms)}</span>
                  {run.record && (
                    <span className="challenge-record__badge">
                      <Sparkles size={11} aria-hidden="true" />
                      {t('profile.recordBadge')}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
