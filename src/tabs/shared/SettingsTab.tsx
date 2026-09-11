import { useEffect, useRef, useState } from 'react';
import { UserCircle, Save, Trash2, Loader2 } from 'lucide-react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';
import MicButton from '../../components/MicButton';
import { toast } from '../../components/Toaster';
import { LANGS, setLanguage, curLang } from '../../lib/i18n';
import { applyFont, applyTheme, getFont, getTheme } from '../../lib/prefs';
import { maskAadhaar } from '../../lib/format';
import { cropPhoto } from '../../lib/media';
import type { MhdUser } from '../../lib/types';

const inputCls = 'w-full bg-app border border-line rounded-[4px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary';
const labelCls = 'block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5';

/** Profile & Settings — ported from the original pg-settings (all roles). */
export default function SettingsTab({ me, onSaved }: { me: MhdUser; onSaved?: (u: MhdUser) => void }) {
  const [f, setF] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<string | undefined>(me.photo);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const src: Record<string, string> = {};
    ['name', 'phone', 'address', 'emergencyName', 'emergencyPhone', 'heightCm', 'weightKg', 'allergies', 'conditions', 'surgeries', 'accidents', 'familyHistory', 'specialization', 'experience', 'hospital', 'adminName'].forEach((k) => {
      if (me[k] != null) src[k] = String(me[k]);
    });
    setF(src);
    setPhoto(me.photo);
  }, [me]);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const data = await cropPhoto(file);
      setPhoto(data);
      toast('Photo ready — tap Save Changes');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read image', 'err');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const update: Record<string, unknown> = { ...f, photo: photo ?? deleteField() };
      await updateDoc(doc(db, 'users', me.id), update);
      // offline emergency card (same as original)
      if (me.role === 'patient') {
        try { localStorage.setItem('mhd_emergency', JSON.stringify({ ...me, ...f, photo })); } catch { /* ignore */ }
      }
      toast('Profile saved');
      onSaved?.({ ...me, ...f, photo });
    } catch (e) {
      toast('Could not save profile', 'err');
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = () => { setPhoto(undefined); toast('Photo removed — tap Save Changes'); };

  const roleLabel = me.role === 'patient' ? 'Patient' : me.role === 'doctor' ? 'Doctor' : 'Hospital Admin';

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-[22px] font-semibold text-heading mb-1">Profile &amp; Settings</h2>
        <p className="text-[14px] text-muted">Manage your account, photo and preferences.</p>
      </div>

      <div className="bg-surface border border-line rounded-[4px] p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          {photo ? (
            <img src={photo} alt="avatar" className="w-[72px] h-[72px] rounded-full object-cover border border-line" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-active flex items-center justify-center">
              <UserCircle className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="text-[13px] font-medium text-primary border border-primary px-4 py-2 rounded-[4px] hover:bg-active transition-colors">Upload Photo</button>
            {photo && <button onClick={removePhoto} className="text-[13px] font-medium text-danger border border-danger-bd px-4 py-2 rounded-[4px] hover:bg-danger-bg transition-colors flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Name</label>
            <div className="flex gap-2"><input value={f.name || ''} onChange={(e) => set('name', e.target.value)} className={inputCls} /><MicButton onText={(t) => set('name', (f.name || '') + ' ' + t)} /></div>
          </div>
          <div><label className={labelCls}>Phone</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>

          {me.role === 'patient' && (<>
            <div><label className={labelCls}>Address</label>
              <div className="flex gap-2"><textarea rows={2} value={f.address || ''} onChange={(e) => set('address', e.target.value)} className={inputCls + ' h-auto py-2'} /><MicButton onText={(t) => set('address', (f.address || '') + ' ' + t)} /></div>
            </div>
            <div><label className={labelCls}>Date of Birth (fixed)</label><input disabled value={me.dob || ''} className={inputCls + ' opacity-60'} /></div>
            <div><label className={labelCls}>Health ID (fixed)</label><input disabled value={me.healthId || ''} className={inputCls + ' opacity-60 font-mono'} /></div>
            <div><label className={labelCls}>Aadhaar (fixed)</label><input disabled value={maskAadhaar(me.aadhaar)} className={inputCls + ' opacity-60'} /></div>
            <div><label className={labelCls}>Emergency Contact Name</label><input value={f.emergencyName || ''} onChange={(e) => set('emergencyName', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Emergency Contact Phone</label><input value={f.emergencyPhone || ''} onChange={(e) => set('emergencyPhone', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Height (cm)</label><input value={f.heightCm || ''} onChange={(e) => set('heightCm', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Weight (kg)</label><input value={f.weightKg || ''} onChange={(e) => set('weightKg', e.target.value)} className={inputCls} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Allergies</label>
              <div className="flex gap-2"><textarea rows={2} value={f.allergies || ''} onChange={(e) => set('allergies', e.target.value)} className={inputCls + ' h-auto py-2'} /><MicButton onText={(t) => set('allergies', (f.allergies || '') + ' ' + t)} /></div>
            </div>
            <div className="sm:col-span-2"><label className={labelCls}>Existing Conditions</label>
              <div className="flex gap-2"><textarea rows={2} value={f.conditions || ''} onChange={(e) => set('conditions', e.target.value)} className={inputCls + ' h-auto py-2'} /><MicButton onText={(t) => set('conditions', (f.conditions || '') + ' ' + t)} /></div>
            </div>
            <div className="sm:col-span-2"><label className={labelCls}>Previous Surgeries</label>
              <div className="flex gap-2"><textarea rows={2} value={f.surgeries || ''} onChange={(e) => set('surgeries', e.target.value)} className={inputCls + ' h-auto py-2'} /><MicButton onText={(t) => set('surgeries', (f.surgeries || '') + ' ' + t)} /></div>
            </div>
            <div className="sm:col-span-2"><label className={labelCls}>Accidents</label><textarea rows={2} value={f.accidents || ''} onChange={(e) => set('accidents', e.target.value)} className={inputCls + ' h-auto py-2'} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Family History</label><textarea rows={2} value={f.familyHistory || ''} onChange={(e) => set('familyHistory', e.target.value)} className={inputCls + ' h-auto py-2'} /></div>
          </>)}

          {me.role === 'doctor' && (<>
            <div><label className={labelCls}>Specialization</label><input value={f.specialization || ''} onChange={(e) => set('specialization', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Experience (years)</label><input value={f.experience || ''} onChange={(e) => set('experience', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Hospital</label><input value={f.hospital || ''} onChange={(e) => set('hospital', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Reg No (fixed)</label><input disabled value={me.regNo || ''} className={inputCls + ' opacity-60 font-mono'} /></div>
          </>)}

          {me.role === 'hospital' && (<>
            <div><label className={labelCls}>Admin Name</label><input value={f.adminName || ''} onChange={(e) => set('adminName', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>License No (fixed)</label><input disabled value={me.licenseNo || ''} className={inputCls + ' opacity-60 font-mono'} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Address</label><textarea rows={2} value={f.address || ''} onChange={(e) => set('address', e.target.value)} className={inputCls + ' h-auto py-2'} /></div>
          </>)}

          <div><label className={labelCls}>Email (fixed)</label><input disabled value={me.email || ''} className={inputCls + ' opacity-60'} /></div>
          <div><label className={labelCls}>Role</label><input disabled value={roleLabel} className={inputCls + ' opacity-60'} /></div>
        </div>

        <button onClick={save} disabled={saving} className="mt-5 h-[40px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors flex items-center gap-2 disabled:opacity-70">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
      </div>

      <div className="bg-surface border border-line rounded-[4px] p-5 shadow-sm space-y-4">
        <h4 className="text-[13px] font-bold text-ink uppercase tracking-wider">Preferences</h4>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Language</label>
            <select value={curLang()} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
              {LANGS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Theme</label>
            <select value={getTheme()} onChange={(e) => applyTheme(e.target.value as 'light' | 'dark' | 'pink')} className={inputCls}>
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
              <option value="pink">Pink Mode</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Text Size</label>
            <div className="flex gap-2">
              {(['sm', 'md', 'lg'] as const).map((v) => (
                <button key={v} onClick={() => applyFont(v)} className={`flex-1 h-[36px] rounded-[4px] border text-[13px] transition-colors ${getFont() === v ? 'border-primary bg-active text-primary font-semibold' : 'border-line text-muted hover:bg-app'}`}>
                  {v === 'sm' ? 'A−' : v === 'md' ? 'A' : 'A+'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
