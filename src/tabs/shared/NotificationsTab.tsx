import { useEffect, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { clearNotification, markNotifRead } from '../../lib/fs';
import { fmtDT } from '../../lib/format';
import type { Notif } from '../../lib/types';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

/* Notification Center — ported from the original pg-notifs page (two
 * columns: New / Read). Fixed: this page is actually reachable now. */
export default function NotificationsTab() {
  const [notifs, setNotifs] = useState<Notif[] | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let unsub = () => {};
    getDoc(doc(db, 'users', uid)).then((userSnap) => {
      const role = userSnap.data()?.role;
      const targets = [uid, role ? `role:${role}` : ''].filter(Boolean);
      // Sort in memory so notifications do not depend on a Firestore composite index.
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-semibold text-heading mb-1">Notification Center</h2>
          <p className="text-[14px] text-muted">Everything that happened in your care, in one place.</p>
        </div>
        {unread.length > 0 && (
          <button onClick={markAll} className="flex items-center gap-2 text-[13px] font-medium text-primary border border-primary px-4 py-2 rounded-[4px] hover:bg-active transition-colors">
            <CheckCheck className="w-4 h-4" strokeWidth={1.5} /> Mark all read
          </button>
        )}
      </div>

      {notifs === null ? (
        <div className="bg-surface border border-line rounded-[4px] p-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider">New ({unread.length})</div>
            <div className="divide-y divide-line max-h-[420px] overflow-y-auto custom-scrollbar">
              {unread.length === 0 && <p className="p-6 text-[13px] text-muted text-center">You're all caught up.</p>}
              {unread.map((n, i) => (
                <div key={`${n.id}-${i}`} className="flex items-start gap-2 px-4 py-3 hover:bg-stripe transition-colors">
                  <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                  <p className="text-[13px] font-semibold text-ink">{n.title}</p>
                  <p className="text-[12px] text-muted mt-0.5">{n.body}</p>
                  <p className="text-[11px] text-muted mt-1">{fmtDT(n.createdAt)}</p>
                  </button>
                  <button onClick={() => clear(n.id)} title="Clear notification" aria-label="Clear notification" className="shrink-0 p-1 text-muted hover:text-danger"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider">Read ({read.length})</div>
            <div className="divide-y divide-line max-h-[420px] overflow-y-auto custom-scrollbar">
              {read.length === 0 && <p className="p-6 text-[13px] text-muted text-center">No read notifications yet.</p>}
              {read.map((n, i) => (
                <div key={`${n.id}-${i}`} className="flex items-start gap-2 px-4 py-3 opacity-70 hover:bg-stripe">
                  <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                  <p className="text-[13px] font-medium text-ink">{n.title}</p>
                  <p className="text-[12px] text-muted mt-0.5">{n.body}</p>
                  <p className="text-[11px] text-muted mt-1">{fmtDT(n.createdAt)}</p>
                  </button>
                  <button onClick={() => clear(n.id)} title="Clear notification" aria-label="Clear notification" className="shrink-0 p-1 text-muted hover:text-danger"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
