import { useSyncExternalStore } from 'react';
import { LANGS, curLang, setLanguage, LANG_EVENT } from '../lib/i18n';
import { applyTheme, getTheme, type ThemeName } from '../lib/prefs';
import { toast } from './Toaster';

/* Language + theme selects (top bar / auth / settings) — same options as the
 * original app: 10 languages, light/dark/pink themes. */

let version = 0;
const listeners = new Set<() => void>();
window.addEventListener(LANG_EVENT, () => { version++; listeners.forEach((l) => l()); });

function useLangVersion() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => version,
  );
}

export function LangSelect({ className = '' }: { className?: string }) {
  useLangVersion();
  return (
    <select
      title="Language"
      value={curLang()}
      onChange={(e) => { setLanguage(e.target.value); toast('🌐 Language updated ✅'); }}
      className={className || 'h-[36px] border border-line rounded-[4px] bg-surface text-ink text-[12px] px-2 focus:outline-none focus:border-primary transition-colors'}
    >
      {LANGS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
    </select>
  );
}

export function ThemeSelect({ className = '' }: { className?: string }) {
  return (
    <select
      title="Theme"
      value={getTheme()}
      onChange={(e) => { applyTheme(e.target.value as ThemeName); toast('Theme changed ✅'); }}
      className={className || 'h-[36px] border border-line rounded-[4px] bg-surface text-ink text-[12px] px-2 focus:outline-none focus:border-primary transition-colors'}
    >
      <option value="light">☀️ Light Mode</option>
      <option value="dark">🌙 Dark Mode</option>
      <option value="pink">💗 Pink Mode</option>
    </select>
  );
}
