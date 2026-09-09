import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  MessagesSquare,
  ScanText,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardSchema } from '../lib/api';
import { useResource } from '../lib/useResource';
import { Empty, ErrorNotice, Loading, MessageTable } from '../components/Common';

export function Dashboard() {
  const { data, error, loading, refresh } = useResource('/dashboard/stats', dashboardSchema);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR MESSAGE INTELLIGENCE, AT A GLANCE</div>
          <h1>Less spam. More clarity.</h1>
          <p>A clear view of your messages and what’s worth your attention.</p>
        </div>
        <Link to="/analyzer" className="button primary">
          <ScanText size={17} />
          Analyze message
        </Link>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNotice message={error} retry={refresh} />
      ) : (
        data && (
          <>
            <div className="stats-grid">
              {[
                {
                  title: 'Messages analyzed',
                  value: data.totalAnalyzed.toLocaleString(),
                  note: 'Across your workspace',
                  icon: MessagesSquare,
                  tone: 'neutral',
                },
                {
                  title: 'Spam detected',
                  value: data.spamCount.toLocaleString(),
                  note: 'Flagged for your attention',
                  icon: ShieldAlert,
                  tone: 'orange',
                },
                {
                  title: 'Legitimate messages',
                  value: data.legitimateCount.toLocaleString(),
                  note: 'A little peace of mind',
                  icon: ShieldCheck,
                  tone: 'green',
                },
                {
                  title: 'Spam rate',
                  value: `${data.spamPercentage.toFixed(1)}%`,
                  note: 'Of all analyzed messages',
                  icon: TrendingUp,
                  tone: 'neutral',
                },
              ].map(({ title, value, note, icon: Icon, tone }) => (
                <section className="stat-card" key={title}>
                  <div className="stat-top">
                    <span>{title}</span>
                    <span className={`stat-icon ${tone}`}>
                      <Icon size={18} />
                    </span>
                  </div>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </section>
              ))}
            </div>
            <div className="overview-grid">
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="hero-kicker">
                    <span /> BUILT TO SPOT THE SIGNAL
                  </span>
                  <h2>
                    Suspicious message?
                    <br />
                    Get a second opinion.
                  </h2>
                  <p>
                    Go beyond a gut feeling. Check any text for spam and see the confidence behind
                    every result.
                  </p>
                  <Link to="/analyzer" className="button ink">
                    Open message analyzer <ArrowUpRight size={17} />
                  </Link>
                  <small>No guesswork. Just a clearer picture.</small>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="floating-message message-one">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="floating-message message-two">
                    <span />
                    <span />
                  </div>
                  <div className="shield-art">
                    <ShieldCheck size={70} strokeWidth={1.35} />
                  </div>
                  <div className="art-pill">
                    <ShieldCheck size={13} /> Signal found
                  </div>
                  <i className="spark spark-one">+</i>
                  <i className="spark spark-two">+</i>
                </div>
              </section>
              <section className="card distribution">
                <div className="section-heading">
                  <h2>Message breakdown</h2>
                  <span className="muted">All time</span>
                </div>
                <div
                  className="donut"
                  style={{
                    background: data.totalAnalyzed
                      ? `conic-gradient(#e88756 0% ${data.spamPercentage}%, #45987b ${data.spamPercentage}% 100%)`
                      : '#e8ece8',
                  }}
                  role="img"
                  aria-label={`${data.spamCount} spam and ${data.legitimateCount} legitimate messages`}
                >
                  <div>
                    <strong>{data.totalAnalyzed.toLocaleString()}</strong>
                    <span>Total messages</span>
                  </div>
                </div>
                <div className="legend">
                  <span>
                    <i className="green-dot" />
                    Legitimate
                  </span>
                  <strong>{data.legitimateCount.toLocaleString()}</strong>
                  <span>
                    <i className="orange-dot" />
                    Spam
                  </span>
                  <strong>{data.spamCount.toLocaleString()}</strong>
                </div>
              </section>
            </div>
            <section className="card recent-card">
              <div className="section-heading">
                <div>
                  <h2>Recent classifications</h2>
                  <p>Your latest messages, with the noise sorted out.</p>
                </div>
                <Link to="/history" className="text-link">
                  View history <ArrowRight size={15} />
                </Link>
              </div>
              {data.recentClassifications.length ? (
                <MessageTable items={data.recentClassifications} />
              ) : (
                <Empty />
              )}
            </section>
            <div className="model-strip">
              <span className={`status-dot ${data.modelStatus}`} />
              <strong>Model {data.modelStatus}</strong>
              <span className="strip-divider" />
              <span>TF-IDF + Logistic Regression</span>
              <Link to="/metrics">
                View performance <ArrowUpRight size={14} />
              </Link>
              <Clock3 size={15} className="strip-clock" />
            </div>
          </>
        )
      )}
    </>
  );
}
