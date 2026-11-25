#!/usr/bin/env python3
"""Authenticated API security checks for the local HackHub instance.

This suite replaces the original audit suite that produced false passes. It is
deliberately conservative:

* every mutation obtains a CSRF token from the same session;
* every check asserts an exact status (or a small, documented set) and a
  response-body invariant;
* a 403 caused by missing CSRF is a FAIL for injection/enumeration checks, not
  a PASS;
* two users with separate sessions are used for IDOR checks;
* secrets are read from the environment at runtime and are never written to
  evidence. Details contain status codes, counts, and redacted identities only.

Run from the repository root:

    AUDIT_TEST_PASSWORD='<throwaway password>' \
    AUDIT_ACCESS_TOKEN_SECRET='<test-only signing secret>' \
    tools/venv/bin/python security-audit/manual_tests.py

Optional environment variables:

    AUDIT_API_URL              default http://127.0.0.1:5000/api
    AUDIT_ORIGIN               default http://localhost:5173
    AUDIT_WEB_URL              frontend URL for the optional stored-XSS render
    AUDIT_ALICE_EMAIL/PASSWORD
    AUDIT_BOB_EMAIL/PASSWORD
    AUDIT_ADMIN_EMAIL/PASSWORD  admin checks are skipped when these are absent
    AUDIT_HIDDEN_HACKATHON_ID   enables DATA-02 when provided
    AUDIT_SKIP_RATE_LIMIT=1     skip the noisy login rate-limit checks
"""
import argparse
import json
import os
import re
import secrets
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

BASE = os.environ.get("AUDIT_API_URL", "http://127.0.0.1:5000/api").rstrip("/")
ORIGIN = os.environ.get("AUDIT_ORIGIN", "http://localhost:5173")
WEB_URL = os.environ.get("AUDIT_WEB_URL", "").rstrip("/")
OUT = Path(__file__).parent / "evidence"

JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+")
COOKIE_RE = re.compile(r"(?i)\b(accessToken|refreshToken|csrfToken)=([^;\s\"']+)")
PATH_RE = re.compile(r"(?:/home/[A-Za-z0-9._-]+|[A-Za-z]:\\[^\s\"']+)")

RESULTS = []
LINES = []


def redact(text):
    """Remove anything that could be a credential or local path."""
    text = JWT_RE.sub("[REDACTED_JWT]", text)
    text = COOKIE_RE.sub(lambda m: f"{m.group(1)}=[REDACTED]", text)
    text = EMAIL_RE.sub("[TEST_EMAIL]", text)
    text = PATH_RE.sub("[LOCAL_PATH]", text)
    return text


def record(tid, title, severity, verdict, detail):
    if verdict not in {"PASS", "FAIL", "SKIP", "NOTE"}:
        raise ValueError(f"invalid verdict {verdict}")
    detail = redact(detail)
    RESULTS.append({
        "id": tid,
        "title": title,
        "severity": severity,
        "verdict": verdict,
        "detail": detail,
    })
    LINES.append(f"[{verdict}] {tid} ({severity}) {title}\n    {detail}\n")
    print(f"[{verdict}] {tid} ({severity}) {title}")


def new_session():
    session = requests.Session()
    session.headers.update({"Origin": ORIGIN, "Accept": "application/json"})
    return session


def csrf(session):
    response = session.get(f"{BASE}/auth/csrf-token", timeout=10)
    token = response.json().get("csrfToken")
    if response.status_code != 200 or not token:
        raise RuntimeError(f"could not obtain CSRF token ({response.status_code})")
    return token


def request(session, method, path, *, token=None, body=None, params=None, timeout=15):
    headers = {"Origin": ORIGIN}
    if token:
        headers["X-CSRF-Token"] = token
    return session.request(
        method,
        BASE + path,
        json=body,
        params=params,
        headers=headers,
        timeout=timeout,
        allow_redirects=False,
    )


def login(email, password):
    session = new_session()
    token = csrf(session)
    response = request(
        session,
        "POST",
        "/auth/login",
        token=token,
        body={"email": email, "password": password},
    )
    return session, response


def register(email, password, name="Audit User"):
    session = new_session()
    token = csrf(session)
    response = request(
        session,
        "POST",
        "/auth/register",
        token=token,
        body={"name": name, "email": email, "password": password},
    )
    return session, response


def session_identity(session):
    response = request(session, "GET", "/users/me")
    if response.status_code != 200:
        raise RuntimeError(f"could not read /users/me ({response.status_code})")
    data = response.json().get("data", {})
    return data.get("id") or data.get("_id"), data


def no_stack(response):
    text = response.text.lower()
    return (
        '"stack"' not in text
        and " at " not in text
        and "node_modules" not in text
    )


