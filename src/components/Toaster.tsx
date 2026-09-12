import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

/* Tiny toast system mirroring the original app's toast() feedback. */

type ToastKind = 'ok' | 'err' | 'info';
interface ToastItem { id: number; msg: string; kind: ToastKind }

let listeners: ((items: ToastItem[]) => void)[] = [];
let items: ToastItem[] = [];
let seq = 1;

function emit() { listeners.forEach((l) => l([...items])); }

export function toast(msg: string, kind: ToastKind = 'ok') {
  const item: ToastItem = { id: seq++, msg, kind };
  items = [...items.slice(-3), item];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== item.id);
    emit();
  }, 3500);
}

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);
  useEffect(() => {
    listeners.push(setList);
    return () => { listeners = listeners.filter((l) => l !== setList); };
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-[100] space-y-2 w-[320px] pointer-events-none">
      {list.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 p-3 rounded-[6px] border shadow-sm text-[13px] animate-in fade-in duration-200 ${
            t.kind === 'err'
              ? 'bg-danger-bg border-danger-bd text-danger'
              : t.kind === 'info'
                ? 'bg-info-bg border-info-bd text-info'
                : 'bg-ok-bg border-ok-bd text-ok'
          }`}
        >
          {t.kind === 'err' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> :
            t.kind === 'info' ? <Info className="w-4 h-4 mt-0.5 shrink-0" /> :
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="leading-snug">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
