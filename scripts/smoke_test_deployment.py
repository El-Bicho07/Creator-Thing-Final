#!/usr/bin/env python3
"""Production deployment smoke test for Creator Platform SaaS.

Probes deployed backend and frontend URLs for health, CORS headers, and
authentication enforcement without exposing any tokens or secret keys.

Usage:
    python scripts/smoke_test_deployment.py --api-url https://api.example.com --web-url https://app.example.com [--token <optional_jwt>]
"""
import argparse
import sys
import urllib.request
import urllib.error
import json


def probe_url(url: str, method: str = "GET", headers: dict = None) -> tuple[int, dict, str]:
    req = urllib.request.Request(url, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, dict(resp.headers), body
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8") if err.fp else ""
        return err.code, dict(err.headers), body
    except Exception as exc:
        return 0, {}, str(exc)


def main():
    parser = argparse.ArgumentParser(description="Production Deployment Smoke Test")
    parser.add_argument("--api-url", required=True, help="Base URL of deployed backend API (e.g. https://api.example.com)")
    parser.add_argument("--web-url", required=False, help="Base URL of deployed frontend (e.g. https://app.example.com)")
    parser.add_argument("--token", required=False, help="Optional Supabase access token to test authenticated endpoints")
    args = parser.parse_args()

    api_url = args.api_url.rstrip("/")
    web_url = args.web_url.rstrip("/") if args.web_url else None

    print("==================================================")
    print("CREATOR PLATFORM SAAS — DEPLOYMENT SMOKE TEST")
    print(f"API Target: {api_url}")
    if web_url:
        print(f"Web Target: {web_url}")
    print("==================================================")

    all_ok = True

    # 1. Backend Liveness & Health Check
    print("\n--- [1] Backend Public Health Endpoint ---")
    status, _, body = probe_url(f"{api_url}/health")
    if status == 200:
        print(f"  [PASS] GET /health returned 200 OK: {body.strip()}")
    else:
        print(f"  [FAIL] GET /health returned status {status}: {body}")
        all_ok = False

    status, _, body = probe_url(f"{api_url}/api/health")
    if status == 200:
        print(f"  [PASS] GET /api/health returned 200 OK: {body.strip()}")
    else:
        print(f"  [FAIL] GET /api/health returned status {status}: {body}")
        all_ok = False

    # 2. Unauthenticated Protected Route Probe (Must fail-closed with 401)
    print("\n--- [2] Unauthenticated Security Probe (Must return 401) ---")
    for endpoint in ["/api/today", "/api/studio/sessions", "/api/voice/profile"]:
        status, _, body = probe_url(f"{api_url}{endpoint}")
        if status == 401:
            print(f"  [PASS] GET {endpoint} correctly returned 401 Unauthorized")
        else:
            print(f"  [FAIL] GET {endpoint} expected 401 Unauthorized but got status {status}: {body}")
            all_ok = False

    # 3. CORS Preflight Check
    if web_url:
        print("\n--- [3] CORS Preflight Headers Check ---")
        cors_headers = {
            "Origin": web_url,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        }
        status, resp_headers, _ = probe_url(f"{api_url}/api/today", method="OPTIONS", headers=cors_headers)
        allow_origin = resp_headers.get("Access-Control-Allow-Origin") or resp_headers.get("access-control-allow-origin")
        if allow_origin in (web_url, "*"):
            print(f"  [PASS] CORS preflight approved for origin: {allow_origin}")
        else:
            print(f"  [FAIL] CORS preflight rejected or missing Access-Control-Allow-Origin: {resp_headers}")
            all_ok = False

    # 4. Authenticated Probe (if token provided)
    if args.token:
        print("\n--- [4] Authenticated API Probe ---")
        auth_headers = {"Authorization": f"Bearer {args.token}"}
        status, _, body = probe_url(f"{api_url}/api/today", headers=auth_headers)
        if status == 200:
            print("  [PASS] GET /api/today with Bearer token returned 200 OK")
        else:
            print(f"  [FAIL] GET /api/today returned status {status}: {body}")
            all_ok = False

    # 5. Frontend Liveness
    if web_url:
        print("\n--- [5] Frontend Public Web Reachability ---")
        status, _, _ = probe_url(web_url)
        if status == 200:
            print(f"  [PASS] GET {web_url} returned 200 OK")
        else:
            print(f"  [FAIL] GET {web_url} returned status {status}")
            all_ok = False

    print("\n--------------------------------------------------")
    if all_ok:
        print("SMOKE TEST RESULT: PASS")
        sys.exit(0)
    else:
        print("SMOKE TEST RESULT: FAIL")
        sys.exit(1)


if __name__ == "__main__":
    main()
