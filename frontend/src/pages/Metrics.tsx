import { ChartNoAxesCombined, Info } from 'lucide-react';
import { metricsSchema, percent } from '../lib/api';
import { useResource } from '../lib/useResource';
import { ErrorNotice, Loading } from '../components/Common';

export function Metrics() {
  const { data, loading, error, refresh } = useResource('/model/metrics', metricsSchema);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TRANSPARENCY, BY DESIGN</div>
          <h1>Behind the predictions</h1>
          <p>Measured performance on messages the model hasn’t seen during training.</p>
        </div>
        <span className="outline-chip">
          <ChartNoAxesCombined size={15} /> Model metrics
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
                ['Accuracy', data.accuracy, 'Correct predictions across all messages'],
                ['Precision', data.precision, 'Flagged messages that are actually spam'],
                ['Recall', data.recall, 'Actual spam successfully detected'],
                ['F1-score', data.f1Score, 'Balance between precision and recall'],
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
            <div className="metrics-grid">
              <section className="card matrix-card">
                <div className="section-heading">
                  <div>
                    <h2>Confusion matrix</h2>
                    <p>Where the model gets it right — and where it doesn’t.</p>
                  </div>
                </div>
                <div className="matrix-predicted">PREDICTED CLASS</div>
                <div className="matrix-layout">
                  <div className="matrix-actual">ACTUAL CLASS</div>
                  <table className="matrix">
                    <thead>
                      <tr>
                        <th aria-label="Actual versus predicted" />
                        <th>Legitimate</th>
                        <th>Spam</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>Legitimate</th>
                        <td className="correct">
                          <strong>{data.confusionMatrix[0][0]}</strong>
                          <span>True negatives</span>
                        </td>
                        <td className="incorrect">
                          <strong>{data.confusionMatrix[0][1]}</strong>
                          <span>False positives</span>
                        </td>
                      </tr>
                      <tr>
                        <th>Spam</th>
                        <td className="incorrect">
                          <strong>{data.confusionMatrix[1][0]}</strong>
                          <span>False negatives</span>
                        </td>
                        <td className="correct deep">
                          <strong>{data.confusionMatrix[1][1]}</strong>
                          <span>True positives</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="matrix-note">
                  <span className="green-dot" /> Correct predictions <span className="orange-dot" />{' '}
                  Misclassifications
                </p>
              </section>
              <section className="card model-details">
                <div className="section-heading">
                  <h2>Model information</h2>
                </div>
                <dl>
                  <dt>Algorithm</dt>
                  <dd>{data.algorithm}</dd>
                  <dt>Model version</dt>
                  <dd className="mono">{data.modelVersion}</dd>
                  <dt>Dataset</dt>
                  <dd>{data.dataset}</dd>
                  <dt>Training messages</dt>
                  <dd>{data.trainingSamples.toLocaleString()}</dd>
                  <dt>Test messages</dt>
                  <dd>
                    {data.testSamples.toLocaleString()} <span className="muted">/ 20% holdout</span>
                  </dd>
                  <dt>Last trained</dt>
                  <dd>{new Date(data.trainedAt).toLocaleString()}</dd>
                </dl>
              </section>
            </div>
            <div className="method-note">
              <Info size={19} />
              <p>
                <strong>A transparent benchmark.</strong> Precision, recall, and F1-score treat spam
                as the positive class. Normalized duplicate messages are removed before a stratified
                80/20 split. These results describe the held-out SMS dataset; performance on new
                languages or message styles may differ.
              </p>
            </div>
          </>
        )
      )}
    </>
  );
}
