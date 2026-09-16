import { t, useLocale } from '../lib/i18n';
import { ArrowUpRight, History, ScanText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function GuestOverview() {
  useLocale();

  const { quota } = useAuth();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('A LITTLE CLARITY, BEFORE YOU COMMIT')}</div>
          <h1>{t('Less spam. More clarity.')}</h1>
          <p>
            {t('Try Spamira for free. Create an account when you’re ready to save your insights.')}
          </p>
        </div>
        <Link to="/register" className="button primary">
          {t('Create free account')}
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <section className="about-hero">
        <ShieldCheck size={42} />
        <h2>
          {t('A suspicious message?')}
          <br />
          {t('Get a second opinion.')}
        </h2>
        <p>
          {t(
            'Guests can analyze 10 messages per day. Your message is processed without being saved to a history.',
          )}
        </p>
        <Link className="button ink" to="/analyzer">
          <ScanText size={17} />
          {t('Try the message analyzer')}
        </Link>
      </section>
      <div className="guest-overview-cards">
        <section className="card guest-allowance">
          <span className="eyebrow">{t('TODAY’S GUEST ALLOWANCE')}</span>
          <strong>
            {quota?.remaining ?? '—'} <small>{t('/ 10 remaining')}</small>
          </strong>
          <div className="metric-track">
            <i style={{ width: `${(quota?.remaining ?? 0) * 10}%` }} />
          </div>
          <p>{t('Resets at 00:00 UTC. Sign in to remove the guest limit.')}</p>
        </section>
        <section className="card private-history-card">
          <History size={26} />
          <h2>{t('Your history starts with an account.')}</h2>
          <p>
            {t(
              'Save classifications, search past messages, and see a dashboard of your own activity.',
            )}
          </p>
          <Link to="/login" className="text-link">
            {t('Sign in to your workspace')}
            <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
    </>
  );
}
