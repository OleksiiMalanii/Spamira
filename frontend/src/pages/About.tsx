import { t, useLocale } from '../lib/i18n';
import { ArrowRight, Binary, FileText, Layers3, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function About() {
  useLocale();

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('MEET SPAMIRA')}</div>
          <h1>{t('Make sense of the message.')}</h1>
          <p>
            {t(
              'Machine learning-powered web application for real-time spam detection and text message classification.',
            )}
          </p>
        </div>
      </div>
      <section className="about-hero">
        <ShieldCheck size={42} strokeWidth={1.4} />
        <h2>
          {t('A clearer inbox starts')}
          <br />
          {t('with an informed decision.')}
        </h2>
        <p>
          {t(
            'Spamira analyzes the language in a text message and classifies it as spam or legitimate. Every result includes both class probabilities, so you can see how confidently the model reached its decision.',
          )}
        </p>
        <Link to="/analyzer" className="button ink">
          {t('Analyze your first message')}
          <ArrowRight size={16} />
        </Link>
      </section>
      <div className="section-heading about-heading">
        <h2>{t('From text to insight')}</h2>
        <span className="muted">{t('One reproducible pipeline')}</span>
      </div>
      <div className="process-grid">
        {[
          {
            icon: FileText,
            title: t('Normalize the text'),
            text: t(
              'Unicode, letter case, and whitespace are normalized. Numbers and punctuation remain available to the text pipeline.',
            ),
          },
          {
            icon: Layers3,
            title: t('Find meaningful patterns'),
            text: t(
              'TF-IDF combines word pairs and character fragments to recognize English and Ukrainian vocabulary and word forms.',
            ),
          },
          {
            icon: Binary,
            title: t('Calculate probabilities'),
            text: t(
              'Logistic Regression scores these features and returns a probability for spam and legitimate. The higher probability determines the class.',
            ),
          },
        ].map(({ icon: Icon, title, text }, index) => (
          <section className="card process-card" key={title}>
            <div>
              <Icon size={24} />
              <span>0{index + 1}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </section>
        ))}
      </div>
      <section className="card about-details">
        <div>
          <h2>{t('Useful insight. Honest limitations.')}</h2>
          <p>
            {t(
              'The model supports English and Ukrainian using a public parallel SMS corpus and curated message scenarios. Ukrainian corpus examples are translated; performance on modern messages can differ. Unsolicited advertising counts as spam. Text alone cannot establish sender consent. Confidence is not a safety guarantee.',
            )}
          </p>
          <Link to="/metrics" className="text-link">
            {t('Explore the model’s performance')}
            <ArrowRight size={15} />
          </Link>
        </div>
        <div>
          <h2>{t('Your workspace, your history.')}</h2>
          <p>
            {t(
              'Signed-in analyses are saved in your private workspace. Only your account can read its history and statistics. Guests receive 10 analyses per day without saved history; creating a free account removes that daily guest allowance.',
            )}
          </p>
          <a
            href="https://archive.ics.uci.edu/dataset/228/sms+spam+collection"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            {t('View the source dataset')}
            <ArrowRight size={15} />
          </a>
        </div>
      </section>
    </>
  );
}
