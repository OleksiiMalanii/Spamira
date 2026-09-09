import { ArrowRight, Binary, FileText, Layers3, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function About() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MEET SPAMIRA</div>
          <h1>Make sense of the message.</h1>
          <p>
            Machine learning-powered web application for real-time spam detection and text message
            classification.
          </p>
        </div>
      </div>
      <section className="about-hero">
        <ShieldCheck size={42} strokeWidth={1.4} />
        <h2>
          A clearer inbox starts
          <br />
          with an informed decision.
        </h2>
        <p>
          Spamira analyzes the language in a text message and classifies it as spam or legitimate.
          Every result includes both class probabilities, so you can see how confidently the model
          reached its decision.
        </p>
        <Link to="/analyzer" className="button ink">
          Analyze your first message <ArrowRight size={16} />
        </Link>
      </section>
      <div className="section-heading about-heading">
        <h2>From text to insight</h2>
        <span className="muted">One reproducible pipeline</span>
      </div>
      <div className="process-grid">
        {[
          {
            icon: FileText,
            title: 'Normalize the text',
            text: 'Unicode, letter case, and whitespace are normalized. Numbers and punctuation remain available to the text pipeline.',
          },
          {
            icon: Layers3,
            title: 'Find meaningful patterns',
            text: 'TF-IDF converts words and pairs of words into numerical features, weighting distinctive terms more strongly.',
          },
          {
            icon: Binary,
            title: 'Calculate probabilities',
            text: 'Logistic Regression scores these features and returns a probability for spam and legitimate. The higher probability determines the class.',
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
          <h2>Useful insight. Honest limitations.</h2>
          <p>
            The model is trained on the public UCI SMS Spam Collection, primarily English SMS
            messages. New scams, unfamiliar vocabulary, and other languages can be harder to
            classify. Confidence is a model probability, not a guarantee that a message is safe.
          </p>
          <Link to="/metrics" className="text-link">
            Explore the model’s performance <ArrowRight size={15} />
          </Link>
        </div>
        <div>
          <h2>Your workspace, your history.</h2>
          <p>
            Messages and results are stored in your deployment’s PostgreSQL database. This workspace
            is shared and has no sign-in. Deploy it within a trusted network or place access
            controls in front of it before sharing sensitive information.
          </p>
          <a
            href="https://archive.ics.uci.edu/dataset/228/sms+spam+collection"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            View the source dataset <ArrowRight size={15} />
          </a>
        </div>
      </section>
    </>
  );
}
