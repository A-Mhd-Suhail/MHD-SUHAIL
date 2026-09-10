import { useState } from 'react';
import { Mic } from 'lucide-react';
import { listenOnce, speechSupported } from '../lib/voice';
import { toast } from './Toaster';

/* 🎙️ Voice-input button (ported from the original app's mic feature).
 * Appends the recognized text to the controlled field via onText. */
export default function MicButton({ onText }: { onText: (text: string) => void }) {
  const [rec, setRec] = useState(false);

  if (!speechSupported()) {
    return (
      <button
        type="button"
        title="Voice input needs Chrome"
        onClick={() => toast('Voice input is not supported in this browser. Try Chrome.', 'err')}
        className="shrink-0 w-[40px] h-[40px] flex items-center justify-center rounded-[4px] border border-line text-muted hover:bg-app transition-colors"
      >
        <Mic className="w-4 h-4" strokeWidth={1.5} />
      </button>
    );
  }

  const start = async () => {
    if (rec) return;
    setRec(true);
    try {
      const text = await listenOnce(() => setRec(false));
      if (text) onText(text);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Voice input failed.', 'err');
    } finally {
      setRec(false);
    }
  };

  return (
    <button
      type="button"
      title="Speak"
      onClick={start}
      className={`shrink-0 w-[40px] h-[40px] flex items-center justify-center rounded-[4px] border transition-colors ${
        rec
          ? 'border-danger-bd bg-danger-bg text-danger animate-pulse'
          : 'border-line text-muted hover:bg-app'
      }`}
    >
      <Mic className="w-4 h-4" strokeWidth={1.5} />
    </button>
  );
}
