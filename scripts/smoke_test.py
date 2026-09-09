"""Verify a running deployment with real predictions and persisted API history."""
import argparse
import json
import math
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4


def call(base, path, payload=None):
    request = Request(base.rstrip("/") + path,
                      data=None if payload is None else json.dumps(payload).encode(),
                      headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def main(base):
    before = call(base, "/api/dashboard/stats")
    token = uuid4().hex[:8]
    for message, expected in [
        ("WINNER! You have won a free cash prize! Call now to claim your reward!", "spam"),
        ("Hey, are we still meeting for lunch tomorrow?", "legitimate"),
    ]:
        result = call(base, "/api/classifications", {"message": f"{message} {token}"})
        assert result["label"] == expected, result
        assert math.isclose(result["spamProbability"] + result["legitimateProbability"], 1)
        assert result["confidence"] == max(result["spamProbability"], result["legitimateProbability"])
        assert call(base, f"/api/classifications/{result['id']}") == result
        history = call(base, f"/api/classifications?label={expected}&search={token}&pageSize=1&sort=desc")
        assert history["items"][0]["id"] == result["id"]
        print(f"{expected}: {result['confidence']:.1%}; persisted ID {result['id']}")
    after = call(base, "/api/dashboard/stats")
    assert after["totalAnalyzed"] >= before["totalAnalyzed"] + 2
    assert after["spamCount"] >= before["spamCount"] + 1
    assert after["legitimateCount"] >= before["legitimateCount"] + 1
    metrics = call(base, "/api/model/metrics")
    assert sum(map(sum, metrics["confusionMatrix"])) == metrics["testSamples"]
    for invalid in ["", "   ", "x" * 5001]:
        try:
            call(base, "/api/classifications", {"message": invalid})
            raise AssertionError("Invalid message was accepted")
        except HTTPError as error:
            assert error.code == 400
    print("Smoke test passed: predictions, probabilities, persistence, search, filters, dashboard, metrics, validation.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:5080")
    main(parser.parse_args().base_url)
