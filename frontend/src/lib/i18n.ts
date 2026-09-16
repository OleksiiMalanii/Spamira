import { useSyncExternalStore } from 'react';
import ukrainian from './uk.json';
export type Locale = 'en' | 'uk';
const listeners = new Set<() => void>();
function initialLocale(): Locale {
  try {
    const saved = window.localStorage.getItem('spamira.locale');
    if (saved === 'en' || saved === 'uk') return saved;
  } catch {
    /* Storage is optional. */
  }
  return navigator.language.toLowerCase().startsWith('uk') ? 'uk' : 'en';
}
let locale: Locale = initialLocale();
export const getLocale = () => locale;
export function setLocale(next: Locale) {
  locale = next;
  document.documentElement.lang = next;
  document.title =
    next === 'uk' ? 'Spamira — Аналіз повідомлень' : 'Spamira — Message intelligence';
  try {
    window.localStorage.setItem('spamira.locale', next);
  } catch {
    /* Storage is optional. */
  }
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useLocale = () => useSyncExternalStore(subscribe, getLocale);
export function t(message: string, values: Record<string, string | number> = {}): string {
  const translated =
    locale === 'uk' ? (ukrainian as Record<string, string>)[message] || message : message;
  return translated.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
setLocale(locale);
window.addEventListener('storage', (event) => {
  if (event.key === 'spamira.locale' && (event.newValue === 'en' || event.newValue === 'uk'))
    setLocale(event.newValue);
});
