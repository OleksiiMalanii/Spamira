import { t, useLocale } from '../lib/i18n';
import {
  AlertCircle,
  ArrowUpRight,
  Inbox,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dateTime, percent } from '../lib/api';
import type { Classification } from '../lib/api';

export function Badge({ label }: { label: string }) {
  useLocale();

  const spam = label === 'spam';
  const Icon = spam ? ShieldAlert : ShieldCheck;
  return (
    <span className={`badge ${spam ? 'spam' : 'legitimate'}`}>
      <Icon size={13} />
      {spam ? t('Spam') : t('Legitimate')}
    </span>
  );
}
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  useLocale();

  return (
    <div role="alert" className="error-notice">
      <AlertCircle size={18} />
      <span>{t(message)}</span>
      {retry && <button onClick={retry}>{t('Try again')}</button>}
    </div>
  );
}
export function Loading() {
  useLocale();

  return (
    <div role="status" className="loading">
      <LoaderCircle className="spin" size={24} />
      <span>{t('Loading your workspace…')}</span>
    </div>
  );
}
export function Empty({ filtered = false }: { filtered?: boolean }) {
  useLocale();

  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={28} />
      </div>
      <h3>{filtered ? t('No matching messages') : t('Your history starts here')}</h3>
      <p>
        {filtered
          ? t('Try a different search or classification filter.')
          : t('Analyze your first message to see your activity here.')}
      </p>
      {!filtered && (
        <Link className="button secondary" to="/analyzer">
          {t('Analyze a message')}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function MessageTable({ items }: { items: Classification[] }) {
  useLocale();

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('Message')}</th>
            <th>{t('Classification')}</th>
            <th>{t('Confidence')}</th>
            <th>{t('Spam probability')}</th>
            <th>{t('Analyzed')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="message-cell">
                <details>
                  <summary title={t('Expand full message')}>
                    {item.message.length > 68 ? `${item.message.slice(0, 68)}…` : item.message}
                  </summary>
                  <p>{item.message}</p>
                  <small>
                    {t('Model:')} {item.modelVersion}
                  </small>
                  <Link className="text-link" to="/analyzer" state={{ message: item.message }}>
                    {t('Analyze again')}
                  </Link>
                </details>
              </td>
              <td>
                <Badge label={item.label} />
              </td>
              <td>
                <span className="confidence-number">{percent(item.confidence)}</span>
                <span className="mini-bar">
                  <i style={{ width: percent(item.confidence) }} />
                </span>
              </td>
              <td className="muted">{percent(item.spamProbability)}</td>
              <td className="date-cell">{dateTime(item.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
