import { Loader2 } from 'lucide-react';
import Loader from '../Loader';
import type { ReactNode } from 'react';

/* Shared UI primitives for all portal feature tabs. */

export const inputCls = 'w-full bg-app border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';
export const labelCls = 'block text-xs font-bold text-muted uppercase tracking-wider mb-1.5';

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-ink tracking-tight mb-1">{title}</h2>
      <p className="text-xs sm:text-sm text-muted">{sub}</p>
    </div>
  );
}

export function Loading() {
  return (
    <div className="bg-surface border border-line rounded-2xl p-8 text-center shadow-xs">
      <Loader inline />
      <p className="text-xs font-medium text-muted mt-2">Loading feature data…</p>
    </div>
  );
}

export function EmptyState({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-10 text-center shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-app border border-line flex items-center justify-center text-primary mx-auto mb-3">
        {icon}
      </div>
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="text-xs sm:text-sm text-muted mt-1 max-w-sm mx-auto">{sub}</p>
    </div>
  );
}

export function StatusChip({ ok, warn, danger, children }: { ok?: boolean; warn?: boolean; danger?: boolean; children: ReactNode }) {
  const cls = ok
    ? 'text-ok bg-ok-bg/90 border-ok-bd/40'
    : danger
      ? 'text-danger bg-danger-bg/90 border-danger-bd/40'
      : 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30';
  return (
    <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-xs ${cls}`}>
      {children}
    </span>
  );
}

export function FilterPills({ filters, value, onChange }: { filters: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 border-b border-line pb-4 overflow-x-auto custom-scrollbar">
      {filters.map((f, i) => (
        <button
          key={`${f}-${i}`}
          onClick={() => onChange(f)}
          className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-xl border transition-all ${
            value === f
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-surface border-line text-muted hover:text-ink hover:bg-app'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

export const btnGhost = 'text-xs font-bold text-primary border border-primary/40 px-4 py-2 rounded-xl hover:bg-primary/10 transition-colors';
export const btnPrimary = 'h-10 px-4 bg-primary text-white rounded-xl text-xs font-bold shadow-sm hover:bg-primary-d transition-colors';

