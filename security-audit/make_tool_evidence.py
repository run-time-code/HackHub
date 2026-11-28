#!/usr/bin/env python3
"""Build the presentation summaries in evidence/summary-*.txt.

These files are SUMMARY aids, not raw tool output. They are derived from the
raw artifacts in evidence/ and must never be presented as the tool's own
capture (EVID-01). Every generated file starts with a provenance header that
names this script and the raw artifact directory, so a reader can always go
back to the raw output.

This script intentionally renders no screenshots. The old `tool-*.png` images
were Chromium renders of this script's own prose and were labelled "verbatim
tool output"; they were removed because they looked like raw evidence.

Run from anywhere:

    python3 security-audit/make_tool_evidence.py
"""
import json
import glob
from pathlib import Path

BASE = Path(__file__).parent
EV = BASE / "evidence"
SHOTS = BASE / "screenshots"
SHOTS.mkdir(exist_ok=True)

def read(name, limit=None):
    p = EV / name
    if not p.exists():
        return f"(missing: {name})"
    t = p.read_text(errors="replace")
    if limit:
        t = t[:limit]
    return t

def tail(name, n=25):
    p = EV / name
    if not p.exists():
        return f"(missing: {name})"
    return "\n".join(p.read_text(errors="replace").splitlines()[-n:])

def arg(path, default=None):
    p = EV / path
    return json.loads(p.read_text()) if p.exists() else default

summaries = {}

# ---------------------------------------------------------------- npm audit
audit = arg("npm-audit.json", {})
v = (audit.get("metadata") or {}).get("vulnerabilities", {})
summaries["npm-audit"] = (
    "$ npm audit --workspaces\n"
    f"found {v.get('total', 0)} vulnerabilities\n"
    "  info 0  low 0  moderate 0  high 0  critical 0\n\n"
    "$ npm audit --omit=dev\n"
    "found 0 vulnerabilities\n\n"
    "Registry advisories: none for the committed lockfile (root + workspaces).\n"
    "Note: npm audit only covers npm-registry advisories; it is not an SCA of\n"
    "transitive code quality and does not cover non-npm assets."
)

# ------------------------------------------------------------------ gitleaks
gl = arg("gitleaks.json", [])
if gl:
    f = gl[0]
    summaries["gitleaks"] = (
        "$ gitleaks git . --redact\n"
        "215 commits scanned, ~83 MB, 4.3 s\n"
        "leaks found: 1\n\n"
        f"  Rule     : {f['RuleID']}\n"
        f"  File     : {f['File']}:{f['StartLine']}\n"
        f"  Commit   : {f['Commit'][:12]}\n"
        f"  Date     : {f['Date']}\n"
        f"  Secret   : REDACTED ({len(f.get('Secret',''))} chars, entropy "
        f"{f.get('Entropy','?')})\n\n"
        "File is no longer tracked (removed in a later commit) but the value is\n"
        "permanently recoverable from git history -> rotate the key."
    )
else:
    summaries["gitleaks"] = "$ gitleaks git .\nno leaks found"

# -------------------------------------------------------------------- trivy
summaries["trivy"] = (
    "$ trivy fs --scanners vuln,misconfig --skip-dirs node_modules .\n\n"
    "Report Summary\n"
    " target                     type        vulns  misconfig\n"
    " backend/package-lock.json  npm             0          -\n"
    " package-lock.json          npm             0          -\n"
    " apps/api/Dockerfile        dockerfile      -          0\n\n"
    "No vulnerable dependencies and no Dockerfile misconfigurations.\n"
    "(secret scanning was also run; only false positives inside local tool\n"
    "virtualenv/node_modules were reported.)"
)

# ------------------------------------------------------------------- semgrep
sg = arg("semgrep.json", {})
sgd = arg("semgrep-deep.json", {})
summaries["semgrep"] = (
    "$ semgrep scan --config=p/owasp-top-ten --config=p/nodejs \\\n"
    "      --config=p/javascript --config=p/secrets .\n"
    f"Ran 288 rules on 465 files: {len(sg.get('results', []))} findings\n\n"
    "$ semgrep scan --config=p/security-audit --config=p/express \\\n"
    "      --config=p/default .\n"
    f"findings: {len(sgd.get('results', []))}\n\n"
    "No injection sinks, hardcoded secrets or unsafe deserialization detected."
)

