# Pending Tasks and Team Dependencies

| Priority | Task | Suggested owner | Dependency / exit evidence |
|---|---|---|---|
| P0 | Verify the logger-import correction on the release commit and rerun the complete API regression suite | API maintainers; coordinate with WA9 owner Deva Kanchana | Local post-fix runs pass 98/98; release-commit rerun and clean result still required |
| P0 | Verify frontend CSP permits only the intended deployed API origin | Frontend/deployment maintainers | Controlled browser check with Vercel-like frontend and Render-like API; no broad CSP relaxation |
| P0 | Reconcile the submitted OWASP documents and determine whether verifiable runtime ZAP evidence exists | Security reviewer / report submitter | Confirm exact target, timestamp, alert export, risk levels, and false-positive disposition; any new scan requires authorization |
| P1 | Establish isolated local test database and dedicated verified QA accounts, then execute API functional cases | QA owner / API test maintainer | API bootstrap repaired; explicit test-only configuration; no personal, staging, or production accounts |
| P1 | Revalidate rate-limit behavior and headers using low-volume local boundary checks | API maintainer / QA | Running isolated API and known fresh rate-limit state |
| P1 | Investigate 89.90% historical load-test failure, HTTP 500 login, and reported 429s | API and performance-test owners | Root cause evidence; only then propose bounded authorized retest |
| P1 | Resolve local `nodemailer` module availability and rerun the prototype email-service unit test | Prototype maintainer | Approval before dependency restore/install; package manifest already declares dependency |
| P1 | Run current scheduler tests after API test initialization is repaired | API/QA owner | Passing API bootstrap; provider delivery remains separately unverified |
| P1 | Complete student UAT (10-15 participants) and document authentic findings | UAT coordinator / project owner | Participants, test environment, approved scenarios, consent and feedback records |
| P2 | Perform broader keyboard, focus, contrast, responsive, and screen-reader review | Accessibility reviewer | Agreed scope and supported browser/device matrix |
| P2 | Review current dependency advisories and add an approved CI audit gate | Dependency/security owner | Current audit output and agreed severity threshold; no force upgrades without review |
| P2 | Rehearse documented staging rollback and record recovery time | Release owner / operations | Staging environment, approved rehearsal window, previous healthy API/frontend versions |
| P2 | Complete API-level data checks and an isolated representative-data audit | Data/API owner | Explicitly isolated dataset; no production/staging data changes |

## Post-snapshot status (2026-11-01)

- The logger import has been corrected locally. Two sequential post-fix API
  runs passed 98/98; re-run the full suite on the release commit before closing
  the P0 item.
- The auth access-token mismatch has been fixed and 9/9 auth route/security
  tests pass. Complete a browser-level login/logout/refresh smoke check before
  closing the related authentication work.
- All other P0–P2 items in the table remain open unless closed by fresh
  evidence, including CSP, runtime security evidence, performance retest,
  rate-limit boundary checks, API functional coverage, data quality, UAT,
  accessibility, rollback rehearsal and production smoke.

## Team dependencies

- The task brief identifies Deva Kanchana as WA9 owner.
- API maintainers are needed for the test-bootstrap defect and follow-up
  regression results.
- QA account/environment owners must provide dedicated verified test accounts
  and isolated local data before authenticated tests.
- A security reviewer/report submitter must reconcile the conflicting
  static-review/DAST claims. This assessment did not repeat ZAP.
- The project owner retains acceptance and release-approval authority.

No application changes, dependency installs, database operations, deployments,
or commits were made as part of the 2026-10-31 assessment.
