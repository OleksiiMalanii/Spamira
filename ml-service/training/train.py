"""Train a bilingual model with translation-group isolation and validation selection."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import joblib
import pandas as pd
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline, FeatureUnion
from training.evaluate import evaluate_model
from training.preprocess import normalize_text

ROOT = Path(__file__).resolve().parents[1]


def prepare(dataset):
    frame = pd.read_csv(dataset, usecols=['labels', 'text', 'text_uk']).dropna()
    if not set(frame.labels).issubset({'ham', 'spam'}):
        raise ValueError('Invalid dataset labels.')
    rows = []
    for group, row in frame.iterrows():
        for language, column in [('en', 'text'), ('uk', 'text_uk')]:
            text = normalize_text(row[column])
            if text:
                rows.append({'text': text, 'label': 'legitimate' if row.labels == 'ham' else 'spam', 'language': language, 'group': group})
    data = pd.DataFrame(rows)
    # Connect exact duplicates across both languages before any split.
    parent = {g: g for g in data.group.unique()}
    def root(g):
        while parent[g] != g:
            parent[g] = parent[parent[g]]
            g = parent[g]
        return g
    seen = {}
    for row in data.itertuples():
        if row.text in seen:
            parent[root(row.group)] = root(seen[row.text])
        else:
            seen[row.text] = row.group
    data['group'] = data.group.map(root)
    conflicts = data.groupby('text').label.nunique()
    bad = set(data.loc[data.text.isin(conflicts[conflicts > 1].index), 'group'])
    data = data[~data.group.isin(bad)].drop_duplicates(['text', 'language']).reset_index(drop=True)
    data['source'] = 'public'
    data['group'] = data.group.map(lambda value: f'public-{value}')
    curated = pd.read_csv(ROOT.parent / 'data/curated/messages.tsv', sep='\t')
    extra = []
    for row in curated.itertuples():
        for language in ('en', 'uk'):
            extra.append({'text': normalize_text(getattr(row, language)), 'label': row.label,
                          'language': language, 'group': f'curated-{row.group}', 'source': 'curated'})
    return pd.concat([data, pd.DataFrame(extra)], ignore_index=True)


def features():
    return FeatureUnion([
        ('word', TfidfVectorizer(preprocessor=normalize_text, lowercase=False, ngram_range=(1, 2), min_df=2, sublinear_tf=True)),
        ('char', TfidfVectorizer(preprocessor=normalize_text, lowercase=False, analyzer='char_wb', ngram_range=(3, 5), min_df=3, sublinear_tf=True, max_features=100000)),
    ])


def train(dataset, output):
    data = prepare(dataset)
    folds = list(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42).split(data.text, data.label, data.group))
    test_index, validation_index = folds[0][1], folds[1][1]
    test, validation = data.iloc[test_index], data.iloc[validation_index]
    training = data.drop(index=list(test_index) + list(validation_index))
    vectorizer = features()
    x = vectorizer.fit_transform(training.text)
    v = vectorizer.transform(validation.text)
    candidates = []
    for c in (2.0, 4.0):
        for weight in ('balanced', {'legitimate': 1, 'spam': 10}, {'legitimate': 1, 'spam': 14}):
            classifier = LogisticRegression(C=c, class_weight=weight, max_iter=1000, random_state=42)
            classifier.fit(x, training.label, sample_weight=training.source.map({'public': 1.0, 'curated': 4.0}))
            score = evaluate_model(classifier, v, validation.label)
            candidates.append((score['f1Score'], score['precision'], c, weight))
    _, _, c, weight = max(candidates, key=lambda value: value[:2])
    development = data.drop(index=test_index)
    model = Pipeline([('tfidf', features()), ('classifier', LogisticRegression(C=c, class_weight=weight, max_iter=1000, random_state=42))])
    model.fit(development.text, development.label, classifier__sample_weight=development.source.map({'public': 1.0, 'curated': 4.0}))
    metrics = evaluate_model(model, test.text, test.label)
    settings = {'C': c, 'classWeight': weight, 'features': 'word 1-2 + char_wb 3-5', 'revision': 3, 'curatedSampleWeight': 4.0}
    curated_text = (ROOT.parent / 'data/curated/messages.tsv').read_text(encoding='utf-8-sig')
    fingerprint = hashlib.sha256(dataset.read_bytes() + curated_text.encode('utf-8') + json.dumps(settings, sort_keys=True).encode()).hexdigest()
    metrics.update({
        'modelVersion': f'sms-en-uk-tfidf-lr-2-{fingerprint[:8]}',
        'trainedAt': datetime.now(timezone.utc).isoformat(),
        'trainingSamples': len(development), 'testSamples': len(test), 'uniqueSamples': len(data),
        'datasetSha256': hashlib.sha256(dataset.read_bytes()).hexdigest(), 'randomState': 42,
        'sklearnVersion': sklearn.__version__, 'dataset': 'SMS Spam Multilingual Collection (English + Ukrainian)',
        'algorithm': 'TF-IDF + Logistic Regression', 'supportedLanguages': ['en', 'uk'],
        'splitStrategy': '5 stratified group folds; translations and duplicate texts stay together; fold 0 test, fold 1 validation',
        'configuration': settings,
        'validationCandidates': [{'f1Score': a, 'precision': b, 'C': c, 'classWeight': d} for a,b,c,d in candidates],
        'perSource': {source: {**evaluate_model(model, subset.text, subset.label), 'testSamples': len(subset)} for source, subset in test.groupby('source')},
        'perLanguage': {lang: {**evaluate_model(model, subset.text, subset.label), 'testSamples': len(subset)} for lang, subset in test.groupby('language')},
    })
    assert not set(test.group) & set(development.group)
    assert not set(test.text) & set(development.text)
    output.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output / 'spam_classifier.joblib')
    (output / 'metrics.json').write_text(json.dumps(metrics, indent=2), encoding='utf-8')
    print(json.dumps(metrics, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', type=Path, default=ROOT.parent / 'data/raw/multilingual.csv')
    parser.add_argument('--output', type=Path, default=ROOT / 'models')
    args = parser.parse_args()
    train(args.dataset, args.output)