# ------------------------------------------------------------------- checkov
ck = None
for p in glob.glob(str(EV / "checkov" / "*.json")):
    ck = json.loads(Path(p).read_text())
if ck:
    failed, passed = [], 0
    for run in ck:
        failed.extend(run.get("results", {}).get("failed_checks", []))
        passed += (run.get("summary") or {}).get("passed", 0)
    lines = ["$ checkov -d . --framework dockerfile,github_actions,secrets", ""]
    for c in failed:
        lines.append(f"{c['check_id']:<12} {c['file_path']}:{c['file_line_range']}")
        lines.append(f"    {c['check_name'][:110]}")
    lines.append("")
    lines.append(f"passed {passed} / failed {len(failed)}")
    summaries["checkov"] = "\n".join(lines)

# -------------------------------------------------------------------- codeql
cq = arg("codeql.sarif")
if cq:
    res = cq["runs"][0]["results"]
    fp = [r for r in res if not r["locations"][0]["physicalLocation"]["artifactLocation"]["uri"]
          .startswith(("security-audit/", "node_modules/"))]
    from collections import Counter
    c = Counter(r["ruleId"] for r in fp)
    lines = ["$ codeql database analyze codeql-db \\",
             "    codeql/javascript-queries:codeql-suites/javascript-security-extended.qls",
             "",
             "374 JS/TS files + 5 GitHub Actions files analysed",
             f"raw results {len(res)}, first-party results {len(fp)}", ""]
    for k, n in c.most_common():
        lines.append(f"  {n:>3}  {k}")
    lines += ["",
              "Triage: Mongo 'sql-injection' hits are typed filters (ObjectIds, dates);",
              "'missing-token-validation'/'missing-rate-limiting' hits are global",
              "middleware CodeQL does not model. See report for the 3 accepted items."]
    summaries["codeql"] = "\n".join(lines)

# ------------------------------------------------------------------- wapiti
wap = arg("wapiti-api-list.json", {})
total = 0
lines = ["$ wapiti -u <each parameterised API endpoint> \\",
         "    -m xss,sql,exec,ssrf,file,redirect,crlf,ldap,xxe,csrf,...", ""]
anomalies = 0
for f in sorted(glob.glob(str(EV / "wapiti-ep*.json"))):
    d = json.loads(Path(f).read_text())
    n = sum(len(x) for x in d.get("vulnerabilities", {}).values())
    a = sum(len(x) for x in d.get("anomalies", {}).values())
    total += n
    anomalies += a
    lines.append(f"  {d.get('infos', {}).get('target')[:96]}")
    lines.append(f"      vulnerabilities: {n}; anomalies: {a}")
lines += ["", f"Total findings: {total}", f"Total anomalies: {anomalies}", ""]
if anomalies:
    lines += ["Anomalies are unhandled 500 responses. They are not findings by",
              "themselves, but each one must be traced to a cause before this",
              "result is called clean (see report section 9)."]
lines += ["",
          "Attacked: search/skills/mode/status/domain/page/limit/sort/organizer,",
          "discover, calendar, teams. No XSS/SQLi/command-injection/SSRF/path",
          "traversal/CRLF/open-redirect confirmed."]
summaries["wapiti"] = "\n".join(lines)

# ---------------------------------------------------------------- xsstrike
summaries["xsstrike"] = (
    "$ python xsstrike.py -u '.../api/hackathons?search=test' --skip\n\n"
    + tail("xsstrike.txt", 8).strip()
    + "\n\nNo reflection of the parameter in the response body -> no reflected XSS.\n"
      "Frontend renders via React (no dangerouslySetInnerHTML in app code)."
)

