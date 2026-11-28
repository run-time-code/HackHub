#!/usr/bin/env python3
"""Capture UI screenshots of the local HackHub instance (Playwright/Chromium).

The audit seed password is no longer stored in evidence/seed.json (SEC-02), so
the credential is read from the environment:

    AUDIT_ALICE_PASSWORD='<throwaway password>' \
    tools/venv/bin/python security-audit/screenshots.py

index.json records paths relative to this directory so the evidence package
stays portable and does not leak absolute local paths (PRIV-01).
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)
seed = json.loads((Path(__file__).parent / "evidence" / "seed.json").read_text())

shots = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    def shot(name, url, wait=1200, full=True):
        page.goto(BASE + url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(wait)
        path = OUT / f"{name}.png"
        page.screenshot(path=str(path), full_page=full)
        shots.append({"name": name, "url": url, "file": path.name})
        print("saved", path)

    # public pages
    shot("01-landing", "/")
    shot("02-auth-login", "/auth?panel=login", wait=1500)
    shot("03-auth-register", "/auth?panel=register", wait=800)
    shot("04-faq", "/faq")
    shot("05-privacy", "/legal/privacy")

    # Authenticated session: mint real tokens through the API, then hand them
    # to the browser exactly as a login would (httpOnly cookies).
    import requests
    alice_password = os.environ.get("AUDIT_ALICE_PASSWORD")
    if not alice_password:
        raise SystemExit(
            "AUDIT_ALICE_PASSWORD is required: the audit password is no "
            "longer stored in evidence/seed.json."
        )
    rs = requests.Session()
    rs.headers.update({"Origin": "http://localhost:5173"})
    ct = rs.get("http://127.0.0.1:5000/api/auth/csrf-token").json()["csrfToken"]
    lr = rs.post("http://127.0.0.1:5000/api/auth/login",
                 json={"email": seed["users"]["alice"]["email"],
                       "password": alice_password},
                 headers={"X-CSRF-Token": ct})
    print("api login:", lr.status_code)
    cookies = []
    for domain in ("localhost", "127.0.0.1"):
        for cname in ("accessToken", "refreshToken"):
            cookies.append({
                "name": cname, "value": rs.cookies.get(cname),
                "domain": domain, "path": "/", "httpOnly": True,
                "secure": False, "sameSite": "Lax",
            })
    ctx.add_cookies(cookies)
    page.goto(BASE + "/dashboard", wait_until="networkidle")
    page.wait_for_timeout(2000)
    print("after auth url:", page.url)

    for name, path in [
        ("06-dashboard", "/dashboard"),
        ("07-discover", "/discover"),
        ("08-teammates", "/teammates"),
        ("09-teams", "/teams"),
        ("10-requests", "/requests"),
        ("11-calendar", "/calendar"),
        ("12-profile", "/profile"),
        ("13-settings", "/settings"),
    ]:
        try:
            shot(name, path, wait=1600)
        except Exception as e:
            print("FAILED", name, e)

    # accessibility / console noise capture
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(BASE + "/dashboard", wait_until="networkidle")
    page.wait_for_timeout(1500)
    (OUT / "console-errors.txt").write_text("\n".join(errors))
    print("console errors:", len(errors))
    browser.close()

(OUT / "index.json").write_text(json.dumps(shots, indent=2))
