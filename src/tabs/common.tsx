import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

/* Shared bits for patient tabs. */

export const inputCls = 'w-full bg-app border border-line rounded-[4px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary';
export const labelCls = 'block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5';

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="text-[22px] font-semibold text-heading mb-1">{title}</h2>
      <p className="text-[14px] text-muted">{sub}</p>
    </div>
  );
}

export function Loading() {
  return (
    <div className="bg-surface border border-line rounded-[4px] p-10 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" />
    </div>
  );
}

export function EmptyState({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="bg-surface border border-line rounded-[4px] p-8 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      <p className="text-[13px] text-muted mt-1">{sub}</p>
    </div>
  );
}

export function StatusChip({ ok, warn, danger, children }: { ok?: boolean; warn?: boolean; danger?: boolean; children: ReactNode }) {
  const cls = ok ? 'text-ok bg-ok-bg border-ok-bd' : danger ? 'text-danger bg-danger-bg border-danger-bd' : 'text-warn bg-warn-bg border-warn-bd';
  return <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${cls}`}>{children}</span>;
}

export function FilterPills({ filters, value, onChange }: { filters: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 border-b border-line pb-4 overflow-x-auto custom-scrollbar">
      {filters.map((f, i) => (
        <button
          key={`${f}-${i}`}
          onClick={() => onChange(f)}
          className={`shrink-0 text-[13px] font-medium px-4 py-2 rounded-[4px] border transition-colors ${
            value === f ? 'bg-primary text-white border-primary' : 'bg-surface border-line text-muted hover:text-ink hover:bg-app'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

export const btnGhost = 'text-[13px] font-medium text-primary border border-primary px-4 py-2 rounded-[4px] hover:bg-active transition-colors';
export const btnPrimary = 'h-[40px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors';
