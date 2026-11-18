import { useMemo, useState } from 'react';
import { Check, FileCode, Folder, Search } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const FILTER_THRESHOLD = 6;

export default function ProjectPicker({ projects, folders = [], selectedIds, onChange, emptyLabel }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const folderNames = useMemo(() => new Map(folders.map((folder) => [folder.id, folder.name])), [folders]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...projects]
      .filter((project) => !term || project.name.toLowerCase().includes(term))
      .sort((a, b) => Number(!!a.folderId) - Number(!!b.folderId) || a.name.localeCompare(b.name));
  }, [projects, query]);

  if (!projects.length) {
    return <p className="project-picker__empty">{emptyLabel || t('dashboard.picker.empty')}</p>;
  }

  const toggle = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const allVisibleSelected = visible.length > 0 && visible.every((project) => selectedIds.has(project.id));
  const toggleAll = () => {
    const next = new Set(selectedIds);
    visible.forEach((project) => (allVisibleSelected ? next.delete(project.id) : next.add(project.id)));
    onChange(next);
  };

  return (
    <div className="project-picker">
      <div className="project-picker__toolbar">
        {projects.length > FILTER_THRESHOLD && (
          <label className="project-picker__search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('dashboard.picker.filter')}
              aria-label={t('dashboard.picker.filter')}
            />
          </label>
        )}
        <button type="button" className="project-picker__all" onClick={toggleAll} disabled={!visible.length}>
          {allVisibleSelected ? t('dashboard.picker.clearAll') : t('dashboard.picker.selectAll')}
        </button>
      </div>
      <ul className="project-picker__list">
        {visible.map((project) => {
          const checked = selectedIds.has(project.id);
          const location = project.folderId ? folderNames.get(project.folderId) : null;
          return (
            <li key={project.id}>
              <label className={`project-picker__item ${checked ? 'is-checked' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(project.id)} />
                <span className="project-picker__check" aria-hidden="true">{checked && <Check size={12} strokeWidth={3} />}</span>
                <FileCode size={15} className="project-picker__icon" aria-hidden="true" />
                <span className="project-picker__name">{project.name}</span>
                {location && (
                  <span className="project-picker__location">
                    <Folder size={11} aria-hidden="true" />
                    {location}
                  </span>
                )}
              </label>
            </li>
          );
        })}
        {!visible.length && <li className="project-picker__empty">{t('dashboard.emptySearchTitle')}</li>}
      </ul>
      <p className="project-picker__count" aria-live="polite">
        {t(selectedIds.size === 1 ? 'dashboard.picker.selectedOne' : 'dashboard.picker.selectedMany', { count: selectedIds.size })}
      </p>
    </div>
  );
}
