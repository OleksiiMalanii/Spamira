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

The smoke test checks real spam and legitimate predictions, both probabilities, exact equality between the creation response and persisted record, search, filtering, dashboard totals, model metrics, and invalid input rejection. Browser tests use live services and cover the analyzer, history, metrics, dashboard, and information page.

Container image builds and a full Compose deployment still require verification on a host with a running container engine. The current Windows host requires a restart after enabling Virtual Machine Platform and reports unavailable firmware virtualization. The included CI workflow performs the container-level checks on Linux.

Run the commands in the README to reproduce the checks. Test counts and the reference model metrics describe this revision.
