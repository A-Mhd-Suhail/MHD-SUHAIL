/* MHD Hospital — shared formatting / domain helpers.
 * Ported verbatim in behaviour from the original js/app.js. */

export const todayStr = (): string => new Date().toISOString().slice(0, 10);

export const fmtD = (d?: string | number | null): string => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};

export const fmtDT = (x?: number | null): string => {
  if (!x) return '—';
  try {
    return new Date(x).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(x);
  }
};

export const uid6 = (): string => Math.random().toString(36).slice(2, 8).toUpperCase();

export const maskAadhaar = (a?: string): string =>
  a ? 'XXXX XXXX ' + String(a).slice(-4) : '—';

export const ageOf = (dob?: string): number => {
  if (!dob) return 0;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

/* '1200' / '55000' style numbers → ₹ formatted */
export const rupees = (n: number | string | undefined | null): string => {
  const v = Number(n ?? 0);
  if (isNaN(v)) return '₹0';
  return '₹' + v.toLocaleString('en-IN');
};

export function timeToMin(t: string): number {
  const m = String(t || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + Number(m[2]);
}

/* Derive a display time from free-text dosage keywords (dashboard schedule) */
export function schedTimeFromDosage(d: string): string {
  const s = (d || '').toLowerCase();
  if (s.includes('breakfast')) return '08:00 AM';
  if (s.includes('lunch')) return '01:00 PM';
  if (s.includes('dinner') || s.includes('night')) return '08:00 PM';
  if (s.includes('evening')) return '06:00 PM';
  return '09:00 AM';
}

export const SLOT_TIMES = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

export const slotKey = (doctorId: string, date: string, time: string): string =>
  (doctorId + '_' + date + '_' + time).replace(/[^a-zA-Z0-9]/g, '_');

export function telLink(phone?: string): string | null {
  const n = String(phone || '').replace(/\D/g, '');
  return n ? 'tel:+91' + n.slice(-10) : null;
}

export function greetKey(): 'greetM' | 'greetA' | 'greetE' {
  const h = new Date().getHours();
  return h < 12 ? 'greetM' : h < 17 ? 'greetA' : 'greetE';
}

/* Queue number: client-side computed per doctor/day (same as original) */
export function queueNumberOf(
  appts: { doctorId: string; date: string; time: string; status: string; id: string }[],
  appt: { doctorId: string; date: string; time: string; id: string },
): number {
  const same = appts
    .filter((a) => a.doctorId === appt.doctorId && a.date === appt.date && a.status === 'upcoming')
    .sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  const idx = same.findIndex((a) => a.id === appt.id);
  return idx >= 0 ? idx + 1 : 0;
}

export const errMsg = (e: unknown): string => {
  const code = (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '') || '';
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'This email is already registered. Try signing in.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/operation-not-allowed': 'Email sign-in is not enabled for this project.',
    'auth/unauthorized-domain': 'This domain is not authorized in Firebase.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/network-request-failed': 'Network error — check your connection.',
    'permission-denied': 'Permission denied by Firestore rules.',
  };
  return map[code] || (e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e));
};
