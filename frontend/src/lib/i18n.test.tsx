import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { t, setLocale, useLocale } from './i18n';
function View() {
  useLocale();
  return <h1>{t('Message analyzer')}</h1>;
}
afterEach(() => {
  setLocale('en');
  vi.unstubAllGlobals();
});
it('switches language without remounting the page and persists the choice', () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key),
    setItem: (key: string, value: string) => values.set(key, value),
  });
  render(<View />);
  act(() => setLocale('uk'));
  expect(screen.getByRole('heading')).toHaveTextContent('Аналіз повідомлень');
  expect(document.documentElement.lang).toBe('uk');
  expect(window.localStorage.getItem('spamira.locale')).toBe('uk');
  expect(t('{count} of 10 free analyses left today', { count: 3 })).toContain('3 із 10');
  act(() => setLocale('en'));
  expect(screen.getByRole('heading')).toHaveTextContent('Message analyzer');
});
