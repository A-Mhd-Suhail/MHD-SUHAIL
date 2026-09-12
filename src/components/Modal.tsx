import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/* MediNexa-style modal shell (same as admin tabs' modals). */
export default function Modal({
  title, icon, onClose, children, footer, wide, small,
}: {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  small?: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const maxWidthClass = small ? 'max-w-[480px]' : wide ? 'max-w-[800px]' : 'max-w-[600px]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-[#102A43]/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-surface rounded-[8px] shadow-xl w-full ${maxWidthClass} flex flex-col max-h-[90vh]`}>
        <div className="p-4 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-[4px] text-muted hover:bg-app hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">{children}</div>
        {footer && <div className="p-4 border-t border-line bg-stripe flex justify-end gap-3 rounded-b-[8px] shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
