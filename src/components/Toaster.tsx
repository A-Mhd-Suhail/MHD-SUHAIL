import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/* Modern floating toast system mirroring toast() feedback. */

type ToastKind = 'ok' | 'err' | 'info';
interface ToastItem { id: number; msg: string; kind: ToastKind }

let listeners: ((items: ToastItem[]) => void)[] = [];
let items: ToastItem[] = [];
let seq = 1;

function emit() { listeners.forEach((l) => l([...items])); }

export function toast(msg: string, kind: ToastKind = 'ok') {
  const item: ToastItem = { id: seq++, msg, kind };
  items = [...items.slice(-4), item];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== item.id);
    emit();
  }, 3800);
}

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);
  useEffect(() => {
    listeners.push(setList);
    return () => { listeners = listeners.filter((l) => l !== setList); };
  }, []);

  const dismiss = (id: number) => {
    items = items.filter((t) => t.id !== id);
    emit();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2.5 w-[340px] max-w-[calc(100vw-3rem)] pointer-events-none">
      {list.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl text-[13px] font-medium pointer-events-auto backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-200 ${
            t.kind === 'err'
              ? 'bg-danger-bg/95 border-danger-bd text-danger'
              : t.kind === 'info'
                ? 'bg-info-bg/95 border-info-bd text-info'
                : 'bg-ok-bg/95 border-ok-bd text-ok'
          }`}
        >
          {t.kind === 'err' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> :
            t.kind === 'info' ? <Info className="w-4 h-4 mt-0.5 shrink-0" /> :
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="leading-snug flex-1">{t.msg}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="p-0.5 rounded hover:bg-black/5 transition-colors opacity-70 hover:opacity-100 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

