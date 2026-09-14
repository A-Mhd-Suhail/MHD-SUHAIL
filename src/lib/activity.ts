/* ============================================================
   PATIENT ACTIVITY — data model + streak/adherence logic
   Collection: `activity` — one doc per logged event:
     { patientId, type: 'med'|'water'|'food'|'walk'|'sleep'|'weight',
       date: 'YYYY-MM-DD', ...payload, createdAt }
   ============================================================ */
import { collection, doc, onSnapshot, query, where, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type ActivityType = 'med' | 'water' | 'food' | 'walk' | 'sleep' | 'weight';

export interface ActivityEntry {
  id: string;
  patientId: string;
  type: ActivityType;
  date: string;          // YYYY-MM-DD (event date)
  createdAt?: number;
  // med
  medicineId?: string;
  medicineName?: string;
  sched?: string;        // scheduled HH:mm
  status?: 'taken' | 'missed' | 'skipped';
  takenAt?: number;
  // water
  ml?: number;
  // food
  meal?: string;         // Breakfast/Lunch/Dinner/Snacks/Beverages
  food?: string;
  grams?: number;
  kcal?: number; protein?: number; carbs?: number; fat?: number; fiber?: number;
  // walk
  steps?: number; minutes?: number;
  // sleep
  bed?: string; wake?: string; hours?: number;
  // weight
  kg?: number;
}

export const todayStr = () => new Date().toISOString().slice(0, 10);

export function dateOffsetStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Subscribe to all activity entries for a patient. */
export function bindActivity(patientId: string, cb: (rows: ActivityEntry[]) => void, err?: () => void): () => void {
  const q = query(collection(db, 'activity'), where('patientId', '==', patientId));
  return onSnapshot(q, (s) => {
    cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityEntry, 'id'>) })));
  }, err || (() => { /* ignore */ }));
}

/** Deterministic doc id so re-marking the same dose updates instead of duplicating. */
export function logMedIntake(patientId: string, medicineId: string, medicineName: string, date: string, sched: string, status: 'taken' | 'missed' | 'skipped') {
  const id = `med_${medicineId}_${date}_${sched.replace(':', '')}`;
  return setDoc(doc(db, 'activity', id), {
    patientId, type: 'med', medicineId, medicineName, date, sched, status,
    takenAt: status === 'taken' ? Date.now() : 0,
    createdAt: Date.now(),
  }, { merge: true });
}

export function logActivity(type: ActivityType, payload: Record<string, unknown>) {
  const id = doc(collection(db, 'activity')).id;
  return setDoc(doc(db, 'activity', id), {
    type, date: todayStr(), createdAt: Date.now(), ...payload,
  }, { merge: false });
}

/* ---------- Streak ---------- */
/** A day is "active" if any real health action happened (med taken, water, food, walk, sleep, weight). */
export function activeDates(entries: ActivityEntry[]): Set<string> {
  const s = new Set<string>();
  entries.forEach((e) => { if (e.type !== 'med' || e.status === 'taken') s.add(e.date); });
  return s;
}

export function currentStreak(entries: ActivityEntry[]): number {
  const days = activeDates(entries);
  let streak = 0;
  let offset = days.has(todayStr()) ? 0 : -1; // today pending? streak can still be alive from yesterday
  while (days.has(dateOffsetStr(offset - streak))) streak++;
  return streak;
}

export function bestStreak(entries: ActivityEntry[]): number {
  const days = [...activeDates(entries)].sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of days) {
    if (prev) {
      const gap = (new Date(d).getTime() - new Date(prev).getTime()) / 86400000;
      run = gap === 1 ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function lastActiveDate(entries: ActivityEntry[]): string {
  const days = [...activeDates(entries)].sort();
  return days.length ? days[days.length - 1] : '';
}

/* ---------- Adherence ---------- */
export function adherenceFor(entries: ActivityEntry[], medicines: { id: string }[], date: string): { taken: number; total: number } {
  const dayMeds = entries.filter((e) => e.type === 'med' && e.date === date);
  const taken = dayMeds.filter((e) => e.status === 'taken').length;
  // total scheduled doses for that date ≈ active medicines still prescribed by then
  const total = medicines.length || dayMeds.length;
  return { taken, total: Math.max(total, taken) };
}

/* ---------- Nutrition estimates (per 100 g) — clearly labelled as ESTIMATES ---------- */
export const FOOD_TABLE: Record<string, { kcal: number; protein: number; carbs: number; fat: number; fiber: number }> = {
  rice: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  'chapati / roti': { kcal: 297, protein: 11, carbs: 46, fat: 7, fiber: 4.9 },
  bread: { kcal: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7 },
  egg: { kcal: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0 },
  milk: { kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
  'curd / yogurt': { kcal: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
  dal: { kcal: 116, protein: 9, carbs: 20, fat: 1.2, fiber: 8 },
  chicken: { kcal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  fish: { kcal: 128, protein: 26, carbs: 0, fat: 2.5, fiber: 0 },
  'paneer / cheese': { kcal: 265, protein: 18, carbs: 3.6, fat: 20, fiber: 0 },
  vegetables: { kcal: 45, protein: 2.5, carbs: 8, fat: 0.4, fiber: 3 },
  'leafy greens': { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  fruits: { kcal: 60, protein: 0.9, carbs: 15, fat: 0.3, fiber: 2.4 },
  banana: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 },
  'idli': { kcal: 122, protein: 4, carbs: 25, fat: 0.6, fiber: 1 },
  'dosa': { kcal: 168, protein: 3.9, carbs: 30, fat: 3.7, fiber: 1.1 },
  'tea / coffee (with milk & sugar)': { kcal: 45, protein: 1.2, carbs: 7, fat: 1.3, fiber: 0 },
  'biscuits / snacks': { kcal: 480, protein: 6, carbs: 65, fat: 20, fiber: 2 },
  'sweets / dessert': { kcal: 350, protein: 4, carbs: 55, fat: 12, fiber: 1 },
  'nuts & dry fruits': { kcal: 600, protein: 20, carbs: 21, fat: 49, fiber: 7 },
};

export function estimateNutrition(food: string, grams: number) {
  const key = Object.keys(FOOD_TABLE).find((k) => food.toLowerCase().includes(k));
  const base = key ? FOOD_TABLE[key] : { kcal: 150, protein: 4, carbs: 20, fat: 5, fiber: 2 };
  const f = grams / 100;
  return {
    kcal: Math.round(base.kcal * f),
    protein: Math.round(base.protein * f * 10) / 10,
    carbs: Math.round(base.carbs * f * 10) / 10,
    fat: Math.round(base.fat * f * 10) / 10,
    fiber: Math.round(base.fiber * f * 10) / 10,
  };
}
