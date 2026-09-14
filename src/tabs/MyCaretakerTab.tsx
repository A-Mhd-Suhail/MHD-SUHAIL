import { useEffect, useState } from 'react';
import { HeartHandshake, MessageSquare, Phone, Send } from 'lucide-react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser } from '../lib/types';
import { telLink } from '../lib/format';
import { ensureThread, sendChatMessage, threadId } from '../lib/fs';
import { toast } from '../components/Toaster';
import { EmptyState, PageHeader } from './common';

type ChatMessage = { id: string; from: string; text: string; at: number };

export default function MyCaretakerTab({ patientData }: { patientData: MhdUser }) {
  const [patient, setPatient] = useState(patientData);
  const [caretaker, setCaretaker] = useState<MhdUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');

  useEffect(() => onSnapshot(doc(db, 'users', patientData.id), (snap) => {
    if (snap.exists()) setPatient({ id: snap.id, ...snap.data() } as MhdUser);
  }), [patientData.id]);

  useEffect(() => {
    const assignment = patient.caretakerAssignment;
    if (!assignment || assignment.status !== 'accepted') { setCaretaker(null); return; }
    return onSnapshot(doc(db, 'users', assignment.caretakerId), (snap) => {
      if (snap.exists() && snap.data().role === 'caretaker') setCaretaker({ id: snap.id, ...snap.data() } as MhdUser);
      else setCaretaker(null);
    });
  }, [patient.caretakerAssignment?.caretakerId, patient.caretakerAssignment?.status]);

  useEffect(() => {
    if (!caretaker) { setMessages([]); return; }
    const tid = threadId(patient.id, caretaker.id);
    void ensureThread(patient.id, caretaker.id);
    return onSnapshot(query(collection(db, 'threads', tid, 'm'), orderBy('at')), (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) })));
    }, () => setMessages([]));
  }, [patient.id, caretaker?.id]);

  const send = async () => {
    if (!caretaker || !text.trim()) return;
    const message = text.trim();
    setText('');
    try { await sendChatMessage(patient, caretaker.id, message, 'caretaker'); }
    catch { setText(message); toast('Could not send message', 'err'); }
  };

  return <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
    <PageHeader title="My Caretaker" sub="Contact only the caretaker assigned to you by your doctor." />
    {!caretaker ? (
      <EmptyState icon={<HeartHandshake className="w-8 h-8 text-ghost mx-auto" />} title={patient.caretakerAssignment?.status === 'pending' ? 'Caretaker awaiting acceptance' : 'No active caretaker'} sub={patient.caretakerAssignment?.status === 'pending' ? 'Your caretaker will appear here after accepting the assignment.' : 'Your doctor can assign a caretaker to your care plan.'} />
    ) : <>
      <section className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-active flex items-center justify-center text-primary"><HeartHandshake /></div>
          <div className="flex-1"><h2 className="font-semibold text-heading">{caretaker.name}</h2><p className="text-sm text-muted">Assigned caretaker · {caretaker.state || ''}{caretaker.district ? `, ${caretaker.district}` : ''}</p></div>
        </div>
        <div className="flex gap-2 mt-4">
          {telLink(caretaker.phone) && <a href={telLink(caretaker.phone)!} className="flex-1 inline-flex justify-center items-center gap-2 px-3 py-2 rounded-md border border-ok-bd text-ok"><Phone className="w-4 h-4" /> Call caretaker</a>}
          <button onClick={() => document.getElementById('caretaker-message')?.focus()} className="flex-1 inline-flex justify-center items-center gap-2 px-3 py-2 rounded-md bg-primary text-white"><MessageSquare className="w-4 h-4" /> Message caretaker</button>
        </div>
      </section>
      <section className="bg-surface border border-line rounded-lg p-5">
        <h3 className="font-semibold mb-3">Private conversation</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto mb-4">{messages.length ? messages.map((m) => <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from === patient.id ? 'ml-auto bg-primary text-white' : 'bg-app text-ink'}`}>{m.text}</div>) : <p className="text-sm text-muted">No messages yet.</p>}</div>
        <div className="flex gap-2"><input id="caretaker-message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void send(); }} placeholder="Write to your caretaker…" className="flex-1 h-10 px-3 border border-line rounded-md bg-app" /><button onClick={() => void send()} className="px-4 rounded-md bg-primary text-white" aria-label="Send message"><Send className="w-4 h-4" /></button></div>
      </section>
    </>}
  </div>;
}
