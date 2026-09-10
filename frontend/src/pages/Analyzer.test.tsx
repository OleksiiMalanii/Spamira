import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Analyzer } from './Analyzer';
import { analyze } from '../lib/api';
import { useAuth } from '../lib/auth';
vi.mock('../lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  analyze: vi.fn(),
}));

describe('Message analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'member', displayName: 'Member', email: 'member@example.com' },
      quota: null,
      loading: false,
      error: '',
      refresh: vi.fn().mockResolvedValue(undefined),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });
  it('blocks exhausted guests and offers an account', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...useAuth(),
      user: null,
      quota: { limit: 10, used: 10, remaining: 0, resetsAt: '2026-09-10T00:00:00Z' },
    });
    render(
      <MemoryRouter>
        <Analyzer />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Analyze message' })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Create account to continue/ })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(analyze).not.toHaveBeenCalled();
  });
  it('rejects whitespace without calling the service', async () => {
    render(
      <MemoryRouter>
        <Analyzer />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Message content'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Analyze message' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a message');
    expect(analyze).not.toHaveBeenCalled();
  });
  it('shows both probabilities and clears stale results when text changes', async () => {
    vi.mocked(analyze).mockResolvedValue({
      id: 'e0c76ed2-f4a4-487f-8b97-51196dc7613b',
      message: 'test',
      label: 'spam',
      confidence: 0.96,
      spamProbability: 0.96,
      legitimateProbability: 0.04,
      createdAt: '2026-09-09T00:00:00Z',
      modelVersion: 'v1',
      processingTimeMs: 12,
      savedToHistory: true,
    });
    render(
      <MemoryRouter>
        <Analyzer />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Message content'), 'test');
    await userEvent.click(screen.getByRole('button', { name: 'Analyze message' }));
    expect(await screen.findByRole('heading', { name: 'Spam' })).toBeInTheDocument();
    expect(screen.getByText('4.0%')).toBeInTheDocument();
    expect(screen.getAllByText('96.0%')).toHaveLength(2);
    await userEvent.type(screen.getByLabelText('Message content'), ' changed');
    expect(screen.queryByRole('heading', { name: 'Spam' })).not.toBeInTheDocument();
  });
  it('shows a friendly service error', async () => {
    vi.mocked(analyze).mockRejectedValue(
      new Error('The classification service is temporarily unavailable.'),
    );
    render(
      <MemoryRouter>
        <Analyzer />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Message content'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: 'Analyze message' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(screen.getByRole('button', { name: 'Analyze message' })).toBeEnabled();
  });
});