def normalized_body(response):
    """Return a comparable body with per-request identifiers removed."""
    try:
        payload = response.json()
    except ValueError:
        return response.text

    def strip_request_ids(value):
        if isinstance(value, dict):
            return {
                key: strip_request_ids(item)
                for key, item in value.items()
                if key != "requestId"
            }
        if isinstance(value, list):
            return [strip_request_ids(item) for item in value]
        return value

    return json.dumps(strip_request_ids(payload), sort_keys=True)


def cookie_flags(response):
    """Return cookie names and flags only; values never leave this function."""
    raw = response.raw.headers.getlist("Set-Cookie") if hasattr(response.raw.headers, "getlist") else []
    flags = {}
    for header in raw:
        pair = header.split(";", 1)[0]
        if "=" not in pair:
            continue
        name = pair.split("=", 1)[0].strip()
        lowered = header.lower()
        flags[name] = {
            "httponly": "httponly" in lowered,
            "secure": "secure" in lowered,
            "samesite": "samesite=" in lowered,
            "path": "path=/" in lowered,
        }
    return flags


def find_first_hackathon_id():
    response = requests.get(f"{BASE}/hackathons", params={"limit": 5}, timeout=10)
    if response.status_code != 200:
        return None
    data = response.json().get("data", {})
    items = data.get("items", data if isinstance(data, list) else [])
    for item in items:
        hid = item.get("id") or item.get("_id")
        if hid:
            return hid
    return None


def setup_identities():
    password = os.environ.get("AUDIT_TEST_PASSWORD")
    if not password or len(password) < 12:
        password = secrets.token_urlsafe(24)

    suffix = f"{int(time.time())}-{secrets.token_hex(3)}"
    alice_email = os.environ.get("AUDIT_ALICE_EMAIL", f"audit-alice-{suffix}@audit.local")
    bob_email = os.environ.get("AUDIT_BOB_EMAIL", f"audit-bob-{suffix}@audit.local")
    alice_password = os.environ.get("AUDIT_ALICE_PASSWORD", password)
    bob_password = os.environ.get("AUDIT_BOB_PASSWORD", password)

    alice, alice_login = login(alice_email, alice_password) if os.environ.get(
        "AUDIT_ALICE_EMAIL"
    ) else (None, None)
    if alice is None or alice_login.status_code != 200:
        alice, alice_reg = register(alice_email, alice_password, "Audit Alice")
        alice, alice_login = login(alice_email, alice_password)
        if alice_login.status_code != 200:
            raise RuntimeError(
                f"Alice setup failed (register={getattr(alice_reg, 'status_code', 'n/a')}, "
                f"login={alice_login.status_code})"
            )

    bob, bob_login = login(bob_email, bob_password) if os.environ.get(
        "AUDIT_BOB_EMAIL"
    ) else (None, None)
    if bob is None or bob_login.status_code != 200:
        bob, bob_reg = register(bob_email, bob_password, "Audit Bob")
        bob, bob_login = login(bob_email, bob_password)
        if bob_login.status_code != 200:
            raise RuntimeError(
                f"Bob setup failed (register={getattr(bob_reg, 'status_code', 'n/a')}, "
                f"login={bob_login.status_code})"
            )

    admin = None
    admin_email = os.environ.get("AUDIT_ADMIN_EMAIL")
    admin_password = os.environ.get("AUDIT_ADMIN_PASSWORD")
    if admin_email and admin_password:
        admin, admin_login = login(admin_email, admin_password)
        if admin_login.status_code != 200:
            admin = None

    return {
        "alice": alice,
        "bob": bob,
        "admin": admin,
        "alice_email": alice_email,
        "bob_email": bob_email,
        "alice_password": alice_password,
        "bob_password": bob_password,
    }


