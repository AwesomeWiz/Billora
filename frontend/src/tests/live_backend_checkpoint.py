"""Opt-in real HTTP/browser audit; never imports, edits or patches backend code.

Run with Python from a disposable environment containing backend/requirements.txt
and optionally playwright. Uses a fresh temporary SQLite database and loopback
ports only. Existing listeners are never reused or stopped. No credentials,
cookie values or CSRF values are printed/saved in the JSON evidence.
"""
import argparse
import json
from importlib.metadata import version
import os
from pathlib import Path
import secrets
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
from http.cookies import SimpleCookie

import httpx

REPO = Path(__file__).resolve().parents[3]
API = "http://127.0.0.1:8000"


def sanitized(value):
    if isinstance(value, dict):
        return {key: ("<redacted>" if any(word in key.lower() for word in ("password", "token", "email")) else sanitized(item))
                for key, item in value.items() if key not in ("input", "ctx")}
    if isinstance(value, list):
        return [sanitized(item) for item in value]
    return value


def require_free(port):
    with socket.socket() as probe:
        probe.settimeout(0.2)
        if probe.connect_ex(("127.0.0.1", port)) == 0:
            raise RuntimeError(f"Port {port} is occupied; existing services are preserved. Stop this audit without touching them.")


def wait_ready(process, url):
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError("Audit server exited during startup; inspect its temporary log.")
        try:
            if httpx.get(url, timeout=1, trust_env=False).status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(0.1)
    raise RuntimeError("Audit server did not become ready.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", action="store_true", help="Also run real Edge against Vite; requires installed Edge and playwright.")
    parser.add_argument("--frontend-port", type=int, default=5173, help="Use an alternate loopback Vite port without touching an existing dev server.")
    parser.add_argument("--output", type=Path, help="Optional sanitized JSON evidence path.")
    args = parser.parse_args()
    require_free(8000)
    if not 1024 <= args.frontend_port <= 65535:
        parser.error("frontend-port must be between 1024 and 65535")
    origin = f"http://127.0.0.1:{args.frontend_port}"
    if args.browser:
        require_free(args.frontend_port)
    work = Path(tempfile.mkdtemp(prefix="billora-live-checkpoint-"))
    db = work / "audit.db"
    env = {**os.environ, "PYTHONPATH": str(REPO / "backend"), "PYTHONDONTWRITEBYTECODE": "1", "SQLITE_URL": "sqlite+aiosqlite:///" + db.as_posix()}
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    processes = []
    evidence = {"backend_head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip(), "isolation": "Fresh temporary SQLite; no role overrides or backend dependency overrides", "versions": {package: version(package) for package in ("fastapi", "pydantic", "sqlalchemy", "uvicorn", "httpx")}, "calls": [], "workflow_complete": False}
    try:
        with (work / "backend.log").open("w", encoding="utf-8") as log:
            server = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], cwd=REPO / "backend", env=env, stdout=log, stderr=log, creationflags=flags)
            processes.append(server)
        wait_ready(server, API + "/api/health")
        with httpx.Client(base_url=API, trust_env=False, timeout=15, headers={"Origin": origin}) as client:
            def call(label, method, path, **kwargs):
                response = client.request(method, path, **kwargs)
                try:
                    body = response.json()
                except ValueError:
                    body = {"non_json_response": response.text[:100]}
                evidence["calls"].append({"case": label, "method": method, "path": path, "status": response.status_code, "body": sanitized(body)})
                return response

            spec = client.get("/api/openapi.json").json()
            evidence["openapi_paths"] = {path: sorted(item.keys()) for path, item in spec["paths"].items()}
            call("anonymous_identity", "GET", "/api/auth/me")
            token_response = call("csrf_bootstrap", "GET", "/api/auth/csrf")
            csrf = token_response.json()["csrf_token"]
            headers = {"X-CSRF-Token": csrf}
            email = "billora-checkpoint-" + secrets.token_hex(8) + "@example.com"
            password = "Aa!" + secrets.token_urlsafe(24)
            credentials = {"email": email, "password": password}
            call("register_missing_csrf", "POST", "/api/auth/register", json=credentials)
            call("register_wrong_csrf", "POST", "/api/auth/register", json=credentials, headers={"X-CSRF-Token": "deliberately-invalid-test-value"})
            registration = call("register_valid", "POST", "/api/auth/register", json=credentials, headers=headers)
            registered = registration.json()
            call("register_duplicate", "POST", "/api/auth/register", json=credentials, headers=headers)
            call("login_missing_csrf", "POST", "/api/auth/login", json=credentials)
            login = call("login_valid", "POST", "/api/auth/login", json=credentials, headers=headers)
            cookies = SimpleCookie()
            for header in login.headers.get_list("set-cookie"):
                cookies.load(header)
            evidence["session_cookie"] = {name: {"httponly": bool(cookie["httponly"]), "samesite": cookie["samesite"], "secure": bool(cookie["secure"]), "path": cookie["path"], "max_age": cookie["max-age"]} for name, cookie in cookies.items()}
            identity = call("identity_after_login", "GET", "/api/auth/me")
            evidence["real_user_id_returned"] = identity.json().get("user", {}).get("id") == registered.get("user_id")
            with httpx.Client(base_url=API, cookies=client.cookies, trust_env=False) as refreshed:
                evidence["fresh_client_session_status"] = refreshed.get("/api/auth/me").status_code
            call("login_untrusted_origin_with_valid_csrf", "POST", "/api/auth/login", json=credentials, headers={**headers, "Origin": "https://untrusted.invalid"})
            call("products_frontend_list", "GET", "/api/products")
            product_payload = {"name": "Isolated integration audit product", "type": "SOFTWARE", "sales_price_minor": 150000, "cost_price_minor": 50000, "currency": "INR", "active": True}
            # Deliberate negative authorization/CSRF probe, ONLY in this disposable DB.
            product = call("customer_product_write_without_csrf_must_be_denied", "POST", "/api/products", json=product_payload)
            if product.status_code == 201:
                product_id = product.json()["id"]
                call("products_frontend_nested_variants", "GET", f"/api/products/{product_id}/variants")
                with httpx.Client(base_url=API, trust_env=False) as anonymous:
                    public = anonymous.get(f"/api/products/{product_id}")
                    evidence["anonymous_product_detail"] = {"status": public.status_code, "cost_price_exposed": "cost_price_minor" in public.json()}
                variant = call("customer_actual_variant_write_without_csrf_must_be_denied", "POST", "/api/products/variants", json={"product_id": product_id, "name": "Audit variant", "price_adjust_minor": 56000})
                if variant.status_code == 201:
                    call("actual_variant_read", "GET", "/api/products/variants/" + variant.json()["id"])
            zero_id = "00000000-0000-0000-0000-000000000000"
            for label, path in {
                "plans": "/api/plans", "customers": "/api/accounts", "customer_detail": "/api/accounts/" + registered.get("account_id", zero_id),
                "subscriptions": "/api/subscriptions", "subscription_detail": "/api/subscriptions/" + zero_id,
                "invoices": "/api/invoices", "invoice_detail": "/api/invoices/" + zero_id,
                "payment_history": "/api/invoices/" + zero_id + "/payments", "reports_summary": "/api/reports/summary", "reports_overdue": "/api/reports/overdue",
            }.items():
                call(label, "GET", path)
            raw_session = client.cookies.get("session_token")
            call("logout_missing_csrf", "POST", "/api/auth/logout")
            call("logout_wrong_csrf", "POST", "/api/auth/logout", headers={"X-CSRF-Token": "deliberately-invalid-test-value"})
            call("logout_valid", "POST", "/api/auth/logout", headers=headers)
            evidence["logout_cookies_cleared"] = not client.cookies.get("session_token") and not client.cookies.get("csrf_token")
            call("identity_after_logout", "GET", "/api/auth/me")
            with httpx.Client(base_url=API, cookies={"session_token": raw_session}, trust_env=False) as replay:
                evidence["revoked_cookie_replay_status"] = replay.get("/api/auth/me").status_code
            evidence["first_blocker"] = "GET /api/auth/me omits user.id; real registration/login cookies work but frontend protected access must remain blocked."
            evidence["subsequent_blocker"] = "Catalog authorization/CSRF and route/DTO mismatch; plans and all remaining financial routes missing. No unknown financial POST payloads sent."

        if args.browser:
            with (work / "vite.log").open("w", encoding="utf-8") as log:
                vite = subprocess.Popen(["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", str(args.frontend_port)], cwd=REPO / "frontend", stdout=log, stderr=log, creationflags=flags)
                processes.append(vite)
            wait_ready(vite, origin + "/login")
            from playwright.sync_api import sync_playwright
            with sync_playwright() as browser_driver:
                browser = browser_driver.chromium.launch(channel="msedge", headless=True)
                context = browser.new_context()
                page = context.new_page()
                page.goto(origin + "/register")
                page.get_by_role("heading", name="Start with clarity").wait_for()
                page.get_by_role("button", name="Create account").wait_for(state="visible")
                # Real bootstrap must make the form usable; no browser request mocking.
                page.wait_for_function("!document.querySelector('button[type=submit]').disabled")
                browser_email = "billora-browser-" + secrets.token_hex(8) + "@example.com"
                page.get_by_label("Email address", exact=False).fill(browser_email)
                page.locator('input[name="password"]').fill(password)
                page.get_by_role("button", name="Create account").click()
                page.wait_for_url("**/login")
                evidence["browser_registration_redirect"] = page.url.endswith("/login")
                page.get_by_label("Work email").fill(browser_email)
                page.locator('input[name="password"]').fill(password)
                page.get_by_role("button", name="Sign in", exact=True).click()
                page.get_by_role("alert").wait_for()
                evidence["browser_login_result"] = {"path": page.url.removeprefix(origin), "protected_navigation_visible": page.get_by_role("navigation", name="Main navigation").count() > 0, "error": page.get_by_role("alert").inner_text()}
                page.goto(origin + "/portal/home")
                page.get_by_role("heading", name="Unable to verify your session").wait_for()
                page.reload()
                page.get_by_role("heading", name="Unable to verify your session").wait_for()
                evidence["browser_refresh_persists_cookie_but_refuses_missing_id"] = any(cookie["name"] == "session_token" and cookie["httpOnly"] for cookie in context.cookies())
                evidence["browser_storage_empty"] = page.evaluate("localStorage.length === 0 && sessionStorage.length === 0")
                csrf_for_logout = context.request.get(origin + "/api/auth/csrf").json()["csrf_token"]
                logout_api = context.request.post(origin + "/api/auth/logout", headers={"X-CSRF-Token": csrf_for_logout})
                page.goto(origin + "/portal/home")
                page.wait_for_url("**/login")
                evidence["browser_context_logout_api"] = {"status": logout_api.status, "session_cookie_cleared": not any(cookie["name"] == "session_token" for cookie in context.cookies()), "protected_refresh_redirects_to_login": page.url.endswith("/login")}
                browser.close()
        with sqlite3.connect(db) as connection:
            evidence["persisted_counts"] = {table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in ("accounts", "users", "user_sessions", "products", "product_variants")}
        if args.output:
            args.output.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
        print(json.dumps(evidence, indent=2))
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)


if __name__ == "__main__":
    main()
