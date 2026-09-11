import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/* MediNexa-style modal shell (same as admin tabs' modals). */
export default function Modal({
  title, icon, onClose, children, footer, wide,
}: {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-[#102A43]/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-surface rounded-[8px] shadow-xl w-full ${wide ? 'max-w-[800px]' : 'max-w-[600px]'} flex flex-col max-h-[90vh]`}>
        <div className="p-4 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-[4px] text-muted hover:bg-app hover:text-ink transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">{children}</div>
        {footer && <div className="p-4 border-t border-line bg-stripe flex justify-end gap-3 rounded-b-[8px] shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
