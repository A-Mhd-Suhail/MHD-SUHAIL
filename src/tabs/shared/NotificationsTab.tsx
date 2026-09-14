import { useEffect, useState } from 'react';
import { Bell, CheckCheck, X, Loader2, Sparkles } from 'lucide-react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { clearNotification, markNotifRead } from '../../lib/fs';
import { fmtDT } from '../../lib/format';
import type { Notif } from '../../lib/types';

export default function NotificationsTab() {
  const [notifs, setNotifs] = useState<Notif[] | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let unsub = () => {};
    getDoc(doc(db, 'users', uid)).then((userSnap) => {
      const role = userSnap.data()?.role;
      const targets = [uid, role ? `role:${role}` : ''].filter(Boolean);
      const q = query(collection(db, 'notifications'), where('to', 'in', targets));
      unsub = onSnapshot(q, (snap) => setNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notif)).sort((a, b) => b.createdAt - a.createdAt)), () => setNotifs([]));
    }).catch(() => setNotifs([]));
    return () => unsub();
  }, []);

  const open = (n: Notif) => {
    if (!n.read) markNotifRead(n.id);
    window.dispatchEvent(new CustomEvent('mhd:navigate', { detail: n.navTarget || 'notifs' }));
  };
  const clear = (id: string) => { clearNotification(id).catch(() => undefined); };
  const markAll = () => { (notifs || []).filter((n) => !n.read).forEach((n) => markNotifRead(n.id)); };

  const unread = (notifs || []).filter((n) => !n.read);
  const read = (notifs || []).filter((n) => n.read);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink tracking-tight mb-1">Notification Center</h2>
          <p className="text-xs sm:text-sm text-muted">All updates, lab alerts, and appointment reminders in one central inbox.</p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={markAll}
            className="flex items-center gap-2 text-xs font-bold text-primary border border-primary/30 bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20 transition-all self-start sm:self-auto shadow-xs"
          >
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      {notifs === null ? (
        <div className="bg-surface border border-line rounded-2xl p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs font-medium text-muted">Fetching notification stream…</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-line bg-stripe flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Unread ({unread.length})</span>
              {unread.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              )}
            </div>
            <div className="divide-y divide-line max-h-[440px] overflow-y-auto custom-scrollbar">
              {unread.length === 0 && <p className="p-8 text-xs text-muted text-center">You are all caught up!</p>}
              {unread.map((n, i) => (
                <div key={`${n.id}-${i}`} className="flex items-start gap-3 px-6 py-4 hover:bg-active/50 transition-colors group">
                  <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-ink group-hover:text-primary transition-colors">{n.title}</p>
                    <p className="text-xs text-muted mt-1 leading-snug">{n.body}</p>
                    <p className="text-[11px] text-muted font-medium mt-1.5">{fmtDT(n.createdAt)}</p>
                  </button>
                  <button
                    onClick={() => clear(n.id)}
                    title="Clear notification"
                    className="shrink-0 p-1 text-muted hover:text-danger hover:bg-app rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-line bg-stripe text-xs font-bold text-muted uppercase tracking-wider">
              Read ({read.length})
            </div>
            <div className="divide-y divide-line max-h-[440px] overflow-y-auto custom-scrollbar">
              {read.length === 0 && <p className="p-8 text-xs text-muted text-center">No read notifications yet.</p>}
              {read.map((n, i) => (
                <div key={`${n.id}-${i}`} className="flex items-start gap-3 px-6 py-4 opacity-75 hover:opacity-100 hover:bg-active/30 transition-colors">
                  <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    <p className="text-xs text-muted mt-1 leading-snug">{n.body}</p>
                    <p className="text-[11px] text-muted mt-1.5">{fmtDT(n.createdAt)}</p>
                  </button>
                  <button
                    onClick={() => clear(n.id)}
                    title="Clear notification"
                    className="shrink-0 p-1 text-muted hover:text-danger hover:bg-app rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

