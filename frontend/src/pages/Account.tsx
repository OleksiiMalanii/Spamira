import {
  ArrowRight,
  Eye,
  EyeOff,
  History,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorNotice, Loading } from '../components/Common';
import { useAuth } from '../lib/auth';

export function Account({ mode }: { mode: 'login' | 'register' }) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const register = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const destination = location.state?.from === '/history' ? '/history' : '/analyzer';
  if (auth.loading) return <Loading />;
  if (auth.user) return <Navigate to={destination} replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (register)
        await auth.register({ displayName: name.trim(), email: email.trim(), password });
      else await auth.login({ email: email.trim(), password, rememberMe });
      navigate(destination, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR OWN CORNER OF CLARITY</div>
          <h1>{register ? 'Make room for better messages.' : 'Welcome back.'}</h1>
          <p>
            {register
              ? 'Create a free account to keep your insights in one private workspace.'
              : 'Sign in to pick up where you left off.'}
          </p>
        </div>
      </div>
      <div className="account-grid">
        <section className="card account-form">
          <div className="account-icon">
            <LockKeyhole size={25} />
          </div>
          <h2>{register ? 'Create your account' : 'Sign in to Spamira'}</h2>
          <p>
            {register
              ? 'No guest limit. A history that belongs to you.'
              : 'Your messages and analysis history are waiting.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <div className="field">
                <label htmlFor="display-name">Your name</label>
                <input
                  id="display-name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                  placeholder="Alex Morgan"
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-input">
                <input
                  id="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  required
                  minLength={register ? 10 : undefined}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  aria-describedby={register ? 'password-hint' : undefined}
                />
                <button
                  type="button"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {register && (
                <small id="password-hint">
                  10–128 characters, including uppercase and lowercase letters and a number.
                </small>
              )}
            </div>
            {!register && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={busy}
                />
                Keep me signed in on this device
              </label>
            )}
            {error && <ErrorNotice message={error} />}
            <button className="button primary account-submit" disabled={busy}>
              {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
            </button>
          </form>
          <div className="account-switch">
            {register ? 'Already have an account?' : 'New to Spamira?'}{' '}
            <Link to={register ? '/login' : '/register'} state={location.state}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </div>
          <Link className="guest-link" to="/analyzer">
            Continue as a guest
          </Link>
        </section>
        <section className="account-benefits">
          <ShieldCheck size={42} strokeWidth={1.3} />
          <h2>
            More insight.
            <br />
            Entirely yours.
          </h2>
          <div>
            <History size={20} />
            <span>
              <strong>Your private history</strong>
              <p>Revisit results, search your messages, and track your own activity.</p>
            </span>
          </div>
          <div>
            <ShieldCheck size={20} />
            <span>
              <strong>Keep analyzing</strong>
              <p>Signed-in accounts are free from the 10-per-day guest allowance.</p>
            </span>
          </div>
          <div>
            <LockKeyhole size={20} />
            <span>
              <strong>Private by default</strong>
              <p>Only your account can access your saved messages and results.</p>
            </span>
          </div>
          <small>Trying things out? Guests get 10 analyses a day, without saved history.</small>
        </section>
      </div>
    </>
  );
}
