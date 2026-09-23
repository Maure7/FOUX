import { useState, useEffect } from 'react';
import { ClipboardList, Clock, FileCode, Trash2, X } from 'lucide-react';

const MAX_COLLAPSED = 6;

/* ===== TIME AGO HELPER ===== */
function timeAgo(date) {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'Agora mesmo';
  if (diffSec < 60) return `Há ${diffSec} segundos`;
  if (diffMin === 1) return 'Há 1 minuto';
  if (diffMin < 60) return `Há ${diffMin} minutos`;
  if (diffHour === 1) return 'Há 1 hora';
  if (diffHour < 24) return `Há ${diffHour} horas`;
  if (diffDay === 1) return 'Há 1 dia';
  return `Há ${diffDay} dias`;
}

/* ===== EMPTY STATE ===== */
function ActivityEmptyState() {
  return (
    <div className="activity-empty">
      <div className="activity-empty__icon-wrapper">
        <Clock className="activity-empty__icon" />
      </div>
      <span className="activity-empty__text">
        Nenhuma atividade recente registrada.
      </span>
    </div>
  );
}

/* ===== ACTIVITY ITEM ===== */
function ActivityItem({ activity, onRemove }) {
  const [timeLabel, setTimeLabel] = useState(() => timeAgo(activity.timestamp));

  // Auto-refresh the relative timestamp every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLabel(timeAgo(activity.timestamp));
    }, 30000);
    return () => clearInterval(interval);
  }, [activity.timestamp]);

  return (
    <div className="activity-item">
      <div className="activity-item__icon-wrapper">
        <FileCode className="activity-item__icon" />
      </div>
      <div className="activity-item__content">
        <span className="activity-item__text">{activity.text}</span>
        <span className="activity-item__time">{timeLabel}</span>
      </div>
      <span className="activity-item__tag">projeto</span>
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
      // Auto-dismiss confirmation after 4s
      setTimeout(() => setConfirmClear(false), 4000);
    }
  };

  return (
    <section className="activity-section" id="activity-section">
      <div className="activity-header">
        <div className="activity-header__left">
          <ClipboardList className="activity-header__icon" />
          <h2 className="activity-header__title">Atividade Recente</h2>
        </div>
        <div className="activity-header__right">
          {activities.length > 0 && onClearActivities && (
            <button
              className={`activity-header__clear ${confirmClear ? 'activity-header__clear--confirm' : ''}`}
              onClick={handleClearAll}
              title={confirmClear ? 'Clique novamente para confirmar' : 'Limpar histórico'}
            >
              <Trash2 size={13} />
              <span>{confirmClear ? 'Confirmar limpeza' : 'Limpar'}</span>
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
              {expanded ? 'Ver resumo' : 'Ver histórico completo'}
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
            />
          ))}
        </div>
      ) : (
        <ActivityEmptyState />
      )}
    </section>
  );
}
