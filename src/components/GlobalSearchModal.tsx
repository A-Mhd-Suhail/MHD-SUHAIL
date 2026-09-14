import { useEffect, useState } from 'react';
import { Search, Command, ArrowRight, LayoutDashboard, Calendar, Pill, FileText, Stethoscope, Users, Settings, Bell, X } from 'lucide-react';

interface SearchItem {
  id: string;
  title: string;
  category: string;
  icon: typeof LayoutDashboard;
  action: () => void;
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  onNavigate,
  userRole = 'patient',
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabName: string) => void;
  userRole?: string;
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          window.dispatchEvent(new CustomEvent('mhd:open-search'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allItems: SearchItem[] = [
    { id: 'dash', title: 'Dashboard Overview', category: 'Navigation', icon: LayoutDashboard, action: () => onNavigate('Dashboard') },
    { id: 'appts', title: 'Appointments & Consultations', category: 'Medical Services', icon: Calendar, action: () => onNavigate('Appointments') },
    { id: 'meds', title: 'Medications & Prescriptions', category: 'Pharmacy', icon: Pill, action: () => onNavigate('Medicines') },
    { id: 'cases', title: 'Medical History & Records', category: 'Clinical', icon: FileText, action: () => onNavigate('My Case') },
    { id: 'docs', title: 'Find Doctors & Specialists', category: 'Services', icon: Stethoscope, action: () => onNavigate('My Doctors') },
    { id: 'notifs', title: 'Notifications & Alerts', category: 'System', icon: Bell, action: () => onNavigate('Notifications') },
    { id: 'settings', title: 'Account & Settings', category: 'Preferences', icon: Settings, action: () => onNavigate('My Info') },
  ];

  const filtered = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[90] flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[580px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-stripe">
          <Search className="w-5 h-5 text-muted shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features, medical records, tabs, or shortcuts... (Cmd+K)"
            className="w-full bg-transparent text-ink placeholder:text-muted text-[14px] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-ink hover:bg-app transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              No matching features or records found for &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-active hover:text-primary transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-app flex items-center justify-center text-muted group-hover:text-primary group-hover:bg-surface border border-line transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-ink group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <span className="text-[11px] text-muted">{item.category}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-line bg-app flex items-center justify-between text-[11px] text-muted font-medium">
          <span className="flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5" /> Quick search across MHD Hospital
          </span>
          <span className="bg-surface px-2 py-0.5 rounded border border-line">Esc to close</span>
        </div>
      </div>
    </div>
  );
}
