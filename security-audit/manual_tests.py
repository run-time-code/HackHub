#!/usr/bin/env python3
"""Deep, authenticated API security tests for the local HackHub instance.

Writes a human-readable log to evidence/manual-tests.txt and a JSON summary to
evidence/manual-tests.json. Every check is evidence-based: it records the
request, the status code and the relevant part of the response.
"""
import json
import time
import sys
from pathlib import Path

import requests

BASE = "http://127.0.0.1:5000/api"
ORIGIN = "http://localhost:5173"
OUT = Path(__file__).parent / "evidence"

seed = json.loads((OUT / "seed.json").read_text())
results = []
lines = []


def record(tid, title, severity, verdict, detail):
    results.append({
        "id": tid, "title": title, "severity": severity,
        "verdict": verdict, "detail": detail,
    })
    lines.append(f"[{verdict}] {tid} ({severity}) {title}\n    {detail}\n")
    print(f"[{verdict}] {tid} ({severity}) {title}")


def new_session(cookies=None):
    s = requests.Session()
    s.headers.update({"Origin": ORIGIN, "Accept": "application/json"})
    if cookies:
        for part in cookies.split("; "):
            k, v = part.split("=", 1)
            s.cookies.set(k, v)
    return s


def csrf(s):
    r = s.get(f"{BASE}/auth/csrf-token", timeout=10)
    return r.json().get("csrfToken")


def req(s, method, path, body=None, headers=None, token=None, **kw):
    h = {}
    if token:
        h["X-CSRF-Token"] = token
    if headers:
        h.update(headers)
    return s.request(method, BASE + path, json=body, headers=h, timeout=15, **kw)


def login(email, password):
    s = requests.Session()
    s.headers.update({"Origin": ORIGIN, "Accept": "application/json"})
    t = csrf(s)
    r = s.post(f"{BASE}/auth/login", json={"email": email, "password": password},
               headers={"X-CSRF-Token": t}, timeout=10)
    return s, r


# ---------------------------------------------------------------- identities
alice = new_session(seed["users"]["alice"]["cookie"])
bob = new_session(seed["users"]["bob"]["cookie"])
admin = new_session(seed["users"]["admin"]["cookie"])
alice_csrf = seed["users"]["alice"]["csrf"]
bob_csrf = seed["users"]["bob"]["csrf"]
admin_csrf = seed["users"]["admin"]["csrf"]

# fresh tokens (seeded tokens may have expired)
alice, r = login(seed["users"]["alice"]["email"], seed["users"]["alice"]["password"])
bob, r2 = login(seed["users"]["bob"]["email"], seed["users"]["bob"]["password"])
admin, r3 = login(seed["users"]["admin"]["email"], seed["users"]["admin"]["password"])
if r.status_code != 200 or r2.status_code != 200 or r3.status_code != 200:
    print("login failed", r.status_code, r.text, r2.status_code, r3.status_code, r3.text)
    sys.exit(1)
alice_csrf, bob_csrf, admin_csrf = csrf(alice), csrf(bob), csrf(admin)
team_id = seed["teamId"]
hidden_id = seed["hiddenHackathonId"]

# --------------------------------------------------- 0. baseline / unauth
r = requests.get(f"{BASE}/users/me", timeout=10)
record("AUTH-01", "Protected endpoint rejects anonymous access", "info",
       "PASS" if r.status_code == 401 else "FAIL",
       f"GET /users/me unauthenticated -> {r.status_code}")

r = requests.get(f"{BASE}/saved", timeout=10)
record("AUTH-02", "Saved list rejects anonymous access", "info",
       "PASS" if r.status_code == 401 else "FAIL",
       f"GET /saved unauthenticated -> {r.status_code}")

r = requests.get(f"{BASE}/admin/users", timeout=10)
record("AUTH-03", "Admin API rejects anonymous access", "info",
       "PASS" if r.status_code in (401, 403) else "FAIL",
       f"GET /admin/users unauthenticated -> {r.status_code}")

