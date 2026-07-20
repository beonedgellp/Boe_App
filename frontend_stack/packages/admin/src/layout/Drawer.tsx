import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import I from '../components/I';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Right-side editing panel: the standard editing surface for the redesigned
// admin. Focus is trapped while open; Escape and overlay click close it.
// Rendered via a React portal on document.body to escape ancestor stacking contexts.

export default function Drawer({ open, title, onClose, footer, children, wide = false }: any) {
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector(FOCUSABLE)?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusable = Array.from<any>(panel.querySelectorAll(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const drawer = (
    <div className="ash-drawer-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className={`ash-drawer ${wide ? 'ash-drawer-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ash-drawer-head">
          <h2 className="ash-drawer-title">{title}</h2>
          <button type="button" className="ash-icon-btn" onClick={onClose} aria-label="Close panel">
            <I icon={X} size={16} />
          </button>
        </div>
        <div className="ash-drawer-body">{children}</div>
        {footer && <div className="ash-drawer-foot">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(drawer, document.body);
}