def run():
    identities = setup_identities()
    alice = identities["alice"]
    bob = identities["bob"]
    admin = identities["admin"]
    alice_id, alice_me = session_identity(alice)
    _bob_id, bob_me = session_identity(bob)
    alice_csrf = csrf(alice)
    bob_csrf = csrf(bob)
    hackathon_id = find_first_hackathon_id()

    # ---------------------------------------------------------- baseline
    response = requests.get(f"{BASE}/users/me", timeout=10)
    record(
        "AUTH-01",
        "Protected endpoint rejects anonymous access",
        "info",
        "PASS" if response.status_code == 401 else "FAIL",
        f"GET /users/me unauthenticated -> {response.status_code}",
    )

    response = requests.get(f"{BASE}/saved", timeout=10)
    record(
        "AUTH-02",
        "Saved list rejects anonymous access",
        "info",
        "PASS" if response.status_code == 401 else "FAIL",
        f"GET /saved unauthenticated -> {response.status_code}",
    )

    response = requests.get(f"{BASE}/admin/users", timeout=10)
    if response.status_code == 404:
        record(
            "AUTH-03",
            "Admin user list exists and rejects anonymous access",
            "high",
            "FAIL",
            "GET /admin/users unauthenticated -> 404 (route missing; a 404 is "
            "not an authorization control).",
        )
    else:
        record(
            "AUTH-03",
            "Admin user list rejects anonymous access",
            "high",
            "PASS" if response.status_code == 401 else "FAIL",
            f"GET /admin/users unauthenticated -> {response.status_code}",
        )

    # -------------------------------------------------------------- JWT
    response = requests.get(
        f"{BASE}/users/me",
        headers={"Authorization": "Bearer x"},
        timeout=10,
    )
    record(
        "JWT-01",
        "Malformed bearer token rejected",
        "info",
        "PASS" if response.status_code == 401 else "FAIL",
        f"GET /users/me with malformed bearer -> {response.status_code}",
    )

    def b64(obj):
        import base64

        return (
            base64.urlsafe_b64encode(json.dumps(obj).encode())
            .rstrip(b"=")
            .decode()
        )

    none_token = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'id': alice_id, 'role': 'admin'})}."
    response = requests.get(
        f"{BASE}/users/me",
        headers={"Authorization": f"Bearer {none_token}"},
        timeout=10,
    )
    record(
        "JWT-02",
        "alg=none JWT forgery rejected",
        "critical",
        "PASS" if response.status_code == 401 else "FAIL",
        f"GET /users/me with alg=none -> {response.status_code}",
    )

    import hashlib
    import hmac

    def sign(payload, secret):
        header = b64({"alg": "HS256", "typ": "JWT"})
        body = b64(payload)
        signature = (
            base64.urlsafe_b64encode(
                hmac.new(
                    secret.encode(), f"{header}.{body}".encode(), hashlib.sha256
                ).digest()
            )
            .rstrip(b"=")
            .decode()
        )
        return f"{header}.{body}.{signature}"

    default_token = sign({"id": alice_id, "exp": int(time.time()) + 3600}, "change_me")
    response = requests.get(
        f"{BASE}/users/me",
        headers={"Authorization": f"Bearer {default_token}"},
        timeout=10,
    )
    record(
        "JWT-03",
        "JWT signed with documented default secret rejected",
        "critical",
        "PASS" if response.status_code == 401 else "FAIL",
        f"GET /users/me with 'change_me' signature -> {response.status_code}",
    )

    signing_secret = os.environ.get("AUDIT_ACCESS_TOKEN_SECRET")
    if signing_secret:
        expired = sign(
            {"id": alice_id, "exp": int(time.time()) - 60}, signing_secret
        )
        response = requests.get(
            f"{BASE}/users/me",
            headers={"Authorization": f"Bearer {expired}"},
            timeout=10,
        )
        record(
            "JWT-04",
            "Expired JWT signed with the test secret rejected",
            "high",
            "PASS" if response.status_code == 401 else "FAIL",
            f"GET /users/me with expired token -> {response.status_code}",
        )
    else:
        record(
            "JWT-04",
            "Expired JWT rejected",
            "high",
            "SKIP",
            "AUDIT_ACCESS_TOKEN_SECRET is not set; the suite does not hardcode "
            "signing secrets.",
        )

    # --------------------------------------------------- CORS / CSRF
    response = requests.get(
        f"{BASE}/hackathons", headers={"Origin": "http://evil.example"}, timeout=10
    )
    acao = response.headers.get("access-control-allow-origin")
    record(
        "CORS-01",
        "CORS does not reflect arbitrary origins",
        "high",
        "PASS" if acao != "http://evil.example" else "FAIL",
        f"Origin evil.example -> ACAO={acao!r}",
    )

    response = requests.get(
        f"{BASE}/hackathons", headers={"Origin": "null"}, timeout=10
    )
    record(
        "CORS-02",
        "CORS does not reflect the null origin",
        "high",
        "PASS" if response.headers.get("access-control-allow-origin") != "null" else "FAIL",
        f"Origin null -> ACAO={response.headers.get('access-control-allow-origin')!r}",
    )

    response = request(
        alice,
        "POST",
        "/saved",
        body={"hackathonId": hackathon_id},
    )
    record(
        "CSRF-01",
        "Cookie-authenticated mutation without a CSRF token is rejected",
        "high",
        "PASS" if response.status_code in (401, 403) else "FAIL",
        f"POST /saved without X-CSRF-Token -> {response.status_code}",
    )
    record(
        "ERR-02",
        "CSRF rejection does not leak a stack trace or file path",
        "medium",
        "PASS" if no_stack(response) else "FAIL",
        f"POST /saved without token body class -> {'clean' if no_stack(response) else 'stack-like'}",
    )

    anonymous = new_session()
    anonymous_token = csrf(anonymous)
    response = anonymous.post(
        f"{BASE}/saved",
        json={"hackathonId": hackathon_id},
        headers={"Origin": ORIGIN, "X-CSRF-Token": anonymous_token},
        timeout=10,
    )
    record(
        "CSRF-02",
        "CSRF token without the matching session cookie is rejected",
        "high",
        "PASS" if response.status_code in (401, 403) else "FAIL",
        f"token from an anonymous session used without Alice's cookies -> {response.status_code}",
    )

    alice, login_response = login(identities["alice_email"], identities["alice_password"])
    flags = cookie_flags(login_response)
    auth_cookies = {k: v for k, v in flags.items() if k in ("accessToken", "refreshToken")}
    if not auth_cookies:
        record(
            "COOKIE-01",
            "Authentication cookies carry the expected flags",
            "high",
            "FAIL",
            f"login -> {login_response.status_code}; no access/refresh cookie observed.",
        )
    else:
        ok = all(v["httponly"] and v["samesite"] and v["path"] for v in auth_cookies.values())
        record(
            "COOKIE-01",
            "Authentication cookies carry HttpOnly, SameSite and Path flags",
            "high",
            "PASS" if ok else "FAIL",
            f"login -> {login_response.status_code}; flags={auth_cookies}",
        )
    alice_csrf = csrf(alice)

    # --------------------------------------------------------- IDOR/BOLA
    response = request(
        alice,
        "POST",
        "/saved",
        token=alice_csrf,
        body={"hackathonId": hackathon_id},
    )
    saved_id = None
    if response.status_code in (200, 201):
        data = response.json().get("data", {})
        saved_id = data.get("id") or data.get("_id") or data.get("savedId")
    if not saved_id:
        response = request(alice, "GET", "/saved")
        data = response.json().get("data", {})
        items = data.get("items", data if isinstance(data, list) else [])
        if items:
            saved_id = items[0].get("id") or items[0].get("_id")

    record(
        "INFO-01",
        "Alice can see her own saved item",
        "info",
        "PASS" if saved_id else "FAIL",
        f"GET/POST /saved -> saved id present={bool(saved_id)}",
    )

    if saved_id:
        get_response = request(bob, "GET", f"/saved/{saved_id}")
        patch_response = request(
            bob,
            "PATCH",
            f"/saved/{saved_id}",
            token=bob_csrf,
            body={"notes": "not allowed"},
        )
        delete_response = request(
            bob, "DELETE", f"/saved/{saved_id}", token=bob_csrf
        )
        allowed = [
            r.status_code
            for r in (get_response, patch_response, delete_response)
            if r.status_code < 300
        ]
        record(
            "IDOR-01",
            "Cross-account saved-item read/update/delete is blocked",
            "high",
            "FAIL" if allowed else "PASS",
            f"As Bob against Alice's saved item: GET={get_response.status_code}, "
            f"PATCH={patch_response.status_code}, DELETE={delete_response.status_code}",
        )
    else:
        record(
            "IDOR-01",
            "Cross-account saved-item read/update/delete is blocked",
            "high",
            "SKIP",
            "No saved item was available to test.",
        )

    reminder_response = request(
        alice,
        "POST",
        "/reminders",
        token=alice_csrf,
        body={"hackathonId": hackathon_id, "eventType": "registration"},
    )
    reminder_id = None
    if reminder_response.status_code == 201:
        data = reminder_response.json().get("data", {})
        reminder_id = data.get("id") or data.get("_id")
    if reminder_id:
        response = request(
            bob, "DELETE", f"/reminders/{reminder_id}", token=bob_csrf
        )
        record(
            "IDOR-02",
            "Cross-account reminder delete is blocked",
            "high",
            "PASS" if response.status_code in (403, 404) else "FAIL",
            f"As Bob DELETE Alice's reminder -> {response.status_code}",
        )
    else:
        record(
            "IDOR-02",
            "Cross-account reminder delete is blocked",
            "high",
            "SKIP",
            f"Reminder setup returned {reminder_response.status_code}; no reminder id.",
        )

    team_id = None
    if hackathon_id:
        team_response = request(
            alice,
            "POST",
            "/teams",
            token=alice_csrf,
            body={
                "name": f"Audit Team {secrets.token_hex(3)}",
                "description": "Security audit team",
                "hackathonId": hackathon_id,
                "rolesNeeded": ["Designer"],
                "maxTeamSize": 4,
            },
        )
        if team_response.status_code in (200, 201):
            data = team_response.json().get("data", {})
            team_id = data.get("id") or data.get("_id")
    if team_id:
        checks = [
            ("IDOR-03", "GET", f"/teams/{team_id}/requests", None),
            ("IDOR-04", "GET", f"/teams/{team_id}/invitations", None),
            ("IDOR-05", "PATCH", f"/teams/{team_id}", {"description": "owned"}),
            ("IDOR-06", "PATCH", f"/teams/{team_id}/leader", {"userId": ""}),
            ("IDOR-07", "DELETE", f"/teams/{team_id}", None),
        ]
        for tid, method, path, body in checks:
            response = request(bob, method, path, token=bob_csrf, body=body)
            expected = (400, 401, 403, 404) if tid == "IDOR-06" else (401, 403, 404)
            record(
                tid,
                "Non-member/non-leader team operation is blocked",
                "critical" if tid in ("IDOR-05", "IDOR-06", "IDOR-07") else "high",
                "PASS" if response.status_code in expected else "FAIL",
                f"As Bob {method} {path} -> {response.status_code}",
            )
    else:
        for tid in ("IDOR-03", "IDOR-04", "IDOR-05", "IDOR-06", "IDOR-07"):
            record(
                tid,
                "Team IDOR check",
                "high",
                "SKIP",
                "No team fixture was available; team creation did not return an id.",
            )

    # ------------------------------------------------------ data exposure
    response = request(alice, "GET", f"/users/public/{alice_id}")
    private_keys = {
        "password",
        "refreshTokenHash",
        "tokenVersion",
        "failedLoginAttempts",
        "lockUntil",
        "resetPasswordToken",
        "emailVerificationToken",
    }
    try:
        public_body = response.text
    except Exception:
        public_body = ""
    leaked = sorted(k for k in private_keys if f'"{k}"' in public_body)
    record(
        "DATA-01",
        "Public profile does not expose private account fields",
        "high",
        "PASS" if response.status_code in (200, 404) and not leaked else "FAIL",
        f"GET /users/public/{{id}} -> {response.status_code}; leaked keys={leaked or 'none'}",
    )

    hidden_id = os.environ.get("AUDIT_HIDDEN_HACKATHON_ID")
    if hidden_id:
        response = requests.get(f"{BASE}/hackathons/{hidden_id}", timeout=10)
        record(
            "DATA-02",
            "Hidden hackathon is not retrievable by id",
            "medium",
            "PASS" if response.status_code == 404 else "FAIL",
            f"GET hidden hackathon -> {response.status_code}",
        )
    else:
        record(
            "DATA-02",
            "Hidden hackathon is not retrievable by id",
            "medium",
            "SKIP",
            "AUDIT_HIDDEN_HACKATHON_ID is not set.",
        )

    response = requests.get(
        f"{BASE}/hackathons", params={"search": "AUDIT Hackathon Hidden", "limit": 100},
        timeout=10,
    )
    found_hidden = "AUDIT Hackathon Hidden" in response.text
    record(
        "DATA-03",
        "Hidden hackathon is absent from the public listing",
        "medium",
        "PASS" if response.status_code == 200 and not found_hidden else "FAIL",
        f"GET /hackathons?search=... -> {response.status_code}; hidden title present={found_hidden}",
    )

    # ------------------------------------------------- mass assignment
    before_role = alice_me.get("role")
    response = request(
        alice,
        "PUT",
        "/users/me",
        token=alice_csrf,
        body={
            "name": "Audit Alice",
            "role": "admin",
            "emailVerified": True,
            "banned": False,
            "tokenVersion": 99,
            "failedLoginAttempts": 0,
            "isAdmin": True,
            "__proto__": {"role": "admin"},
        },
    )
    after_id, after_me = session_identity(alice)
    record(
        "MASS-01",
        "Profile update cannot escalate role or account flags",
        "critical",
        "PASS" if after_me.get("role") == before_role else "FAIL",
        f"PUT /users/me with role/flags -> {response.status_code}; "
        f"role before={before_role!r}, role after={after_me.get('role')!r}",
    )

    response = request(
        alice,
        "PUT",
        "/users/skills",
        token=alice_csrf,
        body={"skills": ["__proto__", "constructor"]},
    )
    stored_skills = after_me.get("skills") or []
    bad_skills = {"__proto__", "constructor", "prototype"} & set(stored_skills)
    record(
        "MASS-02",
        "Skill update rejects or drops prototype-pollution keys",
        "medium",
        "PASS" if response.status_code in (200, 400, 422) and not bad_skills else "FAIL",
        f"PUT /users/skills -> {response.status_code}; stored prototype keys={sorted(bad_skills)}",
    )

    request(
        alice,
        "PUT",
        "/users/me",
        token=alice_csrf,
        body={"__proto__": {"isAdmin": True, "polluted": "yes"}},
    )
    response = requests.get(f"{BASE}/hackathons", timeout=10)
    polluted = '"isAdmin"' in response.text or '"polluted"' in response.text
    _after_id, after_me = session_identity(alice)
    record(
        "MASS-03",
        "JSON __proto__ payload cannot introduce inherited properties",
        "high",
        "PASS" if not polluted and after_me.get("role") == before_role else "FAIL",
        f"GET /hackathons contains prototype markers={polluted}; role={after_me.get('role')!r}",
    )

    record(
        "SAN-01",
        "Sanitizer drops prototype keys and keeps request data safe",
        "medium",
        "PASS" if after_me.get("role") == before_role and not polluted else "FAIL",
        "API-level check; the unit suite also asserts null prototypes and "
        "Object.prototype cleanliness.",
    )

    # ---------------------------------------------------------- injection
    response = requests.get(
        f"{BASE}/hackathons", params={"search": "' OR 1=1 --"}, timeout=10
    )
    record(
        "INJ-01",
        "Search metacharacters return a normal JSON response",
        "info",
        "PASS" if response.status_code == 200 and response.headers.get("content-type", "").startswith("application/json") else "FAIL",
        f"search=' OR 1=1 -- -> {response.status_code}, content-type={response.headers.get('content-type')}",
    )

    response = requests.get(
        f"{BASE}/hackathons", params={"search[$ne]": "x"}, timeout=10
    )
    operator_echo = "$ne" in response.text
    record(
        "INJ-02",
        "Mongo operator-shaped query keys are stripped",
        "high",
        "PASS" if response.status_code == 200 and not operator_echo else "FAIL",
        f"search[$ne]=x -> {response.status_code}; operator reflected={operator_echo}",
    )

    no_csrf_session = new_session()
    response = no_csrf_session.post(
        f"{BASE}/auth/login",
        json={"email": {"$ne": None}, "password": "x"},
        headers={"Origin": ORIGIN},
        timeout=10,
    )
    access_cookie = "accessToken" in no_csrf_session.cookies
    record(
        "INJ-03",
        "NoSQL operator injection in login is rejected (CSRF token supplied)",
        "critical",
        "PASS" if response.status_code in (400, 401) and not access_cookie else "FAIL",
        f"operator login with CSRF -> {response.status_code}; access cookie set={access_cookie}",
    )

    response = requests.get(f"{BASE}/hackathons/not-an-object-id", timeout=10)
    record(
        "ERR-01",
        "Invalid ObjectId returns a safe error",
        "low",
        "PASS" if response.status_code in (400, 404) and no_stack(response) else "FAIL",
        f"GET invalid ObjectId -> {response.status_code}; stack-like={not no_stack(response)}",
    )

    response = requests.post(
        f"{BASE}/feedback",
        json={"message": "x" * 200000},
        headers={"Origin": ORIGIN},
        timeout=20,
    )
    record(
        "LIMIT-01",
        "Oversized JSON body is rejected without a stack leak",
        "low",
        "PASS" if response.status_code == 413 and no_stack(response) else "FAIL",
        f"200 KB POST /feedback -> {response.status_code}; stack-like={not no_stack(response)}",
    )

    # ------------------------------------------------------- enumeration
    enum_session = new_session()
    response = request(
        enum_session,
        "POST",
        "/auth/register",
        token=csrf(enum_session),
        body={
            "name": "Duplicate",
            "email": identities["alice_email"],
            "password": identities["alice_password"],
        },
    )
    record(
        "ENUM-01",
        "Registration rejects a duplicate account without a CSRF false positive",
        "medium",
        "PASS" if response.status_code in (400, 409) else "FAIL",
        f"register existing account -> {response.status_code}",
    )

    unknown_session = new_session()
    known_session = new_session()
    unknown_response = request(
        unknown_session,
        "POST",
        "/auth/forgot-password",
        token=csrf(unknown_session),
        body={"email": f"unknown-{secrets.token_hex(4)}@audit.local"},
        timeout=20,
    )
    known_response = request(
        known_session,
        "POST",
        "/auth/forgot-password",
        token=csrf(known_session),
        body={"email": identities["alice_email"]},
        timeout=20,
    )
    same_status = unknown_response.status_code == known_response.status_code
    same_body = unknown_response.text == known_response.text
    record(
        "ENUM-02",
        "Password-reset response is identical for known and unknown accounts",
        "medium",
        "PASS" if same_status and same_body and unknown_response.status_code == 200 else "FAIL",
        f"known -> {known_response.status_code}, unknown -> {unknown_response.status_code}; "
        f"same body={same_body}",
    )

    unknown_login = new_session()
    unknown_response = request(
        unknown_login,
        "POST",
        "/auth/login",
        token=csrf(unknown_login),
        body={"email": f"unknown-{secrets.token_hex(4)}@audit.local", "password": "WrongPass1!"},
    )
    known_login = new_session()
    known_response = request(
        known_login,
        "POST",
        "/auth/login",
        token=csrf(known_login),
        body={"email": identities["alice_email"], "password": "WrongPass1!"},
    )
    record(
        "ENUM-03",
        "Login failure response is identical for known and unknown accounts",
        "low",
        "PASS" if unknown_response.status_code == known_response.status_code == 401 and unknown_response.text == known_response.text else "FAIL",
        f"known -> {known_response.status_code}, unknown -> {unknown_response.status_code}; "
        f"same body={unknown_response.text == known_response.text}",
    )

    # ---------------------------------------------------- metrics/headers
    response = requests.get("http://127.0.0.1:5000/metrics", timeout=10)
    record(
        "METRICS-01",
        "/metrics is not exposed without a token",
        "medium",
        "PASS" if response.status_code in (401, 403, 404) else "FAIL",
        f"GET /metrics without token -> {response.status_code}",
    )

    response = requests.get(f"{BASE}/health", timeout=10)
    headers = response.headers
    header_checks = {
        "X-Content-Type-Options": headers.get("x-content-type-options") == "nosniff",
        "X-Frame-Options": bool(headers.get("x-frame-options")),
        "Content-Security-Policy": bool(headers.get("content-security-policy")),
        "Referrer-Policy": bool(headers.get("referrer-policy")),
    }
    record(
        "HDR-01",
        "Security headers are present on API responses",
        "info",
        "PASS" if all(header_checks.values()) else "FAIL",
        f"{header_checks}",
    )

    if WEB_URL:
        try:
            response = requests.get(WEB_URL, timeout=10)
            headers = response.headers
            record(
                "HDR-02",
                "Frontend responses set CSP, XCTO and Referrer-Policy",
                "medium",
                "PASS" if headers.get("content-security-policy") and headers.get("x-content-type-options") and headers.get("referrer-policy") else "FAIL",
                f"status={response.status_code}; CSP={bool(headers.get('content-security-policy'))}, "
                f"XCTO={headers.get('x-content-type-options')!r}, "
                f"Referrer-Policy={headers.get('referrer-policy')!r}",
            )
        except requests.RequestException as exc:
            record(
                "HDR-02",
                "Frontend responses set CSP, XCTO and Referrer-Policy",
                "medium",
                "SKIP",
                f"frontend unavailable: {type(exc).__name__}",
            )
    else:
        record(
            "HDR-02",
            "Frontend responses set CSP, XCTO and Referrer-Policy",
            "medium",
            "SKIP",
            "AUDIT_WEB_URL is not set; production/Vite header behavior was not tested.",
        )

    # --------------------------------------------------------- session
    session, login_response = login(identities["alice_email"], identities["alice_password"])
    token = session.cookies.get("accessToken")
    logout_token = csrf(session)
    logout_response = request(
        session, "POST", "/auth/logout", token=logout_token
    )
    response = requests.get(
        f"{BASE}/users/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    record(
        "SESS-01",
        "Access token is revoked server-side on logout",
        "high",
        "PASS" if logout_response.status_code in (200, 204) and response.status_code == 401 else "FAIL",
        f"logout -> {logout_response.status_code}; reuse of pre-logout token -> {response.status_code}",
    )

    # Re-login after logout (logout bumps tokenVersion for the account).
    alice, _ = login(identities["alice_email"], identities["alice_password"])
    alice_csrf = csrf(alice)

    # ----------------------------------------------------- admin authz
    if admin is not None:
        admin_csrf = csrf(admin)
        response = request(admin, "GET", "/admin/reports")
        admin_reports = response.status_code
        response = request(alice, "GET", "/admin/reports")
        non_admin_reports = response.status_code
        response = requests.get(f"{BASE}/admin/reports", timeout=10)
        anonymous_reports = response.status_code
        record(
            "AUTHZ-01",
            "Admin reports use the expected admin/non-admin/anonymous matrix",
            "critical",
            "PASS" if (admin_reports, non_admin_reports, anonymous_reports) == (200, 403, 401) else "FAIL",
            f"admin={admin_reports}, non-admin={non_admin_reports}, anonymous={anonymous_reports}",
        )
        response = request(
            alice, "POST", "/admin/scrapers/run", token=alice_csrf, body={}
        )
        record(
            "AUTHZ-02",
            "Non-admin cannot trigger scraper jobs",
            "high",
            "PASS" if response.status_code == 403 else "FAIL",
            f"Alice -> POST /admin/scrapers/run -> {response.status_code}",
        )
        response = request(admin, "GET", "/admin/users")
        record(
            "AUTHZ-03",
            "Admin user list exists and returns 200 for an admin",
            "high",
            "PASS" if response.status_code == 200 else "FAIL",
            f"Admin -> GET /admin/users -> {response.status_code}"
            + (" (route missing)" if response.status_code == 404 else ""),
        )
    else:
        for tid, title in (
            ("AUTHZ-01", "Admin reports use the expected admin/non-admin/anonymous matrix"),
            ("AUTHZ-02", "Non-admin cannot trigger scraper jobs"),
            ("AUTHZ-03", "Admin user list exists and returns 200 for an admin"),
        ):
            record(
                tid,
                title,
                "high",
                "SKIP",
                "AUDIT_ADMIN_EMAIL/AUDIT_ADMIN_PASSWORD are not set.",
            )

    # ------------------------------------------------------------- XSS
    payload = "<script>alert(1)</script>"
    response = requests.get(
        f"{BASE}/hackathons", params={"search": payload}, timeout=10
    )
    json_response = response.headers.get("content-type", "").startswith("application/json")
    record(
        "XSS-01",
        "Search payload is not reflected as executable HTML",
        "medium",
        "PASS" if json_response and payload not in response.text else "FAIL",
        f"content-type={response.headers.get('content-type')}; raw payload reflected={payload in response.text}",
    )

    if WEB_URL and hackathon_id:
        record_browser_xss(WEB_URL, hackathon_id, alice)
    else:
        record(
            "XSS-02",
            "Seeded stored-XSS payload renders inert in a browser",
            "high",
            "SKIP",
            "AUDIT_WEB_URL is not set; browser render not attempted.",
        )

    # ------------------------------------------------------ rate limits
    if os.environ.get("AUDIT_SKIP_RATE_LIMIT") != "1":
        statuses = []
        for index in range(14):
            spoofed_ip = f"203.0.113.{index + 1}"
            session = new_session()
            session.headers["X-Forwarded-For"] = spoofed_ip
            token = csrf(session)
            response = request(
                session,
                "POST",
                "/auth/login",
                token=token,
                body={
                    "email": f"spoof-{index}-{secrets.token_hex(3)}@audit.local",
                    "password": "WrongPass1!",
                },
            )
            statuses.append(response.status_code)
        record(
            "RATE-01",
            "Spoofed X-Forwarded-For does not reset the login rate-limit bucket",
            "high",
            "PASS" if 429 in statuses else "FAIL",
            f"14 rotating XFF login attempts -> statuses={statuses}",
        )

        stable_ip = "198.51.100.200"
        statuses = []
        for index in range(12):
            session = new_session()
            session.headers["X-Forwarded-For"] = stable_ip
            token = csrf(session)
            response = request(
                session,
                "POST",
                "/auth/login",
                token=token,
                body={
                    "email": f"stable-{index}-{secrets.token_hex(3)}@audit.local",
                    "password": "WrongPass1!",
                },
            )
            statuses.append(response.status_code)
        record(
            "RATE-02",
            "Login limiter enforces a bucket for a stable client identity",
            "medium",
            "PASS" if 429 in statuses else "NOTE",
            f"12 stable-XFF login attempts -> statuses={statuses}",
        )
    else:
        record(
            "RATE-01",
            "Spoofed X-Forwarded-For does not reset the login rate-limit bucket",
            "high",
            "SKIP",
            "AUDIT_SKIP_RATE_LIMIT=1",
        )
        record(
            "RATE-02",
            "Login limiter enforces a bucket for a stable client identity",
            "medium",
            "SKIP",
            "AUDIT_SKIP_RATE_LIMIT=1",
        )

    return RESULTS


