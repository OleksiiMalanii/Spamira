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
  const spam = label === 'spam';
  const Icon = spam ? ShieldAlert : ShieldCheck;
  return (
    <span className={`badge ${spam ? 'spam' : 'legitimate'}`}>
      <Icon size={13} />
      {spam ? 'Spam' : 'Legitimate'}
    </span>
  );
}
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="error-notice">
      <AlertCircle size={18} />
      <span>{message}</span>
      {retry && <button onClick={retry}>Try again</button>}
    </div>
  );
}
export function Loading() {
  return (
    <div role="status" className="loading">
      <LoaderCircle className="spin" size={24} />
      <span>Loading your workspace…</span>
    </div>
  );
}
export function Empty({ filtered = false }: { filtered?: boolean }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={28} />
      </div>
      <h3>{filtered ? 'No matching messages' : 'Your history starts here'}</h3>
      <p>
        {filtered
          ? 'Try a different search or classification filter.'
          : 'Analyze your first message to see your activity here.'}
      </p>
      {!filtered && (
        <Link className="button secondary" to="/analyzer">
          Analyze a message <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function MessageTable({ items }: { items: Classification[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Message</th>
            <th>Classification</th>
            <th>Confidence</th>
            <th>Spam probability</th>
            <th>Analyzed</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="message-cell">
                <details>
                  <summary title="Expand full message">
                    {item.message.length > 68 ? `${item.message.slice(0, 68)}…` : item.message}
                  </summary>
                  <p>{item.message}</p>
                  <small>Model: {item.modelVersion}</small>
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
