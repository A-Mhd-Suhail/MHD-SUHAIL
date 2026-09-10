import React, { useState } from 'react';
import { User, Stethoscope, Shield, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import {
  auth, db,
} from './firebase';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  setPersistence, browserLocalPersistence, browserSessionPersistence, signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

import PatientDashboard from './PatientDashboard';
import DoctorDashboard from './DoctorDashboard';
import AdminDashboard from './AdminDashboard';
import MicButton from './components/MicButton';
import { LangSelect, ThemeSelect } from './components/Controls';
import { toast } from './components/Toaster';
import { uid6, errMsg } from './lib/format';
import { curLang } from './lib/i18n';
import type { Role } from './lib/types';

type PortalType = Role; // 'patient' | 'doctor' | 'hospital'

/* ---------- Demo accounts (identical to the original app) ---------- */
const DEMO_PASS = 'demo123';
const DEMO: Record<PortalType, { email: string; profile: Record<string, unknown> }> = {
  patient: {
    email: 'patient.demo@mhdhospital.in',
    profile: { role: 'patient', name: 'Arjun Kumar', dob: '1980-03-14', gender: 'Male', bloodGroup: 'O+', phone: '9840012345', aadhaar: '432187651122', address: '12, Gandhi Street, Anna Nagar, Chennai 600040', emergencyName: 'Priya Kumar (Wife)', emergencyPhone: '9840055555', heightCm: '170', weightKg: '74', allergies: 'Penicillin (medicine allergy), Dust (other)', conditions: 'Type 2 Diabetes (2021), Hypertension (2022)', surgeries: 'Appendectomy | 2019 | Apollo Hospitals | Dr. Rajan | Appendicitis\nKnee Arthroscopy | 2022 | Kauvery Hospital | Dr. Menon | Meniscus tear', accidents: 'Two-wheeler accident 2016 — right arm fracture', familyHistory: 'Father — Diabetes; Grandmother — Hypertension', income: '240000', language: 'en', healthId: 'MHD-DEMO01' },
  },
  doctor: {
    email: 'doctor.demo@mhdhospital.in',
    profile: { role: 'doctor', name: 'Arun Kumar', specialization: 'General Surgery', experience: '12', hospital: 'MHD Hospital', regNo: 'TMC-45892', phone: '9840077777', onDuty: false },
  },
  hospital: {
    email: 'hospital.demo@mhdhospital.in',
    profile: { role: 'hospital', name: 'MHD Hospital', adminName: 'Admin Demo', phone: '9840088888', address: '1, Hospital Road, Chennai', licenseNo: 'TN-HOSP-1024' },
  },
};

const Logo = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0L30 8V24L16 32L2 24V8L16 0ZM16 4.6L6 10.4V21.6L16 27.4L26 21.6V10.4L16 4.6Z" />
    <rect x="12" y="12" width="8" height="8" />
  </svg>
);

const inputCls = 'w-full h-[40px] border border-line rounded-[4px] px-3 text-[14px] text-ink bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors';
const labelCls = 'block text-[13px] font-medium text-ink mb-1';

