import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import I from './I';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

const TONES = {
  success: 'adm-toast--success',
  error: 'adm-toast--error',
  warning: 'adm-toast--warning',
};

export default function Toast({ toasts = [], onDismiss }: any) {
  return (
    <div className="adm-toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: any) {
  const dismiss = onDismiss;
  const id = toast.id;
  const duration = toast.duration || 4000;
  useEffect(() => {
    const timer = setTimeout(() => dismiss?.(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, dismiss]);

  const Icon = ICONS[toast.type] || CheckCircle2;
  const tone = TONES[toast.type] || TONES.success;

  return (
    <div className={`adm-toast ${tone}`} role="status">
      <I icon={Icon} size={16} />
      <span className="adm-toast-msg">{toast.message}</span>
      <button type="button" className="adm-toast-close" onClick={() => onDismiss?.(toast.id)} aria-label="Dismiss notification">
        <I icon={X} size={14} />
      </button>
    </div>
  );
}
