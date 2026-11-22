#!/usr/bin/env python3
"""Environment-assisted checks that were previously blocked.

Covers: OAuth start/callback with the real client IDs, email delivery through
Resend, password-reset enumeration with delivery available, and avatar upload
end-to-end against Cloudinary. No secret values are printed.
"""

import json
import os
import sys
import time

import requests

BASE = "http://127.0.0.1:5000/api"
ORIGIN = "http://localhost:5173"
OUT = []


def log(line):
    OUT.append(line)
    print(line)


def csrf(session):
    r = session.get(f"{BASE}/auth/csrf-token", timeout=15)
    return r.json().get("csrfToken")


def new_session():
    s = requests.Session()
    s.headers.update({"Origin": ORIGIN, "Accept": "application/json"})
    return s


def login(email, password):
    s = new_session()
    token = csrf(s)
    r = s.post(
        f"{BASE}/auth/login",
        json={"email": email, "password": password},
        headers={"X-CSRF-Token": token},
        timeout=15,
    )
    return s, r


PNG_1X1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)


def oauth_checks():
    log("== OAUTH ==")
    for provider in ("google", "github"):
        s = new_session()
        r = s.get(f"{BASE}/auth/{provider}", allow_redirects=False, timeout=20)
        loc = r.headers.get("Location", "")
        cookie_names = sorted(s.cookies.keys())
        state_cookie = next((c for c in cookie_names if "state" in c.lower()), None)
        state_val = s.cookies.get(state_cookie) if state_cookie else None
        log(
            f"OAUTH start {provider}: status={r.status_code} "
            f"location_host={loc.split('/')[2] if '://' in loc else 'n/a'} "
            f"client_id_present={'client_id=' in loc} "
            f"state_param={'state=' in loc} cookies={','.join(cookie_names)} "
            f"state_len={len(state_val) if state_val else 0}"
        )
        for c in s.cookies:
            if "state" in c.name.lower():
                log(
                    f"OAUTH state cookie {provider}: name={c.name} "
                    f"secure={c.secure} httponly={c.has_nonstandard_attr('HttpOnly') or c._rest.get('HttpOnly', False)} "
                    f"domain={c.domain or '(host-only)'} path={c.path} "
                    f"samesite={c._rest.get('SameSite', 'unset')}"
                )
        # Callback with an invalid code but the matching state.
        if state_val:
            r2 = s.get(
                f"{BASE}/auth/{provider}/callback?code=audit_invalid_code&state={state_val}",
                allow_redirects=False,
                timeout=25,
            )
            body = r2.text[:180].replace("\n", " ")
            log(
                f"OAUTH callback {provider} invalid code: status={r2.status_code} "
                f"stack_like={'stack' in body or ' at ' in body} body={body}"
            )


def email_checks():
    log("== EMAIL / RESET ==")
    s = new_session()
    token = csrf(s)
    email = f"audit-verify-{int(time.time())}@example.com"
    r = s.post(
        f"{BASE}/auth/register",
        json={"name": "Audit Verify", "email": email, "password": "AuditPass1!"},
        headers={"X-CSRF-Token": token},
        timeout=30,
    )
    try:
        payload = r.json()
    except ValueError:
        payload = {}
    log(
        f"EMAIL register: status={r.status_code} autoVerified={payload.get('autoVerified')} "
        f"message={str(payload.get('message'))[:100]}"
    )
    log(f"EMAIL test account: {email}")

    for label, addr in (("known", "alice@audit.local"), ("unknown", "nobody-xyz@audit.local")):
        s2 = new_session()
        t2 = csrf(s2)
        started = time.time()
        r2 = s2.post(
            f"{BASE}/auth/forgot-password",
            json={"email": addr},
            headers={"X-CSRF-Token": t2},
            timeout=40,
        )
        elapsed = round((time.time() - started) * 1000)
        try:
            body = r2.json()
        except ValueError:
            body = {}
        log(
            f"RESET {label}: status={r2.status_code} elapsed_ms={elapsed} "
            f"stack_like={'stack' in r2.text or ' at ' in r2.text} "
            f"message={str(body.get('message'))[:100]}"
        )


def upload_checks():
    log("== UPLOAD ==")
    s, r = login("alice@audit.local", "AuditPass1!")
    if r.status_code != 200:
        log(f"UPLOAD login failed: status={r.status_code}")
        return
    token = csrf(s)

    # 1. MIME-only bypass: text bytes declared as image/png.
    r1 = s.put(
        f"{BASE}/users/avatar",
        headers={"X-CSRF-Token": token},
        files={"avatar": ("audit-fake.png", b"this is not an image\n", "image/png")},
        timeout=40,
    )
    log(
        f"UPLOAD spoofed MIME (text bytes as image/png): status={r1.status_code} "
        f"body={r1.text[:160]}"
    )

    # 2. Real PNG end-to-end to Cloudinary.
    r2 = s.put(
        f"{BASE}/users/avatar",
        headers={"X-CSRF-Token": token},
        files={"avatar": ("audit-real.png", PNG_1X1, "image/png")},
        timeout=60,
    )
    try:
        p2 = r2.json()
    except ValueError:
        p2 = {}
    avatar_url = p2.get("avatarUrl") or ""
    log(
        f"UPLOAD real PNG: status={r2.status_code} "
        f"avatar_host={avatar_url.split('/')[2] if '://' in avatar_url else 'n/a'} "
        f"secure={'https://' in avatar_url} message={str(p2.get('message'))[:80]}"
    )
    log(f"UPLOAD stored_public_path={'/hackhub/avatars/' in avatar_url}")

    # 3. Oversized file (3 MB) and wrong MIME.
    r3 = s.put(
        f"{BASE}/users/avatar",
        headers={"X-CSRF-Token": token},
        files={"avatar": ("big.png", b"A" * (3 * 1024 * 1024), "image/png")},
        timeout=40,
    )
    log(f"UPLOAD oversized 3MB: status={r3.status_code} body={r3.text[:120]}")

    r4 = s.put(
        f"{BASE}/users/avatar",
        headers={"X-CSRF-Token": token},
        files={"avatar": ("x.txt", b"plain", "text/plain")},
        timeout=40,
    )
    log(f"UPLOAD wrong MIME text/plain: status={r4.status_code} body={r4.text[:120]}")

    # 4. Cleanup: delete the avatar (destroys the Cloudinary asset).
    r5 = s.delete(f"{BASE}/users/avatar", headers={"X-CSRF-Token": token}, timeout=40)
    log(f"UPLOAD cleanup delete avatar: status={r5.status_code} body={r5.text[:120]}")


if __name__ == "__main__":
    log(f"timestamp={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")
    oauth_checks()
    email_checks()
    upload_checks()
    with open("/tmp/env-validation.txt", "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT) + "\n")
    sys.exit(0)
