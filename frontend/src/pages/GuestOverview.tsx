import { ArrowUpRight, History, ScanText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function GuestOverview() {
  const { quota } = useAuth();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A LITTLE CLARITY, BEFORE YOU COMMIT</div>
          <h1>Less spam. More clarity.</h1>
          <p>Try Spamira for free. Create an account when you’re ready to save your insights.</p>
        </div>
        <Link to="/register" className="button primary">
          Create free account <ArrowUpRight size={16} />
        </Link>
      </div>
      <section className="about-hero">
        <ShieldCheck size={42} />
        <h2>
          A suspicious message?
          <br />
          Get a second opinion.
        </h2>
        <p>
          Guests can analyze 10 messages per day. Your message is processed without being saved to a
          history.
        </p>
        <Link className="button ink" to="/analyzer">
          <ScanText size={17} />
          Try the message analyzer
        </Link>
      </section>
      <div className="guest-overview-cards">
        <section className="card guest-allowance">
          <span className="eyebrow">TODAY’S GUEST ALLOWANCE</span>
          <strong>
            {quota?.remaining ?? '—'} <small>/ 10 remaining</small>
          </strong>
          <div className="metric-track">
            <i style={{ width: `${(quota?.remaining ?? 0) * 10}%` }} />
          </div>
          <p>Resets at 00:00 UTC. Sign in to remove the guest limit.</p>
        </section>
        <section className="card private-history-card">
          <History size={26} />
          <h2>Your history starts with an account.</h2>
          <p>
            Save classifications, search past messages, and see a dashboard of your own activity.
          </p>
          <Link to="/login" className="text-link">
            Sign in to your workspace <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
    </>
  );
}
