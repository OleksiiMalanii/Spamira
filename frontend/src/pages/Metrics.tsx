import { t, useLocale } from '../lib/i18n';
import { ChartNoAxesCombined, Info } from 'lucide-react';
import { metricsSchema, percent } from '../lib/api';
import { useResource } from '../lib/useResource';
import { ErrorNotice, Loading } from '../components/Common';

export function Metrics() {
  const locale = useLocale();

  const { data, loading, error, refresh } = useResource('/model/metrics', metricsSchema);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('TRANSPARENCY, BY DESIGN')}</div>
          <h1>{t('Behind the predictions')}</h1>
          <p>{t('Measured performance on messages the model hasn’t seen during training.')}</p>
        </div>
        <span className="outline-chip">
          <ChartNoAxesCombined size={15} />
          {t('Model metrics')}
        </span>
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
                [t('Accuracy'), data.accuracy, t('Correct predictions across all messages')],
                [t('Precision'), data.precision, t('Flagged messages that are actually spam')],
                [t('Recall'), data.recall, t('Actual spam successfully detected')],
                [t('F1-score'), data.f1Score, t('Balance between precision and recall')],
              ].map(([name, value, description]) => (
                <section className="stat-card metric-stat" key={String(name)}>
                  <span>{name}</span>
                  <strong>{percent(Number(value))}</strong>
                  <div className="metric-track">
                    <i style={{ width: percent(Number(value)) }} />
                  </div>
                  <small>{description}</small>
                </section>
              ))}
            </div>
            {data.perLanguage && (
              <section className="card language-metrics">
                <h2>{t('Performance by language')}</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {['Language', 'Accuracy', 'Precision', 'Recall', 'F1-score', 'Samples'].map(
                          (label) => (
                            <th key={label}>{t(label)}</th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.perLanguage).map(([lang, metrics]) => (
                        <tr key={lang}>
                          <td>{t(lang === 'uk' ? 'Ukrainian' : 'English')}</td>
                          <td>{percent(metrics.accuracy)}</td>
                          <td>{percent(metrics.precision)}</td>
                          <td>{percent(metrics.recall)}</td>
                          <td>{percent(metrics.f1Score)}</td>
                          <td>{metrics.testSamples}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            <div className="metrics-grid">
              <section className="card matrix-card">
                <div className="section-heading">
                  <div>
                    <h2>{t('Confusion matrix')}</h2>
                    <p>{t('Where the model gets it right — and where it doesn’t.')}</p>
                  </div>
                </div>
                <div className="matrix-predicted">{t('PREDICTED CLASS')}</div>
                <div className="matrix-layout">
                  <div className="matrix-actual">{t('ACTUAL CLASS')}</div>
                  <table className="matrix">
                    <thead>
                      <tr>
                        <th aria-label={t('Actual versus predicted')} />
                        <th>{t('Legitimate')}</th>
                        <th>{t('Spam')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>{t('Legitimate')}</th>
                        <td className="correct">
                          <strong>{data.confusionMatrix[0][0]}</strong>
                          <span>{t('True negatives')}</span>
                        </td>
                        <td className="incorrect">
                          <strong>{data.confusionMatrix[0][1]}</strong>
                          <span>{t('False positives')}</span>
                        </td>
                      </tr>
                      <tr>
                        <th>{t('Spam')}</th>
                        <td className="incorrect">
                          <strong>{data.confusionMatrix[1][0]}</strong>
                          <span>{t('False negatives')}</span>
                        </td>
                        <td className="correct deep">
                          <strong>{data.confusionMatrix[1][1]}</strong>
                          <span>{t('True positives')}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="matrix-note">
                  <span className="green-dot" />
                  {t('Correct predictions')}
                  <span className="orange-dot" /> {t('Misclassifications')}
                </p>
              </section>
              <section className="card model-details">
                <div className="section-heading">
                  <h2>{t('Model information')}</h2>
                </div>
                <dl>
                  <dt>{t('Algorithm')}</dt>
                  <dd>{data.algorithm}</dd>
                  <dt>{t('Model version')}</dt>
                  <dd className="mono">{data.modelVersion}</dd>
                  <dt>{t('Dataset')}</dt>
                  <dd>{data.dataset}</dd>
                  <dt>{t('Training messages')}</dt>
                  <dd>{data.trainingSamples.toLocaleString(locale)}</dd>
                  <dt>{t('Test messages')}</dt>
                  <dd>
                    {data.testSamples.toLocaleString(locale)}{' '}
                    <span className="muted">{t('/ 20% holdout')}</span>
                  </dd>
                  <dt>{t('Last trained')}</dt>
                  <dd>{new Date(data.trainedAt).toLocaleString(locale)}</dd>
                </dl>
              </section>
            </div>
            <div className="method-note">
              <Info size={19} />
              <p>
                <strong>{t('A transparent benchmark.')}</strong>{' '}
                {t(
                  'Spam is the positive class. Translations and duplicate messages stay in the same split. Parameters are selected on validation data; the separate test set measures English and Ukrainian performance. Translated examples do not guarantee performance on new messages.',
                )}
              </p>
            </div>
          </>
        )
      )}
    </>
  );
}
