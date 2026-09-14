import { useEffect, useState } from 'react';
import { Building2, Send, CheckCircle2, Clock, XCircle, AlertCircle, Plus, MapPin, Phone, ShieldCheck, UserCheck, Trash2 } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, HospitalJoinRequest } from '../../lib/types';
import { fmtD } from '../../lib/format';
import { notify } from '../../lib/fs';
import { toast } from '../../components/Toaster';
import { PageHeader, Loading, StatusChip, inputCls, labelCls, btnPrimary } from '../common';

interface HospitalInfo {
  id: string;
  name: string;
  adminName?: string;
  address?: string;
  district?: string;
  state?: string;
  licenseNo?: string;
  phone?: string;
  email?: string;
}

export default function MyHospitalsTab({ doctorData }: { doctorData: MhdUser }) {
  const [hospitalsList, setHospitalsList] = useState<HospitalInfo[]>([]);
  const [requests, setRequests] = useState<HospitalJoinRequest[] | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'affiliated' | 'send' | 'requests'>('affiliated');

  // Load all registered hospitals
  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'hospital')))
      .then((snap) => {
        const list: HospitalInfo[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: (data.name as string) || 'Hospital',
            adminName: data.adminName as string,
            address: data.address as string,
            district: data.district as string,
            state: data.state as string,
            licenseNo: data.licenseNo as string,
            phone: data.phone as string,
            email: data.email as string,
          };
        });
        setHospitalsList(list);
      })
      .catch(() => setHospitalsList([]));
  }, []);

  // Listen to doctor's join requests in real time
  useEffect(() => {
    const q = query(collection(db, 'hospital_requests'), where('doctorId', '==', doctorData.id));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as HospitalJoinRequest));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRequests(list);
    });
    return unsub;
  }, [doctorData.id]);

  if (requests === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  // Compute all affiliated hospital names
  const affiliatedNames = new Set<string>();
  if (doctorData.hospital && doctorData.hospital.trim()) {
    affiliatedNames.add(doctorData.hospital.trim());
  }
  if (Array.isArray(doctorData.hospitals)) {
    doctorData.hospitals.forEach((h) => {
      if (typeof h === 'string' && h.trim()) affiliatedNames.add(h.trim());
    });
  }
  // Include hospitals from accepted requests
  requests.filter((r) => r.status === 'accepted').forEach((r) => {
    if (r.hospitalName) affiliatedNames.add(r.hospitalName.trim());
  });

  const affiliatedArray = Array.from(affiliatedNames);

  // Check pending hospital IDs to prevent duplicate requests
  const pendingHospitalIds = new Set(
    requests.filter((r) => r.status === 'pending').map((r) => r.hospitalId)
  );

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalId) {
      toast('Please select a hospital', 'err');
      return;
    }
    const targetHosp = hospitalsList.find((h) => h.id === selectedHospitalId);
    if (!targetHosp) {
      toast('Hospital not found', 'err');
      return;
    }
    if (affiliatedNames.has(targetHosp.name.trim())) {
      toast('You are already affiliated with this hospital', 'err');
      return;
    }
    if (pendingHospitalIds.has(targetHosp.id)) {
      toast('A join request is already pending for this hospital', 'err');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'hospital_requests'), {
        doctorId: doctorData.id,
        doctorName: doctorData.name,
        doctorEmail: doctorData.email || '',
        doctorPhone: doctorData.phone || '',
        doctorSpecialization: doctorData.specialization || '',
        doctorRegNo: doctorData.regNo || '',
        doctorExperience: doctorData.experience || '',
        doctorPhoto: doctorData.photo || '',
        hospitalId: targetHosp.id,
        hospitalName: targetHosp.name,
        message: message.trim(),
        status: 'pending',
        createdAt: Date.now(),
      });

      // Send notification to hospital
      await notify(
        targetHosp.id,
        'New Doctor Join Request',
        `Dr. ${doctorData.name} (${doctorData.specialization || 'General'}) requested affiliation with ${targetHosp.name}.`,
        'hrequests'
      );

      toast('Join Hospital Request sent successfully!');
      setSelectedHospitalId('');
      setMessage('');
      setActiveTab('requests');
    } catch {
      toast('Failed to send join request. Please try again.', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (reqId: string) => {
    if (!confirm('Are you sure you want to withdraw this join request?')) return;
    try {
      await deleteDoc(doc(db, 'hospital_requests', reqId));
      toast('Join request withdrawn');
    } catch {
      toast('Could not withdraw request', 'err');
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="My Hospitals"
          sub="View your affiliated hospitals, send join requests, and manage hospital credentials."
        />
        <button
          id="btn-open-send-request"
          onClick={() => setActiveTab('send')}
          className="inline-flex items-center gap-2 h-[40px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Send Join Request
        </button>
      </div>

      {/* Top summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-line rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-active flex items-center justify-center text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Affiliated Hospitals</p>
            <p className="text-[22px] font-bold text-heading mt-0.5">{affiliatedArray.length}</p>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-warn-bg border border-warn-bd flex items-center justify-center text-warn shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Pending Requests</p>
            <p className="text-[22px] font-bold text-heading mt-0.5">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-ok-bg border border-ok-bd flex items-center justify-center text-ok shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Primary Facility</p>
            <p className="text-[13px] font-semibold text-heading truncate mt-1">
              {doctorData.hospital || 'MHD Hospital'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          id="tab-affiliated-hospitals"
          onClick={() => setActiveTab('affiliated')}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'affiliated'
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted hover:text-ink hover:bg-surface'
          }`}
        >
          <Building2 className="w-4 h-4" /> Affiliated Hospitals ({affiliatedArray.length})
        </button>
        <button
          id="tab-send-request"
          onClick={() => setActiveTab('send')}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'send'
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted hover:text-ink hover:bg-surface'
          }`}
        >
          <Send className="w-4 h-4" /> Join Hospital Request
        </button>
        <button
          id="tab-requests-history"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted hover:text-ink hover:bg-surface'
          }`}
        >
          <Clock className="w-4 h-4" /> Request History
          {pendingCount > 0 && (
            <span className="bg-warn text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Affiliated Hospitals */}
      {activeTab === 'affiliated' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {affiliatedArray.map((hospName, idx) => {
              const matchedHosp = hospitalsList.find(
                (h) => h.name.trim().toLowerCase() === hospName.trim().toLowerCase()
              );
              const isPrimary = hospName.trim().toLowerCase() === (doctorData.hospital || '').trim().toLowerCase();

              return (
                <div
                  key={`${hospName}-${idx}`}
                  className="bg-surface border border-line rounded-xl p-5 shadow-sm hover:border-primary/40 transition-colors space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-active flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-bold text-heading">{hospName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {isPrimary ? (
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border text-primary bg-active border-primary/30">
                              Primary Facility
                            </span>
                          ) : (
                            <StatusChip ok>Affiliated</StatusChip>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-[13px] text-muted border-t border-line/70 pt-3">
                    {matchedHosp?.address && (
                      <div className="flex items-center gap-2 text-ink">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">
                          {matchedHosp.address}
                          {matchedHosp.district ? `, ${matchedHosp.district}` : ''}
                          {matchedHosp.state ? `, ${matchedHosp.state}` : ''}
                        </span>
                      </div>
                    )}
                    {matchedHosp?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted shrink-0" />
                        <span>{matchedHosp.phone}</span>
                      </div>
                    )}
                    {matchedHosp?.licenseNo && (
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-muted shrink-0" />
                        <span>License: {matchedHosp.licenseNo}</span>
                      </div>
                    )}
                    {matchedHosp?.adminName && (
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-muted shrink-0" />
                        <span>Admin: {matchedHosp.adminName}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-app/60 rounded-lg p-2.5 text-[12px] text-muted flex items-center justify-between">
                    <span>Patient Consultations: Enabled</span>
                    <span className="text-ok font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {affiliatedArray.length === 0 && (
            <div className="bg-surface border border-line rounded-xl p-10 text-center space-y-3">
              <Building2 className="w-10 h-10 text-muted mx-auto" />
              <p className="text-[15px] font-semibold text-ink">No affiliated hospitals yet</p>
              <p className="text-[13px] text-muted max-w-md mx-auto">
                Send a join request to connect with healthcare networks, accept patient appointments, and conduct consultations.
              </p>
              <button
                onClick={() => setActiveTab('send')}
                className={btnPrimary}
              >
                Send Join Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Send Join Request Form */}
      {activeTab === 'send' && (
        <div className="bg-surface border border-line rounded-xl p-6 shadow-sm max-w-2xl space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-line">
            <div className="w-10 h-10 rounded-xl bg-active flex items-center justify-center text-primary">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-heading">Send Join Hospital Request</h3>
              <p className="text-[12px] text-muted">
                Submit an affiliation proposal to hospital administration for official roster approval.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendRequest} className="space-y-4">
            <div>
              <label className={labelCls}>Select Hospital to Join *</label>
              <select
                id="select-hospital-to-join"
                required
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className={inputCls}
              >
                <option value="">Choose a registered hospital…</option>
                {hospitalsList.map((h) => {
                  const isAlreadyAffiliated = affiliatedNames.has(h.name.trim());
                  const isPending = pendingHospitalIds.has(h.id);
                  const disabled = isAlreadyAffiliated || isPending;

                  return (
                    <option key={h.id} value={h.id} disabled={disabled}>
                      {h.name} {h.district ? `(${h.district}, ${h.state || ''})` : ''}
                      {isAlreadyAffiliated ? ' — [Already Affiliated]' : isPending ? ' — [Request Pending]' : ''}
                    </option>
                  );
                })}
              </select>
              {hospitalsList.length === 0 && (
                <p className="text-[11px] text-warn mt-1">
                  No registered hospital users currently found. You can also contact support or create a hospital demo account.
                </p>
              )}
            </div>

            {/* Doctor credentials preview */}
            <div className="bg-app border border-line rounded-lg p-4 space-y-2.5">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Doctor Profile Submitted With Request
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                <div>
                  <span className="text-muted">Doctor: </span>
                  <span className="font-semibold text-ink">Dr. {doctorData.name}</span>
                </div>
                <div>
                  <span className="text-muted">Specialization: </span>
                  <span className="font-medium text-ink">{doctorData.specialization || 'General Practitioner'}</span>
                </div>
                <div>
                  <span className="text-muted">Reg No: </span>
                  <span className="font-mono text-primary font-semibold">{doctorData.regNo || '—'}</span>
                </div>
                <div>
                  <span className="text-muted">Experience: </span>
                  <span className="font-medium text-ink">{doctorData.experience ? `${doctorData.experience} Years` : '—'}</span>
                </div>
                <div>
                  <span className="text-muted">Email: </span>
                  <span className="text-ink truncate">{doctorData.email}</span>
                </div>
                <div>
                  <span className="text-muted">Phone: </span>
                  <span className="text-ink">{doctorData.phone || '—'}</span>
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Message to Hospital Administration (Optional)</label>
              <textarea
                id="join-request-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Requesting visiting consultant privileges for Cardiology OPD and surgery admissions..."
                className={inputCls}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('affiliated')}
                className="px-4 py-2 border border-line text-muted hover:text-ink text-[13px] rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-submit-join-request"
                type="submit"
                disabled={submitting || !selectedHospitalId}
                className="h-[40px] px-6 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? 'Sending Request…' : 'Submit Join Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Request History */}
      {activeTab === 'requests' && (
        <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden space-y-0">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <div>
              <h4 className="text-[15px] font-bold text-heading">Hospital Request History</h4>
              <p className="text-[12px] text-muted">Track the approval status of your hospital join requests.</p>
            </div>
            <span className="text-[12px] font-semibold text-muted">
              {requests.length} total request{requests.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="divide-y divide-line">
            {requests.map((r) => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-app/40 transition-colors">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h5 className="text-[14px] font-bold text-ink truncate">{r.hospitalName}</h5>
                    {r.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border text-warn bg-warn-bg border-warn-bd">
                        <Clock className="w-3 h-3" /> Pending Review
                      </span>
                    )}
                    {r.status === 'accepted' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border text-ok bg-ok-bg border-ok-bd">
                        <CheckCircle2 className="w-3 h-3" /> Accepted & Affiliated
                      </span>
                    )}
                    {r.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border text-danger bg-danger-bg border-danger-bd">
                        <XCircle className="w-3 h-3" /> Declined
                      </span>
                    )}
                  </div>

                  {r.message && (
                    <p className="text-[12px] text-muted italic line-clamp-2">
                      &quot;{r.message}&quot;
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-muted">
                    <span>Sent: {fmtD(new Date(r.createdAt).toISOString().slice(0, 10))}</span>
                    {r.reviewedAt && (
                      <span>Reviewed: {fmtD(new Date(r.reviewedAt).toISOString().slice(0, 10))}</span>
                    )}
                    {r.reviewedBy && <span>By: {r.reviewedBy}</span>}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {r.status === 'pending' && (
                    <button
                      onClick={() => handleCancelRequest(r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-danger border border-danger-bd rounded-[4px] hover:bg-danger-bg transition-colors"
                      title="Withdraw request"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Withdraw
                    </button>
                  )}
                  {r.status === 'accepted' && (
                    <span className="text-[12px] font-medium text-ok flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Active on Hospital Roster
                    </span>
                  )}
                </div>
              </div>
            ))}

            {requests.length === 0 && (
              <div className="p-8 text-center text-muted text-[13px]">
                No join requests sent yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
