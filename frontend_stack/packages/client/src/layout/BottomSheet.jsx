import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

function trapFocus(container) {
  const focusable = Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.disabled && el.offsetParent !== null);

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  first.focus();

  function handleTab(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', handleTab);
  return () => container.removeEventListener('keydown', handleTab);
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  showHandle = true,
  showClose = true,
  className = '',
  ...rest
}) {
  const panelRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!open) return;

    previousActiveElement.current = document.activeElement;
    const removeTrap = trapFocus(panelRef.current);

    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    return () => {
      removeTrap?.();
      document.removeEventListener('keydown', onKey);
      previousActiveElement.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sheetClasses = ['be-sheet', className].filter(Boolean).join(' ');

  return (
    <div
      className="be-sheet-overlay is-open"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      {...rest}
    >
      <div
        ref={panelRef}
        className={sheetClasses}
        onClick={(e) => e.stopPropagation()}
      >
        {showHandle && <div className="be-sheet__handle" aria-hidden="true" />}
        {showClose && (
          <button
            type="button"
            className="be-sheet__close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        )}
        {title && <h2 className="be-page-header__title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
