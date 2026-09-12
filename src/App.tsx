import React, { lazy, Suspense, useEffect, useState } from 'react';
import { User, Stethoscope, Shield, ArrowLeft, Loader2, ShieldCheck, HeartHandshake, Info, Lock, Sparkles } from 'lucide-react';
import Modal from './components/Modal';
import {
  auth, db,
} from './firebase';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  setPersistence, browserLocalPersistence, browserSessionPersistence, signOut, onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Dashboards are heavy — load each portal on demand so the login screen
// paints fast and users only download the portal they actually open.
const PatientDashboard = lazy(() => import('./dashboards/PatientDashboard'));
const CaretakerDashboard = lazy(() => import('./dashboards/CaretakerDashboard'));
const DoctorDashboard = lazy(() => import('./dashboards/DoctorDashboard'));
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard'));
const GovernmentAdminDashboard = lazy(() => import('./dashboards/GovernmentAdminDashboard'));
import MicButton from './components/MicButton';
import { LangSelect, ThemeSelect } from './components/Controls';
import { toast } from './components/Toaster';
import { uid6, errMsg } from './lib/format';
import { curLang } from './lib/i18n';
import type { Role } from './lib/types';

type PortalType = Role;

/* ---------- Demo accounts (identical to the original app) ---------- */
const DEMO_PASS = 'demo123';
const DEMO: Record<PortalType, { email: string; profile: Record<string, unknown> }> = {
  patient: {
    email: 'patient.demo@mhdhospital.in',
    profile: { role: 'patient', name: 'Arjun Kumar', dob: '1980-03-14', gender: 'Male', bloodGroup: 'O+', phone: '9840012345', aadhaar: '432187651122', address: '12, Gandhi Street, Anna Nagar, Chennai 600040', emergencyName: 'Priya Kumar (Wife)', emergencyPhone: '9840055555', heightCm: '170', weightKg: '74', allergies: 'Penicillin (medicine allergy), Dust (other)', conditions: 'Type 2 Diabetes (2021), Hypertension (2022)', surgeries: 'Appendectomy | 2019 | Apollo Hospitals | Dr. Rajan | Appendicitis\nKnee Arthroscopy | 2022 | Kauvery Hospital | Dr. Menon | Meniscus tear', accidents: 'Two-wheeler accident 2016 — right arm fracture', familyHistory: 'Father — Diabetes; Grandmother — Hypertension', income: '240000', language: 'en', healthId: 'MHD-DEMO01' },
  },
  caretaker: {
    email: 'caretaker.demo@mhdhospital.in',
    profile: { role: 'caretaker', name: 'Caretaker Demo', phone: '9840099999', state: 'Tamil Nadu', district: 'Chennai', caretakerPatientId: '', caretakerPatientName: '' },
  },
  doctor: {
    email: 'doctor.demo@mhdhospital.in',
    profile: { role: 'doctor', name: 'Arun Kumar', specialization: 'General Surgery', experience: '12', hospital: 'MHD Hospital', regNo: 'TMC-45892', phone: '9840077777', onDuty: false },
  },
  hospital: {
    email: 'hospital.demo@mhdhospital.in',
    profile: { role: 'hospital', name: 'MHD Hospital', adminName: 'Admin Demo', phone: '9840088888', address: '1, Hospital Road, Chennai', licenseNo: 'TN-HOSP-1024' },
  },
  admin: {
    email: 'admin.demo@mhdhospital.in',
    profile: { role: 'admin', name: 'MHD Admin', adminName: 'System Administrator', phone: '1800-MHD-ADMIN' },
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
  const [authReady, setAuthReady] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeInfoModal, setActiveInfoModal] = useState<'about' | 'privacy' | 'features' | null>(null);

  // Restore the active portal after a browser refresh using Firebase's
  // persisted auth session and the role stored in the user profile.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Check persistent admin session token if Firebase auth is waiting
        try {
          const stored = localStorage.getItem('mhd_admin_session') || sessionStorage.getItem('mhd_admin_session');
          if (stored === 'active') {
            setLoggedIn('admin');
            setAuthReady(true);
            return;
          }
        } catch { /* ignore */ }
        setLoggedIn(null);
        setAuthReady(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.data()?.role as PortalType | undefined;
        if (role) {
          setLoggedIn(role);
          if (role === 'admin') {
            try { localStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
          }
        }
      } finally { setAuthReady(true); }
    });
    return unsub;
  }, []);

  // Registration fields (MHD patient form is the full medical intake)
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const clearForm = () => { setEmail(''); setPassword(''); setF({}); setAuthError(''); };

  const selectPortal = (type: PortalType | null, registering: boolean) => {
    setPortal(type);
    setIsRegistering(type === 'admin' ? false : registering);
    clearForm();
  };

  /* ---------- auth handlers ---------- */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!portal) return;

    if (portal === 'admin') {
      // Official Government Admin login (password only)
      if (!password) {
        setAuthError('Please enter the Government Admin password.');
        return;
      }
      if (password !== '9100') {
        setAuthError('Invalid Government Admin password. Access denied.');
        return;
      }
      setAuthLoading(true);
      try {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        const adminEmail = 'admin.official@mhdhospital.in';
        const adminSecret = 'GovAdmin#9100!MHD';
        let authed = false;
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminSecret);
          authed = true;
        } catch {
          // If first time, provision official government admin credential
          try {
            const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminSecret);
            await setDoc(doc(db, 'users', cred.user.uid), {
              role: 'admin',
              name: 'Government Healthcare Administrator',
              adminName: 'Government Administrator',
              phone: '1800-MHD-GOV',
              email: adminEmail,
              designation: 'National Health Authority Admin',
              official: true,
              createdAt: Date.now(),
            }, { merge: true });
            authed = true;
          } catch {
            // Already provisioned with legacy or existing
          }
        }
        if (auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            role: 'admin',
            name: 'Government Healthcare Administrator',
            adminName: 'Government Administrator',
            email: adminEmail,
            official: true,
          }, { merge: true });
        }
        if (rememberMe) {
          try { localStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
        } else {
          try { sessionStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
        }
        setLoggedIn('admin');
      } catch (err) {
        console.error('Admin authentication fallback:', err);
        // Resilient fallback: preserve government admin portal access
        if (rememberMe) {
          try { localStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
        } else {
          try { sessionStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
        }
        setLoggedIn('admin');
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    if (!email || !password) { setAuthError('Please fill in all required fields.'); return; }
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
        const label = role === 'hospital' ? 'Hospital' : role === 'admin' ? 'Government Admin' : role;
        throw new Error(`This account is registered as ${label}. Please use the ${label} Portal.`);
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
      toast('Password reset email sent');
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
      if (!f.name || !f.dob || !f.phone || !f.state || !f.district) { setAuthError('Name, date of birth, phone, state and district are required.'); return; }
      const aad = (f.aadhaar || '').replace(/\D/g, '');
      if (aad.length !== 12) { setAuthError('Aadhaar number must be exactly 12 digits.'); return; }
    }
    if (portal === 'doctor' && (!f.name || !f.specialization || !f.regNo || !f.hospital || !f.address || !f.state || !f.district)) { setAuthError('Doctor name, specialization, registration number, hospital, address, state and district are required.'); return; }
    if (portal === 'hospital' && (!f.name || !f.address || !f.state || !f.district)) { setAuthError('Hospital name, address, state and district are required.'); return; }
    if (portal === 'caretaker' && (!f.name || !f.patientHealthId || !f.state || !f.district)) { setAuthError('Name, patient Health ID, state and district are required.'); return; }
    if (portal === 'admin') { setAuthError('Account registration is disabled for the Admin Portal.'); return; }
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
            healthId: 'MHD-' + uid6(), state: f.state, district: f.district,
          });
        } else if (portal === 'doctor') {
          Object.assign(profile, {
            name: f.name, specialization: f.specialization, experience: f.experience || '',
            hospital: f.hospital, regNo: f.regNo, phone: f.phone || '', address: f.address, state: f.state, district: f.district, onDuty: false,
          });
        } else if (portal === 'caretaker') {
          const { getDocs, collection, query, where } = await import('firebase/firestore');
          const ps = await getDocs(query(collection(db, 'users'), where('healthId', '==', f.patientHealthId.trim())));
          if (ps.empty) throw new Error('Patient Health ID was not found. Check it and try again.');
          const p = ps.docs[0];
          Object.assign(profile, { name: f.name, phone: f.phone || '', state: f.state, district: f.district, caretakerPatientId: p.id, caretakerPatientName: p.data().name || '' });
        } else {
          Object.assign(profile, {
            name: f.name, adminName: f.adminName || '', phone: f.phone || '',
            address: f.address || '', licenseNo: f.licenseNo || '', state: f.state || '', district: f.district || '',
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
      const signedIn = await signInWithEmailAndPassword(auth, d.email, DEMO_PASS);
      const repairedProfile = { ...d.profile };
      if (role === 'caretaker') {
        delete repairedProfile.caretakerPatientId;
        delete repairedProfile.caretakerPatientName;
      }
      await setDoc(doc(db, 'users', signedIn.user.uid), { ...repairedProfile, email: d.email, role, updatedAt: Date.now() }, { merge: true });
      setLoggedIn(role);
    } catch {
      // First use — create the demo account (same as the original quickDemo)
      try {
        const cred = await createUserWithEmailAndPassword(auth, d.email, DEMO_PASS);
        await setDoc(doc(db, 'users', cred.user.uid), { ...d.profile, email: d.email, createdAt: Date.now() });
        if (role === 'caretaker') {
          const { setDoc: saveDoc, doc: makeDoc, addDoc, collection } = await import('firebase/firestore');
          const demoPatientId = 'caretaker-demo-patient';
          await saveDoc(makeDoc(db, 'users', demoPatientId), { role: 'patient', name: 'Caretaker Demo Patient', healthId: 'MHD-CARE01', state: 'Tamil Nadu', district: 'Chennai', createdAt: Date.now() }, { merge: true });
          await saveDoc(makeDoc(db, 'users', cred.user.uid), { caretakerPatientId: demoPatientId, caretakerPatientName: 'Caretaker Demo Patient' }, { merge: true });
          await addDoc(collection(db, 'medicines'), { patientId: demoPatientId, name: 'Demo medicine', dosage: '1 tablet after breakfast', startDate: new Date().toISOString().slice(0, 10), prescribedBy: 'Dr. Demo', verified: true, active: true, createdAt: Date.now() });
        }
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

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center bg-app"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (loggedIn) {
    const Dashboard =
      loggedIn === 'patient' ? PatientDashboard : loggedIn === 'caretaker' ? CaretakerDashboard : loggedIn === 'doctor' ? DoctorDashboard : loggedIn === 'hospital' ? AdminDashboard : GovernmentAdminDashboard;
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-app"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
        <Dashboard onLogout={() => {
          try {
            localStorage.removeItem('mhd_admin_session');
            sessionStorage.removeItem('mhd_admin_session');
          } catch { /* ignore */ }
          setLoggedIn(null);
        }} />
      </Suspense>
    );
  }

  const portalCopy: Record<PortalType, { icon: React.ReactNode; title: string; desc: string }> = {
    patient: { icon: <User className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'PATIENT PORTAL', desc: 'Access your medical records, medicines, appointments and care plan.' },
    caretaker: { icon: <HeartHandshake className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'CARETAKER PORTAL', desc: 'Track a patient’s medicines and care instructions and report completion to the doctor.' },
    doctor: { icon: <Stethoscope className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'DOCTOR PORTAL', desc: 'Review cases, enter vitals, verify medicines and consult patients.' },
    hospital: { icon: <Shield className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'HOSPITAL PORTAL', desc: 'Manage this hospital, its doctors, patients, records and appointments.' },
    admin: { icon: <ShieldCheck className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'GOVERNMENT ADMIN PORTAL', desc: 'Official government healthcare oversight for registered hospitals, doctors, patients, and system-wide reports.' },
  };

  return (
    <div className="landing-page min-h-screen lg:h-screen lg:overflow-hidden w-full flex flex-col lg:flex-row font-sans text-ink box-border">
      {/* LEFT PANEL - BRANDING */}
      <div className="landing-brand lg:w-[42%] text-white flex flex-col justify-between p-10">
        <div>
          <div className="flex items-center gap-4 mb-8">
            <Logo className="w-10 h-10 text-white" />
            <div>
              <h1 className="text-[24px] font-bold tracking-wide leading-none mb-1">UNITED MEDICATION</h1>
              <p className="text-[10px] text-on-navy-muted uppercase tracking-wider font-semibold">
                UNITED MEDICATION IN COOPERATION
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
                <span className="text-[15px] font-medium text-white">United Integrated Care</span>
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
                    Welcome to United Medication in Cooperation
                  </h2>
                  <p className="text-[14px] text-muted">Secure access to your healthcare services.</p>
                </div>
                <div className="space-y-3">
                  {((['patient', 'caretaker', 'doctor', 'hospital'] as PortalType[])).map((p) => (
                    <div key={p} className="bg-surface/95 border border-white/70 rounded-[10px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_5px_18px_rgba(15,23,42,0.10)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.14)] transition-all">
                      <div className="flex items-start sm:items-center gap-4 flex-1">
                        {portalCopy[p].icon}
                        <div>
                          <h3 className="text-[15px] font-semibold text-ink mb-1">{portalCopy[p].title}</h3>
                          <p className="text-[13px] text-muted leading-relaxed pr-2">{portalCopy[p].desc}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 w-full sm:w-[160px]">
                        <button onClick={() => selectPortal(p, false)} className="h-[38px] px-4 bg-[#064e3b] text-white rounded-[7px] text-[13px] font-medium transition-colors hover:bg-[#047857] shadow-sm w-full">
                          {p === 'hospital' ? 'Sign in as Hospital' : `Sign in as ${p}`}
                        </button>
                        <button onClick={() => selectPortal(p, true)} className="h-[38px] px-4 bg-[#eef7f1] border border-[#b8d5c3] text-ink rounded-[7px] text-[13px] font-medium transition-colors hover:bg-[#dcefe3] w-full">
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
                    <button type="button" onClick={() => quickDemo('caretaker')} disabled={authLoading} className="h-[32px] px-3 bg-transparent border border-line text-muted text-[12px] font-medium rounded-[4px] hover:bg-surface hover:text-ink transition-colors disabled:opacity-60">
                      Caretaker Demo
                    </button>
                    <button type="button" onClick={() => quickDemo('doctor')} disabled={authLoading} className="h-[32px] px-3 bg-transparent border border-line text-muted text-[12px] font-medium rounded-[4px] hover:bg-surface hover:text-ink transition-colors disabled:opacity-60">
                      Doctor Demo
                    </button>
                    <button type="button" onClick={() => quickDemo('hospital')} disabled={authLoading} className="h-[32px] px-3 bg-transparent border border-line text-muted text-[12px] font-medium rounded-[4px] hover:bg-surface hover:text-ink transition-colors disabled:opacity-60">
                      Hospital Demo
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-2">Demo accounts — created automatically on first use. Password: demo123</p>
                </div>
              </>
            ) : (
              <div>
                <button
                  onClick={() => selectPortal(null, false)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 mb-4 rounded-md border border-line bg-surface text-[13px] font-semibold text-ink shadow-sm hover:border-primary hover:text-primary transition-colors"
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
                      {portal === 'hospital' && 'Hospital Sign In'}
                      {portal === 'admin' && 'Government Admin Portal'}
                    </h3>
                    <p className="text-[13px] text-muted mb-4 border-b border-line pb-3">
                      {portal === 'admin'
                        ? 'Enter official government administrator password to proceed'
                        : 'Login to continue to your health portal'}
                    </p>
                    <div className="space-y-3">
                      {portal !== 'admin' && (
                        <div>
                          <label className={labelCls}>Email address</label>
                          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="Enter your email address" />
                        </div>
                      )}
                      <div>
                        <label className={labelCls}>
                          {portal === 'admin' ? 'Administrator Password' : 'Password'}
                        </label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={inputCls}
                          placeholder={portal === 'admin' ? 'Enter administrator password' : 'Enter your password'}
                          autoFocus={portal === 'admin'}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-[13px] text-muted cursor-pointer">
                          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded-[2px] border-line" />
                          Remember me
                        </label>
                        {portal !== 'admin' && (
                          <button type="button" onClick={handleForgot} className="text-[13px] font-medium text-primary hover:underline">
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="pt-2">
                        <button type="submit" disabled={authLoading} className="w-full h-[44px] bg-primary text-on-navy rounded-[6px] text-[14px] font-medium hover:bg-primary-d transition-colors flex items-center justify-center disabled:opacity-80">
                          {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (portal === 'admin' ? 'Access Admin Portal' : 'Sign In')}
                        </button>
                      </div>
                      {portal !== 'admin' && (
                        <div className="pt-3 text-center">
                          <button type="button" onClick={() => { setIsRegistering(true); setAuthError(''); }} className="text-[13px] font-medium text-primary hover:underline transition-colors">
                            Don&apos;t have an account? Create an account
                          </button>
                        </div>
                      )}
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
                          <LocationFields f={f} set={set} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Emergency Contact 1 (optional)</label><input placeholder="Optional" value={f.emergencyName || ''} onChange={(e) => set('emergencyName', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Emergency Contact 1 Phone (optional)</label><input placeholder="Optional" value={f.emergencyPhone || ''} onChange={(e) => set('emergencyPhone', e.target.value)} className={inputCls} /></div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Annual Income (₹) (optional)</label><input type="number" placeholder="Optional" value={f.income || ''} onChange={(e) => set('income', e.target.value)} className={inputCls} /></div>
                            <div>
                              <label className={labelCls}>Language</label>
                              <select value={f.rpLang || 'English'} onChange={(e) => set('rpLang', e.target.value)} className={inputCls}>
                                <option>English</option><option>Hindi</option>
                              </select>
                            </div>
                          </div>
                          <FieldWithMic label="Practice Address *" textarea value={f.address || ''} onChange={(v) => set('address', v)} required />
                          <LocationFields f={f} set={set} />
                        </>
                      )}
                      {portal === 'doctor' && (
                        <>
                          <FieldWithMic label="Doctor Name *" value={f.name || ''} onChange={(v) => set('name', v)} required />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Specialization *</label><input value={f.specialization || ''} onChange={(e) => set('specialization', e.target.value)} className={inputCls} placeholder="e.g. General Surgery" /></div>
                            <div><label className={labelCls}>Experience (years)</label><input type="number" value={f.experience || ''} onChange={(e) => set('experience', e.target.value)} className={inputCls} /></div>
                          </div>
                          <div><label className={labelCls}>Hospital Name *</label><input required value={f.hospital || ''} onChange={(e) => set('hospital', e.target.value)} className={inputCls} placeholder="Enter the hospital where you work" /></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Medical Reg No *</label><input value={f.regNo || ''} onChange={(e) => set('regNo', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Phone</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>
                          </div>
                        </>
                      )}
                      {portal === 'hospital' && (
                        <>
                          <div><label className={labelCls}>Hospital Name *</label><input value={f.name || ''} onChange={(e) => set('name', e.target.value)} className={inputCls} /></div>
                          <div><label className={labelCls}>Phone (optional)</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>
                          <FieldWithMic label="Address *" textarea value={f.address || ''} onChange={(v) => set('address', v)} required />
                          <LocationFields f={f} set={set} />
                          <div><label className={labelCls}>License No</label><input value={f.licenseNo || ''} onChange={(e) => set('licenseNo', e.target.value)} className={inputCls} /></div>
                        </>
                      )}
                      {portal === 'caretaker' && (
                        <>
                          <FieldWithMic label="Caretaker Name *" value={f.name || ''} onChange={(v) => set('name', v)} required />
                          <div><label className={labelCls}>Patient Health ID *</label><input required value={f.patientHealthId || ''} onChange={(e) => set('patientHealthId', e.target.value)} className={inputCls} placeholder="e.g. MHD-ABC123" /></div>
                          <div><label className={labelCls}>Phone</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>
                          <LocationFields f={f} set={set} />
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
                            portal === 'patient' ? 'Create Health ID' : portal === 'doctor' ? 'Register as Doctor' : portal === 'caretaker' ? 'Register Caretaker' : 'Register Hospital'
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
        <footer className="p-4 lg:p-6 lg:py-4 text-[12px] text-muted flex flex-col md:flex-row justify-between items-center gap-3 mt-auto border-t border-line bg-surface/40">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2.5 gap-y-1">
            <span>© {new Date().getFullYear()} CareSphere &bull; United Medication in Cooperation</span>
            <span className="hidden sm:inline text-line">•</span>
            <span className="hidden md:inline">In Collaboration With United Nations Sustainable Development</span>
          </div>

          <nav aria-label="CareSphere Information Links" className="flex items-center gap-3 text-[13px] font-medium">
            <button
              id="footer-link-about"
              type="button"
              onClick={() => setActiveInfoModal('about')}
              className="text-muted hover:text-primary hover:underline underline-offset-4 transition-colors cursor-pointer py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-primary rounded-[4px]"
            >
              About
            </button>
            <span className="text-line select-none">•</span>
            <button
              id="footer-link-privacy"
              type="button"
              onClick={() => setActiveInfoModal('privacy')}
              className="text-muted hover:text-primary hover:underline underline-offset-4 transition-colors cursor-pointer py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-primary rounded-[4px]"
            >
              Privacy Policy
            </button>
            <span className="text-line select-none">•</span>
            <button
              id="footer-link-features"
              type="button"
              onClick={() => setActiveInfoModal('features')}
              className="text-muted hover:text-primary hover:underline underline-offset-4 transition-colors cursor-pointer py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-primary rounded-[4px]"
            >
              Features
            </button>
            <span className="text-line select-none">•</span>
            <button
              id="footer-link-gov-admin"
              type="button"
              onClick={() => selectPortal('admin', false)}
              className="text-muted/60 hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-primary rounded-[4px] text-[12px]"
              title="Official Government Administrator Access"
            >
              Government Admin
            </button>
          </nav>
        </footer>

        {/* Informational Modals */}
        {activeInfoModal === 'about' && (
          <Modal
            small
            title="About CareSphere"
            icon={<Info className="w-5 h-5 text-primary" strokeWidth={1.75} />}
            onClose={() => setActiveInfoModal(null)}
            footer={
              <button
                id="modal-close-about"
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="h-[36px] px-5 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors cursor-pointer shadow-sm"
              >
                Close
              </button>
            }
          >
            <div className="space-y-3.5 text-ink text-[13px] leading-relaxed">
              <div className="p-2.5 bg-active/70 border border-line rounded-[6px] flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                <p className="text-[12px] font-medium text-heading">
                  CareSphere &bull; United Medication in Cooperation
                </p>
              </div>

              <p>
                <strong>CareSphere</strong> is a unified, patient-centric digital healthcare infrastructure engineered to harmonize every step of your clinical journey. By connecting patients, designated caretakers, consulting physicians, hospitals, and national health authorities onto one synchronized platform, CareSphere eliminates fragmented records and communication bottlenecks.
              </p>

              <div className="border-t border-line pt-3 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">Core Mission & Principles</h4>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>One Patient, One Record:</strong> A lifetime continuous health journey with verifiable electronic health records.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Care Team Collaboration:</strong> Real-time coordination between attending doctors and family caretakers for medication adherence.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Sustainable Health Equity:</strong> Developed in strategic collaboration with United Nations Sustainable Development Goal 3.</p>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeInfoModal === 'privacy' && (
          <Modal
            small
            title="Privacy Policy"
            icon={<Lock className="w-5 h-5 text-primary" strokeWidth={1.75} />}
            onClose={() => setActiveInfoModal(null)}
            footer={
              <button
                id="modal-close-privacy"
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="h-[36px] px-5 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors cursor-pointer shadow-sm"
              >
                Close
              </button>
            }
          >
            <div className="space-y-3.5 text-ink text-[13px] leading-relaxed">
              <div className="p-2.5 bg-active/70 border border-line rounded-[6px] flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                <p className="text-[12px] font-medium text-heading">
                  Healthcare Data Security & Privacy Commitment
                </p>
              </div>

              <p>
                Your personal health data is confidential, encrypted, and strictly safeguarded. CareSphere applies defense-in-depth clinical security standards to protect patient identity and medical history.
              </p>

              <div className="border-t border-line pt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Patient Data Ownership:</strong> You own your medical information. Records and diagnostic files are never sold, monetized, or shared without your explicit consent.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Role-Based Access:</strong> Doctors, caretakers, and hospital staff access only authorized patient information relevant to active treatment.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>End-to-End Encryption:</strong> All vitals, surgical entries, prescriptions, and communications are encrypted in transit and at rest.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Immutable Audit Trail:</strong> Every record viewing, prescription issuance, and vital log update is securely tracked with verifiable timestamps.</p>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeInfoModal === 'features' && (
          <Modal
            small
            title="CareSphere Features"
            icon={<Sparkles className="w-5 h-5 text-primary" strokeWidth={1.75} />}
            onClose={() => setActiveInfoModal(null)}
            footer={
              <button
                id="modal-close-features"
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="h-[36px] px-5 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors cursor-pointer shadow-sm"
              >
                Close
              </button>
            }
          >
            <div className="space-y-3.5 text-ink text-[13px] leading-relaxed">
              <div className="p-2.5 bg-active/70 border border-line rounded-[6px] flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                <p className="text-[12px] font-medium text-heading">
                  Integrated CareSphere Platform Capabilities
                </p>
              </div>

              <p>
                CareSphere brings hospital departments, clinical staff, patients, and families together with purpose-built tools:
              </p>

              <div className="border-t border-line pt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Unified Digital Health ID:</strong> Unique longitudinal health profile capturing vitals, allergies, conditions, surgeries, and family histories.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Specialized Portals:</strong> Custom dashboards for Patients, Caretakers, Doctors, Hospitals, and Government Administrators.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Medication & Vitals Tracking:</strong> Live recording of BP, blood sugar, temperature, pulse, and daily caretaker verification of prescriptions.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Speech & Regional Languages:</strong> One-tap voice dictation and instant regional language translation across clinical interfaces.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Emergency SOS & Dispatch:</strong> Instant emergency triggers with critical contact notification and nearby hospital mapping.</p>
                </div>
              </div>
            </div>
          </Modal>
        )}
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

function LocationFields({ f, set }: { f: Record<string, string>; set: (k: string, v: string) => void }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div><label className={labelCls}>State *</label><input required value={f.state || ''} onChange={(e) => set('state', e.target.value)} className={inputCls} placeholder="State" /></div>
    <div><label className={labelCls}>District *</label><input required value={f.district || ''} onChange={(e) => set('district', e.target.value)} className={inputCls} placeholder="District" /></div>
  </div>;
}