export default function App() {
  const [portal, setPortal] = useState<PortalType | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loggedIn, setLoggedIn] = useState<PortalType | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Registration fields (MHD patient form is the full medical intake)
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const clearForm = () => { setEmail(''); setPassword(''); setF({}); setAuthError(''); };

  const selectPortal = (type: PortalType | null, registering: boolean) => {
    setPortal(type);
    setIsRegistering(registering);
    clearForm();
  };

  /* ---------- auth handlers ---------- */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) { setAuthError('Please fill in all required fields.'); return; }
    if (!portal) return;
    setAuthLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Role comes from the users doc (same as the original app)
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        throw new Error('Profile missing. Please register again or contact support.');
      }
      const role = snap.data().role as PortalType;
      if (role !== portal) {
        await signOut(auth);
        throw new Error(`This account is registered as a ${role === 'hospital' ? 'Hospital Admin' : role}. Please use the ${role === 'hospital' ? 'Hospital Admin' : role} Portal.`);
      }
      setLoggedIn(portal);
    } catch (error) {
      setAuthError(errMsg(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) { toast('Enter your email above first, then tap Forgot password.', 'info'); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast('Password reset email sent ✅');
    } catch (error) {
      toast(errMsg(error), 'err');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!portal) return;
    const passOk = f.password && f.password.length >= 6;
    if (!passOk) { setAuthError('Password must be at least 6 characters.'); return; }
    if (portal === 'patient') {
      if (!f.name || !f.dob || !f.phone) { setAuthError('Please fill in all required fields.'); return; }
      const aad = (f.aadhaar || '').replace(/\D/g, '');
      if (aad.length !== 12) { setAuthError('Aadhaar number must be exactly 12 digits.'); return; }
    }
    if (portal === 'doctor' && (!f.name || !f.specialization || !f.regNo)) { setAuthError('Please fill in all required fields.'); return; }
    if (portal === 'hospital' && (!f.name || !f.adminName)) { setAuthError('Please fill in all required fields.'); return; }
    setAuthLoading(true);
    try {
      const emailToUse = (f.email || email).trim();
      const cred = await createUserWithEmailAndPassword(auth, emailToUse, f.password);
      try {
        const profile: Record<string, unknown> = {
          role: portal,
          email: emailToUse,
          language: curLang(),
          createdAt: Date.now(),
        };
        if (portal === 'patient') {
          Object.assign(profile, {
            name: f.name, dob: f.dob, gender: f.gender || 'Male', bloodGroup: f.bloodGroup || '',
            phone: f.phone, aadhaar: (f.aadhaar || '').replace(/\D/g, ''), address: f.address || '',
            emergencyName: f.emergencyName || '', emergencyPhone: f.emergencyPhone || '',
            heightCm: f.heightCm || '', weightKg: f.weightKg || '', allergies: f.allergies || '',
            conditions: f.conditions || '', surgeries: f.surgeries || '', accidents: f.accidents || '',
            familyHistory: f.familyHistory || '', income: f.income || '',
            healthId: 'MHD-' + uid6(),
          });
        } else if (portal === 'doctor') {
          Object.assign(profile, {
            name: f.name, specialization: f.specialization, experience: f.experience || '',
            hospital: f.hospital || 'MHD Hospital', regNo: f.regNo, phone: f.phone || '', onDuty: false,
          });
        } else {
          Object.assign(profile, {
            name: f.name, adminName: f.adminName, phone: f.phone || '',
            address: f.address || '', licenseNo: f.licenseNo || '',
          });
        }
        await setDoc(doc(db, 'users', cred.user.uid), profile);
        setLoggedIn(portal);
      } catch (dbError) {
        await auth.currentUser?.delete();
        throw dbError;
      }
    } catch (error) {
      setAuthError(errMsg(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const quickDemo = async (role: PortalType) => {
    const d = DEMO[role];
    if (!d) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, d.email, DEMO_PASS);
      setLoggedIn(role);
    } catch {
      // First use — create the demo account (same as the original quickDemo)
      try {
        const cred = await createUserWithEmailAndPassword(auth, d.email, DEMO_PASS);
        await setDoc(doc(db, 'users', cred.user.uid), { ...d.profile, email: d.email, createdAt: Date.now() });
        if (role === 'patient') {
          const { addDoc, collection } = await import('firebase/firestore');
          await addDoc(collection(db, 'medicines'), {
            patientId: cred.user.uid, name: 'Metformin 500mg', dosage: '1 tablet after breakfast',
            startDate: new Date().toISOString().slice(0, 10), durationDays: '30',
            prescribedBy: 'Arjun Kumar (self-reported)', verified: false, source: 'patient',
            active: true, createdAt: Date.now(),
          });
        }
        setLoggedIn(role);
      } catch (e2) {
        setAuthError(errMsg(e2));
      }
    }
    setAuthLoading(false);
  };

  if (loggedIn) {
    if (loggedIn === 'patient') return <PatientDashboard onLogout={() => setLoggedIn(null)} />;
    if (loggedIn === 'doctor') return <DoctorDashboard onLogout={() => setLoggedIn(null)} />;
    return <AdminDashboard onLogout={() => setLoggedIn(null)} />;
  }

  const portalCopy: Record<PortalType, { icon: React.ReactNode; title: string; desc: string }> = {
    patient: { icon: <User className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'PATIENT PORTAL', desc: 'Access your medical records, medicines, appointments and care plan.' },
    doctor: { icon: <Stethoscope className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'DOCTOR PORTAL', desc: 'Review cases, enter vitals, verify medicines and consult patients.' },
    hospital: { icon: <Shield className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'HOSPITAL ADMIN PORTAL', desc: 'Manage patients, doctors, documents, billing and hospital operations.' },
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden w-full flex flex-col lg:flex-row font-sans text-ink bg-app box-border">
      {/* LEFT PANEL - BRANDING */}
      <div className="lg:w-[42%] bg-navy text-white flex flex-col justify-between p-10">
        <div>
          <div className="flex items-center gap-4 mb-8">
            <Logo className="w-10 h-10 text-white" />
            <div>
              <h1 className="text-[24px] font-bold tracking-wide leading-none mb-1">MHD HOSPITAL</h1>
              <p className="text-[10px] text-on-navy-muted uppercase tracking-wider font-semibold">
                My Health Defense Hospital 24×7
              </p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-[28px] lg:text-[32px] font-light leading-tight mb-8">
              One Patient.<br />One Medical Journey.
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-5 h-5 text-on-navy-muted" strokeWidth={1.5} />
                <span className="text-[15px] font-medium text-white">24×7 Healthcare Access</span>
              </div>
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-5 h-5 text-on-navy-muted" strokeWidth={1.5} />
                <span className="text-[15px] font-medium text-white">Secure Health Records</span>
              </div>
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-5 h-5 text-on-navy-muted" strokeWidth={1.5} />
                <span className="text-[15px] font-medium text-white">MHD Integrated Care</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-[12px] text-on-navy-muted mb-1 opacity-80">One Patient. One Medical Journey.</p>
          <p className="text-[12px] font-semibold text-white">IN COLLABORATION WITH UNITED NATIONS SUSTAINABLE DEVELOPMENT</p>
        </div>
      </div>

      {/* RIGHT PANEL - AUTHENTICATION */}
      <div className="lg:w-[58%] flex flex-col h-full lg:overflow-y-auto">
        {/* Header */}
        <header className="flex justify-end items-center p-6 lg:pb-4 gap-3">
          <LangSelect />
          <ThemeSelect />
        </header>

        <main className="flex-1 flex flex-col justify-center items-center p-6 lg:pt-0 lg:pb-8">
          <div className="w-full max-w-[640px]">
            {portal === null ? (
              <>
                <div className="mb-5">
                  <h2 className="text-[24px] md:text-[28px] font-semibold text-ink mb-1">
                    Welcome to MHD Hospital
                  </h2>
                  <p className="text-[14px] text-muted">Secure access to your healthcare services.</p>
                </div>
                <div className="space-y-3">
                  {(Object.keys(portalCopy) as PortalType[]).map((p) => (
                    <div key={p} className="bg-surface border border-line rounded-[4px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-colors hover:border-primary-d">
                      <div className="flex items-start sm:items-center gap-4 flex-1">
                        {portalCopy[p].icon}
                        <div>
                          <h3 className="text-[15px] font-semibold text-ink mb-1">{portalCopy[p].title}</h3>
                          <p className="text-[13px] text-muted leading-relaxed pr-2">{portalCopy[p].desc}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 w-full sm:w-[160px]">
                        <button onClick={() => selectPortal(p, false)} className="h-[40px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium transition-colors hover:bg-primary-d w-full">
                          Sign in as {p === 'hospital' ? 'Hospital Admin' : p}
                        </button>
                        <button onClick={() => selectPortal(p, true)} className="h-[40px] px-4 bg-surface border border-line text-ink rounded-[6px] text-[13px] font-medium transition-colors hover:bg-app w-full">
                          Create new account
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Demo accounts (created automatically on first use, as in the original) */}
                <div className="mt-6 pt-4 border-t border-line">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                    → Demo accounts
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => quickDemo('patient')} disabled={authLoading} className="h-[32px] px-3 bg-transparent border border-line text-muted text-[12px] font-medium rounded-[4px] hover:bg-surface hover:text-ink transition-colors disabled:opacity-60">
                      Patient Demo
                    </button>
                    <button type="button" onClick={() => quickDemo('doctor')} disabled={authLoading} className="h-[32px] px-3 bg-transparent border border-line text-muted text-[12px] font-medium rounded-[4px] hover:bg-surface hover:text-ink transition-colors disabled:opacity-60">
                      Doctor Demo
                    </button>
                    <button type="button" onClick={() => quickDemo('hospital')} disabled={authLoading} className="h-[32px] px-3 bg-transparent border border-line text-muted text-[12px] font-medium rounded-[4px] hover:bg-surface hover:text-ink transition-colors disabled:opacity-60">
                      Hospital Demo
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-2">Quick demo accounts — created automatically on first use. Password: demo123</p>
                </div>
              </>
            ) : (
              <div>
                <button
                  onClick={() => selectPortal(null, false)}
                  className="flex items-center text-[13px] font-medium text-muted hover:text-ink mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to portal selection
                </button>

                {authError && (
                  <div className="mb-4 p-3 bg-danger-bg border border-danger-bd text-danger text-[13px] rounded-[4px]">
                    {authError}
                  </div>
                )}

                {!isRegistering ? (
                  /* ---------- LOGIN ---------- */
                  <form onSubmit={handleLogin} className="bg-surface border border-line rounded-[4px] p-5 lg:p-6 lg:py-5">
                    <h3 className="text-[18px] font-semibold text-ink mb-1">
                      {portal === 'patient' && 'Patient Sign In'}
                      {portal === 'doctor' && 'Doctor Sign In'}
                      {portal === 'hospital' && 'Hospital Admin Sign In'}
                    </h3>
                    <p className="text-[13px] text-muted mb-4 border-b border-line pb-3">Login to continue to your health portal</p>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>Email address</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="Enter your email address" />
                      </div>
                      <div>
                        <label className={labelCls}>Password</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Enter your password" />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-[13px] text-muted cursor-pointer">
                          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded-[2px] border-line" />
                          Remember me
                        </label>
                        <button type="button" onClick={handleForgot} className="text-[13px] font-medium text-primary hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <div className="pt-2">
                        <button type="submit" disabled={authLoading} className="w-full h-[44px] bg-primary text-on-navy rounded-[6px] text-[14px] font-medium hover:bg-primary-d transition-colors flex items-center justify-center disabled:opacity-80">
                          {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                        </button>
                      </div>
                      <div className="pt-3 text-center">
                        <button type="button" onClick={() => { setIsRegistering(true); setAuthError(''); }} className="text-[13px] font-medium text-primary hover:underline transition-colors">
                          Don&apos;t have an account? Create an account
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* ---------- REGISTER ---------- */
                  <form onSubmit={handleRegister} className="bg-surface border border-line rounded-[4px] p-5 lg:p-6 lg:py-5">
                    <h3 className="text-[18px] font-semibold text-ink mb-4 border-b border-line pb-3">
                      {portal === 'patient' && 'Create Patient Account'}
                      {portal === 'doctor' && 'Register as Doctor'}
                      {portal === 'hospital' && 'Register Hospital'}
                    </h3>
                    <div className="space-y-3">
                      {portal === 'patient' && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FieldWithMic label="Full Name *" value={f.name || ''} onChange={(v) => set('name', v)} required />
                            <div>
                              <label className={labelCls}>Date of Birth *</label>
                              <input type="date" required value={f.dob || ''} onChange={(e) => set('dob', e.target.value)} className={inputCls} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>Gender *</label>
                              <select value={f.gender || 'Male'} onChange={(e) => set('gender', e.target.value)} className={inputCls}>
                                <option>Male</option><option>Female</option><option>Other</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Blood Group</label>
                              <select value={f.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)} className={inputCls}>
                                <option value="">Select</option>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>Phone *</label>
                              <input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}>Aadhaar Number *</label>
                              <input value={f.aadhaar || ''} onChange={(e) => set('aadhaar', e.target.value)} className={inputCls} placeholder="12-digit" maxLength={12} />
                            </div>
                          </div>
                          <FieldWithMic label="Address" textarea value={f.address || ''} onChange={(v) => set('address', v)} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Emergency Contact Name</label><input value={f.emergencyName || ''} onChange={(e) => set('emergencyName', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Emergency Contact Phone</label><input value={f.emergencyPhone || ''} onChange={(e) => set('emergencyPhone', e.target.value)} className={inputCls} /></div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Height (cm)</label><input type="number" value={f.heightCm || ''} onChange={(e) => set('heightCm', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Weight (kg)</label><input type="number" value={f.weightKg || ''} onChange={(e) => set('weightKg', e.target.value)} className={inputCls} /></div>
                          </div>
                          <FieldWithMic label="⚠️ Allergies" textarea placeholder="e.g. Penicillin (medicine), Dust (other)" value={f.allergies || ''} onChange={(v) => set('allergies', v)} />
                          <FieldWithMic label="🏥 Existing Conditions" textarea placeholder="e.g. Diabetes (2021), BP (2022)" value={f.conditions || ''} onChange={(v) => set('conditions', v)} />
                          <FieldWithMic label="🔪 Previous Surgeries" textarea placeholder="Surgery | Year | Hospital | Doctor (one per line)" value={f.surgeries || ''} onChange={(v) => set('surgeries', v)} />
                          <FieldWithMic label="🚗 Accidents?" textarea value={f.accidents || ''} onChange={(v) => set('accidents', v)} />
                          <FieldWithMic label="👨‍👩‍👦 Family History" textarea value={f.familyHistory || ''} onChange={(v) => set('familyHistory', v)} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Annual Income (₹)</label><input type="number" value={f.income || ''} onChange={(e) => set('income', e.target.value)} className={inputCls} /></div>
                            <div>
                              <label className={labelCls}>Language</label>
                              <select value={f.rpLang || 'English'} onChange={(e) => set('rpLang', e.target.value)} className={inputCls}>
                                <option>English</option><option>Hindi</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                      {portal === 'doctor' && (
                        <>
                          <FieldWithMic label="Doctor Name *" value={f.name || ''} onChange={(v) => set('name', v)} required />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Specialization *</label><input value={f.specialization || ''} onChange={(e) => set('specialization', e.target.value)} className={inputCls} placeholder="e.g. General Surgery" /></div>
                            <div><label className={labelCls}>Experience (years)</label><input type="number" value={f.experience || ''} onChange={(e) => set('experience', e.target.value)} className={inputCls} /></div>
                          </div>
                          <div><label className={labelCls}>Hospital *</label><input value={f.hospital || ''} onChange={(e) => set('hospital', e.target.value)} className={inputCls} /></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Medical Reg No *</label><input value={f.regNo || ''} onChange={(e) => set('regNo', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Phone</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>
                          </div>
                        </>
                      )}
                      {portal === 'hospital' && (
                        <>
                          <div><label className={labelCls}>Hospital Name *</label><input value={f.name || ''} onChange={(e) => set('name', e.target.value)} className={inputCls} /></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Admin Name *</label><input value={f.adminName || ''} onChange={(e) => set('adminName', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Phone</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>
                          </div>
                          <div><label className={labelCls}>Address</label><textarea rows={2} value={f.address || ''} onChange={(e) => set('address', e.target.value)} className={inputCls + ' h-auto py-2'} /></div>
                          <div><label className={labelCls}>License No</label><input value={f.licenseNo || ''} onChange={(e) => set('licenseNo', e.target.value)} className={inputCls} /></div>
                        </>
                      )}

                      <div>
                        <label className={labelCls}>Email *</label>
                        <input type="email" required value={f.email || ''} onChange={(e) => set('email', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Password *</label>
                        <input type="password" required value={f.password || ''} onChange={(e) => set('password', e.target.value)} className={inputCls} placeholder="min 6 characters" />
                      </div>

                      <div className="pt-2 flex gap-3">
                        <button type="submit" disabled={authLoading} className="flex-1 h-[44px] bg-primary text-on-navy rounded-[6px] text-[14px] font-medium hover:bg-primary-d transition-colors flex items-center justify-center disabled:opacity-80">
                          {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            portal === 'patient' ? 'Create Health ID 🆔' : portal === 'doctor' ? 'Register as Doctor' : 'Register Hospital'
                          )}
                        </button>
                      </div>
                      <div className="pt-3 text-center">
                        <button type="button" onClick={() => { setIsRegistering(false); setAuthError(''); }} className="text-[13px] font-medium text-primary hover:underline transition-colors">
                          Already have an account? Sign in
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="p-4 lg:p-6 lg:py-4 text-[12px] text-muted flex flex-wrap justify-between items-center gap-4 mt-auto border-t border-line">
          <p>© {new Date().getFullYear()} MHD Hospital</p>
          <p className="text-[12px] text-muted">My Health Defense Hospital 24×7 &nbsp;•&nbsp; In Collaboration With United Nations Sustainable Development</p>
        </footer>
      </div>
    </div>
  );
}

/* Small helpers for the registration forms */
function FieldWithMic({
  label, value, onChange, textarea, placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  textarea?: boolean; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-2">
        {textarea ? (
          <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={inputCls + ' h-auto py-2'} />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={inputCls} />
        )}
        <MicButton onText={(t) => onChange(value ? value + ' ' + t : t)} />
      </div>
    </div>
  );
}
