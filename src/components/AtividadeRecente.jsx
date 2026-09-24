import { useState, useEffect } from 'react';
import { ClipboardList, Clock, FileCode, Trash2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const MAX_COLLAPSED = 6;

/* ===== EMPTY STATE ===== */
function ActivityEmptyState({ message }) {
  return (
    <div className="activity-empty">
      <div className="activity-empty__icon-wrapper">
        <Clock className="activity-empty__icon" />
      </div>
      <span className="activity-empty__text">
        {message}
      </span>
    </div>
  );
}

/* ===== ACTIVITY ITEM ===== */
function ActivityItem({ activity, onRemove, timeAgo, formatActivity, projectTagLabel }) {
  const [timeLabel, setTimeLabel] = useState(() => timeAgo(activity.timestamp));

  // Auto-refresh the relative timestamp every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLabel(timeAgo(activity.timestamp));
    }, 30000);
    return () => clearInterval(interval);
  }, [activity.timestamp, timeAgo]);

  const translatedText = formatActivity ? formatActivity(activity.text) : activity.text;

  return (
    <div className="activity-item">
      <div className="activity-item__icon-wrapper">
        <FileCode className="activity-item__icon" />
      </div>
      <div className="activity-item__content">
        <span className="activity-item__text">{translatedText}</span>
        <span className="activity-item__time">{timeLabel}</span>
      </div>
      <span className="activity-item__tag">{projectTagLabel}</span>
      {onRemove && (
        <button
          className="activity-item__delete"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(activity.id);
          }}
          aria-label="Remover atividade"
          title="Remover"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/* ===== MAIN COMPONENT ===== */
export default function AtividadeRecente({ activities, onClearActivities, onRemoveActivity }) {
  const { t, timeAgo, formatActivity } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const hasMore = activities.length > MAX_COLLAPSED;
  const visibleActivities = expanded ? activities : activities.slice(0, MAX_COLLAPSED);

  const handleClearAll = () => {
    if (confirmClear) {
      if (onClearActivities) onClearActivities();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
    }
  };

  return (
    <section className="activity-section" id="activity-section">
      <div className="activity-header">
        <div className="activity-header__left">
          <ClipboardList className="activity-header__icon" />
          <h2 className="activity-header__title">{t('activity.title')}</h2>
        </div>
        <div className="activity-header__right">
          {activities.length > 0 && onClearActivities && (
            <button
              className={`activity-header__clear ${confirmClear ? 'activity-header__clear--confirm' : ''}`}
              onClick={handleClearAll}
              title={confirmClear ? t('activity.confirmClear') : t('activity.clear')}
            >
              <Trash2 size={13} />
              <span>{confirmClear ? t('activity.confirmClear') : t('activity.clear')}</span>
            </button>
          )}
          {hasMore && (
            <a
              className="activity-header__link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setExpanded((prev) => !prev);
              }}
            >
              {expanded ? t('activity.viewSummary') : t('activity.viewFullHistory')}
            </a>
          )}
        </div>
      </div>

      {activities.length > 0 ? (
        <div className={`activity-list ${expanded ? 'activity-list--expanded' : ''}`}>
          {visibleActivities.map((item) => (
            <ActivityItem
              key={item.id}
              activity={item}
              onRemove={onRemoveActivity}
              timeAgo={timeAgo}
              formatActivity={formatActivity}
              projectTagLabel={t('activity.projectTag')}
            />
          ))}
        </div>
      ) : (
        <ActivityEmptyState message={t('activity.empty')} />
      )}
    </section>
  );
}
