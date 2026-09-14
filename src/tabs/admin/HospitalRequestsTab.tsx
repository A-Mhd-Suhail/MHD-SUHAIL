import { useEffect, useState } from 'react';
import {
  UserPlus, CheckCircle2, XCircle, Clock, Search, Phone, Mail, FileText,
  Building2, ShieldCheck, Stethoscope, AlertCircle, Check, X, Loader2
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, HospitalJoinRequest } from '../../lib/types';
import { fmtD } from '../../lib/format';
import { notify } from '../../lib/fs';
import { toast } from '../../components/Toaster';
import { PageHeader, Loading, StatusChip } from '../common';

export default function HospitalRequestsTab({ adminData }: { adminData: MhdUser }) {
  const [requests, setRequests] = useState<HospitalJoinRequest[] | null>(null);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Accepted' | 'Rejected'>('All');
  const [search, setSearch] = useState('');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<HospitalJoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    // Listen to all requests addressed to this hospital
    const unsub = onSnapshot(collection(db, 'hospital_requests'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as HospitalJoinRequest))
        .filter((r) => {
          const matchId = r.hospitalId === adminData.id;
          const matchName = r.hospitalName && adminData.name &&
            r.hospitalName.trim().toLowerCase() === adminData.name.trim().toLowerCase();
          return matchId || matchName;
        });

      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRequests(list);
    });

    return unsub;
  }, [adminData.id, adminData.name]);

  if (requests === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const pendingList = requests.filter((r) => r.status === 'pending');
  const acceptedList = requests.filter((r) => r.status === 'accepted');
  const rejectedList = requests.filter((r) => r.status === 'rejected');

  const filtered = requests
    .filter((r) => {
      if (filter === 'Pending') return r.status === 'pending';
      if (filter === 'Accepted') return r.status === 'accepted';
      if (filter === 'Rejected') return r.status === 'rejected';
      return true;
    })
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.doctorName.toLowerCase().includes(q) ||
        (r.doctorSpecialization || '').toLowerCase().includes(q) ||
        (r.doctorRegNo || '').toLowerCase().includes(q) ||
        (r.doctorEmail || '').toLowerCase().includes(q)
      );
    });

  // ACCEPT DOCTOR JOIN REQUEST
  const handleAccept = async (req: HospitalJoinRequest) => {
    setActionBusyId(req.id);
    try {
      const hospitalName = adminData.name || 'MHD Hospital';

      // 1. Update the join request status
      await updateDoc(doc(db, 'hospital_requests', req.id), {
        status: 'accepted',
        reviewedAt: Date.now(),
        reviewedBy: adminData.adminName || adminData.name || 'Hospital Admin',
      });

      // 2. Automatically add the accepted doctor to this hospital
      const doctorRef = doc(db, 'users', req.doctorId);
      const doctorSnap = await getDoc(doctorRef);

      if (doctorSnap.exists()) {
        const dData = doctorSnap.data();
        const currentHospitals: string[] = Array.isArray(dData.hospitals)
          ? [...dData.hospitals]
          : dData.hospital
          ? [dData.hospital]
          : [];

        if (!currentHospitals.includes(hospitalName)) {
          currentHospitals.push(hospitalName);
        }

        await updateDoc(doctorRef, {
          hospitals: currentHospitals,
          hospitalIds: arrayUnion(adminData.id),
          // If primary hospital is empty or generic, set to this hospital
          ...((!dData.hospital || dData.hospital === 'MHD Hospital') && { hospital: hospitalName }),
        });
      }

      // 3. Record on hospital profile
      const hospRef = doc(db, 'users', adminData.id);
      await updateDoc(hospRef, {
        affiliatedDoctorIds: arrayUnion(req.doctorId),
        affiliatedDoctorNames: arrayUnion(`Dr. ${req.doctorName}`),
      }).catch(() => { /* ignore */ });

      // 4. Notify doctor
      await notify(
        req.doctorId,
        'Hospital Affiliation Approved!',
        `Your request to join ${hospitalName} was approved. You are now officially affiliated with this hospital.`,
        'myhospitals'
      );

      toast(`Dr. ${req.doctorName} accepted and added to ${hospitalName}!`);
    } catch {
      toast('Failed to accept request. Please try again.', 'err');
    } finally {
      setActionBusyId(null);
    }
  };

  // REJECT DOCTOR JOIN REQUEST
  const handleReject = async () => {
    if (!selectedReq) return;
    const req = selectedReq;
    setActionBusyId(req.id);
    setShowRejectModal(false);

    try {
      const hospitalName = adminData.name || 'MHD Hospital';

      // 1. Update request status
      await updateDoc(doc(db, 'hospital_requests', req.id), {
        status: 'rejected',
        reviewedAt: Date.now(),
        reviewedBy: adminData.adminName || adminData.name || 'Hospital Admin',
        rejectReason: rejectReason.trim() || 'Not specified',
      });

      // 2. Notify doctor
      await notify(
        req.doctorId,
        'Hospital Join Request Update',
        `Your request to join ${hospitalName} was not accepted at this time.`,
        'myhospitals'
      );

      toast(`Request from Dr. ${req.doctorName} declined.`);
      setRejectReason('');
      setSelectedReq(null);
    } catch {
      toast('Failed to update request.', 'err');
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader
        title="Hospital Requests"
        sub={`Review doctor affiliation requests for ${adminData.name || 'your hospital'}. Accepted doctors are added to your facility automatically.`}
      />

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface border border-line rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-warn-bg border border-warn-bd flex items-center justify-center text-warn shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Pending Action</p>
            <p className="text-[22px] font-bold text-heading mt-0.5">{pendingList.length}</p>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-ok-bg border border-ok-bd flex items-center justify-center text-ok shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Accepted</p>
            <p className="text-[22px] font-bold text-heading mt-0.5">{acceptedList.length}</p>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-danger-bg border border-danger-bd flex items-center justify-center text-danger shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Declined</p>
            <p className="text-[22px] font-bold text-heading mt-0.5">{rejectedList.length}</p>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-active flex items-center justify-center text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Requests</p>
            <p className="text-[22px] font-bold text-heading mt-0.5">{requests.length}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['All', 'Pending', 'Accepted', 'Rejected'] as const).map((tab) => {
            const count =
              tab === 'All'
                ? requests.length
                : tab === 'Pending'
                ? pendingList.length
                : tab === 'Accepted'
                ? acceptedList.length
                : rejectedList.length;

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors flex items-center gap-1.5 ${
                  filter === tab
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface border border-line text-muted hover:text-ink'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    filter === tab
                      ? 'bg-white/20 text-white'
                      : 'bg-app text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor, specialization, reg no…"
            className="w-full h-[36px] bg-surface border border-line rounded-[6px] pl-9 pr-3 text-[13px] text-ink focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Requests list */}
      <div className="space-y-3">
        {filtered.map((r) => {
          const isPending = r.status === 'pending';
          const isBusy = actionBusyId === r.id;

          return (
            <div
              key={r.id}
              className="bg-surface border border-line rounded-xl p-5 shadow-sm hover:border-primary/40 transition-colors space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  {r.doctorPhoto ? (
                    <img
                      src={r.doctorPhoto}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-line shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-active border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-[16px] font-bold text-heading">Dr. {r.doctorName}</h4>
                      {r.status === 'pending' && (
                        <StatusChip warn>Pending Review</StatusChip>
                      )}
                      {r.status === 'accepted' && (
                        <StatusChip ok>Accepted & Affiliated</StatusChip>
                      )}
                      {r.status === 'rejected' && (
                        <StatusChip danger>Declined</StatusChip>
                      )}
                    </div>

                    <p className="text-[13px] text-primary font-medium">
                      {r.doctorSpecialization || 'General Practitioner'}
                      {r.doctorExperience ? ` · ${r.doctorExperience} Years Experience` : ''}
                    </p>

                    <div className="flex items-center gap-4 text-[12px] text-muted flex-wrap pt-0.5">
                      {r.doctorRegNo && (
                        <span className="flex items-center gap-1 font-mono">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Reg: {r.doctorRegNo}
                        </span>
                      )}
                      {r.doctorPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-muted" /> {r.doctorPhone}
                        </span>
                      )}
                      {r.doctorEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-muted" /> {r.doctorEmail}
                        </span>
                      )}
                      <span>
                        Requested: {fmtD(new Date(r.createdAt).toISOString().slice(0, 10))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  {isPending && (
                    <>
                      <button
                        id={`btn-reject-${r.id}`}
                        disabled={isBusy}
                        onClick={() => {
                          setSelectedReq(r);
                          setShowRejectModal(true);
                        }}
                        className="h-[36px] px-3.5 border border-danger-bd text-danger hover:bg-danger-bg rounded-[6px] text-[13px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>

                      <button
                        id={`btn-accept-${r.id}`}
                        disabled={isBusy}
                        onClick={() => handleAccept(r)}
                        className="h-[36px] px-4 bg-ok text-white hover:bg-ok-d rounded-[6px] text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Accept & Add Doctor
                      </button>
                    </>
                  )}

                  {r.status === 'accepted' && (
                    <div className="text-right">
                      <span className="text-[12px] text-ok font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Added to Hospital Roster
                      </span>
                      {r.reviewedAt && (
                        <p className="text-[11px] text-muted">
                          Approved on {fmtD(new Date(r.reviewedAt).toISOString().slice(0, 10))}
                        </p>
                      )}
                    </div>
                  )}

                  {r.status === 'rejected' && (
                    <div className="text-right">
                      <span className="text-[12px] text-danger font-semibold flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Request Declined
                      </span>
                      {r.rejectReason && (
                        <p className="text-[11px] text-muted max-w-[200px] truncate">
                          Reason: {r.rejectReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Message from doctor if provided */}
              {r.message && (
                <div className="bg-app/70 border border-line rounded-lg p-3 text-[13px] text-ink flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-muted text-[11px] uppercase tracking-wider block mb-0.5">
                      Doctor&apos;s Affiliation Proposal:
                    </span>
                    <p className="italic text-ink/90">&quot;{r.message}&quot;</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-surface border border-line rounded-xl p-12 text-center space-y-3">
            <UserPlus className="w-10 h-10 text-muted mx-auto" />
            <p className="text-[15px] font-semibold text-ink">No hospital requests found</p>
            <p className="text-[13px] text-muted max-w-md mx-auto">
              {filter === 'Pending'
                ? 'There are no pending doctor join requests awaiting review.'
                : 'Doctor affiliation proposals will appear here when doctors request to join your hospital.'}
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-xl p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger-bg border border-danger-bd flex items-center justify-center text-danger shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-heading">Decline Doctor Request</h4>
                <p className="text-[12px] text-muted">
                  Decline affiliation request from Dr. {selectedReq.doctorName}.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink">
                Reason / Note (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Department capacity is currently full, or please verify credentials..."
                className="w-full bg-app border border-line rounded-lg px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedReq(null);
                }}
                className="px-4 py-2 border border-line text-muted hover:text-ink text-[13px] rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 bg-danger text-white rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
