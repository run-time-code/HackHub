# HackHub Security Audit — Consolidated Findings, Evidence Review, and Remediation Report

> **Report date:** 22 November 2026  
> **Audit package reviewed:** `security-audit/`  
> **Target reviewed:** HackHub local audit environment (`apps/api`, `apps/web`)  
> **Report type:** Independent consolidation of the existing audit package, plus validation of selected findings against the running local app.  
> **Status:** Final consolidated report. This is the first report in `security-audit/reports/`; the directory was empty before this file was created.  
> **Secret handling:** **No secret values are reproduced in this report.** Some referenced evidence files contain live test passwords, cookies, CSRF tokens, JWTs, or an access-token secret. Those files must be handled as sensitive and must not be published or shared as-is.

> **Bottom line:** The audit package contains useful raw evidence, but it does **not** support a “0 vulnerabilities” or “clean” conclusion. It found real issues, missed or invalidated several important tests, and contains its own credential leaks. The most important assurance finding is that the summary layer is materially unreliable. The most important operational findings are the historical secret leak, the credentials embedded in the audit folder and exposed local services, and a confirmed rate-limit bypass.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Scope, target, and environment](#2-scope-target-and-environment)
3. [Folder inventory and repository hygiene](#3-folder-inventory-and-repository-hygiene)
4. [Evidence quality and methodology audit](#4-evidence-quality-and-methodology-audit)
5. [Confirmed findings](#5-confirmed-findings)
6. [Unconfirmed, weak, or untested areas](#6-unconfirmed-weak-or-untested-areas)
7. [Manual test suite deep dive](#7-manual-test-suite-deep-dive)
8. [CodeQL triage](#8-codeql-triage)
9. [Tool-by-tool results](#9-tool-by-tool-results)
10. [Application attack surface and coverage gaps](#10-application-attack-surface-and-coverage-gaps)
11. [Secrets, privacy, and data handling](#11-secrets-privacy-and-data-handling)
12. [Supply chain and tooling](#12-supply-chain-and-tooling)
13. [Remediation plan](#13-remediation-plan)
14. [What the audit got right](#14-what-the-audit-got-right)
15. [Appendices](#15-appendices)

---

## 1. Executive summary

### 1.1 What was reviewed

The review covered the whole `security-audit/` folder:

- the four audit scripts (`manual_tests.py`, `seed.js`, `screenshots.py`, `make_tool_evidence.py`);
- all raw evidence under `evidence/`, including the CodeQL SARIF, Semgrep, Trivy, Checkov, Wapiti, SQLmap, Commix, XSStrike, ffuf, feroxbuster, kiterunner, Arjun, httpx, Burp, testssl, MobSF, npm audit, gitleaks, proxy, seed, and manual-test artifacts;
- the local MongoDB data directory and the live services;
- the screenshots and the synthetic tool-summary generator;
- the tool binaries, Python virtual environment, logs, wordlists, and `.gitignore`;
- the Git/GitHub handling of the historical secret, as reflected in the evidence and repository state.

Selected findings were validated against the local app with read-only or low-impact checks. No production system, production credentials, or third-party provider was tested. No destructive exploitation was performed.

### 1.2 The short version

The folder is **large, mixed-quality, and internally inconsistent**:

- It contains **real raw evidence** (CodeQL SARIF, Trivy/Checkov/Wapiti JSON, ffuf JSON, Mongo data) and some genuine findings.
- It also contains **synthetic screenshots**, **hardcoded summary text**, **false passes**, **invalid tool runs**, and **misleading claims** that are not supported by the raw output.
- It contains **live test credentials and tokens in tracked files**, including a running access-token secret in a tracked script, while the API and Vite servers were bound to `0.0.0.0`.
- It does **not** contain a final report, a README, a methodology, a findings register, a coverage matrix, checksums, or a tool manifest.

The correct conclusion is **not** “the app is clean.” The correct conclusion is:

> The local app has a small number of confirmed weaknesses, a larger number of unverified areas, and the audit package itself is not currently suitable for publication, sign-off, or reliance.

### 1.3 Headline numbers

| Metric | Value | Meaning |
|---|---:|---|
| Audit folder on disk | **5.2 GB** | Mostly ignored tools and the local database |
| Git-tracked files under `security-audit/` | **101** | Tools/logs/DB are ignored; sensitive evidence is tracked |
| Tools directory | **~4.5 GB** | CodeQL, venv, Burp, Trivy, archives, etc. |
| Evidence directory | **~560 MB** | Dominated by the ignored `codeql-db` |
| Local MongoDB data | **~206 MB** | Local audit database; no authentication |
| Screenshots | **~5.0 MB** | 13 app + 19 tool PNGs |
| Final reports | **0** | `reports/` was empty before this report |
| Manual checks | **43** | 40 PASS, 2 NOTE, 1 FAIL — but several are invalid or weak |
| CodeQL raw results | **72** | 42 first-party, 30 in audit tools/venv |
| CodeQL first-party active API hits | **23** | 17 legacy, 1 build script, 1 web dev artifact |
| Semgrep deep-scan conclusion | **Invalid** | 0 files scanned, 2 config errors |
| Wapiti findings | **0 vulns** | But 1 unhandled 500 anomaly was ignored |
| Checkov failed checks | **7** | GitHub Actions hardening |
| Trivy app results | **0** | App lockfiles/Dockerfile clean; third-party tooling noise |
| Gitleaks historical findings | **1** | One secret-bearing historical `.env`; remediation incomplete |
| Live services observed | **3** | API `0.0.0.0:5000`, Vite `0.0.0.0:5173`, Mongo `127.0.0.1:27017` |

### 1.4 Top findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| `SEC-01` | Historical secret exposure in Git/GitHub; rotation and purge not verified | **Critical** (until rotated) | Confirmed from gitleaks evidence; operational remediation pending |
| `SEC-02` | Audit artifacts and live local services expose credentials/tokens; API/Vite on `0.0.0.0` | **High** | Confirmed in the audit environment |
| `RATE-01` | IP rate-limit bypass via spoofed `X-Forwarded-For`; 14 login attempts produced no 429 | **High** | Confirmed live |
| `EVID-01` | Evidence package is unreliable: synthetic screenshots, hardcoded summaries, false passes, invalid tools, no report | **High** (assurance) | Confirmed by comparison with raw evidence |
| `ERR-01` | Error-stack leakage on CSRF 403 and oversized-body 413 responses | **Medium** | Confirmed live/proxy evidence |
| `SAN-01` | Sanitizer copies `__proto__`; prototype-inherited properties are visible; exploitation not demonstrated | **Medium** | Confirmed code behavior |
| `ADMIN-01` | `GET /api/admin/users` does not exist; admin authorization and ban/unban are untested | **Medium** (assurance) | Confirmed incompletion |
| `DB-01` | Local MongoDB runs without authentication | **Medium** (local audit environment) | Confirmed live |
| `VITE-01` | Vite dev server on `0.0.0.0:5173` serves project files | **Low/Medium** | Confirmed live |
| `CI-01` | GitHub Actions use `write-all` and curl-with-secrets patterns | **Low/Medium** | Confirmed by Checkov |
| `LOG-01` | Four user-controlled log-injection candidates in an active controller | **Low** | Static only |
| `OAUTH-01` | OAuth state cookie uses `SameSite=None` in production; end-to-end OAuth untested | **Low** | Needs review |
| `LEGACY-01` | Legacy/duplicate backend has static SQLi and missing-rate-limit hits | **Medium** (needs review) | Static only |
| `SUPPLY-01` | Audit tooling has no checksums/SBOM, dev versions, duplicate archives, and fake DNS shims | **Medium** (assurance) | Confirmed |
| `PRIV-01` | Test credentials/PII-like data and absolute local paths in tracked artifacts | **Medium** (privacy) | Partly confirmed |

### 1.5 What is confirmed vs. not confirmed

**Confirmed in the local environment:**

- The rate-limit bypass via `X-Forwarded-For`.
- Error-stack leakage on at least two error paths (403 CSRF and 413 body-too-large).
- The sanitizer’s `__proto__` handling weakness, with inherited properties visible in the sanitized object.
- The local MongoDB has no authentication.
- The Vite dev server exposes project files on `0.0.0.0:5173`.
- The admin user-list GET route is absent; the recorded “admin can reach admin endpoints” test passed on a 404.
- The audit folder contains live test credentials/tokens and a running access-token secret in a tracked script.
- The historical secret finding is real; the old secret must be treated as compromised until rotation is verified.

**Not confirmed / not demonstrated by the available evidence:**

- SQL injection in the active API (CodeQL flags typed Mongoose filters; no exploit was demonstrated).
- SQL injection in legacy code (static only; deployment status unclear).
- NoSQL operator injection (the relevant tests were blocked by CSRF and are invalid).
- Stored or DOM XSS (only reflected search was tested; the seeded stored payload was not exercised).
- IDOR/BOLA beyond the specific cases that passed; `IDOR-02` is missing entirely.
- Mass assignment (the tests used weak assertions or the wrong endpoint).
- Authentication bypass or admin bypass.
- File-upload, SSRF, OAuth login-CSRF, password-reset, or email-verification vulnerabilities.
- Production TLS/header/redirect weaknesses (production was not tested).
- Remote code execution, command injection, or server-side template injection.

This distinction is central: the folder contains many claims, but most of the “not found” statements are **absence of evidence**, not evidence of absence.

### 1.6 What the audit got right

The package is not worthless. It contains useful material:

- CodeQL SARIF with 42 first-party results and enough detail to triage.
- Raw Trivy, Checkov, Wapiti, ffuf, and feroxbuster output.
- A manual suite that found the rate-limit bypass, even though it mislabeled the result.
- A clear Vite file-exposure finding.
- A CSRF control that works, plus the stack leak that the summary missed.
- A local Mongo inventory with test-only data.
- Good basic controls: bcrypt password hashes, JWT `alg=none` rejection, expiry checks, CSRF token requirement, CORS restrictions, Helmet headers on the API, hidden-hackathon filtering, and server-side logout revocation.

The problem is the **summary and evidence-handling layer**, not the existence of every individual test.

### 1.7 Scorecard

| Dimension | Rating | Reason |
|---|---|---|
| Application security | **Amber/Red** | Real rate-limit, error-leak, and sanitizer issues; many important areas untested |
| Evidence quality | **Red** | Synthetic tool images, hardcoded summaries, invalid Semgrep, wrong kiterunner count, false ffuf citation |
| Secret handling | **Red** | Historical leak unresolved; live test credentials/tokens in tracked files; access secret in a script |
| Coverage | **Red** | No authenticated proxy, no production, no file upload/OAuth/reset/admin ban, no stored XSS, no Python/Go/Docker SCA |
| Reproducibility | **Red** | No README/methodology/manifest/checksums; tools ignored; fake DNS; no environment snapshot |
| Tooling | **Amber** | Many tools available, but versions are mixed/dev, no checksums, duplicates, and some are not usable |
| Production readiness | **Unknown** | No production target, no TLS test, no deployment test |
| Documentation | **Red** | No final report, no README, no findings register, no remediation tracking |
| Overall | **Not approved** | The audit package cannot be signed off as complete or clean |

---

## 2. Scope, target, and environment

### 2.1 In scope

- `security-audit/` as a complete artifact: scripts, raw evidence, summaries, screenshots, tools, logs, wordlists, database, and Git hygiene.
- The local HackHub API and web app, to validate selected findings.
- The local MongoDB database used by the API.
- The GitHub Actions workflows referenced by the audit evidence.
- The historical secret incident to the extent reflected in the repository and evidence.

### 2.2 Out of scope

- Production HackHub deployments, production databases, and production credentials.
- Third-party services: Google/GitHub OAuth, Cloudinary, Sentry, Vercel, Render, email providers, and any external API.
- Mobile applications; no mobile artifact was present.
- Network-level testing beyond the local host, DNS infrastructure, firewalls, and ISP.
- Physical security, social engineering, supply-chain compromise of upstream projects, and zero-day research.
- Full manual source review of every controller and service; CodeQL and targeted review were used.
- Destructive exploitation, brute force beyond 14 login attempts, denial-of-service, or data exfiltration.

### 2.3 Target environment observed

| Component | Observed state | Security relevance |
|---|---|---|
| API | `0.0.0.0:5000`, Node/Express, `NODE_ENV=development` | Reachable from the local network; development error behavior |
| Web | `0.0.0.0:5173`, Vite dev server | Project files reachable from the local network |
| MongoDB | `127.0.0.1:27017`, no authentication, database `hackhub` | Any local user/process can read/write the test DB |
| API database | Local loopback MongoDB; no credentials | No remote/production DB was used by the API |
| API auto-verification | `DEV_AUTO_VERIFY=true` | Registration email verification is bypassed in this environment |
| Background jobs | `RUN_BACKGROUND_JOBS=false` | Scraper/background behavior was not exercised |
| Global rate limits | `RATE_LIMIT_PER_IP=100000`, `RATE_LIMIT_PER_USER=100000` | The global limiter is effectively disabled |
| Login limiter | Max 10 per IP (per the audit evidence) | Bypassable via `X-Forwarded-For` because of `trust proxy` |
| API secrets | Short development secrets; one access-token secret is in a tracked script | Token forgery is feasible in the audit environment |
| Cookies | `secure` depends on production; development uses HTTP | Cookie flags are not production-representative |
| CORS | `CORS_ORIGIN=http://localhost:5173` | Browser CORS restriction only; not an authentication control |
| TLS | None on the local target | TLS/headers/redirect behavior unverified |
| Admin test account | Seeded; login returned 200 | Known test credentials exist in tracked evidence |

The API’s database connection was local. That is important: the local audit database is **not** evidence of production data exposure. The historical leaked MongoDB URI is a separate issue and may have pointed at a different database.

### 2.4 Data in the local database

Read-only inventory of `hackhub`:

| Collection | Count | Notes |
|---|---:|---|
| `users` | 3 | All `@audit.local`; 1 admin; 3 bcrypt-looking password hashes; 3 refresh-token hashes |
| `Hackathons` | 3 | Seeded audit hackathons |
| `auditlogs` | 203 | Test activity; may include IP/user-agent fields |
| `teams` | 1 | Seeded audit team |
| `joinrequests` | 1 | Seeded audit join request |
| `Saved_Hackathons` | 1 | Seeded saved item |
| `notifications` | 1 | Seeded notification |
| `Registrations` | 0 | No registrations observed |
| `feedbacks` | 0 | No feedback observed |
| `reminders` | 0 | No reminders observed |
| `ScraperRuns` | 0 | Background jobs disabled |
| `joblocks` | 0 | Background jobs disabled |

No production user data was observed in this local database. The audit logs and seeded accounts are still sensitive test artifacts, especially because the admin password is present in tracked evidence and the API is network-exposed.

### 2.5 Method

1. Inventory the folder and Git state.
2. Read every audit script and compare its behavior with its claims.
3. Parse raw evidence and compare it with the generated summaries.
4. Validate selected findings against the local app with safe checks:
   - service bindings and process environment (redacted);
   - MongoDB authentication status and collection counts (read-only);
   - 14 login attempts with rotating `X-Forwarded-For` (dummy accounts, no real credentials);
   - CSRF error response inspection (no token values reproduced);
   - sanitizer behavior at the middleware/object level;
   - admin route existence and response codes;
   - Vite file exposure;
   - screenshot and console evidence.
5. Classify each claim as confirmed, static, unverified, invalid, or not applicable.
6. Produce this report without reproducing any secret value, token, cookie, password, or old commit coordinate.

### 2.6 Limitations of this review

- The review is local and time-bounded.
- No production deployment, production database, or production credentials were available.
- No authenticated proxy/Burp scan was performed.
- No file-upload, OAuth, password-reset, email-verification, admin-ban, or background-job test was performed.
- No full manual review of every route/controller was performed.
- No Python/Go/Docker image SCA was performed.
- The CodeQL database was not inspected for copies of the historical secret.
- The historical secret’s current validity was not re-tested; it is treated as compromised.
- No remediation was implemented or verified.
- This report is a review of the existing audit, not a guarantee that the app is secure.

---

## 3. Folder inventory and repository hygiene

### 3.1 Folder tree (simplified)

```text
security-audit/
├── .gitignore
├── make_tool_evidence.py          # generates synthetic summaries and PNGs
├── manual_tests.py                # 43-check authenticated suite; contains a live access secret
├── screenshots.py                 # 13 app screenshots; late console listener
├── seed.js                        # seeds users/hackathons/team; writes seed.json
├── evidence/                      # raw and derived evidence (~560 MB, mostly codeql-db)
│   ├── codeql.sarif               # 72 raw results, 42 first-party
│   ├── codeql-db/                 # ignored; ~560 MB; may contain copies of old secrets
│   ├── semgrep.json               # 0 findings, 4 partial-parse errors
│   ├── semgrep-deep.json          # 0 files scanned, 2 config errors
│   ├── trivy-fs.json              # app clean; third-party tool noise
│   ├── checkov/results_json.json  # 7 failed GitHub Actions checks
│   ├── wapiti-*.json              # 6 scans; 0 vulns; 1 unhandled 500 anomaly
│   ├── sqlmap/                    # SQLmap run and session
│   ├── commix.txt                 # limit-only test; no --eval
│   ├── xsstrike.txt               # reflected-only; no stored XSS
│   ├── ffuf-api.json              # 3x200, 3552x429
│   ├── ffuf-api-clean.json        # 7 results
│   ├── ffuf-throttled.txt         # NOT 429 evidence; tail of common.txt
│   ├── feroxbuster.txt            # Vite file exposure
│   ├── kiterunner.txt             # one raw result
│   ├── arjun.txt                  # four parameters
│   ├── httpx.txt                  # API headers; no TLS
│   ├── burp-run.txt               # empty
│   ├── mitmproxy.txt              # empty
│   ├── proxy-flows.mitm           # 7 flows; login test password + stack; tracked
│   ├── proxy-flows.txt            # 7-flow text summary
│   ├── testssl.txt                # plain HTTP; no TLS
│   ├── mobsf.txt                  # not applicable
│   ├── npm-audit.json             # 0 npm vulnerabilities
│   ├── gitleaks.json              # redacted historical finding
│   ├── seed.json                  # test passwords, cookies, CSRF, tokens; tracked
│   ├── manual-tests.json          # full JWT, stack traces; tracked
│   ├── manual-tests.txt           # stack traces; tracked
│   ├── summary-*.txt              # generated summaries; several misleading
│   └── ...
├── logs/                          # ignored; Mongo no-auth warning, pip/go/Burp install logs
├── screenshots/                   # 13 app + 19 tool PNGs; index.json uses absolute paths
├── tools/                         # ignored; ~4.5 GB; binaries, venv, archives, fake DNS shims
├── wordlists/                     # common.txt valid; api-endpoints.txt/routes.kite invalid
├── .mongo-data/                   # ignored; ~206 MB; no-auth local DB
└── reports/                       # empty before this report
```

### 3.2 Size and Git status

At analysis time:

- `security-audit/` was **5.2 GB** on disk.
- **101 files** were tracked under `security-audit/`.
- `tools/`, `.mongo-data/`, `.output/`, `logs/`, and `evidence/codeql-db/` were ignored.
- The working tree was clean before this report was added.
- `reports/` was empty.
- No README or top-level methodology file existed.
- The repository was public, with no forks observed and GitHub secret scanning disabled.
- The historical secret-bearing commits/PR refs may still be reachable; a force-push was performed, but a GitHub Support purge and credential rotation were not verified.

### 3.3 Inventory assessment

| Path | Size | Git | Purpose | Assessment |
|---|---:|---|---|---|
| `tools/` | ~4.5 GB | Ignored | CodeQL, venv, Burp, Trivy, sqlmap, feroxbuster, etc. | Large, unchecksummed, partly dev versions; duplicates; supply-chain risk |
| `evidence/` | ~560 MB | Partly tracked | Raw and derived evidence | Mixed quality; contains secrets and invalid results |
| `evidence/codeql-db/` | ~560 MB | Ignored | CodeQL database | May contain copies of the old `.env` secret; scan before sharing |
| `.mongo-data/` | ~206 MB | Ignored | Local MongoDB | No auth; test data; delete/secure after audit |
| `screenshots/` | ~5.0 MB | Tracked | 13 app + 19 tool PNGs | App screenshots partial; tool PNGs synthetic |
| `logs/` | ~44 KB | Ignored | Mongo/pip/go/Burp logs | Operational evidence; Mongo no-auth warning; pip failures |
| `wordlists/` | ~72 KB | Tracked | Wordlists | `common.txt` valid; `api-endpoints.txt` generic; `routes.kite` invalid |
| `reports/` | 0 | Empty | Final reports | No final report existed |
| scripts | Small | Tracked | Seed/test/screenshot/evidence generation | Contain secrets and hardcoded claims |

### 3.4 Completeness checklist

| Expected audit artifact | Present? | Notes |
|---|---|---|
| README / how to run | **No** | No top-level README |
| Scope and methodology | **No** | Implicit in scripts only |
| Environment snapshot | **No** | No OS/tool/version manifest |
| Tool manifest with checksums | **No** | Tools are ignored and unchecksummed |
| Licenses for tools | **Partial** | Some tools have licenses; several do not |
| Findings register | **No** | No structured register |
| Evidence index | **No** | No map from claim to raw artifact |
| Coverage matrix | **No** | No route/area coverage matrix |
| Reproducible commands | **Partial** | Some commands in summaries; no full runbook |
| Raw terminal logs | **Partial** | Some raw JSON; tool PNGs are not raw |
| Data-handling/retention policy | **No** | Secrets and test data are tracked |
| Remediation tracking | **No** | No owner/status/verification |
| Final report | **No** | This report is the first |
| Sign-off/approval | **No** | No reviewer or approval record |

### 3.5 `.gitignore` analysis

The audit `.gitignore` excludes large/operational artifacts such as `tools/`, `.mongo-data/`, `.output/`, `logs/`, and `evidence/codeql-db/`. That is useful for repository size.

It does **not** exclude:

- `evidence/seed.json`
- `evidence/manual-tests.json`
- `evidence/manual-tests.txt`
- `evidence/proxy-flows.mitm`
- `screenshots/`
- `wordlists/`

As a result, sensitive test credentials, tokens, cookies, a proxy capture containing a test password, stack traces, and local absolute paths are tracked in a public repository. This is a repository-hygiene and secret-handling failure independent of the historical `.env` incident.

### 3.6 Repository security observations

- The repository is public.
- GitHub secret scanning was disabled.
- No forks were observed.
- The old secret-bearing history was rewritten, but old objects/PR refs/caches may remain.
- The audit folder contains new secrets that were never covered by the historical gitleaks result.
- The report file itself is new and was not committed at the time of writing.

---

## 4. Evidence quality and methodology audit

### 4.1 Evidence grades

| Grade | Definition | Examples in this folder |
|---|---|---|
| **A** | Raw tool output, reproducible command, environment captured, no synthetic layer | CodeQL SARIF, Trivy JSON, Checkov JSON, Wapiti JSON, ffuf JSON, Mongo inventory |
| **B** | Raw output but incomplete, narrow, or missing context | Manual JSON (invalid tests), npm audit (npm only), Arjun (short output), httpx (no TLS) |
| **C** | Summary or narrative not backed by a complete raw artifact | Some `summary-*.txt`; `summary-kiterunner`; `summary-ffuf`; `summary-burp` |
| **D** | Invalid, synthetic, or misleading evidence | Tool PNGs, Semgrep deep scan, `routes.kite`, `api-endpoints.txt`, `ffuf-throttled.txt`, fake DNS shims |
| **E** | Not run / not applicable | Burp scanner, MobSF, production TLS, OAuth, file upload, admin ban |

### 4.2 Summary vs. raw evidence — the material discrepancies

| Summary claim | Raw evidence | Assessment |
|---|---|---|
| Kiterunner found four routes (`/health`, `/Health`, `/stats`, `/Stats`) | Raw kiterunner output contains **one** result: `GET 200 /api//health` | **Unsupported**; summary overstates |
| ffuf 429 evidence is in `ffuf-throttled.txt` | That file is the tail of `common.txt` (`dns-query`, `sse`, `mcp`, `mcp/transport`, `mcp/message`, `FFUF1_DONE`), not 429 output | **False citation**; raw ffuf JSON does show 3552×429, but the cited file does not |
| Semgrep deep scan found 0 issues | Deep scan scanned **0 files** and had 2 config errors; first run had 4 partial-parse errors | **Invalid conclusion** |
| Wapiti found 0 findings | Raw `wapiti-ep1.json` contains one **unhandled 500 anomaly** on a null-byte search payload | **Omission** |
| Trivy found no misconfigurations/secrets | App targets are clean, but a third-party `sqlmap` Dockerfile has 2 misconfigurations; secret hits are third-party tool noise | **Overbroad claim** |
| Gitleaks secret is 8 characters with entropy 3.98973 | That is the redacted placeholder, not the original secret | **Misleading measurement** |
| Burp proxy testing was performed | Burp only reached a license prompt; `burp-run.txt` and `mitmproxy.txt` are empty; proxy has 7 unauthenticated flows and a 403 login | **No Burp scan** |
| testssl verified production TLS/secure cookies | Local target is plain HTTP; no TLS; production was not tested | **Speculative** |
| CodeQL summary references “the 3 accepted items” | No report or triage artifact exists | **Dangling claim** |
| Manual suite covered XSS, prototype pollution, admin gating | Reflected search only; sanitizer test is partial; admin test passed on a 404 | **Overstated coverage** |
| Tool screenshots are “verbatim tool output” | `make_tool_evidence.py` generates synthetic HTML/PNG summaries; `tool-codeql.png` is a summary card | **False label** |
| Console errors were captured for the app | Console listener was attached after all app screenshots; `console-errors.txt` is empty | **Not evidence of no errors** |

### 4.3 Why the summary layer is unreliable

`make_tool_evidence.py` is the root of much of the problem:

- It reads some raw artifacts but also contains hardcoded conclusion text.
- It writes `summary-*.txt` files that look like tool output.
- It renders PNG “terminal” images from a generic HTML template.
- It labels the result “verbatim tool output” even though the PNG is a generated summary.
- It repeats claims that the raw artifacts do not support (kiterunner count, ffuf 429 evidence, Semgrep 0 findings, Burp proxy testing, testssl production claims).
- It points readers to “the report” for accepted CodeQL items, but no report existed.

A reader who only looks at the summaries or the tool PNGs will receive a materially more favorable and less accurate picture than a reader who parses the raw JSON.

### 4.4 Specific evidence-integrity problems

1. **Synthetic tool screenshots.** The 19 `tool-*.png` images are generated summary cards, not terminal captures. They omit raw errors, warnings, and command context.
2. **Hardcoded conclusions.** The summary generator contains prose such as “No vulnerable dependencies,” “No injection sinks,” “Total findings: 0,” and “Proxy-level testing…” even where the raw evidence is incomplete or contradictory.
3. **Wrong counts.** Kiterunner is the clearest example: four claimed results vs. one raw result.
4. **Wrong file citation.** ffuf’s 429 evidence is attributed to a file that contains a wordlist tail.
5. **Invalid tool run.** Semgrep deep scan is treated as a clean result despite scanning zero files.
6. **Ignored anomaly.** Wapiti’s 500 anomaly is omitted from the summary.
7. **No raw Burp output.** Burp never ran a scan; Community Edition has no scanner; the proxy evidence is unauthenticated.
8. **No production TLS evidence.** Testssl tested plain HTTP on localhost.
9. **No console evidence.** The listener was attached after the app screenshots; the empty file only proves the final page had no captured errors after attachment.
10. **No report.** The summary references a report that did not exist; the `reports/` directory was empty.
11. **No route inventory.** `api-endpoints.txt` is a generic directory/file wordlist; `routes.kite` is an nginx 404 HTML page.
12. **Fake DNS.** `tools/bin/dig`, `host`, and `nslookup` are shims that return synthetic local answers. Any DNS-dependent tool output is not real DNS evidence.
13. **Absolute local paths.** `screenshots/index.json` contains `/home/<user>/...` paths. That is local username/home-directory disclosure and reduces portability.
14. **Missing test result.** `IDOR-02` is absent from `manual-tests.json` even though the suite is described as 43 checks.
15. **No checksums or SBOM.** Tools and archives cannot be verified.
16. **No data handling.** Secrets and test tokens are tracked; there is no retention or redaction policy.

### 4.5 What can be trusted

The following raw artifacts are useful, subject to their stated scope:

- `evidence/codeql.sarif` — 72 raw results; 42 first-party; usable for triage.
- `evidence/trivy-fs.json` — app lockfiles/Dockerfile clean; third-party noise.
- `evidence/checkov/results_json.json` — 7 failed GitHub Actions checks.
- `evidence/wapiti-*.json` — 0 vulnerabilities, 1 anomaly; useful with caveats.
- `evidence/ffuf-api.json` and `ffuf-api-clean.json` — raw status counts.
- `evidence/feroxbuster.txt` — Vite file exposure.
- `evidence/npm-audit.json` — 0 npm advisories at run time.
- The local Mongo inventory and live service checks — confirmed facts about this environment.
- `evidence/manual-tests.json` — useful as a record of what was attempted, but not as a verdict of security.

The following should not be relied on without re-running:

- `summary-*.txt` as a whole.
- `tool-*.png` as evidence of tool execution.
- Semgrep deep scan.
- Burp as a scanner.
- Testssl production claims.
- Kiterunner as API discovery.
- `ffuf-throttled.txt` as 429 evidence.
- Manual suite verdicts without reading the assertions.
- `api-endpoints.txt` and `routes.kite` as wordlists.

---

## 5. Confirmed findings

The findings below are the ones supported by code review, raw evidence, or live local validation. Each includes impact, root cause, and remediation. Secret values are deliberately omitted.

### 5.1 `SEC-01` — Historical secret exposure and incomplete remediation

**Severity:** Critical until rotation and purge are verified  
**Status:** Confirmed from gitleaks evidence; operational remediation pending  
**Affected assets:** Old `data_importer/.env`, Git history, public GitHub repository, Brabble API key, MongoDB URI  
**Evidence:** `evidence/gitleaks.json` (redacted), `evidence/summary-gitleaks.txt`, repository state (public, no forks observed, secret scanning disabled)

**What happened**

A historical `.env` file for the data importer contained a Brabble API key and a MongoDB connection URI. The file was removed from the current tree and the history was rewritten/force-pushed. The gitleaks evidence records one historical finding. The report intentionally does not reproduce the secret value, the matching rule text, or the old commit coordinates.

**Why it is still critical**

- The repository is public.
- Secret scanning was disabled.
- No forks were observed, but clones, caches, pull-request refs, and unreachable Git objects may still contain the old secret.
- A force-push does not guarantee that GitHub has purged cached views or PR refs.
- There is no evidence that the Brabble API key or the MongoDB credential was rotated.
- The old MongoDB URI may point at a real database. It must be treated as compromised even if it is no longer used by the current app.

**Impact**

- Unauthorized use of the Brabble API, including quota/cost abuse, if the key is still valid.
- Unauthorized database access if the MongoDB credential is still valid.
- Potential access to data outside the local audit environment.
- Reputational and compliance exposure from a public secret leak.

**Root cause**

- A real `.env` was committed instead of being kept outside Git.
- Secret scanning/push protection was not enabled.
- Remediation focused on history rewriting but not on verified credential rotation.
- The audit package did not include a closure record for the incident.

**Remediation**

1. **Rotate first**, before or in parallel with the GitHub purge:
   - revoke/rotate the Brabble API key;
   - rotate the MongoDB user/password and any related connection strings;
   - check provider audit logs for use of the old credentials;
   - update the local `tools/data-importer/.env` outside Git;
   - never commit the new value.
2. Submit a GitHub Support request to purge unreachable objects and PR refs associated with the old file.
3. Enable GitHub secret scanning and push protection.
4. Notify collaborators/clones; ask them to reset and re-clone.
5. Run gitleaks on the current tree and on the audit evidence, not just history.
6. Add a closure record with rotation date, provider confirmation, purge ticket, and verification.
7. If the repository remains public, assume the old secret is public forever; rotation is the only reliable control.

**Verification**

- The old API key and MongoDB credential fail authentication.
- The old secret is absent from the current tree and from a fresh gitleaks scan.
- GitHub confirms the purge request.
- No secret is present in `seed.json`, `manual-tests.json`, `proxy-flows.mitm`, or scripts.
- The incident record is closed with evidence.

**Status note:** Do not mark this finding closed based on the force-push alone. Rotation and provider-side verification are required.

---

### 5.2 `SEC-02` — Audit artifacts and live local services expose credentials/tokens

**Severity:** High (audit environment; not evidence of production compromise)  
**Status:** Confirmed  
**Affected assets:** `evidence/seed.json`, `evidence/manual-tests.json`, `evidence/manual-tests.txt`, `evidence/proxy-flows.mitm`, `manual_tests.py`, `seed.js`, local API, local MongoDB, local Vite server

**What was found**

- `evidence/seed.json` is tracked and contains:
  - three plaintext test passwords;
  - three session cookies;
  - three CSRF tokens;
  - three access-token values and three refresh-token values;
  - six JWT-like strings;
  - seeded user/admin IDs and an admin login status of 200.
- `evidence/manual-tests.json` is tracked and contains a full JWT and CSRF/error details.
- `evidence/manual-tests.txt` is tracked and contains stack traces.
- `evidence/proxy-flows.mitm` is tracked and contains a login request body with a test password and a 403 response with a stack trace.
- `manual_tests.py` line 133 contains the **actual running API’s access-token secret**; this was verified by exact comparison with the process environment without printing the value.
- `seed.js` contains the plaintext test password and a stored-XSS payload.
- The API was bound to `0.0.0.0:5000`, the Vite server to `0.0.0.0:5173`, and MongoDB to `127.0.0.1:27017` without authentication.
- The admin test account login returned 200.

**Why this is high**

This is a chain, not just a file-hygiene issue:

1. Anyone with repository access can read the admin password and seeded user IDs.
2. Anyone with repository access can read the access-token secret in `manual_tests.py`.
3. Anyone on the local network can reach the API on `0.0.0.0:5000`.
4. The API accepts the seeded admin credentials and/or HS256 tokens signed with the exposed access secret.
5. The admin routes include state-changing operations (for example, user ban/unban and admin hackathon/report/scraper routes).
6. The local MongoDB has no authentication, so any local process can read/write the test data.

Even though this is test data, the primitive is real: the folder contains everything needed to authenticate to the running audit environment. If the same pattern were copied into a production-like environment, the impact would be critical.

**Impact**

- Full administrative access to the local audit instance.
- Ability to ban/unban seeded users, modify admin-managed data, or trigger admin operations.
- Ability to forge access tokens for seeded accounts if a live token is minted with the exposed secret.
- Local database read/write via unauthenticated MongoDB.
- Disclosure of test credentials and tokens to anyone who can read the public repository.
- The tokens may still be valid if the local services remain running.

**Root cause**

- The audit suite was written to be convenient, not safe: it stores credentials and tokens in tracked files.
- The test script hardcodes a real access-token secret instead of reading a short-lived environment value.
- The audit environment uses development services on `0.0.0.0`.
- The `.gitignore` was designed for size, not for sensitive evidence.
- No secret scan was run on the audit artifacts themselves.

**Remediation**

1. Stop the API, Vite, and MongoDB audit services.
2. Rotate the audit secrets:
   - `ACCESS_TOKEN_SECRET`, `JWT_SECRET`, `CSRF_SECRET`, and any cookie-signing secret;
   - admin/test passwords;
   - local database credentials (and enable authentication).
3. Remove or redact:
   - `evidence/seed.json` (replace with counts/placeholders, not values);
   - `evidence/manual-tests.json` (remove JWT/cookies/CSRF/stack values);
   - `evidence/manual-tests.txt` (redact stacks if retained);
   - `evidence/proxy-flows.mitm` (delete or replace with a redacted text summary);
   - `manual_tests.py` (read the secret from a test-only env var; never hardcode it).
4. Bind the API and Vite to `127.0.0.1` for audit work; do not expose them on `0.0.0.0`.
5. Enable MongoDB authentication and use a dedicated least-privilege user; keep the DB on loopback and firewall it.
6. Add sensitive evidence patterns to `.gitignore`; use a separate private evidence store if raw captures must be retained.
7. Run gitleaks/trufflehog on the current tree and the audit folder.
8. Verify that no tracked file contains a password, cookie, JWT, CSRF token, access secret, or proxy credential.
9. Consider rotating any credentials that were ever used with these test accounts, even if they are “test only.”

**Verification**

- `seed.json`, `manual-tests.json`, and `proxy-flows.mitm` contain no live values.
- `manual_tests.py` contains no hardcoded secret.
- The admin password no longer works; old tokens are rejected.
- API/Vite are not reachable from the LAN.
- MongoDB rejects unauthenticated connections.
- A current-tree gitleaks scan is clean.
- The test evidence still proves the same findings using placeholders and hashes.

---

### 5.3 `RATE-01` — IP rate-limit bypass via spoofed `X-Forwarded-For`

**Severity:** High  
**Status:** Confirmed live; the manual suite recorded it as a FAIL, which is a false negative  
**Affected assets:** `POST /api/auth/login`, the login limiter, global API limiter, admin account, local network exposure

**What was found**

- The API uses `app.set('trust proxy', 1)`.
- The login limiter is configured to allow 10 attempts per IP.
- The API is directly exposed on `0.0.0.0:5000`; there is no trusted reverse proxy in front of it.
- With a valid CSRF flow, 14 login attempts for distinct unknown accounts and rotating `X-Forwarded-For` values returned `401` each time; no `429` was observed.
- The manual test `RATE-01` is titled “IP rate limit not bypassable via spoofed X-Forwarded-For” and has verdict `FAIL`. The detail shows 14×401. That means the test correctly observed the bypass but the label/summary treated it as a failure of the control.
- The global API limits were set to `RATE_LIMIT_PER_IP=100000` and `RATE_LIMIT_PER_USER=100000`, so the general limiter is effectively disabled in this environment.

**Impact**

- Credential stuffing and password spraying against local accounts.
- Repeated login attempts against the seeded admin account.
- The per-IP control can be bypassed by rotating the leftmost `X-Forwarded-For` value.
- The global limiter provides little protection at 100,000 requests.
- Combined with the known admin test password or the exposed access secret, the brute-force/forgery risk is higher.
- The per-account lockout (`failedLoginAttempts`/`lockUntil`) may still slow a single-account attack, but it does not stop distributed attempts and was not tested.

**Root cause**

- `trust proxy` is enabled even though the app is directly exposed.
- The limiter keys on `req.ip`, which is derived from the spoofable `X-Forwarded-For` header when the proxy is trusted.
- The audit environment uses very high global limits.
- The manual test’s assertion inverted the meaning of the result.

**Remediation**

1. If the API is directly exposed, set `app.set('trust proxy', false)`.
2. If a reverse proxy is used, trust only the exact number of known proxy hops and strip/normalize `X-Forwarded-For` at the edge.
3. Use a rate-limit key generator that uses the trusted client IP, not an arbitrary header.
4. Lower the login limiter and add per-account lockout/backoff.
5. Lower the global limits to realistic values for the deployment.
6. Add MFA for admin accounts; add alerting for repeated failures.
7. Add a test that expects a 429 after the configured threshold and verifies that spoofed XFF does not reset the bucket.
8. Ensure the test title and assertion match the desired security property.

**Verification**

- 14 login attempts from one real client produce a 429 after the configured threshold.
- Rotating `X-Forwarded-For` does not reset the bucket when no trusted proxy is present.
- Direct and proxied deployments behave correctly.
- Admin login has an additional control (MFA or equivalent).
- Global limits are not set to effectively unlimited values.

---

### 5.4 `ERR-01` — Error-stack leakage on CSRF 403 and oversized-body 413

**Severity:** Medium (information disclosure)  
**Status:** Confirmed live and in proxy evidence  
**Affected assets:** `POST /api/saved` without a CSRF token; `POST /api/feedback` with an oversized body; error-handling middleware

**What was found**

- A cookie-authenticated `POST /api/saved` without `X-CSRF-Token` returns `403` with a JSON error that includes an `error.stack` field of roughly 795 characters.
- The proxy capture also shows a `413 Payload Too Large` response to `POST /api/feedback` with a stack marker and a response body of about 1.2 KB.
- The custom error handler does not appear to normalize these framework-generated errors consistently; the CSRF library’s default response and the body-parser error path can expose development details.
- The manual `CSRF-01` test passed the CSRF control but did not fail on the stack disclosure. The `LIMIT-01` test checked only the 413 status, not the body.
- The environment uses `NODE_ENV=development`, which often enables stack output. Production behavior was not tested.

**Impact**

- Disclosure of internal file paths, line numbers, middleware names, and framework internals.
- The stack may reveal route/controller structure and aid further attacks.
- No secret/token was observed in the stack, but the response body should still not be exposed to clients.
- The same error path may behave differently in production; the fix should not depend on `NODE_ENV`.

**Root cause**

- The CSRF middleware emits its own error response before the custom error handler.
- The body-parser error path is not normalized to a generic JSON error.
- The custom error handler may itself include stack output in development.
- The tests assert only status codes, not response-body safety.

**Remediation**

1. Add a dedicated CSRF error handler that returns a generic `403` with a stable error code and no stack.
2. Add a body-parser error handler for `entity.too.large` and malformed JSON; return generic `413`/`400`.
3. Ensure the central error handler never sends `error.stack` to clients, regardless of environment.
4. Log the stack server-side with correlation IDs; do not return it.
5. Add tests for 400, 403, 404, 413, and 500 responses that assert the absence of `stack`, `at `, file paths, and internal messages.
6. Check whether the Wapiti 500 anomaly also returns a stack; add a regression test.

**Verification**

- A CSRF-less `POST /api/saved` returns 403 with no stack.
- A 200 KB `POST /api/feedback` returns 413 with no stack.
- A malformed JSON body returns 400 with no stack.
- A 500 response returns a generic message and a correlation ID.
- Server logs retain the diagnostic detail.

---

### 5.5 `SAN-01` — Prototype-copy weakness in the sanitizer

**Severity:** Medium (defense-in-depth; exploitation not demonstrated)  
**Status:** Confirmed code behavior  
**Affected assets:** `apps/api/middleware/sanitizeMiddleware.js`, request body/query/params sanitization, downstream services

**What was found**

- The sanitizer recursively copies user-controlled keys into a normal object: `const sanitized = {}; sanitized[key] = ...`.
- It rejects keys starting with `$` and keys containing `.` (except a controlled skill-name exception), but it does not reject `__proto__`, `constructor`, or `prototype`.
- A test payload using `__proto__` caused `req.body.polluted` and an inherited `role` property to be visible through the sanitized object.
- `Object.prototype` itself was not polluted, and no current controller exploit was demonstrated.
- CodeQL reports `js/remote-property-injection` at `sanitizeMiddleware.js:18`.

**Impact**

- Latent privilege/logic manipulation if downstream code reads inherited properties, merges objects, or trusts `req.body` fields.
- Could become exploitable if a controller uses a property lookup that walks the prototype chain.
- The current impact is limited because no direct exploit was found, but the sanitizer is not safe by construction.
- The manual suite’s `MASS-03` test checks that the response does not show pollution, which is weaker than checking the sanitizer’s internal object behavior.

**Root cause**

- The sanitizer uses `{}` instead of a null-prototype object.
- It does not reject prototype-related keys.
- The tests do not assert on the sanitized object’s prototype/inherited properties.

**Remediation**

1. Reject `__proto__`, `constructor`, and `prototype` keys outright.
2. Build sanitized objects with `Object.create(null)`.
3. Use `Object.hasOwn` for property checks and avoid prototype-walking lookups.
4. Use a vetted deep-merge/sanitization library or a well-tested implementation.
5. Add unit tests that assert:
   - `Object.getPrototypeOf(sanitized)` is `null`;
   - `__proto__`/`constructor`/`prototype` are absent;
   - inherited `role`/`isAdmin` cannot be introduced;
   - `Object.prototype` remains clean.
6. Re-run CodeQL and a prototype-pollution scanner.

**Verification**

- A `__proto__` payload is rejected or safely copied without changing the prototype.
- `req.body.polluted` is undefined; inherited `role` is absent.
- `Object.prototype` is unchanged.
- Unit tests cover nested objects, arrays, dotted keys, and the skill-name exception.

---

### 5.6 `ADMIN-01` — Admin API is incomplete and its authorization is untested

**Severity:** Medium (assurance/incompletion)  
**Status:** Confirmed absence and test gap  
**Affected assets:** `apps/api/routes/adminUserRoutes.js`, admin user list, ban/unban, admin hackathon/report/scraper routes, manual tests `AUTH-03`/`AUTHZ-03`

**What was found**

- `GET /api/admin/users` does not exist. The admin user routes provide only PATCH ban/unban operations.
- The manual suite’s `AUTH-03` (“Admin API rejects anonymous access”) and `AUTHZ-03` (“Admin can reach admin endpoints”) both target the missing list route. `AUTH-03` gets 401, `AUTHZ-03` gets 404; the suite records both as PASS.
- The ban/unban endpoints, admin hackathon CRUD, admin reports, and scraper jobs were not tested for authorization, CSRF, rate limits, audit logging, or IDOR.
- The seeded admin account logs in successfully, so the missing route is not an authentication barrier.
- The summary’s “admin gating” coverage claim is therefore unsupported.

**Impact**

- False confidence in admin authorization.
- A 404 is being treated as an authorization control; it is not.
- Ban/unban and other admin mutations may have authorization, CSRF, or audit gaps that were never tested.
- Admin functionality may be broken (no list endpoint), which affects operability and incident response.
- If an attacker obtains admin credentials, the tested/unimplemented route gap does not stop access to the routes that do exist.

**Root cause**

- The admin user list route was not implemented.
- The tests were written against a path that returns 404 and only checked status codes.
- No route inventory or authorization matrix was maintained.

**Remediation**

1. Decide whether `GET /api/admin/users` is required; implement it with pagination/filtering or remove the expectation.
2. Add an authorization matrix for every admin route:
   - anonymous → 401;
   - non-admin → 403;
   - admin → 200/expected;
   - CSRF required for mutations;
   - rate limits;
   - audit logs.
3. Test ban/unban, admin hackathon CRUD, reports, and scraper jobs.
4. Ensure 404 is not used as a substitute for 403 on sensitive routes.
5. Add a route inventory test or OpenAPI spec to prevent missing/untested routes.

**Verification**

- `GET /api/admin/users` returns 200 for admin, 403 for non-admin, 401 for anonymous, or is intentionally removed and documented.
- Ban/unban tests cover admin, non-admin, anonymous, CSRF-less, and invalid IDs.
- All admin mutations produce audit logs.
- The manual suite fails if an expected admin route is missing.

---

### 5.7 `DB-01` — Local MongoDB runs without authentication

**Severity:** Medium (local audit environment)  
**Status:** Confirmed live  
**Affected assets:** Local MongoDB `hackhub` database, `.mongo-data`, API database connection

**What was found**

- MongoDB was running on `127.0.0.1:27017` with no authentication (`connectionStatus` reported 0 authenticated users).
- The server was bound to loopback, not the LAN.
- The Unix socket `/tmp/mongodb-27017.sock` was owner-only (`srwx------`), which is good.
- The data directory was about 206 MB; top-level directory permissions were 755, files were 600.
- The API used the local database; no remote/production database was used by the running API.
- The database contains three seeded users (one admin), bcrypt password hashes, refresh-token hashes, 203 audit logs, and seeded content.
- The `mongod` log includes the standard “Access control is not enabled” warning.

**Impact**

- Any local user/process that can reach TCP `127.0.0.1:27017` can read/write the test database without credentials.
- Password hashes and refresh-token hashes are exposed to local readers; bcrypt protects passwords, but the data is still sensitive.
- An attacker who compromises the API or another local process can modify users, roles, hackathons, teams, and audit logs.
- The DB is not LAN-exposed, which limits the impact.
- No production data was observed, so this is an audit-environment issue, not a production breach.

**Root cause**

- The development MongoDB was started without `--auth`.
- The audit environment did not use a separate least-privilege DB user.
- The data directory was retained after seeding.

**Remediation**

1. Stop the audit MongoDB when testing is complete.
2. For any retained environment, enable authentication with a keyfile and create a dedicated app user with least privilege.
3. Keep the bind address on loopback and firewall the port.
4. Use a separate database/user per environment; never reuse production credentials.
5. Encrypt the disk and restrict data-directory permissions.
6. Delete or archive the test DB after evidence capture.
7. Rotate any credentials that were stored in the DB or used with it.

**Verification**

- Unauthenticated `mongosh`/driver connections fail.
- The app user can access only `hackhub`.
- The DB is not reachable from the LAN.
- The test data is removed or encrypted after the audit.

---

### 5.8 `VITE-01` — Vite dev server exposes project files on `0.0.0.0:5173`

**Severity:** Low/Medium (development exposure)  
**Status:** Confirmed live  
**Affected assets:** Vite dev server, project root files, local network

**What was found**

- Vite was started with `--host 0.0.0.0 --port 5173`.
- Feroxbuster found HTTP 200 responses for:
  - `/.gitignore` (1460 bytes)
  - `/package.json` (1940 bytes)
  - `/package` (10862 bytes)
  - `/vite.config.js` (1655 bytes)
- `/.env` returned 404; no `.env` content was exposed in this run.
- The server is a development server, not the production static build.

**Impact**

- Disclosure of project metadata, dependencies, scripts, and Vite configuration to the local network.
- The `.gitignore` may reveal ignored paths and development practices.
- The `/package` response may expose package metadata or directory content.
- No secret file was found exposed in this run, but the exposure is unnecessary and should be removed.
- Production is served by Vercel/static hosting; this is not a production finding, but it is an audit-environment risk.

**Root cause**

- The audit needed LAN/browser access and used `--host 0.0.0.0`.
- Vite serves the project root in development.
- No firewall or access control was applied.

**Remediation**

1. Bind Vite to `127.0.0.1` unless LAN access is explicitly required.
2. If LAN access is required, use a firewall/allowlist and a temporary environment.
3. Do not serve the project root; use a production build for any shared environment.
4. Ensure `.env` and other secrets are outside the served root.
5. Add a deployment check that the dev server is not exposed.

**Verification**

- `curl` from another host cannot reach `:5173`.
- `/.gitignore`, `/package.json`, and `/vite.config.js` are not served in production.
- `.env` is not present in the served root.

---

### 5.9 `CI-01` — GitHub Actions hardening gaps

**Severity:** Low/Medium  
**Status:** Confirmed static (Checkov)  
**Affected assets:** `.github/workflows/ci.yml`, `deploy-staging.yml`, `scrape-hackathons.yml`, `deploy-production.yml`

**What was found**

Checkov reported 7 failed checks:

| Check | File / lines | Meaning |
|---|---|---|
| `CKV_GHA_3` | `deploy-staging.yml` [37, 47] | Suspicious use of curl with secrets |
| `CKV_GHA_3` | `deploy-staging.yml` [46, 65] | Suspicious use of curl with secrets |
| `CKV_GHA_7` | `scrape-hackathons.yml` [17, 28] | Build output can be affected by user-controlled workflow parameters |
| `CKV2_GHA_1` | `ci.yml` [53, 54] | Top-level permissions set to `write-all` |
| `CKV2_GHA_1` | `deploy-staging.yml` [0, 1] | Top-level permissions set to `write-all` |
| `CKV2_GHA_1` | `scrape-hackathons.yml` [0, 1] | Top-level permissions set to `write-all` |
| `CKV2_GHA_1` | `deploy-production.yml` [0, 1] | Top-level permissions set to `write-all` |

**Impact**

- Secrets passed through `curl` arguments can leak via process listings, debug logs, or shell tracing.
- `write-all` gives the workflow token more permission than needed, increasing the blast radius of a compromised action or script.
- `workflow_dispatch`/user-controlled parameters can influence a build in ways that are not constrained.
- The audit did not verify action pinning, environment protection rules, or secret scoping.

**Root cause**

- Workflows use broad permissions and inline curl commands with secrets.
- No least-privilege policy or workflow review was applied.
- Checkov was run, but the results were not remediated.

**Remediation**

1. Set `permissions: contents: read` at the workflow level and grant only the specific permissions each job needs.
2. Avoid secrets in curl URLs/arguments; pass them via environment variables or headers and disable shell tracing.
3. Mask secrets and avoid echoing commands.
4. Review `workflow_dispatch` inputs and validate/limit them.
5. Pin third-party actions to full commit SHAs and review updates.
6. Use GitHub environments/protection rules for deployment secrets.
7. Add Checkov to CI with a failing threshold and a baseline.

**Verification**

- Checkov reports 0 failed checks for these IDs.
- No `write-all` remains.
- Secret-bearing commands do not appear in logs/process arguments.
- Actions are pinned and reviewed.
- Deployment environments require approval.

---

### 5.10 `LOG-01` — User-controlled log-injection candidates

**Severity:** Low  
**Status:** Static only (4 CodeQL results)  
**Affected assets:** `apps/api/controllers/hackathonTrackingController.js` lines 88, 143, 205, 359

**What was found**

CodeQL reports four `js/log-injection` results in an active controller. The exact values were not dynamically tested. The likely pattern is user-controlled tracking data (search terms, IDs, or event fields) written into logs without encoding.

**Impact**

- Forged log lines or terminal escape sequences.
- Difficulty correlating events; audit-trail integrity issues.
- Potential log-parser injection if logs are consumed by another system.
- No remote code execution or direct data compromise was demonstrated.

**Root cause**

- User-controlled strings are concatenated into log messages.
- Logging is not structured/encoded.
- No tests cover CR/LF or ANSI input in logs.

**Remediation**

1. Use structured JSON logging and pass user input as a field, not as part of the message.
2. Strip or encode CR/LF and ANSI escape sequences.
3. Add tests with `\n`, `\r`, and ANSI payloads.
4. Centralize logging helpers and lint for unsafe interpolation.
5. Re-run CodeQL after the fix.

**Verification**

- A payload containing newlines/ANSI produces one safe log record.
- No forged log level/timestamp is possible.
- CodeQL no longer reports log injection.

---

### 5.11 `OAUTH-01` — OAuth state cookie uses `SameSite=None` in production

**Severity:** Low (needs end-to-end review)  
**Status:** Static; code review suggests the design is intentional but untested  
**Affected assets:** `apps/api/middleware/rateLimitMiddleware.js` (OAuth state cookie options around lines 17–29), Google/GitHub OAuth flow

**What was found**

- In production, the OAuth state cookie uses `sameSite: "none"` and `secure: true`.
- It is `httpOnly`, signed, path-scoped to `/api/auth`, and expires after 10 minutes.
- The state value is 32 random bytes; the callback compares it with `crypto.timingSafeEqual`.
- The code comments explain the login-CSRF/linking threat the state protects against.
- No end-to-end OAuth test was performed; provider callback, state mismatch, expiry, replay, redirect URI, and account-linking behavior were not exercised.

**Impact**

- `SameSite=None` is often required for cross-site OAuth callbacks, but it increases the need for correct CSRF/state handling.
- If the state check were bypassed or the cookie were not `Secure` in production, login CSRF/account-linking attacks could be possible.
- The current code has the expected protections, so this is a review item, not a confirmed vulnerability.
- The audit did not test the actual provider flow.

**Root cause**

- Cross-site OAuth requires a cookie that survives the provider redirect.
- The tradeoff is documented in code but not covered by tests.

**Remediation**

1. Keep `Secure` and `HttpOnly`; verify the production cookie is actually set with both.
2. Test state mismatch, expired state, replayed state, missing cookie, and callback without state.
3. Test redirect URI allowlisting and account-linking behavior.
4. Consider a `__Host-` cookie prefix and the narrowest possible path/domain.
5. Do not change `SameSite` to `Lax` without verifying the provider flow.
6. Add OAuth integration tests with a mock provider.

**Verification**

- A mismatched/missing/expired state is rejected.
- A replayed state is rejected.
- The cookie is `Secure`, `HttpOnly`, and correctly scoped in production.
- Account linking requires an authenticated, intentional action.

---

### 5.12 `LEGACY-01` — Legacy/duplicate backend static findings

**Severity:** Medium (needs review)  
**Status:** Static only; deployment status unclear  
**Affected assets:** `backend/`, `apps/backend-prototype/`

**What was found**

- 17 of the 42 first-party CodeQL results are in legacy/duplicate backend code:
  - `backend/routes/authRoutes.js` (4 missing-rate-limit hits)
  - `backend/routes/hackathonRoutes.js` (2)
  - `backend/routes/notificationRoutes.js` (3)
  - `backend/routes/userRoutes.js` (3)
  - `backend/server.js` (1)
  - `backend/controllers/hackathonController.js` (1 SQLi)
  - `apps/backend-prototype/routes/hackathonRoutes.js` (2 missing-rate-limit)
  - `apps/backend-prototype/controllers/hackathonController.js` (1 SQLi)
- The running API mounts legacy route modules from `apps/api/routes`; the `backend/` and `apps/backend-prototype/` directories appear to be older duplicates. Their deployment status was not established.
- No legacy endpoint was exercised dynamically.

**Impact**

- If any of this code is deployed, the static SQLi/missing-rate-limit findings are relevant.
- If it is dead code, it increases maintenance and audit noise and could be accidentally revived.
- The audit summary counted these as first-party but did not distinguish active vs. legacy, making the results look more severe/active than they are.
- The SQLi hits are not proof of exploitability; they require code-path review.

**Root cause**

- Multiple backend generations remain in the repository.
- No dead-code removal or deployment manifest.
- CodeQL scans all first-party paths.

**Remediation**

1. Determine whether `backend/` and `apps/backend-prototype/` are deployed.
2. If dead, remove them or move them to an archive outside the build.
3. If active, fix the SQLi/rate-limit issues and add tests.
4. Add a deployment manifest/route inventory to distinguish active code.
5. Re-run CodeQL and triage only active paths.

**Verification**

- The repository has one active backend or a documented legacy boundary.
- CodeQL results for active paths are triaged separately.
- No legacy route is reachable unless intended.

---

### 5.13 `EVID-01` — The audit evidence package is not reliable enough for a clean conclusion

**Severity:** High (assurance; not a CVE)  
**Status:** Confirmed  
**Affected assets:** Entire `security-audit/` evidence and summary layer

**What was found**

This is the central folder-level finding. The package has raw evidence, but the summary/evidence layer is not trustworthy enough to support a security sign-off:

- Synthetic tool screenshots labeled as verbatim output.
- Hardcoded summary conclusions not tied to raw output.
- Four false-pass manual checks and one false-negative that hides a real vulnerability.
- A Semgrep “0 findings” claim from a scan that scanned 0 files.
- A kiterunner summary that reports four results where raw output has one.
- An ffuf 429 citation to a wordlist tail.
- An ignored Wapiti 500 anomaly.
- A Burp “proxy testing” claim with no Burp scan and only unauthenticated proxy flows.
- Testssl production claims from a plain-HTTP local target.
- No final report; `reports/` was empty.
- No README, methodology, coverage matrix, tool manifest, checksums, or data-handling policy.
- Fake DNS shims in `tools/bin`.
- Sensitive credentials/tokens in tracked evidence.
- Absolute local paths in screenshot metadata.
- A console-errors file that does not cover the app screenshots.
- `IDOR-02` missing from the manual results.

**Impact**

- A reader could incorrectly conclude that the app is clean or that coverage is complete.
- Real issues can be missed; false issues can be over-weighted.
- The audit cannot be independently reproduced or defended.
- The folder cannot be published as-is because it contains credentials and tokens.
- Remediation priorities may be based on inaccurate summaries.
- Stakeholders may accept a false sense of assurance.

**Root cause**

- The summary generator was written to produce presentable output, not to preserve traceability.
- No evidence QA or reviewer sign-off.
- No separation between raw evidence, derived summaries, and synthetic presentation.
- No methodology or coverage matrix.
- No secret/data-handling review.

**Remediation**

1. Rebuild the evidence package around a traceability rule: every claim links to a raw artifact, command, timestamp, and environment.
2. Remove synthetic tool PNGs or label them clearly as “illustrative summary, not raw output.”
3. Delete or regenerate the misleading summaries from raw data; no hardcoded conclusions.
4. Re-run Semgrep with valid configs; record scanned-file counts and errors.
5. Re-run kiterunner with a valid API wordlist or remove the result.
6. Re-run ffuf and preserve the actual 429 output; do not cite a wordlist tail.
7. Re-run Burp only if a scanner is available; otherwise mark it “not run.”
8. Re-run testssl against a real TLS endpoint or mark TLS “not tested.”
9. Rewrite the manual suite with exact assertions and CSRF handling; no secrets in code.
10. Add a coverage matrix and route inventory.
11. Add checksums, tool versions, licenses, and an environment snapshot.
12. Have an independent reviewer sign off.
13. Remove all secrets/PII from the evidence or move them to a private, access-controlled store.

**Verification**

- Every summary claim is traceable to raw evidence.
- No synthetic image is presented as raw output.
- Semgrep reports a nonzero scanned-file count and valid configs.
- The manual suite has no false passes.
- The report is present in `reports/`.
- The evidence package contains no secrets.
- A second reviewer can reproduce the findings from the README.

---

### 5.14 `SUPPLY-01` — Audit tooling supply-chain and provenance gaps

**Severity:** Medium (assurance/security)  
**Status:** Confirmed  
**Affected assets:** `tools/`, `tools/venv`, tool archives, `tools/bin`, Burp, CodeQL DB, logs

**What was found**

- `tools/` is about 4.5 GB and is Git-ignored, so it is not reproducible from the repository.
- There is no checksum manifest, SBOM, or lockfile for the binaries/archives.
- Several tools are development versions: testssl `3.3dev`, sqlmap `1.10.11.89#dev`, commix `4.2.dev362`, ffuf `2.1.0-dev`.
- The Go install log includes `github.com/vulncheck-oss/go-exploit`, an exploitation framework that is not needed for this audit.
- `feroxbuster`’s Go install failed with a checksum 404; the binary in `tools/feroxbuster` was obtained another way, undocumented.
- `pip-install.log` shows a PEP 668 externally-managed-environment failure; the venv creation/installation process is not documented.
- The venv is 898 MB with 190 packages, including Flask, mitmproxy, Playwright, Semgrep, and Checkov; `pip check` is clean, but there is no vulnerability scan.
- Duplicate archives: CodeQL 664 MB tar + 1.4 GB extracted; Trivy 51 MB tar + 169 MB binary; ferox 6.5 MB tar + 17 MB; gitleaks 7.9 MB tar + 21 MB; kiterunner 5.6 MB tar + 15 MB; Burp 341 MB installer + 863 MB installed. That is roughly 1.1 GB of redundant data.
- `tools/bin/dig`, `host`, and `nslookup` are fake shims that return synthetic local answers. Any DNS-dependent tool output is not real DNS evidence.
- `httpx` in the shell PATH was Python’s `httpx`, not ProjectDiscovery’s; the ProjectDiscovery binary was in `~/go/bin`, outside the audit folder. The audit summary does not make this distinction.
- Burp Community Edition has no scanner; the only Burp output is a license prompt. `burp-run.txt` and `mitmproxy.txt` are empty.
- The CodeQL database is ignored and unverified for copies of the old `.env` secret.
- Licenses are missing for several tools; CodeQL/sqlmap/commix/XSStrike/testssl have license material, but gitleaks/Trivy/ferox/kiterunner/Burp provenance is incomplete.

**Impact**

- A compromised or replaced tool could produce false evidence.
- Findings cannot be reproduced on another machine.
- Dev versions may have undisclosed bugs or behavior changes.
- The fake DNS shims can invalidate DNS-dependent tests.
- Duplicate/unused tools increase attack surface and disk usage.
- No SBOM/SCA means known vulnerabilities in the tooling are unknown.
- License/compliance risk.

**Root cause**

- Tools were downloaded ad hoc into an ignored directory.
- No manifest/checksum/SBOM process.
- The audit prioritized having many tools over provenance.
- Fake DNS shims were used to work around the host environment.

**Remediation**

1. Create `tools/manifest.json` with name, version, source URL, SHA-256, license, and purpose.
2. Pin versions and verify checksums before use.
3. Use containers or a dedicated audit VM with a reproducible image.
4. Generate an SBOM and run vulnerability scans on the tooling.
5. Remove duplicate archives and unused tools.
6. Remove `go-exploit` unless explicitly required and documented.
7. Replace fake DNS shims with a real resolver or clearly mark DNS tests as synthetic/not run.
8. Keep `httpx`/`ffuf` binaries in the audit toolchain with version output captured.
9. Store raw terminal logs, not synthetic PNGs.
10. Document the venv creation and package versions; use a lockfile.

**Verification**

- Every tool has a checksum and license record.
- The manifest can rebuild the toolchain.
- `pip check` and a vulnerability scan pass.
- No fake DNS shim is used for evidence.
- Duplicate archives are removed.
- Burp is marked “not run” unless a scanner is available.

---

### 5.15 `PRIV-01` — Test data, PII-like content, and local-path disclosure

**Severity:** Medium (privacy/assurance)  
**Status:** Partly confirmed  
**Affected assets:** `screenshots/`, `screenshots/index.json`, `seed.json`, `manual-tests.json`, `proxy-flows.mitm`, logs, local DB

**What was found**

- The local DB contains three `@audit.local` test users (one admin) and seeded hackathons/teams. No production PII was observed.
- The app screenshots show the audit test accounts and seeded content.
- The profile screenshot shows non-audit-looking example handles, institution, and year. The local DB’s audit users have empty links, so these values appear to be demo/placeholder data from `apps/web/src/mocks/data.js` or the UI. The exact values are intentionally omitted here.
- `screenshots/index.json` contains absolute paths under `/home/<user>/...`, disclosing the local username/home directory.
- `seed.json` contains test passwords, cookies, CSRF tokens, and JWTs.
- `manual-tests.json` contains a JWT and stack traces.
- `proxy-flows.mitm` contains a login request body with a test password and a 403 stack.
- `auditlogs` has 203 records; IP/user-agent/action fields were not fully reviewed.
- There is no retention policy, redaction policy, or access control for the evidence folder.

**Impact**

- If the folder is published or shared, test credentials and tokens are exposed.
- The local username/home path is disclosed.
- The demo/placeholder profile data could be mistaken for a real person or could be real if the demo fixtures were copied from a real profile; it should be reviewed.
- Audit logs may contain IP addresses or user agents.
- No production data was observed, but the historical Mongo URI may point elsewhere; that incident is covered by `SEC-01`.

**Root cause**

- The audit captured convenience data without a redaction step.
- Screenshots and seed files were treated as test artifacts, not sensitive evidence.
- No data-handling policy.

**Remediation**

1. Remove or redact all credentials/tokens from tracked evidence.
2. Replace screenshots with synthetic data or redact them.
3. Remove absolute paths from `index.json`; use relative paths.
4. Review `apps/web/src/mocks/data.js` and the profile screenshot for real personal data; replace with clearly fictional data if needed.
5. Review audit logs for IP/user-agent retention; redact or aggregate.
6. Define retention and access control for raw evidence.
7. Add a pre-publication checklist and secret/PII scan.
8. Do not publish the audit folder as-is.

**Verification**

- No password, cookie, JWT, CSRF token, access secret, or local absolute path is tracked.
- Screenshots contain only clearly synthetic data.
- Audit logs are retained only as long as needed and access-controlled.
- A reviewer signs off on the redaction.

---

### 5.16 `CONFIG-01` — Weak development configuration on an exposed API

**Severity:** High in the audit environment; production impact unknown  
**Status:** Confirmed live configuration  
**Affected assets:** Local API process, cookies, rate limits, email verification, CORS, secrets

**What was found**

- `NODE_ENV=development`.
- `DEV_AUTO_VERIFY=true`; registration email verification is bypassed.
- `RATE_LIMIT_PER_IP=100000` and `RATE_LIMIT_PER_USER=100000`; the global limiter is effectively disabled.
- API secrets were short development values; the access-token secret is in a tracked script.
- `COOKIE_SECRET` was not set; `cookieParser` falls back to the JWT secret.
- Cookies are not `Secure` in development; the local target is plain HTTP.
- The API is bound to `0.0.0.0:5000`.
- `RUN_BACKGROUND_JOBS=false`; scraper/background behavior is disabled, which limits coverage.
- CORS is restricted to `http://localhost:5173`, but CORS is not an authentication control and can be spoofed by non-browser clients.
- The admin test account is seeded and its password is in tracked evidence.

**Impact**

- The audit environment is not production-representative; some findings may not apply to production, and some production risks may be hidden.
- Auto-verification bypasses an email-ownership control.
- High rate limits weaken brute-force/DoS protection.
- Weak/short secrets and secret reuse increase token/cookie forgery risk.
- `0.0.0.0` exposure makes the local test instance reachable from the LAN.
- The local environment is not safe to leave running.

**Root cause**

- Development convenience settings were used for an audit environment that was also network-exposed.
- No production-like configuration profile.
- No secret management.

**Remediation**

1. Use a production-like configuration for security testing:
   - strong random secrets from a secret manager;
   - `DEV_AUTO_VERIFY=false`;
   - realistic rate limits;
   - `NODE_ENV=production` for error/cookie behavior;
   - TLS;
   - separate cookie-signing secret.
2. Bind to loopback unless LAN access is explicitly required.
3. Use a separate test DB and test accounts with unique, non-production credentials.
4. Stop the environment when testing is complete.
5. Document the configuration and deviations.

**Verification**

- The audit environment matches production security-relevant settings or deviations are documented.
- Auto-verify is off.
- Rate limits are realistic and tested.
- Secrets are strong and not in code/evidence.
- Cookies are `Secure`/`HttpOnly`/`SameSite` as intended.
- API/Vite are loopback-only.

---

## 6. Unconfirmed, weak, or untested areas

These are not confirmed vulnerabilities. They are areas where the audit’s evidence is insufficient, invalid, or absent. They should not be reported as “clean.”

| Area | What exists | Why it is not confirmed | Next step |
|---|---|---|---|
| SQL injection — active API | 12 CodeQL `js/sql-injection` hits in services | Typed Mongoose filters/sanitizer may mitigate; no exploit demonstrated; CodeQL is not proof | Code-path review plus safe payload tests; do not dismiss solely on types |
| SQL injection — legacy | 2 CodeQL hits in `backend/` and `apps/backend-prototype` | Deployment status unclear; no dynamic test | Determine active/dead; remove or fix |
| NoSQL operator injection | `INJ-02`/`INJ-03` | `INJ-03` got 403 CSRF, not a NoSQL rejection; `INJ-02` accepts 200/400 without proving operator handling | Re-test with CSRF and exact assertions |
| Stored XSS | Seeded `<img onerror>` payload | Not exercised in the UI; only reflected search was tested | Render the seeded hackathon description and check React escaping/CSP |
| DOM XSS | No `dangerouslySetInnerHTML` found in app source | No DOM-sink review or browser test | Review all HTML sinks and run a DOM-XSS scan |
| Reflected XSS | `XSS-01` search payload | Only one context; no browser execution | Use a real browser and multiple encodings |
| IDOR/BOLA | `IDOR-01`, `IDOR-03`–`IDOR-07` pass | `IDOR-02` is missing; only selected objects tested; no proxy replay | Enumerate all object IDs/roles and test cross-account |
| Mass assignment | `MASS-01`/`MASS-02`/`MASS-03` | `MASS-02` hit a 404; `MASS-01` checked only `role`; `MASS-03` checked response not sanitizer | Test actual profile/skills endpoints with all sensitive fields |
| Admin authorization | `AUTHZ-01`/`AUTHZ-02`; `AUTHZ-03` 404 | Admin list route absent; ban/unban and other admin routes untested | Build an admin route/authz matrix |
| OAuth login CSRF | State cookie code | No end-to-end provider test | Test state mismatch/expiry/replay/redirect URI/account linking |
| Password reset/email verification | Routes exist | `DEV_AUTO_VERIFY=true`; no tests | Test tokens, expiry, reuse, enumeration, rate limits |
| File upload/avatar/SSRF | AvatarUploader/Cloudinary code | Not tested | Test type/size/magic, storage, signed URLs, SSRF, image processing |
| SSRF via scraper/links | Admin scraper/links code | Background jobs disabled; no tests | Test URL allowlists, redirects, metadata endpoints |
| Rate limits beyond login | Global limiter | Only login/global tested; global 100000 | Test register/reset/upload/search/admin |
| CSRF beyond selected routes | CSRF middleware | Only a few routes tested; error leak | Test all state-changing routes, login CSRF, SameSite |
| Frontend headers/TLS | API Helmet; frontend no headers | No production test; local plain HTTP | Test production TLS/redirect/CSP/HSTS/XCTO/Referrer-Policy |
| Log injection | 4 static CodeQL hits | No dynamic test | Send CR/LF/ANSI payloads and inspect logs |
| Legacy code | 17 CodeQL hits | Active/dead unknown | Remove or test |
| Python/Go/Docker SCA | npm audit + app Trivy | No `pip-audit`, `govulncheck`, image scan | Run SCA/SBOM |
| CI action pinning | Checkov 7 | Pinning/environment protections not assessed | Review workflows |
| Mobile | None | MobSF not applicable | No action unless a mobile app exists |
| Production | None | No production URL/credentials | Separate production assessment |

### 6.1 SQL injection — why “typed filters” is not enough

The CodeQL summary says the Mongo “SQL injection” hits are typed filters. That may be true for some paths, but it is a **triage hypothesis**, not a demonstrated proof. The active API has 12 hits across join requests, notifications, teams, and users services. The legacy code has 2. The audit did not:

- trace each hit to a concrete user-controlled input;
- show that every value is cast/validated before reaching the query;
- test operator injection with a valid CSRF session;
- test legacy code;
- run a NoSQL-specific scanner.

The correct disposition is “needs code-path review,” not “false positive.”

### 6.2 NoSQL injection — the tests were blocked by CSRF

`INJ-03` sends `{"email":{"$ne":null},"password":"x"}` to `/auth/login` without a CSRF token. The server returns 403, which the test accepts as a pass. That proves CSRF protection, not NoSQL safety. `INJ-02` accepts 200 or 400 and only checks that `"$ne"` is not in the response; that is not a proof that the operator was neutralized. Both need re-testing with a valid CSRF token and precise assertions.

### 6.3 XSS — only reflection was tested

The suite’s `XSS-01` tests a search payload and checks that it is not reflected unescaped. It does not test:

- the seeded stored-XSS payload in a hackathon description;
- profile fields, team names, join-request messages, notifications, feedback, or admin content;
- DOM sinks;
- CSP bypass;
- browser execution.

The app uses React, and no `dangerouslySetInnerHTML` was found in the app source, which is a positive signal. That is not a substitute for a stored/DOM XSS test.

### 6.4 IDOR/BOLA — one test is missing

`IDOR-02` is absent from `manual-tests.json`. The other IDOR checks pass for the objects they use, but there is no full object/role matrix. The suite does not prove that every team, join request, invitation, saved item, notification, or admin object is protected.

### 6.5 Mass assignment — wrong endpoint and weak assertions

`MASS-02` is recorded as NOTE after a 404; it tested `/users/me/skills` rather than the actual skills update endpoint. `MASS-01` checks `role`/account flags but not all sensitive fields. `MASS-03` checks that the response does not show pollution, not that the sanitizer is safe. The mass-assignment area is effectively untested.

### 6.6 Admin authorization — 404 is not a control

`AUTH-03` and `AUTHZ-03` both target `/api/admin/users`. The route does not exist. An anonymous 401 and an admin 404 are not evidence that admin authorization works. The ban/unban routes and other admin operations are untested.

### 6.7 File upload/SSRF — not tested

The app has an avatar uploader and Cloudinary integration. The audit did not test:

- file type/size/magic-byte validation;
- image processing/EXIF;
- signed URL exposure;
- SSRF via remote avatar URLs;
- Cloudinary credential handling;
- deletion/cleanup.

The scraper/admin URL-fetching code was not exercised because background jobs were disabled.

### 6.8 Password reset/email verification — not tested

`DEV_AUTO_VERIFY=true` bypasses email verification. The audit did not test reset-token entropy, expiry, reuse, enumeration, rate limits, or email delivery. The `ENUM-02` test was blocked by CSRF and is invalid.

### 6.9 Production TLS/headers — not tested

The local target is plain HTTP. Testssl did not test TLS. The API sets Helmet headers, but the frontend headers and production TLS/redirect behavior are unverified. HSTS on an HTTP response is not meaningful. Production could be fine, or not; the audit does not know.

---

## 7. Manual test suite deep dive

### 7.1 Recorded results

`manual-tests.json` contains 43 checks:

- **40 PASS**
- **2 NOTE**
- **1 FAIL** (`RATE-01`)

The suite is described as covering authn/authz, JWT forgery, CSRF, CORS, IDOR/BOLA, mass assignment, NoSQL injection, prototype pollution, headers, rate limits, account enumeration, session revocation, admin gating, and XSS.

That description overstates the suite. Several checks are invalid or weak, and one “failure” is actually a confirmed vulnerability.

### 7.2 False passes

These checks passed but do not prove what they claim:

| Check | Claim | What actually happened | Why it is a false pass |
|---|---|---|---|
| `INJ-03` | NoSQL operator injection in login rejected | 403 from CSRF | The request never reached the login logic; CSRF blocked it |
| `ENUM-01` | Registration does not disclose existing accounts | 403 from CSRF | The duplicate-account path was never exercised |
| `ENUM-02` | Password reset response identical | 403 from CSRF | The reset path was never exercised |
| `AUTHZ-03` | Admin can reach admin endpoints | 404 because `/api/admin/users` does not exist | 404 is not an authorization success |

### 7.3 The false negative that found a real bug

`RATE-01` is titled “IP rate limit not bypassable via spoofed X-Forwarded-For” and is recorded as **FAIL**. The detail shows 14 login attempts with rotating XFF and 14×401, with no 429. That is exactly the bypass. The suite inverted the desired result: the control failed, which means the vulnerability is confirmed. The summary’s “FAIL” is technically a finding, but its wording makes it look like a test failure rather than a security issue.

### 7.4 Weak/inconclusive checks

| Check | Problem |
|---|---|
| `JWT-03` | Tests the literal default `change_me`, not the actual running secret. The actual access-token secret is separately embedded in the script at line 133. |
| `JWT-04` | The expired-token result is valid, but the test signs it with the actual access secret; the script is a credential leak. |
| `CSRF-01` | The CSRF control works, but the 403 response leaks a stack trace; the test does not fail on the leak. |
| `CSRF-03` | The detail contradicts the PASS; it appears to test IP binding, not session binding. |
| `COOKIE-01` | Checks only `HttpOnly`; does not verify `Secure`, `SameSite`, domain, path, or expiry; the detail leaks a JWT. |
| `INJ-01` | Metacharacter handling is not injection proof. |
| `INJ-02` | Accepts 200 or 400 and only checks for `"$ne"` absence; not proof. |
| `MASS-01` | Checks only `role`/flags; not a full sensitive-field test. |
| `MASS-02` | NOTE at a 404; wrong endpoint. |
| `MASS-03` | Checks response pollution, not sanitizer internals. |
| `ENUM-03` | Only an unknown account; no existing-account comparison. |
| `HDR-02` | Frontend headers are absent/not verified; production unverified. |
| `AUTHZ-01` | May be testing the missing admin route; non-admin 404/403 is not a full authz proof. |
| `XSS-01` | Reflected search only; no stored/DOM XSS. |
| `LIMIT-01` | Checks 413 status only; the 413 body contains a stack. |

### 7.5 Missing result

`IDOR-02` is not present in `manual-tests.json`. The suite count is 43 without it; the missing test is a coverage hole, not a pass.

### 7.6 What the suite does prove

These checks are useful, subject to their scope:

- `AUTH-01`/`AUTH-02`: anonymous access to `/users/me` and `/saved` is rejected.
- `JWT-01`/`JWT-02`: malformed and `alg=none` tokens are rejected.
- `JWT-04`: expired tokens are rejected (but see the secret leak).
- `CORS-01`/`CORS-02`: arbitrary/null origins are not reflected.
- `CSRF-01`/`CSRF-02`: a mutation without a token and a token without a matching cookie are rejected.
- `COOKIE-01`: auth cookies are HttpOnly (partial).
- `INFO-01`: Alice sees Alice’s saved items.
- `IDOR-01`, `IDOR-03`–`IDOR-07`: selected cross-account team/saved operations are blocked.
- `DATA-01`–`DATA-03`: private fields and hidden hackathons are not exposed in the tested paths.
- `ERR-01`: invalid ObjectId does not leak a stack (but other error paths do).
- `LIMIT-01`: oversized JSON gets 413 (but the body leaks a stack).
- `METRICS-01`: `/metrics` is not exposed without a token.
- `HDR-01`: API security headers are present.
- `SESS-01`: logout revokes the access token server-side.
- `AUTHZ-01`/`AUTHZ-02`: non-admin access to selected admin/scraper routes is blocked (partial).
- `CSRF-02`: token/cookie mismatch is rejected.

### 7.7 How to fix the suite

1. Add a CSRF helper that fetches a token and sends it with every mutation.
2. Assert exact status codes and response-body invariants; do not accept 403 as a pass for injection/enumeration tests.
3. Use two real users with known objects for every IDOR test.
4. Use the actual endpoints and HTTP methods.
5. Assert on JSON fields, not response length or substrings.
6. Check the sanitized object’s prototype/inherited properties.
7. Check all cookie flags: `HttpOnly`, `Secure`, `SameSite`, domain, path, expiry.
8. Test stored XSS by rendering seeded content in a browser.
9. Test NoSQL operator injection with CSRF and exact behavior.
10. Test admin routes with anonymous/non-admin/admin and CSRF-less mutations.
11. Test rate limits at the configured threshold and with spoofed XFF.
12. Test error bodies for stacks on 400/403/404/413/500.
13. Never hardcode credentials/tokens; read test secrets from a temporary env and redact logs.
14. Record raw request/response metadata (redacted) and a timestamp.
15. Add a coverage matrix and fail if a required route is missing.

---

## 8. CodeQL triage

### 8.1 Raw results

- 72 raw results.
- 42 first-party results.
- 30 results in audit tools/venv (not app code).
- First-party breakdown:
  - 23 active API (`apps/api/`)
  - 17 legacy/duplicate (`backend/`, `apps/backend-prototype/`)
  - 1 build script (`scripts/configure-vercel-csp.mjs`)
  - 1 web dev artifact (`apps/web/public/mockServiceWorker.js`)

### 8.2 Rule summary and disposition

| Rule | Count | Disposition |
|---|---:|---|
| `js/missing-rate-limiting` | 17 | Active 2: global limiter exists but is bypassable; legacy 15: needs review/removal. Not a blanket false positive. |
| `js/sql-injection` | 14 | Active 12: typed filters may mitigate, but no exploit proof; legacy 2: needs review. Do not dismiss without code-path review. |
| `js/log-injection` | 4 | Active; low; needs dynamic test. |
| `js/missing-token-validation` | 2 | Likely false positive due global CSRF/session middleware; verify. |
| `js/remote-property-injection` | 1 | Confirmed sanitizer weakness (`SAN-01`). |
| `js/samesite-none-cookie` | 1 | OAuth state cookie; likely intentional; needs end-to-end review (`OAUTH-01`). |
| `js/missing-origin-check` | 1 | MSW service worker; development-only; low/false positive. |
| `js/incomplete-url-substring-sanitization` | 1 | Build script; likely false positive; review. |
| `js/user-controlled-bypass` | 1 | Rate-limit identity middleware; the token is signature-verified; likely false positive. The real bypass is `trust proxy`/XFF (`RATE-01`). |

### 8.3 Active API hits

The active API has 23 first-party hits:

- `apps/api/src/app.js`: 2 missing-rate-limit + 1 missing-token-validation.
- `apps/api/server.js`: 1 missing-token-validation.
- `apps/api/src/services/joinRequestsService.js`: 5 SQLi.
- `apps/api/src/services/notificationsService.js`: 2 SQLi.
- `apps/api/src/services/teamsService.js`: 2 SQLi.
- `apps/api/src/services/usersService.js`: 3 SQLi.
- `apps/api/controllers/hackathonTrackingController.js`: 4 log-injection.
- `apps/api/middleware/sanitizeMiddleware.js`: 1 remote-property-injection.
- `apps/api/middleware/rateLimitMiddleware.js`: 1 SameSite=None (OAuth state cookie).
- `apps/api/src/middleware/rateLimitIdentity.js`: 1 user-controlled-bypass (likely false positive).

The active SQLi hits are concentrated in services that build filters from request data. The sanitizer and typed casts may reduce risk, but the audit did not prove it for each path. The correct next step is a path-by-path review with safe tests, not a blanket “false positive.”

### 8.4 What the CodeQL summary gets wrong

- It says “Mongo SQL injection hits are typed filters” without showing the path review.
- It says “missing-token-validation/missing-rate-limiting hits are global middleware CodeQL does not model” without distinguishing the active bypass and legacy code.
- It says “See report for the 3 accepted items,” but no report existed.
- It does not disclose that 17 of the 42 first-party hits are legacy/duplicate code.
- It does not mention the confirmed sanitizer weakness as a confirmed item; it is treated as triage noise.
- It does not mention the OAuth state cookie nuance.

### 8.5 Recommended CodeQL process

1. Run CodeQL with a checked-in query suite and record the command, database, and source commit.
2. Separate active vs. legacy paths in the SARIF triage.
3. Require a code-path note for every dismissed SQLi/rate-limit hit.
4. Add unit/integration tests for accepted risks.
5. Re-run after fixes and compare the SARIF.
6. Do not use “typed filters” as a blanket dismissal.

---

## 9. Tool-by-tool results

### 9.1 Manual suite

- **What it is:** 43 authenticated checks against the local API.
- **What is valid:** selected auth, CORS, JWT, CSRF, IDOR, hidden-resource, header, metrics, session, and rate-limit evidence.
- **What is invalid/weak:** four false passes, one false negative, one missing IDOR test, weak NoSQL/mass-assignment/XSS/cookie assertions, and a hardcoded access secret.
- **Conclusion:** useful as a starting point; not a reliable verdict. See section 7.

### 9.2 CodeQL

- **Raw result:** 72 results; 42 first-party; 30 tool/venv.
- **What is valid:** the SARIF is real; rule/path/line data is usable.
- **What is weak:** triage summary is incomplete; no report; legacy/active not separated; SQLi dismissals are unproven.
- **Conclusion:** use the raw SARIF; re-triage. See section 8.

### 9.3 Semgrep

- **First run:** 288 rules on 465 files; 0 findings; 4 partial-parse errors in `deploy-staging.yml`/design HTML.
- **Deep run:** 0 findings; **0 files scanned**; 2 config errors (the `p/express` config could not be downloaded; HTTP 404).
- **What is valid:** the first run scanned real files and found no results, but parse errors reduce confidence.
- **What is invalid:** the deep run cannot support “0 findings” because it scanned nothing.
- **Conclusion:** invalid/incomplete. Re-run with local, pinned rule packs and fix parse errors.

### 9.4 Trivy

- **Scope:** filesystem scan of app lockfiles and Dockerfiles; secret scanning also run.
- **App results:** `backend/package-lock.json` 0; root `package-lock.json` 0; `apps/api/Dockerfile` 0 misconfigurations.
- **Third-party noise:** the `sqlmap` test Dockerfile has 2 misconfigurations; secret hits in `sqlmap` JWT utilities and mitmproxy CA keys are third-party tool artifacts.
- **What is valid:** app lockfiles/Dockerfile are clean in this scan.
- **What is weak:** the summary says “only false positives” but omits the third-party Dockerfile misconfigurations; it is not a full app image/dependency scan.
- **Conclusion:** app-scope clean; not a full SCA. Re-run with a proper image/SBOM scope and triage third-party noise separately.

### 9.5 Checkov

- **Raw result:** 7 failed GitHub Actions checks; 289 passed across the runs.
- **Findings:** 2× `CKV_GHA_3` curl-with-secrets in `deploy-staging.yml`; 1× `CKV_GHA_7` user-parameter build in `scrape-hackathons.yml`; 4× `CKV2_GHA_1` write-all.
- **What is valid:** the checks are real CI hardening findings.
- **What is weak:** no remediation; no action-pinning review; no environment protection review.
- **Conclusion:** valid static CI findings; fix and re-run. See `CI-01`.

### 9.6 Wapiti

- **Runs:** 6 scans; 0 vulnerabilities across all module keys; 1 anomaly in `wapiti-ep1.json`.
- **Anomaly:** HTTP 500 on a null-byte search payload (`search=https://wapiti3.ovh/e.php%00`).
- **Coverage:** unauthenticated GET only; no authenticated flows, no POST/JSON mutations, no stored XSS, no rate-limit testing.
- **What is valid:** the 0-vulnerability result is real for the tested unauthenticated GET surface.
- **What is weak:** the 500 anomaly is ignored; it is a robustness/error-handling issue and may be a stack-leak path.
- **Conclusion:** partial. Re-run with authentication and the anomaly included.

### 9.7 SQLmap

- **Target:** `GET /api/hackathons?search=test&limit=20&page=1`; the run tested a `Referer` parameter and logged 4090 HTTP 400 responses.
- **Result:** no injectable parameters; the datastore is MongoDB, not SQL.
- **What is valid:** SQLmap did not find SQL injection.
- **What is weak:** SQLmap is the wrong tool for MongoDB; 4090 400s indicate payloads were rejected, not that the app is injection-free; no NoSQL-specific test.
- **Conclusion:** inconclusive for NoSQL; do not cite as proof of safety.

### 9.8 Commix

- **Target:** `limit` parameter; file-based blind command injection tests.
- **Result:** no injection; `--eval`/code injection was not tested.
- **What is valid:** the tested `limit` parameter did not show command injection.
- **What is weak:** only one parameter; no code injection; no OS command sinks reviewed.
- **Conclusion:** inconclusive.

### 9.9 XSStrike

- **Result:** no reflection found.
- **What is valid:** the tested reflected payload was not reflected unescaped.
- **What is weak:** stored XSS was not tested; the seeded `<img onerror>` payload was not rendered; no DOM XSS; no CSP bypass.
- **Conclusion:** partial; no stored/DOM conclusion.

### 9.10 ffuf

- **Raw run:** 3555 results; 3×200, 3552×429.
- **Clean run:** 7 results; 4×200 (`/api/Health`, `/api/Stats`, `/api/health`, `/api/stats`) and 3×401 (`/api/calendar`, `/api/notifications`, `/api/saved`).
- **What is valid:** the raw 429s show the app’s limiter was active during the raw run; the clean run shows case-insensitive duplicate routes and 401s.
- **What is weak:** `summary-ffuf` cites `ffuf-throttled.txt` as 429 evidence, but that file is the tail of `common.txt`; the current environment uses 100000 limits, so the 429 behavior is not reproducible; the wordlist is generic and not an API route inventory.
- **Conclusion:** partial; fix the citation and rerun under the current config.

### 9.11 Feroxbuster

- **Result:** 200 for `/.gitignore`, `/package.json`, `/package`, `/vite.config.js`; `.env` 404.
- **What is valid:** Vite dev-server file exposure is real.
- **What is weak:** development-only; only 8 response records captured; no production test.
- **Conclusion:** confirmed development exposure (`VITE-01`).

### 9.12 Kiterunner

- **Raw result:** one result: `GET 200 /api//health`.
- **Summary claim:** four results (`/health`, `/Health`, `/stats`, `/Stats`).
- **Wordlist:** `api-endpoints.txt` is a generic directory/file wordlist; `routes.kite` is an nginx 404 HTML page, not a kiterunner routes file.
- **What is valid:** the single health result.
- **What is weak:** the summary overstates; the wordlist is invalid; authenticated routes were not discovered.
- **Conclusion:** invalid/incomplete.

### 9.13 Arjun

- **Result:** parameters `mode`, `active`, `sort`, `status`.
- **What is valid:** those parameters were found; the tested hidden/admin parameters did not expose hidden records.
- **What is weak:** limited parameter space; no full API inventory; no authenticated parameter fuzzing.
- **Conclusion:** narrow, no confirmed finding.

### 9.14 httpx

- **Result:** API security headers; frontend responses lack headers; HSTS is reported on plain HTTP.
- **What is valid:** API headers were observed.
- **What is weak:** no TLS; HSTS on HTTP is not meaningful; frontend/production unverified; `httpx` in PATH was Python’s httpx, not ProjectDiscovery.
- **Conclusion:** partial; no TLS conclusion.

### 9.15 Burp

- **Result:** license prompt only; no scan; `burp-run.txt` and `mitmproxy.txt` empty; Burp Community has no scanner.
- **Proxy:** 7 unauthenticated flows; login 403 due missing CSRF; no authenticated session.
- **What is valid:** the proxy text summary lists the 7 flows.
- **What is weak:** the summary’s “proxy-level testing” overstates; no Burp scan; no authenticated proxy testing.
- **Conclusion:** not run / invalid for scanner claims.

### 9.16 Testssl

- **Target:** `127.0.0.1:5000`; plain HTTP; no TLS.
- **Result:** no protocol/TLS detected; no production test.
- **What is valid:** the local target has no TLS.
- **What is weak:** the summary’s production TLS/secure-cookie claims are speculative; the fake `dig`/`host` shims affect DNS-dependent behavior.
- **Conclusion:** not applicable/coverage gap.

### 9.17 MobSF

- **Result:** not applicable; no mobile artifact.
- **Conclusion:** correctly not run, assuming no mobile app. If a mobile app exists, this is a coverage gap.

### 9.18 npm audit

- **Result:** 0 vulnerabilities for the npm workspace.
- **What is valid:** no npm advisories at run time.
- **What is weak:** no Python/Go/Docker/image SCA; no SBOM; no runtime dependency review.
- **Conclusion:** valid but narrow.

### 9.19 Gitleaks

- **Result:** one historical finding: a generic API key in an old data-importer `.env`.
- **What is valid:** the finding is real; the evidence is redacted.
- **What is weak:** the summary’s “8 chars/entropy 3.98973” describes the redacted placeholder, not the original secret; no current-tree scan of the audit artifacts; no closure/rotation evidence.
- **Conclusion:** confirmed historical incident; remediation incomplete (`SEC-01`).

### 9.20 Screenshots

- **App:** 13 screenshots at 1440px; seeded audit data; profile screenshot shows demo/placeholder values; no accessibility testing; console listener attached after captures.
- **Tool:** 19 synthetic PNGs generated by `make_tool_evidence.py`; not verbatim tool output.
- **Metadata:** `index.json` uses absolute `/home/<user>/...` paths; tool screenshots are not indexed.
- **Conclusion:** app screenshots are partial visual evidence; tool screenshots are not evidence of tool execution.

### 9.21 Logs and wordlists

- **Mongo log:** no-auth warning; local bind.
- **pip log:** PEP 668 failure; venv process undocumented.
- **Go log:** dev versions; `go-exploit`; ferox checksum 404.
- **Burp log:** license prompt.
- **Wordlists:** `common.txt` valid; `api-endpoints.txt` generic; `routes.kite` invalid HTML; `ffuf-throttled.txt` is not 429 evidence.
- **Conclusion:** operational context, but not a substitute for raw evidence.

### 9.22 Tool coverage matrix

| Area | Tool coverage | Status |
|---|---|---|
| Authentication | Manual JWT/login, CodeQL, Wapiti | Partial; reset/OAuth/email not tested |
| Authorization | Manual IDOR/admin, CodeQL | Partial; IDOR-02 missing; admin 404 |
| SQL/NoSQL injection | SQLmap, CodeQL, manual | Inconclusive; wrong DB/tests blocked |
| XSS | XSStrike, manual | Reflected only; stored/DOM not tested |
| CSRF | Manual, CodeQL, proxy | Basic control works; error leak; broad routes untested |
| Rate limiting | Manual, ffuf | Bypass confirmed; other endpoints untested |
| Headers/TLS | httpx, testssl | API headers; TLS/production unverified |
| File upload/SSRF | None | Not tested |
| OAuth | Code review only | Not tested end-to-end |
| Password reset/email | None | Not tested |
| Admin mutations | None | Not tested |
| CI/CD | Checkov | 7 findings; not remediated |
| Supply chain | npm audit, Trivy app | Partial; no Python/Go/Docker/SBOM |
| Mobile | MobSF | Not applicable |
| Production | None | Not tested |

---

## 10. Application attack surface and coverage gaps

### 10.1 Coverage is much smaller than the summary implies

The audit has 43 manual checks, a handful of unauthenticated proxy flows, and six Wapiti GET scans. That is a small sample of a full application. The `api-endpoints.txt` wordlist is not an API route inventory, so the actual route count is unknown. The app has auth, users, hackathons, teams, join requests, notifications, saved items, feedback, admin, reports, scrapers, metrics, and OAuth code. Most of it was not tested.

### 10.2 Uncovered or lightly covered endpoints/areas

| Area | Examples | Coverage |
|---|---|---|
| Registration/login | register, login, logout, refresh | Login partially; register/reset/OAuth not |
| Email verification | verify token, resend | Not tested; `DEV_AUTO_VERIFY=true` bypasses |
| Password reset | forgot, reset, token expiry/reuse | Not tested; `ENUM-02` invalid |
| OAuth | Google/GitHub start/callback, state, linking | Not tested end-to-end |
| Profile | update, avatar, links, skills, delete/export | Mass assignment weak; upload/SSRF not tested |
| Hackathons | list/detail/track/save/hidden/admin CRUD/reports | Public list/search partial; detail/track/admin not |
| Teams | create/join/invite/accept/leave/kick/transfer/delete | Selected IDOR only; business logic not |
| Join requests | create/list/accept/reject | Selected IDOR only |
| Notifications | list/read/delete | Only 401 on list |
| Feedback | submit/admin | Only oversized body 413 |
| Saved | list/add/remove | Selected IDOR only |
| Admin users | list/ban/unban | GET missing; ban/unban not tested |
| Admin hackathons | CRUD/hidden/reports | Not tested |
| Admin scrapers | run/status | Not tested; background jobs disabled |
| Metrics | `/metrics` | Tested; not exposed without token |
| Health/stats | `/api/health`, `/api/stats` | Public; low info |
| MCP/SSE | `mcp`, `sse` wordlist entries | Not tested |
| File uploads | avatar/Cloudinary | Not tested |
| SSRF | scraper/remote links | Not tested |
| WebSocket/SSE | if present | Not tested |
| Production | TLS/headers/redirect/CSP | Not tested |

### 10.3 Route inventory gap

There is no OpenAPI spec, route inventory, or coverage tool in the audit folder. The ffuf/kiterunner/ferox runs used generic wordlists, not a route-aware crawl. The admin GET 404 is a symptom: a route was assumed to exist and was not verified. A route inventory would have caught it.

### 10.4 Authenticated proxy gap

The only proxy evidence is 7 unauthenticated flows:

- `GET /api/health` 200
- `GET /api/hackathons?search=x` 200
- `GET /api/users/me` 401
- `GET /api/saved` 401
- `GET /api/admin/users` 401
- `POST /api/auth/login` 403 (missing CSRF)
- `POST /api/feedback` 413 (stack)

There is no authenticated proxy session, no IDOR replay, no CSRF token capture, and no Burp scanner. The proxy evidence does not test the authenticated attack surface.

### 10.5 Production gap

No production URL, credentials, TLS endpoint, CDN, WAF, or deployment configuration was tested. The audit cannot state that production is clean, that HSTS/CSP are correct, or that cookies are Secure in production. Those are code-level expectations, not verified facts.

### 10.6 Supply-chain gap

`npm audit` covers npm only. The audit folder has 190 Python packages, Go binaries, CodeQL, Burp, Trivy, and Dockerfiles. There is no `pip-audit`, `govulncheck`, image scan, SBOM, or license review. The app’s Dockerfile is clean per Trivy, but that is not the same as a full image/dependency assessment.

---

## 11. Secrets, privacy, and data handling

### 11.1 Sensitive artifacts

| Artifact | Sensitive content | Git | Risk | Action |
|---|---|---|---|---|
| `evidence/seed.json` | 3 plaintext passwords, 3 cookies, 3 CSRF tokens, 3 access/refresh tokens, 6 JWT-like strings, admin login 200 | Tracked | **High** | Remove/redact; rotate; replace with placeholders |
| `evidence/manual-tests.json` | Full JWT, CSRF/error details | Tracked | **High** | Redact; rotate; retain only status/counts |
| `evidence/manual-tests.txt` | Stack traces | Tracked | Medium | Redact paths/details |
| `evidence/proxy-flows.mitm` | Login request with test password; 403 stack | Tracked | **High** | Delete or replace with redacted text summary |
| `manual_tests.py` | Actual access-token secret at line 133 | Tracked | **Critical** | Read from env; rotate; never commit |
| `seed.js` | Plaintext test password; stored-XSS payload | Tracked | Medium | Use env/placeholder; rotate |
| `screenshots/` | Test accounts; demo/placeholder profile data | Tracked | Medium | Review/redact; use synthetic data |
| `screenshots/index.json` | Absolute `/home/<user>/...` paths | Tracked | Low | Use relative paths |
| `evidence/codeql-db/` | 560 MB CodeQL DB; may contain old `.env` secret | Ignored | **High** | Scan for secrets before sharing; delete after use |
| `.mongo-data/` | 206 MB local DB; password/token hashes; audit logs | Ignored | **High** | Enable auth; delete/secure after audit |
| `logs/` | Mongo no-auth warning; install logs | Ignored | Medium | Retain only redacted; delete test logs |
| `tools/` | Binaries; third-party JWT/CA strings; no checksums | Ignored | Medium | Verify/checksum; remove unused; scan |
| `evidence/gitleaks.json` | Redacted historical finding | Tracked | Medium | Keep redacted; do not add old coordinates |

### 11.2 Historical secret vs. audit secrets

These are separate incidents:

1. **Historical `.env` leak** (`SEC-01`): a real API key and MongoDB URI in old Git history. Rotation and purge are pending.
2. **Audit artifact leak** (`SEC-02`): test passwords, cookies, JWTs, CSRF tokens, a proxy capture, and a real access-token secret in the audit folder. These are test-only, but the API is exposed and the tokens may be valid.

Do not conflate them. Rotating the historical Brabble/MongoDB credentials does not fix the audit folder; redacting the audit folder does not fix the old Git history.

### 11.3 Privacy review

- The local DB contains test accounts only (`@audit.local`), one admin, and seeded content.
- No production PII was observed.
- The profile screenshot shows demo/placeholder values; the audit users’ DB links are empty. The exact values are omitted here. Review whether the demo fixtures represent a real person.
- `auditlogs` has 203 records; IP/user-agent/action fields were not fully reviewed.
- The historical MongoDB URI may have pointed at a real database; treat it as compromised and check provider logs.
- `screenshots/index.json` discloses the local username/home path.
- There is no retention or redaction policy.

### 11.4 Data-handling recommendations

1. Keep raw sensitive evidence in a private, access-controlled store, not the public repo.
2. Commit only redacted summaries with counts, hashes, and non-sensitive excerpts.
3. Add a secret/PII scan before every commit and release.
4. Define retention: delete test DBs, proxy captures, cookies, and tokens after the audit.
5. Rotate all test and historical credentials.
6. Do not publish the audit folder as-is.
7. Review screenshots and logs for personal data.
8. Add a data-handling section to the audit README.

---

## 12. Supply chain and tooling

### 12.1 Tool inventory

| Tool | Version | Size | Provenance/notes |
|---|---|---:|---|
| CodeQL | 2.27.5 | 1.4 GB + 664 MB archive | Extracted + duplicate tar; license present |
| Python venv | Python 3.14 | 898 MB, 190 packages | No lockfile/hash; includes Flask, mitmproxy, Playwright, Semgrep, Checkov |
| Burp Suite | 2025.10.3 | 863 MB + 341 MB installer | Community/no scanner; license prompt; duplicate installer |
| Trivy | 0.76.2 | 169 MB + 51 MB archive | No checksum/license record |
| gitleaks | 8.30.1 | 21 MB + 7.9 MB archive | No checksum/license record |
| feroxbuster | 2.14.0 | 17 MB + 6.5 MB archive | Go install failed; binary provenance undocumented |
| kiterunner (`kr`) | old | 15 MB + 5.6 MB archive | Wordlist invalid; no checksum/license |
| sqlmap | 1.10.11.89#dev | 26 MB | License present; dev version |
| testssl | 3.3dev | 23 MB | License present; dev version; no TLS target |
| commix | 4.2.dev362 | 9.4 MB | License present; dev version |
| XSStrike | 3.1.5 | 620 KB | License present |
| ffuf | 2.1.0-dev | external `~/go/bin` | Not bundled; dev version |
| httpx (ProjectDiscovery) | unknown | external `~/go/bin` (~70 MB) | Not bundled; name collision with Python httpx |
| mitmproxy | 12.3.1 | venv | Used for proxy evidence; 7 flows |
| Playwright | 1.65.2 | venv | Screenshot capture |
| Semgrep | 1.186.0 | venv | Deep run invalid |
| Checkov | 3.4.6 | venv | 7 CI findings |
| MongoDB | 8.2.6 | 206 MB data | No auth |
| `dig`/`host`/`nslookup` | shims | 12 KB | Fake DNS; synthetic answers |

### 12.2 Supply-chain issues

- No checksum manifest or SBOM.
- No reproducible toolchain; tools are Git-ignored.
- Dev versions and an undocumented `feroxbuster` binary.
- `go-exploit` downloaded during Go installs; not justified for this audit.
- Duplicate archives and installer: about 1.1 GB redundant.
- No Python/Go/Docker SCA; only npm audit and app-scope Trivy.
- Fake DNS shims can invalidate DNS-dependent evidence.
- Burp Community has no scanner; the summary’s proxy claim is not a scanner result.
- The CodeQL DB may contain old secrets; it was not scanned.
- No license review for several tools.

### 12.3 Recommendations

1. Create a tool manifest with name, version, source URL, SHA-256, license, and purpose.
2. Pin and verify every download; use a lockfile for Python.
3. Use containers or a reproducible audit VM.
4. Generate an SBOM and run vulnerability scans on the tooling.
5. Remove duplicate archives, unused tools, and `go-exploit`.
6. Replace fake DNS shims with a real resolver or mark DNS tests synthetic.
7. Capture raw terminal output; do not generate “terminal” PNGs.
8. Mark Burp/testssl/MobSF as “not run” when they did not run.
9. Store tools outside the public repo; document how to rebuild them.
10. Review licenses before redistribution.

---

## 13. Remediation plan

### 13.1 P0 — Immediate (24–48 hours)

| Action | Why | Verification |
|---|---|---|
| Stop API, Vite, MongoDB audit services | They expose test credentials and no-auth DB on the local network | No listeners on 5000/5173/27017 |
| Rotate Brabble API key and MongoDB credentials | Historical secret may still be valid | Old credentials fail; provider logs reviewed |
| Remove/redact audit secrets | `seed.json`, `manual-tests.json`, `proxy-flows.mitm`, `manual_tests.py` | Current-tree secret scan clean |
| Rotate audit secrets and admin/test passwords | Access secret is in a tracked script | Old tokens/passwords rejected |
| Bind API/Vite to loopback | Remove LAN exposure | No `0.0.0.0` listeners |
| Enable MongoDB auth or delete the test DB | No-auth local DB | Unauthenticated connection fails |
| Submit GitHub Support purge request | Old objects/PR refs may persist | Support confirmation |
| Enable GitHub secret scanning/push protection | Prevent recurrence | Settings verified |
| Notify collaborators/clones | Clones may contain old secrets | Reset/re-clone confirmed |
| Preserve only redacted evidence | Avoid publishing secrets | Reviewer sign-off |

### 13.2 P1 — Code fixes (1 week)

| Action | Finding | Verification |
|---|---|---|
| Fix `trust proxy`/XFF rate-limit bypass | `RATE-01` | 14 attempts → 429; spoofed XFF does not bypass |
| Lower global rate limits; add login lockout/MFA | `RATE-01`, `CONFIG-01` | Limits enforced; admin MFA |
| Add generic CSRF/body-parser error handlers | `ERR-01` | 403/413/400/500 bodies contain no stack |
| Harden sanitizer: reject `__proto__`/`constructor`/`prototype`; null-prototype objects | `SAN-01` | Unit tests pass; no inherited props |
| Implement/remove admin user list; test ban/unban and admin routes | `ADMIN-01` | Admin 200 / non-admin 403 / anonymous 401 |
| Bind Vite to loopback; remove project-root exposure | `VITE-01` | No files from LAN; production build |
| Enable MongoDB auth; least-privilege app user | `DB-01` | Unauthenticated access fails |
| Fix GitHub Actions permissions and curl secrets | `CI-01` | Checkov 0; no write-all |
| Disable `DEV_AUTO_VERIFY` outside dev; use strong secrets; separate cookie secret | `CONFIG-01` | Production-like config |
| Add frontend headers/TLS/redirect checks | `HEADER` gap | Production test A grade |
| Add log encoding/structured logging | `LOG-01` | CR/LF/ANSI tests pass |
| Review OAuth state flow end-to-end | `OAUTH-01` | State mismatch/expiry/replay rejected |

### 13.3 P2 — Coverage and evidence rebuild (2–4 weeks)

| Action | Why |
|---|---|
| Rewrite the manual suite with CSRF helpers, exact assertions, two-user fixtures, and no secrets | False passes/false negative |
| Add stored/DOM XSS, NoSQL, mass-assignment, IDOR matrix, admin, file upload, OAuth, password reset, email verification, SSRF, rate-limit tests | Coverage gaps |
| Re-run Semgrep with valid local configs and record scanned-file counts | Invalid deep scan |
| Re-run kiterunner with a valid API wordlist or remove the result | Wrong count |
| Re-run ffuf and preserve actual 429 output | False citation |
| Re-run Burp only with a scanner; otherwise mark not run | No scan |
| Re-run testssl against a TLS endpoint; test production headers/redirect | Production gap |
| Add a route inventory/OpenAPI spec and coverage matrix | Missing route/admin 404 |
| Add checksums, SBOM, tool manifest, licenses | Supply chain |
| Remove synthetic tool PNGs; capture raw logs | Evidence integrity |
| Add README/methodology/evidence index/report | Documentation |
| Scan CodeQL DB and tools for secrets | Old secret copies |
| Run Python/Go/Docker SCA | Supply-chain gap |
| Independent review and sign-off | Assurance |

### 13.4 P3 — Ongoing

- Threat modeling and secure SDLC.
- Secret scanning and push protection on every repo.
- Dependabot/SCA for npm, Python, Go, and Docker.
- Branch protection and required reviews.
- Least-privilege CI/CD and pinned actions.
- Security regression tests in CI.
- Monitoring/alerting for auth failures and rate-limit events.
- Data-retention and evidence-handling policy.
- Quarterly audit/retest.
- Incident-response runbook for secret leaks.

### 13.5 Definition of done

The audit can be considered closed only when:

1. Historical Brabble/MongoDB credentials are rotated and old access fails.
2. GitHub purge is confirmed; secret scanning/push protection are on.
3. The audit folder contains no passwords, cookies, JWTs, CSRF tokens, access secrets, or proxy credentials.
4. API/Vite/Mongo are not exposed; Mongo has auth or is deleted.
5. Rate-limit bypass is fixed and verified.
6. Error responses do not leak stacks.
7. Sanitizer rejects prototype keys.
8. Admin routes are implemented/removed and tested.
9. Manual suite has no false passes; `IDOR-02` is covered.
10. Semgrep/Burp/testssl/kiterunner claims are corrected or removed.
11. Coverage matrix includes auth, authz, injection, XSS, CSRF, rate limits, file upload, OAuth, password reset, admin, CI, and production.
12. Tool manifest/checksums/SBOM exist.
13. A final report is in `reports/` and has reviewer sign-off.
14. No secrets/PII are published.
15. Production is assessed separately or explicitly marked out of scope.

---

## 14. What the audit got right

To be fair, the package contains real work and useful signals:

- The manual suite found the rate-limit bypass, even if it mislabeled the result.
- It found the Vite file exposure.
- It confirmed CSRF protection works, then exposed the stack leak in the same response.
- It exercised JWT malformed/`alg=none`/expired cases.
- It tested CORS, selected IDOR, hidden hackathons, headers, metrics, and session revocation.
- CodeQL produced a usable SARIF with 42 first-party results.
- Trivy/Checkov/Wapiti/ffuf/ferox raw outputs are useful when read directly.
- The Mongo inventory shows test-only data and bcrypt hashes.
- The app has several good controls: bcrypt, JWT signature/expiry checks, CSRF token requirement, CORS restrictions, Helmet on the API, hidden-resource filtering, and server-side logout revocation.
- The `.gitignore` keeps large tools/logs/DB out of Git.
- The historical secret was redacted in the evidence; the old value is not in this report.
- The report now exists.

The audit’s main failure is not that it found nothing. It is that it presented a mixed, incomplete, and sometimes synthetic evidence package as if it were a clean, comprehensive result.

---

## 15. Appendices

### Appendix A — Full manual test results and review

The suite records 43 checks. This table adds the missing `IDOR-02` row for completeness, so it has 44 rows.

| ID | Recorded | Title | Review |
|---|---|---|---|
| `AUTH-01` | PASS | Protected endpoint rejects anonymous access | Valid for `/users/me` |
| `AUTH-02` | PASS | Saved list rejects anonymous access | Valid for `/saved` |
| `AUTH-03` | PASS | Admin API rejects anonymous access | **False pass**: `/admin/users` does not exist; 401 is not admin gating |
| `JWT-01` | PASS | Malformed bearer token rejected | Valid |
| `JWT-02` | PASS | `alg=none` forgery rejected | Valid |
| `JWT-03` | PASS | Default-secret `change_me` rejected | Weak: tests only the default literal, not the actual secret |
| `JWT-04` | PASS | Expired JWT rejected | Valid result, but the test signs with the actual access secret; script leak |
| `CORS-01` | PASS | Arbitrary origin not reflected | Valid |
| `CORS-02` | PASS | `null` origin rejected | Valid |
| `CSRF-01` | PASS | Mutation without CSRF token rejected | Valid control; response leaks a stack (`ERR-01`) |
| `CSRF-02` | PASS | Token without matching cookie rejected | Valid |
| `CSRF-03` | PASS | Token bound to authenticated session | Weak/inconsistent: detail contradicts PASS; appears IP-only |
| `COOKIE-01` | PASS | Auth cookies are HttpOnly | Weak: only HttpOnly checked; JWT leaked in detail; Secure/SameSite/path/expiry not checked |
| `INFO-01` | PASS | Alice sees Alice’s saved items | Valid |
| `IDOR-01` | PASS | Cross-account saved read/update/delete blocked | Valid for tested objects |
| `IDOR-02` | — | (missing) | **Not executed**; coverage hole |
| `IDOR-03` | PASS | Non-member cannot list team join requests | Valid for tested team |
| `IDOR-04` | PASS | Non-member cannot list team invitations | Valid for tested team |
| `IDOR-05` | PASS | Non-member cannot edit team | Valid for tested team |
| `IDOR-06` | PASS | Non-leader cannot transfer leadership | Valid for tested team |
| `IDOR-07` | PASS | Non-leader cannot delete team | Valid for tested team |
| `DATA-01` | PASS | Public profile hides private fields | Valid for tested profile |
| `DATA-02` | PASS | Hidden hackathon not retrievable by ID | Valid for tested ID |
| `DATA-03` | PASS | Hidden hackathon absent from listing | Valid |
| `MASS-01` | PASS | Profile update cannot escalate role/flags | Weak: only role/flags checked; not all sensitive fields |
| `MASS-02` | NOTE | Skill update rejects prototype keys | **Invalid**: tested `/users/me/skills` 404, not the real endpoint |
| `MASS-03` | PASS | JSON `__proto__` does not pollute responses | Partial: response-only; sanitizer still copies prototype keys |
| `INJ-01` | PASS | SQL/NoSQL metacharacters handled safely | Weak: metacharacter handling is not injection proof |
| `INJ-02` | PASS | Mongo operator injection via query keys blocked | Weak: accepts 200/400; no operator proof |
| `INJ-03` | PASS | NoSQL operator injection in login rejected | **False pass**: 403 CSRF, login never reached |
| `ERR-01` | PASS | Invalid ObjectId no stack | Valid for that route; other errors leak stacks |
| `LIMIT-01` | PASS | Oversized JSON rejected | Valid 413; body leaks a stack |
| `ENUM-01` | PASS | Registration does not disclose existing accounts | **False pass**: 403 CSRF |
| `ENUM-02` | PASS | Password reset response identical | **False pass**: 403 CSRF |
| `ENUM-03` | PASS | Login failure identical for unknown accounts | Weak: unknown-only; no existing-account comparison |
| `METRICS-01` | PASS | `/metrics` not exposed without token | Valid |
| `HDR-01` | PASS | API security headers present | Valid for API |
| `HDR-02` | NOTE | Frontend CSP/XCTO/Referrer-Policy | Weak/absent; production unverified |
| `RATE-01` | FAIL | IP rate limit not bypassable via XFF | **False negative**: 14×401, no 429; bypass confirmed |
| `SESS-01` | PASS | Access token revoked on logout | Valid |
| `AUTHZ-01` | PASS | Non-admin cannot reach admin endpoints | Weak: may be 404 on missing route; not full authz |
| `AUTHZ-02` | PASS | Non-admin cannot trigger scraper jobs | Valid for tested route |
| `AUTHZ-03` | PASS | Admin can reach admin endpoints | **False pass**: 404 on missing `/admin/users` |
| `XSS-01` | PASS | Search payload not reflected unescaped | Weak: reflected only; stored/DOM untested |

### Appendix B — Full first-party CodeQL results

| Rule | Path:line | Triage |
|---|---|---|
| `js/incomplete-url-substring-sanitization` | `scripts/configure-vercel-csp.mjs:26` | Review; likely false positive/low |
| `js/log-injection` | `apps/api/controllers/hackathonTrackingController.js:88` | Low; needs dynamic test |
| `js/log-injection` | `apps/api/controllers/hackathonTrackingController.js:143` | Low; needs dynamic test |
| `js/log-injection` | `apps/api/controllers/hackathonTrackingController.js:205` | Low; needs dynamic test |
| `js/log-injection` | `apps/api/controllers/hackathonTrackingController.js:359` | Low; needs dynamic test |
| `js/missing-origin-check` | `apps/web/public/mockServiceWorker.js:23` | Dev-only; low/false positive |
| `js/missing-rate-limiting` | `apps/api/src/app.js:103` | Active; global limiter exists but bypassable |
| `js/missing-rate-limiting` | `apps/api/src/app.js:106` | Active; same |
| `js/missing-rate-limiting` | `apps/backend-prototype/routes/hackathonRoutes.js:10` | Legacy; review/remove |
| `js/missing-rate-limiting` | `apps/backend-prototype/routes/hackathonRoutes.js:12` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/authRoutes.js:35` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/authRoutes.js:35` | Legacy; duplicate line hit |
| `js/missing-rate-limiting` | `backend/routes/authRoutes.js:36` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/authRoutes.js:36` | Legacy; duplicate line hit |
| `js/missing-rate-limiting` | `backend/routes/hackathonRoutes.js:10` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/hackathonRoutes.js:12` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/notificationRoutes.js:11` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/notificationRoutes.js:13` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/notificationRoutes.js:14` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/userRoutes.js:10` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/userRoutes.js:11` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/routes/userRoutes.js:12` | Legacy; review/remove |
| `js/missing-rate-limiting` | `backend/server.js:39` | Legacy; review/remove |
| `js/missing-token-validation` | `apps/api/server.js:74` | Likely false positive due global CSRF; verify |
| `js/missing-token-validation` | `apps/api/src/app.js:95` | Likely false positive due global CSRF; verify |
| `js/remote-property-injection` | `apps/api/middleware/sanitizeMiddleware.js:18` | **Confirmed** sanitizer weakness (`SAN-01`) |
| `js/samesite-none-cookie` | `apps/api/middleware/rateLimitMiddleware.js:29` | OAuth state cookie; needs review (`OAUTH-01`) |
| `js/sql-injection` | `apps/api/src/services/joinRequestsService.js:120` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/joinRequestsService.js:216` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/joinRequestsService.js:262` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/joinRequestsService.js:293` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/joinRequestsService.js:299` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/notificationsService.js:44` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/notificationsService.js:58` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/teamsService.js:139` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/teamsService.js:144` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/usersService.js:144` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/usersService.js:150` | Active; code-path review |
| `js/sql-injection` | `apps/api/src/services/usersService.js:247` | Active; code-path review |
| `js/sql-injection` | `apps/backend-prototype/controllers/hackathonController.js:216` | Legacy; review/remove |
| `js/sql-injection` | `backend/controllers/hackathonController.js:319` | Legacy; review/remove |
| `js/user-controlled-bypass` | `apps/api/src/middleware/rateLimitIdentity.js:41` | Likely false positive; token signature verified; real XFF bypass is `RATE-01` |

### Appendix C — Checkov failed checks

| Check | File | Lines | Issue |
|---|---|---|---|
| `CKV_GHA_3` | `.github/workflows/deploy-staging.yml` | 37, 47 | curl with secrets |
| `CKV_GHA_3` | `.github/workflows/deploy-staging.yml` | 46, 65 | curl with secrets |
| `CKV_GHA_7` | `.github/workflows/scrape-hackathons.yml` | 17, 28 | user-controlled workflow parameters |
| `CKV2_GHA_1` | `.github/workflows/ci.yml` | 53, 54 | top-level `write-all` |
| `CKV2_GHA_1` | `.github/workflows/deploy-staging.yml` | 0, 1 | top-level `write-all` |
| `CKV2_GHA_1` | `.github/workflows/scrape-hackathons.yml` | 0, 1 | top-level `write-all` |
| `CKV2_GHA_1` | `.github/workflows/deploy-production.yml` | 0, 1 | top-level `write-all` |

### Appendix D — Evidence quality matrix

| Tool/artifact | Raw artifact | Grade | Proves | Does not prove |
|---|---|---|---|---|
| Manual suite | `manual-tests.json` | B-/D | Selected controls; rate-limit failure | NoSQL/XSS/admin/mass assignment; false passes |
| CodeQL | `codeql.sarif` | A-/B | 42 first-party static hits | Exploitability; triage |
| Semgrep | `semgrep.json`, `semgrep-deep.json` | D | First run scanned 465 files with 0 findings | Deep run scanned 0; no clean conclusion |
| Trivy | `trivy-fs.json` | B | App lockfiles/Dockerfile clean | Full image/SBOM; third-party noise |
| Checkov | `checkov/results_json.json` | A | 7 CI failures | Runtime/deployment |
| Wapiti | `wapiti-*.json` | B- | 0 unauth GET vulns; 1 anomaly | Auth/POST/stored XSS/rate limits |
| SQLmap | `sqlmap/` | D | No SQLi found in tested GET | MongoDB/NoSQL; 400s; no exploit |
| Commix | `commix.txt` | D | `limit` not command-injectable | Code injection/other params |
| XSStrike | `xsstrike.txt` | C | No reflected XSS | Stored/DOM XSS |
| ffuf | `ffuf-api*.json` | B | Status counts/duplicate routes | Full API discovery; current config |
| Feroxbuster | `feroxbuster.txt` | B | Vite file exposure | Production |
| Kiterunner | `kiterunner.txt` | D | One health result | 4 results; API discovery |
| Arjun | `arjun.txt` | C | 4 parameters | Full parameter space |
| httpx | `httpx.txt` | C | API headers | TLS/production/frontend |
| Burp | `burp-run.txt`, `mitmproxy.txt` | E | Nothing (license prompt) | Scanner/proxy auth |
| Testssl | `testssl.txt` | E/C | Local plain HTTP | TLS/production |
| MobSF | `mobsf.txt` | N/A | No mobile artifact | Mobile security |
| npm audit | `npm-audit.json` | B | 0 npm advisories | Python/Go/Docker |
| Gitleaks | `gitleaks.json` | B | 1 historical finding | Current audit folder; closure |
| Screenshots | `screenshots/` | C/D | App UI/test data | Tool execution; console/accessibility |
| Mongo inventory | Live DB | A | Test data/no auth | Production |
| Live checks | API/Vite/Mongo | A | Bindings, rate-limit bypass, stack, sanitizer | Full exploitability |

### Appendix E — Safe verification commands (no secrets)

These commands are for the local audit environment only. Do not paste cookies, tokens, passwords, or secret values into a shell history or report.

```bash
# Inventory
cd /path/to/HackHub
git ls-files security-audit | wc -l
du -sh security-audit security-audit/*

# Service bindings
ss -ltnp | grep -E ':(27017|5000|5173)\b'

# Vite exposure (no secrets)
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5173/package.json
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5173/.env

# MongoDB authentication status (read-only)
# Use a local driver/mongosh; do not print data.
mongosh --quiet --eval 'db.adminCommand({connectionStatus:1}).authInfo'

# Current-tree secret scan
gitleaks detect --source . --no-git --redact

# CodeQL re-run (record command, DB, and SARIF)
# codeql database create ...; codeql database analyze ... --format=sarif-latest

# Manual rate-limit check:
# Use a test harness that obtains a CSRF token and sends 14 attempts with
# rotating X-Forwarded-For values. Expect 429 after the threshold.
# Do not use real credentials.

# Sanitizer unit test:
# Send {"__proto__":{"polluted":"x","role":"admin"}} through the sanitizer
# and assert Object.getPrototypeOf(result) === null and no inherited role.
```

For the CSRF stack check, use a disposable test session and inspect only whether the JSON contains `stack`/`at `; do not save the token or cookie.

### Appendix F — Severity and status legend

| Label | Meaning |
|---|---|
| **Critical** | Immediate, broad compromise; rotate/patch now |
| **High** | Serious compromise/abuse path; urgent |
| **Medium** | Meaningful risk or assurance gap; fix soon |
| **Low** | Limited impact or defense-in-depth |
| **Info** | Observation/hardening |
| **Assurance** | Not a direct app vulnerability, but the audit conclusion is unreliable |
| **Confirmed** | Observed in code/live local evidence |
| **Static** | Tool/code finding; not dynamically exploited |
| **Needs review** | Plausible but not proven |
| **Unverified** | Not tested; no conclusion |
| **Invalid** | Test cannot support its claim |
| **N/A** | Not applicable |

### Appendix G — Limitations and sign-off

**Limitations:** local only; no production; no authenticated proxy; no file upload/OAuth/reset/admin-ban/background jobs; no full manual route review; no Python/Go/Docker SCA; no CodeQL DB secret scan; no remediation verification; no independent re-test; no access to provider/GitHub admin logs.

**Sign-off status:** **Not approved.**

- The application has confirmed issues that require remediation.
- The audit package is not suitable for publication because it contains secrets/tokens.
- The evidence package is not reliable enough for a clean conclusion.
- A retest is required after remediation.

**Prepared:** 22 November 2026.  
**Next review:** after P0/P1 remediation and evidence rebuild.
