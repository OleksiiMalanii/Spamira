from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.classifier import Classifier
from app.config import MODEL_DIR
from training.preprocess import normalize_text


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def test_model_loading_and_preprocessing():
    classifier = Classifier(MODEL_DIR)
    assert normalize_text("  HELLO\n   Friend!  ") == "hello friend!"
    assert classifier.predict("  HELLO\n Friend! ") == classifier.predict("hello friend!")


def test_health_and_metrics(client):
    assert client.get("/health").status_code == 200
    metrics = client.get("/metrics").json()
    assert sum(map(sum, metrics["confusionMatrix"])) == metrics["testSamples"]
    assert metrics["accuracy"] > 0.90


@pytest.mark.parametrize("text", ["", "   ", "x" * 5001])
def test_validation(client, text):
    assert client.post("/predict", json={"text": text}).status_code == 422


@pytest.mark.parametrize("text, label", [
    ("WINNER! You have won a free cash prize! Call now to claim your reward!", "spam"),
    ("Hey, are we still meeting for lunch tomorrow?", "legitimate"),
])
def test_prediction_contract(client, text, label):
    response = client.post("/predict", json={"text": text})
    assert response.status_code == 200
    result = response.json()
    assert result["label"] == label
    assert result["spam_probability"] + result["legitimate_probability"] == pytest.approx(1)
    assert result["confidence"] == max(result["spam_probability"], result["legitimate_probability"])


def test_missing_model_returns_unavailable(client):
    app.state.classifier = None
    assert client.get("/health").status_code == 503
    assert client.post("/predict", json={"text": "hello"}).status_code == 503


def test_missing_artifacts():
    with pytest.raises(FileNotFoundError):
        Classifier(Path("does-not-exist"))
