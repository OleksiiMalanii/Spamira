# Verification

The application has been exercised locally against the trained model, ASP.NET Core API, PostgreSQL 17, and the React frontend.

| Check | Result |
| --- | --- |
| Frontend production build | Passed |
| Frontend component/service tests | 6 passed |
| Backend Release build | Passed, no warnings |
| Backend unit/integration tests | 20 passed |
| Python model and service tests | 9 passed |
| Browser end-to-end tests | 4 passed across desktop and mobile |
| Real API → ML → PostgreSQL smoke test | Passed |
| EF Core migration snapshot consistency | Passed |
| EF Core PostgreSQL SQL generation | Passed |
| Migration application on a fresh PostgreSQL database | Passed |
| History retained after PostgreSQL and API restart | Passed; all 14 existing records retained |
| Docker Compose configuration validation | Passed |
| Container image builds and complete Compose startup | Passed on Linux CI |
| Smoke test and browser tests against Docker deployment | Passed |
| Docker database and API restart persistence | Passed |

The smoke test checks real spam and legitimate predictions, both probabilities, exact equality between the creation response and persisted record, search, filtering, dashboard totals, model metrics, and invalid input rejection. Browser tests use live services and cover the analyzer, history, metrics, dashboard, and information page.

The complete [GitHub Actions verification run](https://github.com/OleksiiMalanii/Spamira/actions/runs/34350598441) passed for application commit `1cdbaf7`. It built all images, started the complete Compose stack on Linux, ran real API and browser checks, and confirmed unchanged message counts after restarting PostgreSQL and the API.

The local Windows host requires a restart after enabling Virtual Machine Platform and reports unavailable firmware virtualization. Docker Desktop and WSL are installed. The application was additionally verified using local processes and PostgreSQL before that restart.

Run the commands in the README to reproduce the checks. Test counts and the reference model metrics describe this revision.
