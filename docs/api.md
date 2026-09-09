# API reference

Default API base: `http://localhost:5080`. Swagger UI: `/swagger`; OpenAPI JSON: `/openapi/v1.json`.

## Classify a message

`POST /api/classifications`

```json
{ "message": "Hey, are we still meeting for lunch tomorrow?" }
```

Successful response: `201 Created`, with a `Location` header pointing to the stored record.

```json
{
  "id": "287af01e-57bc-4c71-90ad-f41fbb897854",
  "message": "Hey, are we still meeting for lunch tomorrow?",
  "label": "legitimate",
  "confidence": 0.96,
  "spamProbability": 0.04,
  "legitimateProbability": 0.96,
  "createdAt": "2026-09-09T10:00:00Z",
  "processingTimeMs": 12,
  "modelVersion": "sms-tfidf-lr-1-7d039a24"
}
```

Values above illustrate the contract; actual probabilities depend on message content and model version. Message length must be 1–5,000 characters and must not be whitespace only. Stored messages preserve internal whitespace and case. `confidence` and both probability fields are fractions from 0 to 1. The UI formats them as percentages. `processingTimeMs` measures the ML call, excluding the database save.

## History

`GET /api/classifications?page=1&pageSize=10&label=spam&search=prize&sort=desc`

| Parameter | Default | Rules |
| --- | --- | --- |
| `page` | 1 | 1–1,000,000 |
| `pageSize` | 10 | 1–100 |
| `label` | none | `spam` or `legitimate` |
| `search` | none | Case-insensitive substring, up to 5,000 characters |
| `sort` | `desc` | `asc` or `desc`, by UTC analysis date |

Response: `{ "items": [], "page": 1, "pageSize": 10, "totalCount": 0, "totalPages": 0 }`. Equal timestamps use UUID as a stable secondary sort key. An out-of-range page returns an empty list.

`GET /api/classifications/{id}` returns one record or `404`.

## Dashboard

`GET /api/dashboard/stats`

Returns `totalAnalyzed`, `spamCount`, `legitimateCount`, `spamPercentage` (0–100), `recentClassifications` (up to five), and `modelStatus` (`online` or `offline`). Statistics reflect persisted classifications.

## Model metrics

`GET /api/model/metrics`

Returns `accuracy`, `precision`, `recall`, `f1Score` (all 0–1), `confusionMatrix`, `labels`, `modelVersion`, `trainedAt`, `trainingSamples`, `testSamples`, and training metadata. Matrix rows are actual labels, columns predicted labels, both ordered `["legitimate", "spam"]`. Spam is the positive class.

## Health

`GET /health` returns `{ "status": "healthy", "database": true, "model": true }`. A failing dependency changes the status to `degraded` and HTTP status to `503`.

## Errors

Application errors use a Problem Details body with `status`, `title`, `detail`, and `traceId`. Validation returns `400`; dependency failures return `503`; rate limiting returns `429`. Normal responses never include internal exception details.

## Internal ML service

Default base: `http://localhost:8000`; automatic docs at `/docs`.

- `POST /predict`: `{ "text": "message" }` → `label`, `confidence`, `spam_probability`, `legitimate_probability`, `model_version`.
- `GET /metrics`: current evaluation JSON.
- `GET /health`: readiness and loaded model version.

The internal service uses snake_case prediction fields; the application API maps them to camelCase. FastAPI returns `422` for invalid prediction input. Browser clients should use the application API so classifications are persisted.
