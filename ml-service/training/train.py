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
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from training.evaluate import evaluate_model
from training.preprocess import normalize_text

ROOT = Path(__file__).resolve().parents[1]


def train(dataset: Path, output: Path):
    rows = []
    for line in dataset.read_text(encoding="utf-8").splitlines():
        if line.strip():
            label, text = line.split("\t", 1)
            if label not in {"ham", "spam"}:
                raise ValueError(f"Unexpected label: {label}")
            rows.append(("legitimate" if label == "ham" else "spam", normalize_text(text)))
    frame = pd.DataFrame(rows, columns=["label", "text"])
    raw_count = len(frame)
    conflicts = frame.groupby("text")["label"].nunique()
    frame = frame[~frame.text.isin(conflicts[conflicts > 1].index)]
    frame = frame[frame.text.str.len() > 0].drop_duplicates("text")
    x_train, x_test, y_train, y_test = train_test_split(
        frame.text, frame.label, test_size=0.2, random_state=42, stratify=frame.label
    )
    model = Pipeline([
        ("tfidf", TfidfVectorizer(preprocessor=normalize_text, lowercase=False,
                                 ngram_range=(1, 2), min_df=2, sublinear_tf=True)),
        ("classifier", LogisticRegression(class_weight="balanced", C=4.0, max_iter=1000, random_state=42)),
    ])
    model.fit(x_train, y_train)
    metrics = evaluate_model(model, x_test, y_test)
    dataset_hash = hashlib.sha256(dataset.read_bytes()).hexdigest()
    metrics.update({
        "modelVersion": f"sms-tfidf-lr-1-{dataset_hash[:8]}",
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "trainingSamples": len(x_train), "testSamples": len(x_test),
        "rawSamples": raw_count, "uniqueSamples": len(frame),
        "datasetSha256": dataset_hash, "randomState": 42,
        "sklearnVersion": sklearn.__version__, "dataset": "UCI SMS Spam Collection",
        "algorithm": "TF-IDF + Logistic Regression",
    })
    output.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output / "spam_classifier.joblib")
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=ROOT.parent / "data/raw/SMSSpamCollection")
    parser.add_argument("--output", type=Path, default=ROOT / "models")
    args = parser.parse_args()
    train(args.dataset, args.output)
