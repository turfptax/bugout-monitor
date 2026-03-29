import type { Toast as ToastType } from '../../store/useUIStore';
import { useUIStore } from '../../store/useUIStore';

const iconMap = {
  success: '\u2705',
  error: '\u274C',
  info: '\u2139\uFE0F',
};

const bgMap = {
  success: 'border-threat-green/40 bg-threat-green/10',
  error: 'border-threat-red/40 bg-threat-red/10',
  info: 'border-accent-2/40 bg-accent-2/10',
};

export default function Toast({ toast }: { toast: ToastType }) {
  const dismiss = useUIStore((s) => s.dismissToast);

  return (
    <div
      className={`animate-toast-in flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm text-text-primary ${bgMap[toast.type]}`}
    >
      <span>{iconMap[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => dismiss(toast.id)}
        className="text-text-dim hover:text-text-primary text-xs cursor-pointer ml-2"
      >
        ✕
      </button>
    </div>
  );
}
