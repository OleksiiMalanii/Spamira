import { afterEach, expect, it, vi } from 'vitest';
import { analyze } from './api';
afterEach(() => vi.unstubAllGlobals());
it('rejects invalid response contracts', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ label: 'spam' }), { status: 200 })),
  );
  await expect(analyze('hello')).rejects.toThrow('unexpected response');
});
it('handles network failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
  await expect(analyze('hello')).rejects.toThrow('Unable to connect');
});
it('surfaces structured API errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Please try again later.' }), { status: 503 }),
      ),
  );
  await expect(analyze('hello')).rejects.toThrow('Please try again later.');
});
