# Verification

The bilingual model and account release has been exercised against real TF-IDF/Logistic Regression inference and PostgreSQL, using both local processes and the complete Docker Compose deployment on Windows with WSL 2.

| Check | Result |
| --- | --- |
| Frontend production build | Passed |
| Frontend component/service/session tests | 9 passed |
| Backend Release build | Passed |
| Backend unit/integration tests | 30 passed |
| Python model and service tests | 14 passed |
| Browser end-to-end scenarios | 6 passed across desktop and mobile |
| Account registration, login, logout, and private history | Passed with real services |
| Isolation between different accounts | Passed |
| Guest requests never stored in history | Passed |
| Guest allowance reset at UTC midnight | Passed with controlled server clock |
| Concurrent PostgreSQL guest allowance | Passed; exactly 10 successes from 12 requests with a fresh allowance |
| EF Core migration snapshot consistency | Passed |
| Account migration on an existing PostgreSQL database | Passed; previous unowned records retained and hidden |
| Docker Compose configuration and image builds | Passed |
| Complete Compose startup | All four services healthy |
| Browser scenarios through Nginx | Passed |
| Session and private history after PostgreSQL/API restart | Passed through Nginx |

The smoke test creates independent accounts and verifies real spam/legitimate predictions, both probabilities, exact persisted-result equality, search, filters, private statistics, model metrics, validation, and account isolation. Its optional saved-session mode verifies that cookies and history survive service restarts. Temporary state files contain a session cookie and should be kept private.

The concurrent quota script launches twelve requests and verifies the database-enforced allowance using fresh cookie jars. It consumes the guest allowance on the test network for that UTC day. Backend tests separately exercise midnight reset, validation and inference-failure refunds, absent CSRF, password hashing, lockout, duplicate registration, and member access beyond ten analyses. Frontend tests cover stale session responses that finish after login.

Browser tests use live services for guest classification and account registration, private history, logout, sign-in, metrics, dashboard, and responsive layout. The logout test waits for the completed sign-out state before navigating.

Nginx resolves backend addresses through Docker DNS with a short cache. Restart verification checks the public frontend proxy, which catches stale upstream routing as well as database or session persistence failures.

Run the commands in the README to reproduce these checks. The [continuous integration workflow](https://github.com/OleksiiMalanii/Spamira/actions/workflows/ci.yml) also trains the model, builds all container images, tests the complete stack, exercises concurrent guest requests, and verifies restart persistence.

The bilingual release also verifies English/Ukrainian interface switching, saved language preference, draft preservation, per-language metrics, zero-feature input rejection, and translation/duplicate isolation across all data folds. Windows browser checks use installed Microsoft Edge; backend and ML tests run in Linux containers. Historical results retain their original model version.
