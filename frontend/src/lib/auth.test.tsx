import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './auth';
import { request } from './api';

vi.mock('./api', () => ({ request: vi.fn() }));

function SessionView() {
  const auth = useAuth();
  return (
    <>
      <span>{auth.loading ? 'Loading' : auth.user?.displayName || 'Guest'}</span>
      <button
        onClick={() =>
          void auth.login({
            email: 'alex@example.com',
            password: 'ExamplePassword123',
            rememberMe: false,
          })
        }
      >
        Login
      </button>
    </>
  );
}

it('ignores a stale guest refresh that finishes after sign-in', async () => {
  const guest = { user: null, guestQuota: null };
  let finishRefresh: (value: unknown) => void = () => {};
  vi.mocked(request)
    .mockResolvedValueOnce(guest)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRefresh = resolve;
        }),
    )
    .mockResolvedValueOnce({ id: 'member', displayName: 'Alex', email: 'alex@example.com' });
  render(
    <AuthProvider>
      <SessionView />
    </AuthProvider>,
  );
  await screen.findByText('Guest');
  fireEvent(window, new Event('focus'));
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await screen.findByText('Alex');
  await act(async () => finishRefresh(guest));
  expect(screen.getByText('Alex')).toBeInTheDocument();
  expect(screen.queryByText('Guest')).not.toBeInTheDocument();
});
