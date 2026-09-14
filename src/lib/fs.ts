/* MHD Hospital — Firestore write helpers shared by all tabs.
 * Mirrors the original app: notifications ('to' = uid or 'role:doctor'),
 * accessLog audit entries, thread-id helper for chat. */

import {
  addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, Role } from './types';

export async function notify(to: string, title: string, body: string, navTarget?: string | null) {
  try {
    await addDoc(collection(db, 'notifications'), {
      to, title, body, navTarget: navTarget ?? null, read: false, createdAt: Date.now(),
    });
  } catch (e) {
    console.warn('notify failed', e);
  }
}

export async function notifyRole(role: Role, title: string, body: string, navTarget?: string | null) {
  return notify('role:' + role, title, body, navTarget);
}

export async function logAccess(patientId: string, actorName: string, actorRole: Role, action: string) {
  try {
    await addDoc(collection(db, 'accessLog'), {
      patientId, actorName, actorRole, action, createdAt: Date.now(),
    });
  } catch (e) {
    console.warn('logAccess failed', e);
  }
}

/** threads doc id — sorted pair of uids joined by '_' (same as original). */
export const threadId = (a: string, b: string): string => [a, b].sort().join('_');

export async function ensureThread(meId: string, otherId: string) {
  try {
    await setDoc(doc(db, 'threads', threadId(meId, otherId)), {
      ids: [meId, otherId].sort(), lastAt: Date.now(),
    }, { merge: true });
  } catch (e) {
    console.warn('ensureThread failed', e);
  }
}

export async function sendChatMessage(
  me: MhdUser, otherId: string, text: string, otherRole: Role,
) {
  const tid = threadId(me.id, otherId);
  await setDoc(doc(db, 'threads', tid), { ids: [me.id, otherId].sort(), lastAt: Date.now() }, { merge: true });
  await addDoc(collection(db, 'threads', tid, 'm'), {
    from: me.id, fromRole: me.role, text, at: Date.now(),
  });
  const label = me.role === 'doctor' ? 'Dr. ' + me.name : me.name;
  await notify(otherId, 'New message', `${label}: ${text.slice(0, 80)}`, 'messages');
}

/** Mark one notification read. */
export const markNotifRead = (id: string) => updateDoc(doc(db, 'notifications', id), { read: true });
export const clearNotification = (id: string) => deleteDoc(doc(db, 'notifications', id));

export const serverNow = () => serverTimestamp();
