import { memo, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { Pipette } from 'lucide-react';
import useDraft from '../../../hooks/useDraft';
import { addRecentColor } from '../../../hooks/useRecentColors';
import { EyedropperContext } from '../../../hooks/useEyedropper';
import { useLanguage } from '../../../context/LanguageContext';
import { normalizeHex } from '../../../utils/css/color.js';
import RecentColors from './RecentColors';

// Seletor + texto hexadecimal + conta-gotas + cores recentes. O texto digitado fica até
// o blur e só valores completos (#abc, #aabbcc, com ou sem '#') são aplicados durante a digitação.
function ColorField({ label, value, disabled, onChange, compact }) {
  const { t } = useLanguage();
  const [picked, setPicked] = useDraft(value);
  const [typed, setTyped] = useState(null);
  const pickerValue = normalizeHex(picked) || '#000000';
  const pickerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // O arraste do seletor dispara dezenas de eventos: a cor só entra nas recentes quando
  // a escolha é confirmada (change nativo, Enter, blur) ou o campo sai de cena.
  const pending = useRef(null);
  const commit = useCallback(() => {
    if (pending.current) addRecentColor(pending.current);
    pending.current = null;
  }, []);
  useEffect(() => {
    const picker = pickerRef.current;
    picker?.addEventListener('change', commit);
    return () => {
      picker?.removeEventListener('change', commit);
      commit();
    };
  }, [commit]);

  // Swatch recente ou conta-gotas: uma escolha já confirmada, aplicada num passo só.
  const applyConfirmed = useCallback((hex) => {
    pending.current = null;
    setTyped(null);
    setPicked(hex);
    onChangeRef.current(hex);
    addRecentColor(hex);
  }, [setPicked]);

  const eyedropper = useContext(EyedropperContext);
  const pickerId = useId();
  const picking = eyedropper?.activeId === pickerId;
  const cancelPicking = eyedropper?.cancel;
  // Um campo que some (outro elemento, outra aba) não pode receber a cor depois.
  useEffect(() => () => cancelPicking?.(pickerId), [cancelPicking, pickerId]);
  useEffect(() => {
    if (disabled && picking) cancelPicking(pickerId);
  }, [disabled, picking, cancelPicking, pickerId]);

  const eyedropperLabel = t(picking ? 'colorTools.eyedropperCancel' : 'colorTools.eyedropper');

  return (
    <div className={`sidebar-color-field${compact ? ' sidebar-color-field--compact' : ''}`}>
      <div className="sidebar-color-input">
        <input
          ref={pickerRef}
          type="color"
          className="sidebar-color-picker"
          aria-label={label}
          value={pickerValue}
          disabled={disabled}
          onChange={(event) => {
            pending.current = event.target.value;
            setPicked(event.target.value);
            onChange(event.target.value);
          }}
        />
        <input
          type="text"
          className="sidebar-color-text"
          aria-label={label}
          value={typed ?? picked ?? ''}
          maxLength={7}
          spellCheck={false}
          disabled={disabled}
          onChange={(event) => {
            setTyped(event.target.value);
            const hex = normalizeHex(event.target.value);
            if (hex) {
              pending.current = hex;
              setPicked(hex);
              onChange(hex);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
          }}
          onBlur={() => {
            setTyped(null);
            commit();
          }}
        />
        {eyedropper && (
          <button
            type="button"
            className={`sidebar-eyedropper-btn${picking ? ' is-active' : ''}`}
            aria-label={`${eyedropperLabel} — ${label}`}
            aria-pressed={picking}
            data-tooltip={eyedropperLabel}
            data-eyedropper-active={picking ? '' : undefined}
            disabled={disabled}
            onClick={() => (picking ? eyedropper.cancel(pickerId) : eyedropper.start(pickerId, applyConfirmed))}
          >
            <Pipette size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <RecentColors current={pickerValue} disabled={disabled} compact={compact} onPick={applyConfirmed} />
    </div>
  );
}

export default memo(ColorField);
