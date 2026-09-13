import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

export default function NotificationBell({ onOpen }: { onOpen: () => void }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let stopNotifications: (() => void) | undefined;
    let cancelled = false;
    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopNotifications?.();
      stopNotifications = undefined;
      setUnread(0);
      if (!user) return;
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        if (cancelled) return;
        const role = snap.data()?.role;
        const targets = [user.uid, role ? `role:${role}` : ''].filter(Boolean);
        stopNotifications = onSnapshot(
          query(collection(db, 'notifications'), where('to', 'in', targets)),
          (s) => setUnread(s.docs.reduce((count, item) => count + (item.data().read ? 0 : 1), 0)),
          () => setUnread(0),
        );
      }).catch(() => setUnread(0));
    });
    return () => { cancelled = true; stopNotifications?.(); stopAuth(); };
  }, []);
  return <button onClick={onOpen} title="Notifications" className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface text-muted hover:text-primary hover:border-primary transition-colors"><Bell className="w-5 h-5" strokeWidth={1.5} />{unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>}</button>;
}
