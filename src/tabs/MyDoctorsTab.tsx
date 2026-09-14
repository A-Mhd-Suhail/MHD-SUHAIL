import { useEffect, useRef, useState } from 'react';
import { Stethoscope, Phone, MapPin, MessageSquare, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MhdUser } from '../lib/types';
import { telLink } from '../lib/format';
import { ensureThread, sendChatMessage } from '../lib/fs';
import Modal from '../components/Modal';
import { toast } from '../components/Toaster';
import { PageHeader, Loading, EmptyState, StatusChip } from './common';

interface DocRow { id: string; name?: string; specialization?: string; experience?: string; hospital?: string; regNo?: string; phone?: string; photo?: string; onDuty?: boolean; location?: { lat: number; lng: number; updatedAt: number } }

export default function MyDoctorsTab({ patientData }: { patientData: MhdUser }) {
  const [doctors, setDoctors] = useState<DocRow[] | null>(null);
  const [chatWith, setChatWith] = useState<DocRow | null>(null);
  const [msgs, setMsgs] = useState<{ id: string; from: string; text: string; at: number }[]>([]);
  const [text, setText] = useState('');
  const [locating, setLocating] = useState(false);
  const mapDiv = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    import('firebase/firestore').then(({ collection, getDocs, query, where }) =>
      Promise.all([
        getDocs(query(collection(db2, 'users'), where('role', '==', 'doctor'))),
        getDocs(query(collection(db2, 'appointments'), where('patientId', '==', patientData.id), where('confirmed', '==', true))),
      ]).then(([doctorSnap, appointmentSnap]) => {
        const acceptedIds = new Set(appointmentSnap.docs.map((d) => d.data().doctorId as string));
        setDoctors(doctorSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DocRow)).filter((d) => acceptedIds.has(d.id)));
      })
        .catch(() => setDoctors([])));
  }, [patientData.id]);

  // Leaflet map of on-duty doctors
  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;
    try {
      const map = L.map(mapDiv.current).setView([11.0168, 76.9558], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
      mapRef.current = map;
    } catch { /* ignore */ }
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, [!!doctors]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !doctors) return;
    const fresh = (d: DocRow) => d.onDuty && d.location && Date.now() - d.location.updatedAt < 6 * 60 * 1000;
    const withLoc = doctors.filter(fresh);
    doctors.forEach((d) => {
      if (!fresh(d) || !d.location) return;
      L.marker([d.location.lat, d.location.lng])
        .addTo(map)
        .bindPopup(`<b>Dr. ${d.name}</b><br/>${d.specialization || ''}`);
    });
    if (withLoc.length === 1) map.setView([withLoc[0].location!.lat, withLoc[0].location!.lng], 13);
    else if (withLoc.length > 1) map.fitBounds(withLoc.map((d) => [d.location!.lat, d.location!.lng]));
    setLocating(false);
  }, [doctors]);

  // chat subscribe
  useEffect(() => {
    if (!chatWith) { setMsgs([]); return; }
    let unsub: (() => void) | null = null;
    ensureThread(patientData.id, chatWith.id);
    import('firebase/firestore').then(async ({ collection, onSnapshot, orderBy, query }) => {
      const { threadId } = await import('../lib/fs');
      unsub = onSnapshot(query(collection(db2, 'threads', threadId(patientData.id, chatWith.id), 'm'), orderBy('at')), (s) => {
        setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as { from: string; text: string; at: number }) })));
      });
    });
    return () => unsub?.();
  }, [chatWith?.id, patientData.id]);

  if (doctors === null) return <div className="max-w-[1000px] mx-auto space-y-6"><Loading /></div>;

  const onDuty = doctors.filter((d) => d.onDuty && d.location && Date.now() - d.location.updatedAt < 6 * 60 * 1000);

  const send = async () => {
    if (!text.trim() || !chatWith) return;
    const t2 = text; setText('');
    try { await sendChatMessage(patientData, chatWith.id, t2, 'doctor'); }
    catch { toast('Could not send message', 'err'); }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title="My Doctors" sub="Doctors who accepted your appointments. Message or call them directly." />

      {doctors.length === 0 ? (
        <EmptyState icon={<Stethoscope className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No doctors registered yet" sub="Doctors will appear here once they register." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {doctors.map((d, i) => (
            <div key={`${d.id}-${i}`} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {d.photo ? <img src={d.photo} alt="" className="w-11 h-11 rounded-full object-cover" />
                  : <div className="w-11 h-11 rounded-full bg-active flex items-center justify-center text-[16px] font-semibold text-primary">{(d.name || "?").charAt(0)}</div>}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">Dr. {d.name}</p>
                  <p className="text-[12px] text-muted truncate">{d.specialization || 'General'} · {d.hospital || 'MHD Hospital'}</p>
                </div>
                {d.onDuty && d.location && Date.now() - d.location.updatedAt < 6 * 60 * 1000
                  ? <StatusChip ok>On Duty</StatusChip> : <StatusChip warn>Off Duty</StatusChip>}
              </div>
              <p className="text-[12px] text-muted mt-2">{d.experience ? `${d.experience} yrs · ` : ''}Reg: {d.regNo || '—'}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setChatWith(d)} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium text-primary border border-primary px-3 py-2 rounded-[4px] hover:bg-active transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" /> Message
                </button>
                {telLink(d.phone) && (
                  <a href={telLink(d.phone)!} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium text-ok border border-ok-bd px-3 py-2 rounded-[4px] hover:bg-ok-bg transition-colors">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                )}
                {d.location && (
                  <a href={`https://www.google.com/maps?q=${d.location.lat},${d.location.lng}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted border border-line px-3 py-2 rounded-[4px] hover:bg-app transition-colors">
                    <MapPin className="w-3.5 h-3.5" /> Locate
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live map */}
      <div className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
        <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-3">Live doctor locations ({onDuty.length} on duty) {locating && <Loader2 className="w-3 h-3 animate-spin inline" />}</h4>
        <div ref={mapDiv} className="leaflet-map" />
        <p className="text-[11px] text-muted mt-2">Doctors who are ON DUTY with fresh location appear here (updates every few minutes).</p>
      </div>

      {/* Chat modal */}
      {chatWith && (
        <Modal title={`Chat with Dr. ${chatWith.name}`} onClose={() => setChatWith(null)}>
          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto custom-scrollbar mb-3">
            {msgs.length === 0 && <p className="text-[13px] text-muted text-center py-6">No messages yet — say hello</p>}
            {msgs.map((m, i) => (
              <div key={`${m.id || 'msg'}-${i}`} className={`max-w-[75%] px-3 py-2 rounded-[8px] text-[13px] ${m.from === patientData.id ? 'self-end bg-primary text-on-navy' : 'self-start bg-app text-ink border border-line'}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message…" className="flex-1 h-[40px] border border-line rounded-[4px] px-3 text-[13px] text-ink focus:outline-none focus:border-primary" />
            <button onClick={send} className="h-[40px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d">Send</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { db as db2 } from '../firebase';
