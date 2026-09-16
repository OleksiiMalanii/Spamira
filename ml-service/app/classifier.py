import json
import re
from pathlib import Path
import joblib
from app.schemas import PredictResponse


class Classifier:
    def __init__(self, directory: Path):
        self.model = joblib.load(directory / "spam_classifier.joblib")
        self.metrics = json.loads((directory / "metrics.json").read_text(encoding="utf-8"))
        if set(self.model.classes_) != {"spam", "legitimate"}:
            raise ValueError("Model classes are invalid.")

    def predict(self, text: str) -> PredictResponse:
        if not re.search(r"[a-zA-Zа-яА-ЯіІїЇєЄґҐ]", text) or self.model.named_steps['tfidf'].transform([text]).nnz == 0:
            raise ValueError("Please enter meaningful English or Ukrainian text.")
        values = dict(zip(self.model.classes_, self.model.predict_proba([text])[0]))
        label = max(values, key=values.get)
        return PredictResponse(label=label, confidence=float(values[label]),
                               spam_probability=float(values["spam"]),
                               legitimate_probability=float(values["legitimate"]),
                               model_version=self.metrics["modelVersion"])