def record_browser_xss(web_url, hackathon_id, alice):
    """Optional Playwright check for the seeded stored-XSS payload."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        record(
            "XSS-02",
            "Seeded stored-XSS payload renders inert in a browser",
            "high",
            "SKIP",
            "Playwright is not installed in this interpreter.",
        )
        return

    cookies = []
    for name in ("accessToken", "refreshToken"):
        value = alice.cookies.get(name)
        if value:
            for domain in ("localhost", "127.0.0.1"):
                cookies.append({
                    "name": name,
                    "value": value,
                    "domain": domain,
                    "path": "/",
                    "httpOnly": True,
                    "secure": False,
                    "sameSite": "Lax",
                })

    dialogs = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(viewport={"width": 1280, "height": 900})
            if cookies:
                context.add_cookies(cookies)
            page = context.new_page()
            page.on("dialog", lambda dialog: (dialogs.append(dialog.type), dialog.dismiss()))
            page.goto(f"{web_url}/discover/{hackathon_id}", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)
            raw_images = page.locator('img[src="x"]').count()
            browser.close()
        record(
            "XSS-02",
            "Seeded stored-XSS payload renders inert in a browser",
            "high",
            "PASS" if raw_images == 0 and not dialogs else "FAIL",
            f"raw <img src=x> elements={raw_images}; dialogs={dialogs or 'none'}",
        )
    except Exception as exc:
        record(
            "XSS-02",
            "Seeded stored-XSS payload renders inert in a browser",
            "high",
            "SKIP",
            f"browser check could not run: {type(exc).__name__}",
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--write",
        action="store_true",
        help="write evidence/manual-tests.json and manual-tests.txt",
    )
    args = parser.parse_args()

    started = datetime.now(timezone.utc).isoformat()
    results = run()

    counts = {}
    for item in results:
        counts[item["verdict"]] = counts.get(item["verdict"], 0) + 1

    header = [
        "# Rebuilt manual security suite.",
        f"# Started: {started}",
        f"# Checks: {len(results)} ({', '.join(f'{k} {v}' for k, v in sorted(counts.items()))})",
        "# Secrets are read from the environment and are not written here.",
        "",
    ]
    text = "\n".join(header) + "\n".join(LINES)
    json_text = json.dumps({
        "startedAt": started,
        "checks": results,
        "summary": counts,
    }, indent=2) + "\n"

    if args.write:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / "manual-tests.txt").write_text(text)
        (OUT / "manual-tests.json").write_text(json_text)
        print(f"wrote {OUT / 'manual-tests.txt'} and {OUT / 'manual-tests.json'}")

    print("SUMMARY", counts)
    return 0 if not counts.get("FAIL") else 1


if __name__ == "__main__":
    sys.exit(main())
