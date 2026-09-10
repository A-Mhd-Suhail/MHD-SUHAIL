/* MHD Hospital — 🎙️ voice input (webkitSpeechRecognition).
 * Same behaviour as the original: appends the transcript to the target
 * field, language follows the selected UI language. Chrome/Edge only. */

type SR = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function SRClass(): (new () => SR) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => SR) | null;
}

import { curLang } from './i18n';

export function speechSupported(): boolean {
  return !!SRClass();
}

/**
 * Start listening and resolve with the recognized transcript.
 * onError rejects with a user-facing message.
 */
export function listenOnce(onEnd?: () => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = SRClass();
    if (!Ctor) {
      reject(new Error('Voice input is not supported in this browser. Try Chrome.'));
      return;
    }
    const rec = new Ctor();
    const lang = curLang();
    rec.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      resolve(text);
    };
    const done = (fn: () => void) => () => { onEnd?.(); fn(); };
    rec.onend = done(() => { /* resolved via onresult */ });
    rec.onerror = done(() => reject(new Error('Could not hear you — try again.')));
    rec.start();
  });
}