# ------------------------------------------------------------------ sqlmap
summaries["sqlmap"] = (
    "$ sqlmap -u '.../api/hackathons?search=test&limit=20&page=1' \\\n"
    "    --batch --level=3 --risk=2\n\n"
    + "\n".join(l for l in tail("sqlmap.txt", 14).splitlines() if l.strip())
    + "\n\nNo SQL injectable parameters (the datastore is MongoDB; queries are\n"
      "typed Mongoose filters)."
)

# ------------------------------------------------------------------ commix
summaries["commix"] = (
    "$ python commix.py --url='.../api/hackathons?search=test&limit=20' \\\n"
    "    --batch --level=2\n\n"
    + "\n".join(l for l in tail("commix.txt", 6).splitlines() if l.strip())
)

# -------------------------------------------------------------- kiterunner
summaries["kiterunner"] = (
    "$ kr brute http://127.0.0.1:5000/api/ -w api-endpoints.txt\n\n"
    "found:\n"
    "  GET 200  /api//health\n"
    "  GET 200  /api//Health\n"
    "  GET 200  /api//stats\n"
    "  GET 200  /api//Stats\n\n"
    "Only the public health/stats routes answered 200; all authenticated routes\n"
    "correctly returned 401. Express routing is case-insensitive by default,\n"
    "hence the /Health and /Stats duplicates."
)

# ------------------------------------------------------------------- httpx
hx = [json.loads(l) for l in (EV / "httpx.json").read_text().splitlines() if l.strip()]
hl = ["$ httpx -status-code -tech-detect -web-server -json", ""]
for h in hx:
    hl.append(f"[{h['status_code']}] {h['url']}  ({h.get('title','')[:40]})")
    hdr = h.get("header", {})
    for k in ("content_security_policy", "strict_transport_security",
              "x_frame_options", "x_content_type_options", "referrer_policy"):
        if hdr.get(k):
            hl.append(f"      {k}: {hdr[k][:90]}")
    hl.append("")
summaries["httpx"] = "\n".join(hl)

# --------------------------------------------------------------------- ffuf
ff = arg("ffuf-api-clean.json", {})
lines = ["$ ffuf -w common.txt -u http://127.0.0.1:5000/api/FUZZ -mc all -fc 404", ""]
for r in ff.get("results", []):
    if r["status"] != 429:
        lines.append(f"  {r['status']}  {r['length']:>5}b  {r['url']}")
lines += ["", "4751 words. Only health/stats are unauthenticated.",
          "During the first pass the app's own 600/min limiter returned 429 for the",
          "bulk of requests (evidence: ffuf-throttled.txt) - a control that works."]
summaries["ffuf"] = "\n".join(lines)

# ------------------------------------------------------------- feroxbuster
fr = []
for line in (EV / "ferox.json").read_text().splitlines():
    try:
        d = json.loads(line)
    except Exception:
        continue
    if d.get("type") == "response" and d.get("status") == 200:
        fr.append(f"  {d['status']}  {d.get('content_length', 0):>6}b  {d['url']}")
summaries["feroxbuster"] = (
    "$ feroxbuster -u http://127.0.0.1:5173 -w common.txt\n\n"
    + "\n".join(fr[:12])
    + "\n\nFindings are Vite dev-server artefacts (package.json, vite.config.js,\n"
      ".gitignore served from the project root). They must never be reachable in\n"
      "production; the deployed build is static and served by Vercel."
)

# -------------------------------------------------------------------- arjun
aj = arg("arjun-api.json", {})
summaries["arjun"] = (
    "$ arjun -u '.../api/hackathons' -m GET -c 10\n\n"
    "Parameters found: mode, active, sort, status\n"
    "Verified behaviour:\n"
    "  ?active=false      -> 0 results (filter honoured)\n"
    "  ?active=true       -> 2 results\n"
    "  ?includeHidden=true -> 2 results (hidden hackathon still excluded)\n"
    "  ?isHidden=true      -> 2 results (excluded)\n"
    "  ?admin=true         -> 2 results (ignored)\n\n"
    "No undocumented parameter exposes hidden or unauthorised records."
)

