import { useEffect, useMemo, useState } from 'react';
import {
  Flame, Pill, GlassWater, Utensils, Footprints, Moon, Scale, CheckCircle2, XCircle,
  MinusCircle, Plus, TrendingDown, TrendingUp, CalendarDays, Info, Loader2,
} from 'lucide-react';
import { onSnapshot, query, where, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Medicine } from '../../lib/types';
import { t } from '../../lib/i18n';
import { schedTimeFromDosage, fmtD } from '../../lib/format';
import {
  bindActivity, logMedIntake, logActivity,
  currentStreak, bestStreak, lastActiveDate, activeDates, adherenceFor,
  estimateNutrition, FOOD_TABLE, todayStr, dateOffsetStr,
  type ActivityEntry,
} from '../../lib/activity';

const card = 'bg-surface border border-line rounded-[4px] p-5 shadow-sm';
const h4 = 'text-[11px] font-bold text-muted uppercase tracking-wider mb-3';
const input = 'w-full bg-app border border-line rounded-[4px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary';
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages'];

/** Patient "Activity" page — daily health management (medicines, water, food, walk, sleep, weight) + streak. */
export default function ActivityTab({ me }: { me: MhdUser }) {
  const uid = me.id;
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  // medicines
  useEffect(() => {
    const un = onSnapshot(query(collection(db, 'medicines'), where('patientId', '==', uid)),
      (s: any) => setMeds(s.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((m: Medicine) => m.active !== false)),
      () => {});
    return un;
  }, [uid]);

  // activity log
  useEffect(() => { return bindActivity(uid, setEntries); }, [uid]);

  const today = todayStr();
  const E = entries || [];
  const dayE = (d: string) => E.filter((e) => e.date === d);

  /* ----- today's medicine schedule ----- */
  const schedule = useMemo(() => meds.map((m) => ({
    med: m,
    time: schedTimeFromDosage(m.dosage || ''),
    intake: E.find((e) => e.type === 'med' && e.medicineId === m.id && e.date === today),
  })), [meds, E, today]);

  /* ----- summaries ----- */
  const waterMl = dayE(today).filter((e) => e.type === 'water').reduce((a, e) => a + (e.ml || 0), 0);
  const steps = dayE(today).filter((e) => e.type === 'walk').reduce((a, e) => a + (e.steps || 0), 0);
  const sleepToday = dayE(today).find((e) => e.type === 'sleep');
  const weightLogs = useMemo(() => E.filter((e) => e.type === 'weight' && e.kg).sort((a, b) => a.date.localeCompare(b.date)), [E]);
  const currentWeight = weightLogs[weightLogs.length - 1];
  const prevWeight = weightLogs[weightLogs.length - 2];
  const weightChange = currentWeight && prevWeight ? Math.round((currentWeight.kg! - prevWeight.kg!) * 10) / 10 : 0;

  const mealsToday = dayE(today).filter((e) => e.type === 'food');
  const kcalToday = mealsToday.reduce((a, e) => a + (e.kcal || 0), 0);

  const streak = currentStreak(E);
  const best = bestStreak(E);
  const lastActive = lastActiveDate(E);
  const activeToday = E.some((e) => e.date === today && (e.type !== 'med' || e.status === 'taken'));
  const activeDaysSet = activeDates(E);

  const adh = adherenceFor(E, meds, today);
  const adhPct = adh.total ? Math.round((adh.taken / adh.total) * 100) : 0;
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => dateOffsetStr(i - 6));
    return days.map((d) => ({ d, adh: adherenceFor(E, meds, d) }));
  }, [E, meds]);
  const weekPct = (() => {
    const t2 = week.reduce((a, w) => a + w.adh.total, 0);
    const k = week.reduce((a, w) => a + w.adh.taken, 0);
    return t2 ? Math.round((k / t2) * 100) : 0;
  })();

  /* ----- form state ----- */
  const [waterTarget] = useState(2000);
  const [wForm, setWForm] = useState({ food: '', grams: '100', meal: 'Breakfast' });
  const [walkForm, setWalkForm] = useState({ steps: '', minutes: '' });
  const [sleepForm, setSleepForm] = useState({ bed: '23:00', wake: '07:00' });
  const [kgForm, setKgForm] = useState('');

  const est = wForm.food ? estimateNutrition(wForm.food, Number(wForm.grams) || 100) : null;

  if (!entries) {
    return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>;
  }

  return (
    <div className="max-w-[1000px] mx-auto p-6 space-y-5">
      {/* ===== DAILY HEALTH SUMMARY ===== */}
      <div className={card}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-[16px] font-bold text-ink">Today's Health Activity</h3>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[13px] font-bold">
            <Flame className="w-4 h-4" /> Activity Streak: {streak} day{streak === 1 ? '' : 's'}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ['Medicine', `${adh.taken}/${adh.total} taken`],
            ['Nutrition', mealsToday.length ? `${kcalToday} kcal logged` : 'Not logged'],
            ['Water', waterMl ? `${(waterMl / 1000).toFixed(1)}L` : '0 ml'],
            ['Walking', steps ? `${steps.toLocaleString()} steps` : '—'],
            ['Sleep', sleepToday?.hours ? `${Math.floor(sleepToday.hours)}h ${Math.round((sleepToday.hours % 1) * 60)}m` : '—'],
            ['Weight', currentWeight ? `${currentWeight.kg} kg` : '—'],
          ].map(([l, v]) => (
            <div key={l} className="border border-line rounded-[8px] bg-app p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{l}</p>
              <p className="mt-1 text-[13px] font-semibold text-ink">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== ACTIVITY STREAK ===== */}
      <div className={card}>
        <h4 className={h4}><Flame className="w-3.5 h-3.5 inline text-primary" /> Activity Streak</h4>
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-primary">{streak}</p>
            <p className="text-[11px] text-muted">current streak (days)</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-ink">{best}</p>
            <p className="text-[11px] text-muted">best streak</p>
          </div>
          <div>
            <p className={`text-[13px] font-semibold ${activeToday ? 'text-ok' : 'text-muted'}`}>
              {activeToday ? '✓ Today is active — keep it going!' : 'Today not logged yet — any health action keeps the streak alive.'}
            </p>
            <p className="text-[12px] text-muted mt-1">Last active: {lastActive ? fmtD(lastActive) : '—'}</p>
          </div>
          <div className="flex gap-1.5 ml-auto">
            {week.map((w) => (
              <div key={w.d} className="text-center">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${activeDaysSet.has(w.d) ? 'bg-primary text-on-navy' : 'bg-app border border-line text-muted'}`}>
                  {new Date(w.d).getDate()}
                </div>
                <p className="text-[9px] text-muted mt-1">{w.d.slice(8)}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-3">Streak counts days with real health actions: medicine taken, food, water, walking, sleep or weight logging.</p>
      </div>

      {/* ===== A. TODAY'S MEDICINES ===== */}
      <div className={card}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className={h4 + ' mb-0'}><Pill className="w-3.5 h-3.5 inline text-primary" /> Today's Medicines</h4>
          <p className="text-[12px] text-muted">Adherence today: <span className="font-bold text-ink">{adh.taken}/{adh.total}</span> ({adhPct}%) · This week: <span className="font-bold text-ink">{weekPct}%</span></p>
        </div>
        <div className="mt-4 space-y-3">
          {schedule.map(({ med, time, intake }) => (
            <div key={med.id} className="border border-line rounded-[8px] bg-app p-3.5 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <p className="text-[14px] font-semibold text-ink">{med.name} <span className="text-muted font-normal">· {med.dosage}</span></p>
                <p className="text-[12px] text-muted mt-0.5">
                  {time} · Prescribed by {med.prescribedBy || 'doctor'} · Start {fmtD(med.startDate)}{med.durationDays ? ` · ${med.durationDays} days` : ''}
                  {med.verified ? ' · ✓ Verified' : ''}
                </p>
              </div>
              {intake ? (
                <span className={`text-[12px] font-bold flex items-center gap-1.5 ${intake.status === 'taken' ? 'text-ok' : intake.status === 'missed' ? 'text-danger' : 'text-muted'}`}>
                  {intake.status === 'taken' ? <CheckCircle2 className="w-4 h-4" /> : intake.status === 'missed' ? <XCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                  {intake.status === 'taken' ? `Taken ${intake.takenAt ? new Date(intake.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}` : intake.status === 'missed' ? 'Missed' : 'Skipped'}
                </span>
              ) : (
                <div className="flex gap-2">
                  {(['taken', 'missed', 'skipped'] as const).map((s) => (
                    <button key={s} disabled={busy}
                      onClick={async () => { setBusy(true); try { await logMedIntake(uid, med.id, med.name, today, time, s); } finally { setBusy(false); } }}
                      className={`h-[32px] px-3 rounded-[6px] text-[12px] font-semibold border transition-colors disabled:opacity-60 ${s === 'taken' ? 'border-ok text-ok hover:bg-ok/10' : s === 'missed' ? 'border-danger text-danger hover:bg-danger-bg' : 'border-line text-muted hover:bg-app'}`}>
                      {s === 'taken' ? '✓ Taken' : s === 'missed' ? '✕ Missed' : '— Skipped'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {schedule.length === 0 && <p className="text-[13px] text-muted">No active medicines scheduled today.</p>}
        </div>
      </div>

      {/* ===== C/D/E/F/G grid: water, food, walk, sleep, weight ===== */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* WATER */}
        <div className={card}>
          <h4 className={h4}><GlassWater className="w-3.5 h-3.5 inline text-primary" /> Water / Hydration</h4>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-extrabold text-ink">{(waterMl / 1000).toFixed(2)}<span className="text-base text-muted">L</span></p>
            <p className="text-[12px] text-muted mb-1">of {(waterTarget / 1000).toFixed(1)}L target · {Math.round(waterMl / 250)} glasses</p>
          </div>
          <div className="mt-3 h-[8px] bg-app border border-line rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (waterMl / waterTarget) * 100)}%` }} />
          </div>
          <button disabled={busy}
            onClick={async () => { setBusy(true); try { await logActivity('water', { ml: 250, patientId: uid }); } finally { setBusy(false); } }}
            className="mt-4 h-[36px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-semibold hover:bg-primary-d inline-flex items-center gap-2 disabled:opacity-60">
            <Plus className="w-4 h-4" /> Add a glass (250 ml)
          </button>
        </div>

        {/* WALKING */}
        <div className={card}>
          <h4 className={h4}><Footprints className="w-3.5 h-3.5 inline text-primary" /> Walking / Activity</h4>
          <p className="text-[13px] text-ink">Today: <span className="font-bold">{steps.toLocaleString()} steps</span></p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input type="number" placeholder="Steps" value={walkForm.steps} onChange={(e) => setWalkForm({ ...walkForm, steps: e.target.value })} className={input} />
            <input type="number" placeholder="Minutes" value={walkForm.minutes} onChange={(e) => setWalkForm({ ...walkForm, minutes: e.target.value })} className={input} />
          </div>
          <button disabled={busy || !walkForm.steps}
            onClick={async () => { setBusy(true); try { await logActivity('walk', { patientId: uid, steps: Number(walkForm.steps), minutes: Number(walkForm.minutes) || 0 }); setWalkForm({ steps: '', minutes: '' }); } finally { setBusy(false); } }}
            className="mt-3 h-[36px] px-4 border border-primary text-primary rounded-[6px] text-[13px] font-semibold hover:bg-active inline-flex items-center gap-2 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Log activity
          </button>
          <p className="text-[11px] text-muted mt-2">Manual entry for now — ready for Apple Health / Health Connect integration later.</p>
        </div>

        {/* FOOD */}
        <div className={card}>
          <h4 className={h4}><Utensils className="w-3.5 h-3.5 inline text-primary" /> Food / Meals</h4>
          <div className="grid grid-cols-3 gap-2">
            <select value={wForm.meal} onChange={(e) => setWForm({ ...wForm, meal: e.target.value })} className={input}>
              {MEALS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input list="foodlist" placeholder="Food (e.g. rice)" value={wForm.food} onChange={(e) => setWForm({ ...wForm, food: e.target.value })} className={input} />
            <input type="number" placeholder="Grams" value={wForm.grams} onChange={(e) => setWForm({ ...wForm, grams: e.target.value })} className={input} />
          </div>
          <datalist id="foodlist">{Object.keys(FOOD_TABLE).map((f) => <option key={f} value={f} />)}</datalist>
          {est && (
            <p className="text-[11px] text-muted mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" /> Estimated: {est.kcal} kcal · P {est.protein}g · C {est.carbs}g · F {est.fat}g · Fiber {est.fiber}g (estimate, not medical advice)
            </p>
          )}
          <button disabled={busy || !wForm.food}
            onClick={async () => { setBusy(true); try { await logActivity('food', { patientId: uid, meal: wForm.meal, food: wForm.food, grams: Number(wForm.grams) || 100, ...estimateNutrition(wForm.food, Number(wForm.grams) || 100) }); setWForm({ ...wForm, food: '' }); } finally { setBusy(false); } }}
            className="mt-3 h-[36px] px-4 border border-primary text-primary rounded-[6px] text-[13px] font-semibold hover:bg-active inline-flex items-center gap-2 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Log food
          </button>
          {mealsToday.length > 0 && (
            <div className="mt-3 border-t border-line pt-2">
              <p className="text-[12px] font-semibold text-ink">Daily total ≈ {kcalToday} kcal from {mealsToday.length} item(s)</p>
              {mealsToday.slice(-4).map((e) => (
                <p key={e.id} className="text-[12px] text-muted mt-1">{e.meal}: {e.food} ({e.grams}g) ≈ {e.kcal} kcal</p>
              ))}
            </div>
          )}
        </div>

        {/* SLEEP */}
        <div className={card}>
          <h4 className={h4}><Moon className="w-3.5 h-3.5 inline text-primary" /> Sleep</h4>
          <p className="text-[13px] text-ink">{sleepToday?.hours ? `Last night: ${Math.floor(sleepToday.hours)}h ${Math.round((sleepToday.hours % 1) * 60)}m` : 'Not logged for today'}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div><label className="text-[11px] text-muted">Sleep at</label><input type="time" value={sleepForm.bed} onChange={(e) => setSleepForm({ ...sleepForm, bed: e.target.value })} className={input} /></div>
            <div><label className="text-[11px] text-muted">Woke at</label><input type="time" value={sleepForm.wake} onChange={(e) => setSleepForm({ ...sleepForm, wake: e.target.value })} className={input} /></div>
          </div>
          <button disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const [bh, bm] = sleepForm.bed.split(':').map(Number);
                const [wh, wm] = sleepForm.wake.split(':').map(Number);
                let mins = wh * 60 + wm - (bh * 60 + bm);
                if (mins <= 0) mins += 1440;
                await logActivity('sleep', { patientId: uid, bed: sleepForm.bed, wake: sleepForm.wake, hours: Math.round((mins / 60) * 10) / 10 });
              } finally { setBusy(false); }
            }}
            className="mt-3 h-[36px] px-4 border border-primary text-primary rounded-[6px] text-[13px] font-semibold hover:bg-active inline-flex items-center gap-2 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Log sleep
          </button>
        </div>

        {/* WEIGHT */}
        <div className={card + ' lg:col-span-2'}>
          <h4 className={h4}><Scale className="w-3.5 h-3.5 inline text-primary" /> Weight</h4>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-3xl font-extrabold text-ink">{currentWeight ? `${currentWeight.kg} kg` : '—'}</p>
              {weightChange !== 0 && prevWeight && (
                <p className={`text-[12px] font-semibold flex items-center gap-1 ${weightChange > 0 ? 'text-danger' : 'text-ok'}`}>
                  {weightChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />} {weightChange > 0 ? '+' : ''}{weightChange} kg since last entry
                </p>
              )}
            </div>
            <input type="number" step="0.1" placeholder="Today's weight (kg)" value={kgForm} onChange={(e) => setKgForm(e.target.value)} className={input + ' max-w-[220px]'} />
            <button disabled={busy || !kgForm}
              onClick={async () => { setBusy(true); try { await logActivity('weight', { patientId: uid, kg: Number(kgForm) }); setKgForm(''); } finally { setBusy(false); } }}
              className="h-[38px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-semibold hover:bg-primary-d disabled:opacity-50">
              Save
            </button>
            {weightLogs.length > 0 && (
              <div className="text-[12px] text-muted">
                History: {weightLogs.slice(-5).reverse().map((w) => `${w.date.slice(5)} — ${w.kg}kg`).join(' · ')}
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted mt-2 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> BMI (if height is on file) is a general metric only — not a diagnosis.</p>
        </div>
      </div>
    </div>
  );
}

/** Compact streak summary for the Patient Dashboard. */
export function ActivityStreakCard({ me }: { me: MhdUser }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  useEffect(() => { return bindActivity(me.id, setEntries); }, [me.id]);
  const streak = currentStreak(entries);
  const best = bestStreak(entries);
  const today = todayStr();
  const activeToday = entries.some((e) => e.date === today && (e.type !== 'med' || e.status === 'taken'));
  return (
    <button className="w-full flex items-center justify-between bg-surface border border-line rounded-[4px] p-5 shadow-sm hover:border-primary transition-colors text-left">
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Flame className="w-5 h-5" /></span>
        <div>
          <p className="text-[14px] font-bold text-ink">Activity Streak: {streak} day{streak === 1 ? '' : 's'}</p>
          <p className="text-[12px] text-muted">{activeToday ? 'Today is logged — well done!' : 'Log any health activity today to continue the streak.'} · Best: {best} days</p>
        </div>
      </div>
      <span className="text-[12px] font-semibold text-primary">View Activity →</span>
    </button>
  );
}

