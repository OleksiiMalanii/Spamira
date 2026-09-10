# API reference

Default API base: `http://localhost:5080`. Swagger UI: `/swagger`; OpenAPI JSON: `/openapi/v1.json`.

## Accounts and CSRF

Every POST requires an `X-CSRF-TOKEN` header. First fetch `GET /api/auth/csrf`, preserve its cookie, and send its `token` value in that header. Fetch a fresh token after sign-in or sign-out. Browser requests use credentials; HTTP-only session cookies are never stored in local storage. Swagger mutations also require the token header and cookie.

| Endpoint | Request / response |
| --- | --- |
| `POST /api/auth/register` | `{ "displayName": "Alex", "email": "alex@example.com", "password": "<your-password>" }` returns `201`, user object and sign-in cookie |
| `POST /api/auth/login` | `{ "email": "alex@example.com", "password": "<your-password>", "rememberMe": false }` returns `200`, user object and cookie |
| `POST /api/auth/logout` | `{}` returns `{ "signedOut": true }` and expires the cookie |
| `GET /api/auth/session` | `{ "user": { "id": "...", "displayName": "Alex", "email": "alex@example.com" }, "guestQuota": null }` |
| `GET /api/auth/csrf` | `{ "token": "..." }` and anti-forgery cookie |

Guest session response: `{ "user": null, "guestQuota": { "limit": 10, "used": 2, "remaining": 8, "resetsAt": "2026-09-11T00:00:00Z" } }`. Ten successful analyses per network address per UTC day. Guest messages are never saved. Members have no daily guest cap. Invalid messages and failed predictions do not consume allowance.

Names: 1–80 characters after trimming. Emails: at most 254 characters. Passwords: 10–128 characters including uppercase, lowercase, and a number. Five incorrect password attempts lock the account for 15 minutes. Login and registration share 20 requests per minute per address. Sessions last up to seven days with sliding renewal; `rememberMe` makes the cookie persist across browser sessions.

See `scripts/smoke_test.py` for a working cookie-aware client. From the repository root:

```python
from scripts.smoke_test import Client
client = Client("http://localhost:5080")
result = client.call("/api/classifications", {"message": "See you tomorrow"})
print(result["label"], result["spamProbability"])
```

## Classification

`POST /api/classifications` with `{ "message": "Hey, are we still meeting for lunch tomorrow?" }`.

Members receive `201 Created` and a `Location` header. Guests receive `200 OK`, `savedToHistory: false`, and an ephemeral UUID that cannot be read back.

```json
{
  "id": "287af01e-57bc-4c71-90ad-f41fbb897854",
  "message": "Hey, are we still meeting for lunch tomorrow?",
  "label": "legitimate",
  "confidence": 0.96,
  "spamProbability": 0.04,
  "legitimateProbability": 0.96,
  "createdAt": "2026-09-10T10:00:00Z",
  "processingTimeMs": 12,
  "modelVersion": "sms-tfidf-lr-1-7d039a24",
  "savedToHistory": true
}
```

Probabilities above illustrate the contract. Messages must contain 1–5,000 characters and cannot be whitespace-only. Internal case and whitespace are preserved. Probability fields and confidence are fractions from 0 to 1. Processing time covers quota reservation and the ML call, excluding persistence. An abuse guard limits all clients, including members, to 60 analyses per minute per address.

## Private history and dashboard

These endpoints require sign-in (`401` otherwise). Queries always filter by the current account. Another account’s record returns `404`.

`GET /api/classifications?page=1&pageSize=10&label=spam&search=prize&sort=desc`

| Parameter | Default | Rules |
| --- | --- | --- |
| `page` | 1 | 1–1,000,000 |
| `pageSize` | 10 | 1–100 |
| `label` | none | `spam` or `legitimate` |
| `search` | none | Case-insensitive substring, at most 5,000 characters |
| `sort` | `desc` | `asc` or `desc`, by UTC analysis date |

Response: `{ "items": [], "page": 1, "pageSize": 10, "totalCount": 0, "totalPages": 0 }`. UUID is a stable secondary sort key. An out-of-range page returns no items.

`GET /api/classifications/{id}` returns one owned record or `404`.

`GET /api/dashboard/stats` returns personal `totalAnalyzed`, `spamCount`, `legitimateCount`, `spamPercentage` (0–100), up to five `recentClassifications`, and `modelStatus` (`online` or `offline`).

## Metrics and health

`GET /api/model/metrics` is public and returns `accuracy`, `precision`, `recall`, `f1Score` (0–1), `confusionMatrix`, `labels`, `modelVersion`, `trainedAt`, sample counts, and training metadata. Matrix rows are actual classes, columns predicted classes; both use `["legitimate", "spam"]`. Spam is positive.

`GET /health` returns `{ "status": "healthy", "database": true, "model": true }`, or `503` with status `degraded` if a dependency fails.

## Errors

Application errors use Problem Details with `status`, `title`, `detail`, and `traceId`. Authorization failures can have an empty body. No internal exception details are returned.

| Status | Meaning |
| --- | --- |
| 400 | Invalid input |
| 401 | Missing/invalid sign-in or locked account |
| 403 | Missing or invalid CSRF token |
| 404 | Missing record or record belongs to another account |
| 409 | Account cannot be created with these details |
| 429 | Guest daily allowance or minute rate limit reached |
| 503 | Dependency unavailable |

## Internal ML service

Default base: `http://localhost:8000`, docs at `/docs`. Browser clients must use the main API for account scoping, quotas, and persistence.

- `POST /predict`: `{ "text": "message" }` returns `label`, `confidence`, `spam_probability`, `legitimate_probability`, `model_version`.
- `GET /metrics`: model evaluation JSON.
- `GET /health`: readiness and model version.

FastAPI returns `422` for invalid input. The application API maps snake_case prediction fields to camelCase.
