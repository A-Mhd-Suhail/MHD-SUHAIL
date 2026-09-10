import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Phone, Loader2 } from 'lucide-react';
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, ChatMessage } from '../../lib/types';
import { telLink } from '../../lib/format';
import { ensureThread, sendChatMessage } from '../../lib/fs';
import Modal from '../../components/Modal';
import { PageHeader, inputCls, EmptyState } from '../common';

interface PRow { id: string; name?: string; healthId?: string; phone?: string; photo?: string; specialization?: never }

export default function MessagesTab({ doctorData }: { doctorData: MhdUser }) {
  const [patients, setPatients] = useState<PRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [chatWith, setChatWith] = useState<PRow | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'patient')))
      .then((s) => setPatients(s.docs.map((d) => ({ id: d.id, ...d.data() } as PRow))))
      .catch(() => setPatients([]));
  }, []);

  useEffect(() => {
    if (!chatWith) { setMsgs([]); return; }
    ensureThread(doctorData.id, chatWith.id);
    const u = onSnapshot(query(collection(db, 'threads', `${[doctorData.id, chatWith.id].sort().join('_')}`, 'm'), orderBy('at')), (s) =>
      setMsgs(s.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage))));
    return u;
  }, [chatWith?.id, doctorData.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  if (patients === null) return <div className="max-w-[1200px] mx-auto"><div className="bg-surface border border-line rounded-[4px] p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" /></div></div>;

  const list = patients.filter((p) => (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.healthId || '').toLowerCase().includes(search.toLowerCase()));

  const send = async () => {
    if (!text.trim() || !chatWith) return;
    const t2 = text; setText('');
    try { await sendChatMessage(doctorData, chatWith.id, t2, 'patient'); }
    catch { /* ignore */ }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="💬 Messages" sub="Chat with any patient — they get a notification for each message." />
      <div className="relative max-w-[340px]">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient…" className={inputCls + ' pl-9'} />
        <MessageSquare className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<MessageSquare className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No patients found" sub="Registered patients appear here." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <div key={p.id} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {p.photo ? <img src={p.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-active flex items-center justify-center text-[16px]">🧑</div>}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">{p.name}</p>
                  <p className="text-[11px] text-muted font-mono">{p.healthId}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setChatWith(p)} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium text-primary border border-primary px-3 py-2 rounded-[4px] hover:bg-active transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" /> Chat
                </button>
                {telLink(p.phone) && <a href={telLink(p.phone)!} className="flex items-center justify-center text-[12px] font-medium text-ok border border-ok-bd px-3 py-2 rounded-[4px] hover:bg-ok-bg transition-colors"><Phone className="w-3.5 h-3.5" /></a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {chatWith && (
        <Modal title={`Chat — ${chatWith.name}`} onClose={() => setChatWith(null)}>
          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto custom-scrollbar mb-3">
            {msgs.length === 0 && <p className="text-[13px] text-muted text-center py-6">No messages yet — say hello 👋</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`max-w-[75%] px-3 py-2 rounded-[8px] text-[13px] ${m.from === doctorData.id ? 'self-end bg-primary text-on-navy' : 'self-start bg-app text-ink border border-line'}`}>
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
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
