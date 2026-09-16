import { t, useLocale } from '../lib/i18n';
import {
  ArrowRight,
  Check,
  Clock3,
  Info,
  LoaderCircle,
  ScanText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { analyze, dateTime, percent } from '../lib/api';
import type { Classification } from '../lib/api';
import { ErrorNotice } from '../components/Common';
import { useAuth } from '../lib/auth';

export function Analyzer() {
  const locale = useLocale();

  const auth = useAuth();
  const exhausted = !auth.user && auth.quota?.remaining === 0;
  const location = useLocation();
  const [text, setText] = useState(() =>
    typeof location.state?.message === 'string' ? location.state.message.slice(0, 5000) : '',
  );
  const [result, setResult] = useState<Classification>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (exhausted) return;
    if (!text.trim()) {
      setError('Please enter a message to analyze.');
      return;
    }
    if (text.length > 5000) {
      setError('Messages must contain at most 5,000 characters.');
      return;
    }
    setError('');
    setResult(undefined);
    setLoading(true);
    try {
      setResult(await analyze(text));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('Please try again.'));
    } finally {
      setLoading(false);
      void auth.refresh();
    }
  }
  function changeText(value: string) {
    setText(value);
    setResult(undefined);
    setError('');
  }
  const spam = result?.label === 'spam';
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('A SECOND LOOK, IN SECONDS')}</div>
          <h1>{t('Message analyzer')}</h1>
          <p>{t('Turn a suspicious text into an informed decision.')}</p>
        </div>
        <span className="outline-chip">
          <ScanText size={15} />
          {t('Text classification')}
        </span>
      </div>
      {!auth.user && (
        <div className={`quota-banner ${exhausted ? 'quota-exhausted' : ''}`} role="status">
          <div>
            <strong>
              {exhausted
                ? t('Your daily guest allowance is used up.')
                : t('{count} of 10 free analyses left today', {
                    count: auth.quota?.remaining ?? '—',
                  })}
            </strong>
            <p>
              {t(
                'Guest results aren’t saved. The allowance resets at 00:00 UTC and is shared on the same network.',
              )}
            </p>
          </div>
          <Link to="/register" className="button secondary">
            {exhausted ? t('Create account to continue') : t('Unlock your free account')}{' '}
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
      {auth.error && <ErrorNotice message={auth.error} retry={() => void auth.refresh()} />}
      <div className="analyzer-grid">
        <section className="card input-card">
          <div className="section-heading">
            <div>
              <h2>{t('What’s in your message?')}</h2>
              <p>{t('Paste a text below. We’ll help you read between the lines.')}</p>
            </div>
            <span className="step-number">01</span>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="message">{t('Message content')}</label>
            <textarea
              id="message"
              placeholder={t('Paste or type a message you’d like to check…')}
              value={text}
              onChange={(e) => changeText(e.target.value)}
              maxLength={5000}
              disabled={loading}
              aria-describedby="message-hint"
            />
            <div className="input-meta" id="message-hint">
              <span>{t('English and Ukrainian supported')}</span>
              <span>{text.length.toLocaleString()} / 5,000</span>
            </div>
            <div className="examples">
              <span>{t('Try an example')}</span>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  changeText(
                    locale === 'uk'
                      ? 'Вітаємо! Ви виграли грошовий приз! Телефонуйте негайно, щоб отримати виграш!'
                      : 'WINNER! You have won a free cash prize! Call now to claim your reward!',
                  )
                }
              >
                {t('Suspicious text')}
                <ArrowRight size={12} />
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  changeText(
                    locale === 'uk'
                      ? 'Привіт! Ми все ще зустрічаємося завтра на обід?'
                      : 'Hey, are we still meeting for lunch tomorrow?',
                  )
                }
              >
                {t('Everyday message')}
                <ArrowRight size={12} />
              </button>
            </div>
            {error && <ErrorNotice message={error} />}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                disabled={loading || !text}
                onClick={() => changeText('')}
              >
                {t('Clear message')}
              </button>
              <button
                className="button primary"
                disabled={loading || exhausted || auth.loading || Boolean(auth.error)}
              >
                {loading ? <LoaderCircle size={17} className="spin" /> : <ScanText size={17} />}
                {loading ? t('Analyzing…') : t('Analyze message')}
              </button>
            </div>
          </form>
          <div className="privacy-note">
            <Info size={15} />
            <span>
              {auth.user
                ? t(
                    'Analyzed messages are saved to your private history. Avoid submitting sensitive personal information.',
                  )
                : t(
                    'Guest messages are processed without being saved. Sign in to keep a private analysis history.',
                  )}
            </span>
          </div>
        </section>
        <section
          className={`card result-card ${result ? (spam ? 'result-spam' : 'result-legitimate') : ''}`}
          aria-live="polite"
          aria-busy={loading}
        >
          <div className="section-heading">
            <h2>{t('Analysis result')}</h2>
            <span className="step-number">02</span>
          </div>
          {result ? (
            <>
              <div className={`result-symbol ${spam ? 'orange' : 'green'}`}>
                {spam ? <ShieldAlert size={36} /> : <ShieldCheck size={36} />}
              </div>
              <span className="eyebrow">{t('MESSAGE CLASSIFICATION')}</span>
              <h2 className="result-label">{spam ? t('Spam') : t('Legitimate')}</h2>
              <p className="result-description">
                {spam
                  ? t('This message shows patterns commonly associated with spam.')
                  : t('This message looks like an everyday conversation.')}
              </p>
              {result.confidence < 0.8 && (
                <p className="uncertainty-note" role="note">
                  {t('Low confidence. Review the sender and context before trusting this result.')}
                </p>
              )}
              <div className="confidence">
                <span>{t('Model confidence')}</span>
                <strong>{percent(result.confidence)}</strong>
              </div>
              <div
                className="probability-bar"
                role="img"
                aria-label={`${t('Spam')} ${percent(result.spamProbability)}, ${t('Legitimate').toLowerCase()} ${percent(result.legitimateProbability)}`}
              >
                <i style={{ width: percent(result.legitimateProbability) }} />
                <i style={{ width: percent(result.spamProbability) }} />
              </div>
              <div className="probability-labels">
                <span>
                  <i className="green-dot" />
                  {t('Legitimate')}
                  <strong>{percent(result.legitimateProbability)}</strong>
                </span>
                <span>
                  <i className="orange-dot" />
                  {t('Spam')}
                  <strong>{percent(result.spamProbability)}</strong>
                </span>
              </div>
              <div className="result-timestamp">
                <Clock3 size={14} />
                <time dateTime={result.createdAt}>{dateTime(result.createdAt)}</time>
              </div>
              {result.savedToHistory ? (
                <Link className="saved-link" to="/history">
                  <Check size={14} />
                  {t('Saved to classification history')}
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <Link className="saved-link" to="/register">
                  {t('Guest result · not saved. Create an account')}
                  <ArrowRight size={14} />
                </Link>
              )}
            </>
          ) : (
            <div className="result-empty">
              <div className="scan-illustration">
                {loading ? (
                  <LoaderCircle size={44} className="spin" />
                ) : (
                  <ScanText size={44} strokeWidth={1.2} />
                )}
              </div>
              <h3>{loading ? t('Reading the signals…') : t('Clarity is one click away')}</h3>
              <p>
                {loading
                  ? t('Checking patterns and calculating probabilities.')
                  : t(
                      'Your classification, confidence, and probability breakdown will appear here.',
                    )}
              </p>
            </div>
          )}
        </section>
      </div>
      <div className="info-cards">
        <div>
          <Sparkles size={20} />
          <h3>{t('Patterns, not rules')}</h3>
          <p>{t('Trained on real messages to recognize the language of spam.')}</p>
        </div>
        <div>
          <ShieldCheck size={20} />
          <h3>{t('Confidence included')}</h3>
          <p>{t('See probabilities for both classes, with every analysis.')}</p>
        </div>
        <div>
          <Info size={20} />
          <h3>{t('A useful second opinion')}</h3>
          <p>{t('Predictions can be wrong. Always use your judgment before responding.')}</p>
        </div>
      </div>
    </>
  );
}
