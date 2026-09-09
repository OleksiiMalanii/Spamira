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
import { Link } from 'react-router-dom';
import { analyze, dateTime, percent } from '../lib/api';
import type { Classification } from '../lib/api';
import { ErrorNotice } from '../components/Common';

export function Analyzer() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<Classification>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
      setError(reason instanceof Error ? reason.message : 'Please try again.');
    } finally {
      setLoading(false);
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
          <div className="eyebrow">A SECOND LOOK, IN SECONDS</div>
          <h1>Message analyzer</h1>
          <p>Turn a suspicious text into an informed decision.</p>
        </div>
        <span className="outline-chip">
          <ScanText size={15} /> Text classification
        </span>
      </div>
      <div className="analyzer-grid">
        <section className="card input-card">
          <div className="section-heading">
            <div>
              <h2>What’s in your message?</h2>
              <p>Paste a text below. We’ll help you read between the lines.</p>
            </div>
            <span className="step-number">01</span>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="message">Message content</label>
            <textarea
              id="message"
              placeholder="Paste or type a message you’d like to check…"
              value={text}
              onChange={(e) => changeText(e.target.value)}
              maxLength={5000}
              disabled={loading}
              aria-describedby="message-hint"
            />
            <div className="input-meta" id="message-hint">
              <span>English text works best</span>
              <span>{text.length.toLocaleString()} / 5,000</span>
            </div>
            <div className="examples">
              <span>Try an example</span>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  changeText(
                    'WINNER! You have won a free cash prize! Call now to claim your reward!',
                  )
                }
              >
                Suspicious text <ArrowRight size={12} />
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => changeText('Hey, are we still meeting for lunch tomorrow?')}
              >
                Everyday message <ArrowRight size={12} />
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
                Clear message
              </button>
              <button className="button primary" disabled={loading}>
                {loading ? <LoaderCircle size={17} className="spin" /> : <ScanText size={17} />}
                {loading ? 'Analyzing…' : 'Analyze message'}
              </button>
            </div>
          </form>
          <div className="privacy-note">
            <Info size={15} />
            <span>
              Analyzed messages are saved to your workspace history. Avoid submitting sensitive
              personal information.
            </span>
          </div>
        </section>
        <section
          className={`card result-card ${result ? (spam ? 'result-spam' : 'result-legitimate') : ''}`}
          aria-live="polite"
          aria-busy={loading}
        >
          <div className="section-heading">
            <h2>Analysis result</h2>
            <span className="step-number">02</span>
          </div>
          {result ? (
            <>
              <div className={`result-symbol ${spam ? 'orange' : 'green'}`}>
                {spam ? <ShieldAlert size={36} /> : <ShieldCheck size={36} />}
              </div>
              <span className="eyebrow">MESSAGE CLASSIFICATION</span>
              <h2 className="result-label">{spam ? 'Spam' : 'Legitimate'}</h2>
              <p className="result-description">
                {spam
                  ? 'This message shows patterns commonly associated with spam.'
                  : 'This message looks like an everyday conversation.'}
              </p>
              <div className="confidence">
                <span>Model confidence</span>
                <strong>{percent(result.confidence)}</strong>
              </div>
              <div
                className="probability-bar"
                role="img"
                aria-label={`Spam ${percent(result.spamProbability)}, legitimate ${percent(result.legitimateProbability)}`}
              >
                <i style={{ width: percent(result.legitimateProbability) }} />
                <i style={{ width: percent(result.spamProbability) }} />
              </div>
              <div className="probability-labels">
                <span>
                  <i className="green-dot" />
                  Legitimate<strong>{percent(result.legitimateProbability)}</strong>
                </span>
                <span>
                  <i className="orange-dot" />
                  Spam<strong>{percent(result.spamProbability)}</strong>
                </span>
              </div>
              <div className="result-timestamp">
                <Clock3 size={14} />
                <time dateTime={result.createdAt}>{dateTime(result.createdAt)}</time>
              </div>
              <Link className="saved-link" to="/history">
                <Check size={14} />
                Saved to classification history <ArrowRight size={14} />
              </Link>
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
              <h3>{loading ? 'Reading the signals…' : 'Clarity is one click away'}</h3>
              <p>
                {loading
                  ? 'Checking patterns and calculating probabilities.'
                  : 'Your classification, confidence, and probability breakdown will appear here.'}
              </p>
            </div>
          )}
        </section>
      </div>
      <div className="info-cards">
        <div>
          <Sparkles size={20} />
          <h3>Patterns, not rules</h3>
          <p>Trained on real messages to recognize the language of spam.</p>
        </div>
        <div>
          <ShieldCheck size={20} />
          <h3>Confidence included</h3>
          <p>See probabilities for both classes, with every analysis.</p>
        </div>
        <div>
          <Info size={20} />
          <h3>A useful second opinion</h3>
          <p>Predictions can be wrong. Always use your judgment before responding.</p>
        </div>
      </div>
    </>
  );
}