# ------------------------------------------------------------ 1. JWT attacks
r = requests.get(f"{BASE}/users/me", headers={"Authorization": "Bearer " + "x"}, timeout=10)
record("JWT-01", "Malformed bearer token rejected", "info",
       "PASS" if r.status_code == 401 else "FAIL", f"-> {r.status_code}")

# alg=none forgery
import base64
def b64(o):
    return base64.urlsafe_b64encode(json.dumps(o).encode()).rstrip(b"=").decode()
alice_id = json.loads(base64.urlsafe_b64decode(
    seed["users"]["alice"]["cookie"].split("accessToken=")[1].split(";")[0].split(".")[1] + "=="
))["id"]
none_tok = f"{b64({'alg':'none','typ':'JWT'})}.{b64({'id':alice_id,'role':'admin'})}."
r = requests.get(f"{BASE}/users/me", headers={"Authorization": f"Bearer {none_tok}"}, timeout=10)
record("JWT-02", "alg=none JWT forgery rejected", "critical",
       "PASS" if r.status_code == 401 else "FAIL", f"-> {r.status_code}")

# token signed with the documented default secret
import hmac, hashlib
def sign(payload, secret):
    h = b64({"alg": "HS256", "typ": "JWT"})
    p = b64(payload)
    sig = base64.urlsafe_b64encode(
        hmac.new(secret.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest()
    ).rstrip(b"=").decode()
    return f"{h}.{p}.{sig}"
forged = sign({"id": alice_id, "exp": int(time.time()) + 3600}, "change_me")
r = requests.get(f"{BASE}/users/me", headers={"Authorization": f"Bearer {forged}"}, timeout=10)
record("JWT-03", "JWT signed with documented default secret 'change_me' rejected", "critical",
       "PASS" if r.status_code == 401 else "FAIL", f"-> {r.status_code}")

# expired token
expired = sign({"id": alice_id, "exp": int(time.time()) - 60}, "audit_access_secret_0123456789")
r = requests.get(f"{BASE}/users/me", headers={"Authorization": f"Bearer {expired}"}, timeout=10)
record("JWT-04", "Expired JWT rejected", "info",
       "PASS" if r.status_code == 401 else "FAIL", f"-> {r.status_code}")

# ------------------------------------------- 2. CORS / CSRF / cookies
r = requests.get(f"{BASE}/hackathons", headers={"Origin": "http://evil.example"}, timeout=10)
acao = r.headers.get("access-control-allow-origin")
record("CORS-01", "CORS does not reflect arbitrary origins", "high",
       "PASS" if not acao or acao != "http://evil.example" else "FAIL",
       f"Origin: http://evil.example -> ACAO={acao!r}, ACAC={r.headers.get('access-control-allow-credentials')!r}")

r = requests.get(f"{BASE}/hackathons", headers={"Origin": "null"}, timeout=10)
record("CORS-02", "CORS rejects 'null' origin", "high",
       "PASS" if r.headers.get("access-control-allow-origin") != "null" else "FAIL",
       f"Origin: null -> ACAO={r.headers.get('access-control-allow-origin')!r}")

r = alice.post(f"{BASE}/saved", json={"hackathonId": seed["hackathons"][1]["id"]}, timeout=10)
record("CSRF-01", "Cookie-authenticated mutation without CSRF token rejected", "high",
       "PASS" if r.status_code in (401, 403) else "FAIL",
       f"POST /saved with no X-CSRF-Token -> {r.status_code} {r.text[:120]}")

r = requests.post(f"{BASE}/saved", json={"hackathonId": seed["hackathons"][1]["id"]},
                  headers={"X-CSRF-Token": alice_csrf, "Origin": ORIGIN}, timeout=10)
record("CSRF-02", "CSRF token without matching cookie rejected", "high",
       "PASS" if r.status_code in (401, 403) else "FAIL",
       f"POST /saved with token but no cookie -> {r.status_code}")

# token issued to one session replayed in another session from the same IP
other = new_session()
other_t = csrf(other)
r = alice.post(f"{BASE}/saved", json={"hackathonId": seed["hackathons"][1]["id"]},
               headers={"X-CSRF-Token": other_t}, timeout=10)
record("CSRF-03", "CSRF token is bound to the authenticated session", "low",
       "FAIL" if r.status_code in (200, 201) else "PASS",
       f"token from an unrelated anonymous session (same IP) used with Alice's cookies -> {r.status_code}. "
       "Binding is req.ip only (csrfMiddleware getSessionIdentifier), not the session/user.")

# cookie flags as actually issued by the server
_, lr = login(seed["users"]["bob"]["email"], seed["users"]["bob"]["password"])
setc = ", ".join(lr.raw.headers.getlist("Set-Cookie")) if hasattr(lr.raw.headers, "getlist") else lr.headers.get("set-cookie", "")
flags_ok = all(f in setc.lower() for f in ("httponly",))
record("COOKIE-01", "Auth cookies are HttpOnly", "info",
       "PASS" if lr.status_code == 200 and flags_ok else "FAIL",
       f"login -> {lr.status_code}; Set-Cookie: {setc[:300]}")

# ------------------------------------------ 3. BOLA / IDOR (two accounts)
r = alice.get(f"{BASE}/saved", timeout=10)
alice_saved = r.json().get("data", {}).get("items", r.json().get("data", []))
saved_id = None
if isinstance(alice_saved, list) and alice_saved:
    saved_id = alice_saved[0].get("id") or alice_saved[0].get("_id")
record("INFO-01", "Alice saved items visible to Alice", "info",
       "PASS" if saved_id else "FAIL", f"GET /saved -> {r.status_code}, first id={saved_id}")

if saved_id:
    r = bob.get(f"{BASE}/saved/{saved_id}", timeout=10)
    r2 = bob.patch(f"{BASE}/saved/{saved_id}", json={"notes": "pwned"},
                   headers={"X-CSRF-Token": bob_csrf}, timeout=10)
    r3 = bob.delete(f"{BASE}/saved/{saved_id}", headers={"X-CSRF-Token": bob_csrf}, timeout=10)
    vuln = any(x.status_code in (200, 204) for x in (r, r2, r3))
    record("IDOR-01", "Cross-account saved-hackathon read/update/delete blocked", "high",
           "FAIL" if vuln else "PASS",
           f"As Bob against Alice's saved id {saved_id}: GET={r.status_code}, PATCH={r2.status_code}, DELETE={r3.status_code}")

# reminders
r = alice.get(f"{BASE}/reminders", timeout=10)
alice_rem = r.json().get("data", {}).get("items", r.json().get("data", []))
rem_id = None
if isinstance(alice_rem, list) and alice_rem:
    rem_id = alice_rem[0].get("id") or alice_rem[0].get("_id")
if rem_id:
    r = bob.delete(f"{BASE}/reminders/{rem_id}", headers={"X-CSRF-Token": bob_csrf}, timeout=10)
    record("IDOR-02", "Cross-account reminder delete blocked", "high",
           "PASS" if r.status_code in (403, 404) else "FAIL",
           f"As Bob DELETE Alice's reminder {rem_id} -> {r.status_code}")

# team membership / requests
r = bob.get(f"{BASE}/teams/{team_id}/requests", timeout=10)
record("IDOR-03", "Non-member cannot list a team's join requests", "high",
       "PASS" if r.status_code in (401, 403, 404) else "FAIL",
       f"As Bob (not a member) GET /teams/{team_id}/requests -> {r.status_code} {r.text[:120]}")

r = bob.get(f"{BASE}/teams/{team_id}/invitations", timeout=10)
record("IDOR-04", "Non-member cannot list a team's invitations", "high",
       "PASS" if r.status_code in (401, 403, 404) else "FAIL",
       f"As Bob GET /teams/{team_id}/invitations -> {r.status_code}")

r = bob.patch(f"{BASE}/teams/{team_id}", json={"description": "owned"},
              headers={"X-CSRF-Token": bob_csrf}, timeout=10)
record("IDOR-05", "Non-member cannot edit a team", "critical",
       "PASS" if r.status_code in (401, 403, 404) else "FAIL",
       f"As Bob PATCH /teams/{team_id} -> {r.status_code}")

r = bob.patch(f"{BASE}/teams/{team_id}/leader", json={"userId": ""},
              headers={"X-CSRF-Token": bob_csrf}, timeout=10)
record("IDOR-06", "Non-leader cannot transfer team leadership", "critical",
       "PASS" if r.status_code in (400, 401, 403, 404) else "FAIL",
       f"As Bob PATCH /teams/{team_id}/leader -> {r.status_code}")

r = bob.delete(f"{BASE}/teams/{team_id}", headers={"X-CSRF-Token": bob_csrf}, timeout=10)
record("IDOR-07", "Non-leader cannot delete a team", "critical",
       "PASS" if r.status_code in (401, 403, 404) else "FAIL",
       f"As Bob DELETE /teams/{team_id} -> {r.status_code}")

# public profile exposure
r = alice.get(f"{BASE}/users/public/{alice_id}", timeout=10)
body = r.text
leaks = [k for k in ("email", "password", "tokenVersion", "refreshTokenHash", "failedLoginAttempts") if f'"{k}"' in body]
record("DATA-01", "Public profile does not expose private account fields", "high",
       "FAIL" if leaks else "PASS",
       f"GET /users/public/{alice_id} -> {r.status_code}, leaked keys={leaks or 'none'}")

# hidden hackathon
r = requests.get(f"{BASE}/hackathons/{hidden_id}", timeout=10)
record("DATA-02", "Hidden hackathon is not retrievable by id", "medium",
       "PASS" if r.status_code == 404 else "FAIL",
       f"GET /hackathons/{hidden_id} (isHidden=true) -> {r.status_code}")

r = requests.get(f"{BASE}/hackathons", params={"limit": 100}, timeout=10)
titles = [i.get("title") for i in r.json().get("data", {}).get("items", [])]
record("DATA-03", "Hidden hackathon absent from catalogue listing", "medium",
       "PASS" if not any("Hidden" in (t or "") for t in titles) else "FAIL",
       f"GET /hackathons -> titles={titles}")

# -------------------------------------- 4. mass assignment / privilege esc
r = alice.put(f"{BASE}/users/me", json={
    "name": "Audit Alice",
    "role": "admin", "emailVerified": True, "banned": False,
    "tokenVersion": 99, "failedLoginAttempts": 0,
    "__proto__": {"role": "admin"},
}, headers={"X-CSRF-Token": alice_csrf}, timeout=10)
r2 = alice.get(f"{BASE}/users/me", timeout=10)
me = r2.json().get("data", {})
record("MASS-01", "Profile update cannot escalate role or account flags", "critical",
       "FAIL" if me.get("role") == "admin" else "PASS",
       f"PUT /users/me with role=admin -> {r.status_code}; resulting role={me.get('role')!r}, emailVerified={me.get('emailVerified')!r}")

r = alice.put(f"{BASE}/users/me/skills", json={"skills": ["__proto__", "constructor"]},
              headers={"X-CSRF-Token": alice_csrf}, timeout=10)
record("MASS-02", "Skill update rejects prototype-pollution keys", "medium",
       "PASS" if r.status_code in (400, 422) else "NOTE",
       f"PUT /users/me/skills with '__proto__' -> {r.status_code} {r.text[:100]}")

# persisted prototype pollution check
r = alice.put(f"{BASE}/users/me", json={"__proto__": {"isAdmin": True}},
              headers={"X-CSRF-Token": alice_csrf}, timeout=10)
r2 = requests.get(f"{BASE}/hackathons", timeout=10)
record("MASS-03", "JSON __proto__ payload does not pollute responses", "high",
       "PASS" if '"isAdmin"' not in r2.text else "FAIL",
       f"body __proto__.isAdmin sent -> PUT {r.status_code}; later GET /hackathons contains isAdmin={'"isAdmin"' in r2.text}")

# ------------------------------------------------ 5. injection attempts
r = requests.get(f"{BASE}/hackathons", params={"search": "' OR 1=1 --"}, timeout=10)
record("INJ-01", "SQL/NoSQL metacharacters in search handled safely", "info",
       "PASS" if r.status_code == 200 else "FAIL",
       f"search=' OR 1=1 -- -> {r.status_code}, returned {r.json().get('data',{}).get('total')} items")

r = requests.get(f"{BASE}/hackathons", params={"search[$ne]": "x"}, timeout=10)
record("INJ-02", "Mongo operator injection via query keys blocked", "critical",
       "PASS" if r.status_code in (200, 400) and '"$ne"' not in r.text else "FAIL",
       f"search[$ne]=x -> {r.status_code}; body starts {r.text[:100]}")

r = requests.post(f"{BASE}/auth/login", json={"email": {"$ne": None}, "password": "x"},
                  headers={"Origin": ORIGIN}, timeout=10)
record("INJ-03", "NoSQL operator injection in login rejected", "critical",
       "PASS" if r.status_code in (400, 401, 403) else "FAIL",
       f'{{"email":{{"$ne":null}}}} -> {r.status_code} {r.text[:120]}')

r = requests.get(f"{BASE}/hackathons/not-an-object-id", timeout=10)
record("ERR-01", "Invalid ObjectId does not leak a stack trace", "low",
       "PASS" if "at " not in r.text and "stack" not in r.text.lower() else "FAIL",
       f"GET /hackathons/not-an-object-id -> {r.status_code} {r.text[:150]}")

r = requests.post(f"{BASE}/feedback", json={"message": "x" * 200000}, timeout=20)
record("LIMIT-01", "Oversized JSON body rejected", "low",
       "PASS" if r.status_code == 413 else "NOTE",
       f"200 KB body -> {r.status_code}")

# ------------------------------------------- 6. account enumeration
r = requests.post(f"{BASE}/auth/register",
                  json={"name": "Dup", "email": seed["users"]["alice"]["email"], "password": "AuditPass1!"},
                  headers={"Origin": ORIGIN}, timeout=10)
record("ENUM-01", "Registration does not disclose existing accounts", "medium",
       "FAIL" if r.status_code == 409 else "PASS",
       f"register existing alice@audit.local -> {r.status_code} {r.text[:120]}")

r = requests.post(f"{BASE}/auth/forgot-password", json={"email": "nobody-xyz@audit.local"},
                  headers={"Origin": ORIGIN}, timeout=15)
r2 = requests.post(f"{BASE}/auth/forgot-password", json={"email": seed["users"]["bob"]["email"]},
                   headers={"Origin": ORIGIN}, timeout=15)
same = r.status_code == r2.status_code
record("ENUM-02", "Password reset response identical for existing/non-existing accounts", "medium",
       "PASS" if same else "FAIL",
       f"nonexistent -> {r.status_code}; existing -> {r2.status_code} ({r2.text[:100]})")

# lockout oracle
s = new_session()
t = csrf(s)
r = s.post(f"{BASE}/auth/login", json={"email": "nobody-xyz@audit.local", "password": "WrongPass1!"},
           headers={"Origin": ORIGIN, "X-CSRF-Token": t}, timeout=10)
record("ENUM-03", "Login failure response identical for unknown accounts", "low",
       "PASS" if r.status_code == 401 else "FAIL",
       f"unknown account -> {r.status_code} {r.text[:80]}")

# ------------------------------------------------- 7. metrics exposure
r = requests.get("http://127.0.0.1:5000/metrics", timeout=10)
record("METRICS-01", "/metrics is not exposed when no METRICS_TOKEN is configured", "medium",
       "PASS" if r.status_code in (401, 403, 404) else "FAIL",
       f"GET /metrics without METRICS_TOKEN -> {r.status_code} (implementation returns 404 to avoid confirming the path)")

# ------------------------------------------------- 8. transport headers
r = requests.get(f"{BASE}/health", timeout=10)
h = r.headers
checks = {
    "X-Content-Type-Options": h.get("x-content-type-options") == "nosniff",
    "X-Frame-Options": bool(h.get("x-frame-options")),
    "Content-Security-Policy": bool(h.get("content-security-policy")),
    "Referrer-Policy": bool(h.get("referrer-policy")),
}
record("HDR-01", "Security headers present on API responses", "info",
       "PASS" if all(checks.values()) else "FAIL", f"{checks}")

r = requests.get("http://127.0.0.1:5173/", timeout=10)
h = r.headers
record("HDR-02", "Frontend responses set CSP/XCTO/Referrer-Policy", "medium",
       "PASS" if h.get("content-security-policy") and h.get("x-content-type-options") else "NOTE",
       f"CSP={h.get('content-security-policy')!r}, XCTO={h.get('x-content-type-options')!r}, "
       f"Referrer-Policy={h.get('referrer-policy')!r} (Vite dev server; production CSP is set by configure-vercel-csp.mjs)")

# --------------------------------------- 9. rate-limit IP spoofing test
codes = []
for i in range(14):
    xff = f"203.0.113.{i}"
    s = new_session()
    s.headers["X-Forwarded-For"] = xff
    t = csrf(s)
    r = s.post(f"{BASE}/auth/login",
               json={"email": f"spoof{i}@audit.local", "password": "WrongPass1!"},
               headers={"Origin": ORIGIN, "X-CSRF-Token": t, "X-Forwarded-For": xff}, timeout=10)
    codes.append(r.status_code)
limited = 429 in codes
record("RATE-01", "IP rate limit not bypassable via spoofed X-Forwarded-For", "medium",
       "FAIL" if not limited else "PASS",
       f"14 logins for distinct unknown accounts with rotating X-Forwarded-For (CSRF handled per session) -> statuses={codes}. "
       "app.set('trust proxy', 1) makes the leftmost XFF the client IP when the app is reachable directly.")

# ------------------------------------- 10. logout revokes access token
s, r = login(seed["users"]["alice"]["email"], seed["users"]["alice"]["password"])
t = csrf(s)
tok = s.cookies.get("accessToken")
r = s.post(f"{BASE}/auth/logout", headers={"X-CSRF-Token": t}, timeout=10)
r2 = requests.get(f"{BASE}/users/me", headers={"Authorization": f"Bearer {tok}"}, timeout=10)
record("SESS-01", "Access token is revoked server-side on logout", "high",
       "PASS" if r2.status_code == 401 else "FAIL",
       f"logout -> {r.status_code}; reuse of pre-logout token -> {r2.status_code}")

# Logout bumps tokenVersion for the whole account (all devices), so re-login
# Alice before the authorization checks below.
alice, _ = login(seed["users"]["alice"]["email"], seed["users"]["alice"]["password"])
alice_csrf = csrf(alice)

# --------------------------------------------- 11. admin authorization
r = alice.get(f"{BASE}/admin/users", timeout=10)
record("AUTHZ-01", "Non-admin cannot reach admin endpoints", "critical",
       "PASS" if r.status_code == 403 else "FAIL", f"Alice -> GET /admin/users {r.status_code}")

r = alice.post(f"{BASE}/admin/scrapers/run", json={}, headers={"X-CSRF-Token": alice_csrf}, timeout=10)
record("AUTHZ-02", "Non-admin cannot trigger scraper jobs", "high",
       "PASS" if r.status_code == 403 else "FAIL", f"Alice -> POST /admin/scrapers/run {r.status_code}")

r = admin.get(f"{BASE}/admin/users", timeout=10)
record("AUTHZ-03", "Admin can reach admin endpoints", "info",
       "PASS" if r.status_code in (200, 404) else "NOTE", f"Admin -> GET /admin/users {r.status_code}")

# --------------------------------------------------- 12. XSS reflection
payload = "<script>alert(1)</script>"
r = requests.get(f"{BASE}/hackathons", params={"search": payload}, timeout=10)
record("XSS-01", "Search payload not reflected unescaped in HTML context", "medium",
       "PASS" if payload not in r.text or r.headers.get("content-type","").startswith("application/json") else "FAIL",
       f"content-type={r.headers.get('content-type')}, reflected={payload in r.text}")

(OUT / "manual-tests.txt").write_text("\n".join(lines))
(OUT / "manual-tests.json").write_text(json.dumps(results, indent=2))
summary = {}
for x in results:
    summary[x["verdict"]] = summary.get(x["verdict"], 0) + 1
print("\nSUMMARY", summary)