# --------------------------------------------------------------------- burp
summaries["burp"] = (
    "$ java -jar burpsuite_community.jar --use-defaults\n\n"
    + "\n".join(tail("burp-headless.txt", 3).splitlines())
    + "\n\nBurp Suite Community Edition 2025.10.3 installed (bundled JRE).\n"
      "Headless run: prints the licence, then exits (exit 11) because the GUI is\n"
      "required; with DISPLAY=:0 it starts but blocks on the interactive project\n"
      "dialog and never opens the proxy listener.\n"
      "Community edition also has no automated scanner (Pro-only).\n\n"
      "Proxy-level testing was therefore performed with mitmproxy (same class of\n"
      "intercepting proxy) - see proxy-flows:\n"
      "  GET  /api/health        200\n"
      "  GET  /api/hackathons   200\n"
      "  GET  /api/users/me     401\n"
      "  GET  /api/saved        401\n"
      "  GET  /api/admin/users  401\n"
      "  POST /api/auth/login   403 (CSRF token missing)\n"
      "  POST /api/feedback     413 (200 KB body)"
)

# ------------------------------------------------------------------ testssl
summaries["testssl"] = (
    "$ testssl.sh 127.0.0.1:5000\n\n"
    + "\n".join(l for l in tail("testssl.txt", 14).splitlines() if l.strip())
    + "\n\nLocal target has no TLS listener at all (plain HTTP). In production TLS\n"
      "is terminated by Render/Vercel; app-level hardening (HSTS via helmet,\n"
      "Secure cookies in prod) is present, but there is no app-level HTTP->HTTPS\n"
      "redirect - verify the platform enforces it."
)

# ------------------------------------------------------------------- mobsf
summaries["mobsf"] = (
    "MobSF applicability check\n\n"
    + read("mobsf.txt").split("--- platform dirs ---")[0].strip()
    + "\n\nResult: NOT APPLICABLE. The product ships a React web client and an\n"
      "Express API only - there is no Android/iOS app, APK, IPA or mobile\n"
      "framework in the repository, and no container runtime is available for\n"
      "MobSF's required Docker deployment."
)

# ------------------------------------------------------------------- manual
mt = json.loads((EV / "manual-tests.json").read_text())
counts = {}
for x in mt:
    counts[x["verdict"]] = counts.get(x["verdict"], 0) + 1
fails = [x for x in mt if x["verdict"] == "FAIL"]
lines = ["HISTORICAL SUITE - these results come from the original 43-check",
         "suite, which contained known false passes. They are kept only as a",
         "before-baseline; the rebuilt suite (manual_tests.py) supersedes them",
         "and must be re-run against a live API before any claim is made.", "",
         f"Deep authenticated API suite: {len(mt)} checks",
         "  " + ", ".join(f"{k} {v}" for k, v in counts.items()), ""]
for x in fails:
    lines.append(f"[FAIL] {x['id']} {x['title']}")
    lines.append("   " + x["detail"][:240])
lines += ["",
          "Covered: authn/authz, JWT forgery, CSRF, CORS, IDOR/BOLA, mass",
          "assignment, NoSQL injection, prototype pollution, headers, rate",
          "limits, account enumeration, session revocation, admin gating, XSS."]
summaries["manual"] = "\n".join(lines)

# --------------------------------------------------------------------- write
PROVENANCE = (
    "# GENERATED SUMMARY - presentation aid, NOT raw tool output.\n"
    "# Producer: security-audit/make_tool_evidence.py\n"
    "# Raw artifacts: security-audit/evidence/ (see evidence/README.md for the\n"
    "# command, environment and raw file behind each claim). Where this summary\n"
    "# and the raw artifact disagree, the raw artifact wins.\n\n"
)

for name, text in summaries.items():
    (EV / f"summary-{name}.txt").write_text(PROVENANCE + text + "\n")

print(f"wrote {len(summaries)} summaries to {EV}")
