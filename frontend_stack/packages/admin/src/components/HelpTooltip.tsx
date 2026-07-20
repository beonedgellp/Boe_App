import { Info } from 'lucide-react';
import { useState, useRef } from 'react';
import I from './I';

export default function HelpTooltip({ text }: any) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  function show() {
    clearTimeout(timerRef.current);
    setOpen(true);
  }

  function hide() {
    timerRef.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <span
      className="ash-tooltip-wrap"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        className="ash-tooltip-trigger"
        aria-label="More info"
        onClick={() => setOpen((v) => !v)}
      >
        <I icon={Info} size={14} />
      </button>
      {open && (
        <span className="ash-tooltip" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}
