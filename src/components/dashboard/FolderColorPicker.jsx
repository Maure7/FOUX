import { useEffect, useId, useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { FOLDER_COLORS } from '../../utils/folderColors';
import { useLanguage } from '../../context/LanguageContext';

export function ColorSwatches({ value, onSelect, className = '' }) {
  const { t } = useLanguage();
  return (
    <div className={`folder-swatches ${className}`.trim()} role="group" aria-label={t('common.changeColor')}>
      {FOLDER_COLORS.map(({ key, value: color }) => (
        <button
          key={color}
          type="button"
          className={`folder-swatches__swatch ${value === color ? 'is-active' : ''}`}
          style={{ '--swatch-color': color }}
          onClick={() => onSelect(color)}
          aria-label={t(`modals.colors.${key}`)}
          aria-pressed={value === color}
          title={t(`modals.colors.${key}`)}
        />
      ))}
    </div>
  );
}

export default function FolderColorPicker({ value, onChange, label, variant = 'dot', placement = 'bottom' }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverId = useId();
  const text = label || t('common.changeColor');

  useEffect(() => {
    if (!open) return;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  useEffect(() => {
    if (open) rootRef.current?.querySelector('.folder-swatches__swatch.is-active, .folder-swatches__swatch')?.focus();
  }, [open]);

  const close = (restoreFocus) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  return (
    <div
      className={`folder-color-picker folder-color-picker--${placement}`}
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          close(true);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`folder-color-picker__trigger folder-color-picker__trigger--${variant}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-label={text}
        title={variant === 'dot' ? text : undefined}
      >
        {variant === 'dot' ? (
          <span className="folder-color-picker__dot" style={{ '--swatch-color': value || 'transparent' }} />
        ) : (
          <>
            <Palette size={15} />
            <span>{text}</span>
          </>
        )}
      </button>
      {open && (
        <div className="folder-color-picker__popover" id={popoverId}>
          <ColorSwatches
            value={value}
            onSelect={(color) => {
              onChange(color);
              close(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
