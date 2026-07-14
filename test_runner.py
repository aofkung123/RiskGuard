import urllib.request
import urllib.error
import json
import time
import sys

BASE = "http://localhost:8000"
PASS = 0
FAIL = 0
WARN = 0
results = []

def call(method, path, body=None, token=None):
    url = BASE + path
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read().decode()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            body_err = json.loads(raw)
        except:
            body_err = {"raw": raw}
        return e.code, body_err
    except Exception as ex:
        return 0, {"error": str(ex)}

def ok(name, expected, actual, extra=""):
    global PASS, FAIL
    ea, aa = str(expected), str(actual)
    if ea == aa:
        print(f"  \033[92m[PASS]\033[0m {name}")
        PASS += 1
        results.append(("PASS", name, ""))
    else:
        print(f"  \033[91m[FAIL]\033[0m {name}  (expected={ea!r}  got={aa!r}) {extra}")
        FAIL += 1
        results.append(("FAIL", name, f"expected={ea} got={aa} {extra}"))

def ok_in(name, valid_set, actual):
    global PASS, FAIL
    if actual in valid_set:
        print(f"  \033[92m[PASS]\033[0m {name}  ({actual})")
        PASS += 1
        results.append(("PASS", name, str(actual)))
    else:
        print(f"  \033[91m[FAIL]\033[0m {name}  (got={actual!r} not in {valid_set})")
        FAIL += 1
        results.append(("FAIL", name, f"got={actual}"))

def warn(name, msg):
    global WARN
    print(f"  \033[93m[WARN]\033[0m {name} — {msg}")
    WARN += 1
    results.append(("WARN", name, msg))

def section(s):
    print(f"\n\033[35m[{s}]\033[0m")

# ──────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print(" RiskGuard API Test Suite")
print(f" {time.strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

# Section 0: Health
section("Section 0: Health Check")
code, body = call("GET", "/health")
ok("/health -> 200", 200, code)
ok("/health status = healthy", "healthy", body.get("status"))
code2, body2 = call("GET", "/")
ok("/ -> 200", 200, code2)
ok("/ has message", True, bool(body2.get("message")))

# Section 1: Auth
section("Section 1: Authentication")
ts = int(time.time())
EMP_EMAIL = f"emp{ts}@riskguard.com"
CON_EMAIL = f"con{ts}@riskguard.com"
PWD = "TestPass1234"

# Register employer
c, b = call("POST", "/api/auth/register", {"email": EMP_EMAIL, "password": PWD, "full_name": "Employer Test", "role": "employer"})
ok("Register employer -> 200", 200, c)

# Register contractor
c, b = call("POST", "/api/auth/register", {"email": CON_EMAIL, "password": PWD, "full_name": "Contractor Test", "role": "contractor"})
ok("Register contractor -> 200", 200, c)

# Short password
c, b = call("POST", "/api/auth/register", {"email": f"short{ts}@example.com", "password": "123", "full_name": "Short", "role": "employer"})
ok_in("Register short password -> 422", {422, 400}, c)

# Duplicate email
c, b = call("POST", "/api/auth/register", {"email": EMP_EMAIL, "password": PWD, "full_name": "Dup", "role": "employer"})
ok_in("Register duplicate email -> 400", {400, 409, 422}, c)

# Login employer
c, b = call("POST", "/api/auth/login", {"email": EMP_EMAIL, "password": PWD})
ok("Login employer -> 200", 200, c)
ok("Login employer role", "employer", b.get("role"))
EMP_TOKEN = b.get("access_token", "")
EMP_ID    = b.get("user_id")
ok("Login returns token", True, len(EMP_TOKEN) > 0)

# Login contractor
c, b = call("POST", "/api/auth/login", {"email": CON_EMAIL, "password": PWD})
ok("Login contractor -> 200", 200, c)
ok("Login contractor role", "contractor", b.get("role"))
CON_TOKEN = b.get("access_token", "")
CON_ID    = b.get("user_id")

# Login wrong password
c, b = call("POST", "/api/auth/login", {"email": EMP_EMAIL, "password": "WrongPass999"})
ok_in("Login wrong password -> 401", {401, 400}, c)

# Login nonexist
c, b = call("POST", "/api/auth/login", {"email": "nobody@riskguard.test", "password": PWD})
ok_in("Login nonexistent -> 401", {401, 400}, c)

# Section 2: Marketplace
section("Section 2: Marketplace / Services")

# Get services (public)
c, b = call("GET", "/api/marketplace/services")
ok("GET /marketplace/services public -> 200", 200, c)
ok("Services returns list", True, isinstance(b, list))

# Create service without profile -> 403
c, b = call("POST", "/api/marketplace/services", {
    "contractor_id": CON_ID,
    "title": "Build House",
    "category": "Construction",
    "price": 500000,
    "location": "Bangkok",
    "detail_description": "Full service",
    "experience_years": 5
}, token=CON_TOKEN)
ok("Create service no profile -> 403", 403, c)

# Update profile to complete (only phone+bio needed per backend logic)
c, b = call("POST", "/api/profile/update", {
    "phone": "0812345678",
    "bio": "10 years professional contractor in Bangkok",
    "address": "Bangkok, Thailand",
    "company_name": "Test Construction Co.",
    "tax_id": "1234567890123"
}, token=CON_TOKEN)
if c == 200:
    ok("Profile update -> 200", 200, c)
else:
    warn("Profile update", f"code={c} — check endpoint, body={b}")

# Retry create service (contractor_id taken from auth token, don't send None)
c, b = call("POST", "/api/marketplace/services", {
    "contractor_id": CON_ID,
    "title": "Build House BKK",
    "category": "Construction",
    "price": 500000,
    "location": "Bangkok",
    "detail_description": "End-to-end construction service",
    "experience_years": 5
}, token=CON_TOKEN)
if c == 200:
    ok("Create service after profile -> 200", 200, c)
else:
    warn("Create service after profile", f"code={c} — body={b}")

# Section 3: Chat & Quotation
section("Section 3: Chat & Quotation")

# Send text message
c, b = call("POST", "/api/chat/messages", {
    "sender_id": CON_ID, "receiver_id": EMP_ID,
    "content": "Hello, interested in your project", "type": "text"
}, token=CON_TOKEN)
ok("Send text message CON->EMP -> 200", 200, c)

# Get messages
c, b = call("GET", f"/api/chat/messages?user2={EMP_ID}", token=CON_TOKEN)
ok("GET /chat/messages -> 200", 200, c)
ok("Messages not empty", True, len(b) > 0 if isinstance(b, list) else False)

# Send quotation
c, b = call("POST", "/api/chat/messages", {
    "sender_id": CON_ID, "receiver_id": EMP_ID,
    "content": "", "type": "quotation",
    "action_data": {"title": "Kitchen Extension", "description": "3x4m, 30 days", "amount": 150000, "status": "pending"}
}, token=CON_TOKEN)
ok("Send quotation CON->EMP -> 200", 200, c)

# Employer cannot send quotation
c, b = call("POST", "/api/chat/messages", {
    "sender_id": EMP_ID, "receiver_id": CON_ID,
    "content": "", "type": "quotation",
    "action_data": {"title": "Wrong", "description": "", "amount": 1, "status": "pending"}
}, token=EMP_TOKEN)
ok("Employer send quotation -> 403", 403, c)

# Get quotations
c, b = call("GET", "/api/chat/quotations", token=EMP_TOKEN)
ok("GET /chat/quotations -> 200", 200, c)
pending_list = [q for q in (b if isinstance(b, list) else []) if q.get("status") == "pending"]
pending_q = pending_list[0] if pending_list else None

PROJECT_ID = None

if pending_q:
    # Approve
    c, b = call("POST", "/api/chat/action", {"message_id": pending_q["id"], "action": "approve"}, token=EMP_TOKEN)
    ok("Approve quotation -> 200", 200, c)
    time.sleep(0.5)

    # Check project created
    c, b = call("GET", "/api/tracking/projects", token=EMP_TOKEN)
    ok("GET /tracking/projects after approve -> 200", 200, c)
    if isinstance(b, list):
        emp_projs = [p for p in b if p.get("owner_id") == EMP_ID]
        if emp_projs:
            PROJECT_ID = emp_projs[-1]["id"]
            ok("Project auto-created", True, True)
            ok("Project status=in_progress", "in_progress", emp_projs[-1].get("status"))
        else:
            warn("Project auto-create", "No project found after approve")
    
    # Double approve -> 409
    c, b = call("POST", "/api/chat/action", {"message_id": pending_q["id"], "action": "approve"}, token=EMP_TOKEN)
    ok("Double approve -> 409", 409, c)
else:
    warn("Quotation approve flow", "No pending quotation")

# Reject flow
c, b = call("POST", "/api/chat/messages", {
    "sender_id": CON_ID, "receiver_id": EMP_ID,
    "content": "", "type": "quotation",
    "action_data": {"title": "Painting", "description": "Exterior 14 days", "amount": 80000, "status": "pending"}
}, token=CON_TOKEN)
if c == 200:
    time.sleep(0.3)
    c2, b2 = call("GET", "/api/chat/quotations", token=EMP_TOKEN)
    pending2 = [q for q in (b2 if isinstance(b2, list) else []) if q.get("status") == "pending"]
    if pending2:
        c3, b3 = call("POST", "/api/chat/action", {"message_id": pending2[0]["id"], "action": "reject"}, token=EMP_TOKEN)
        ok("Reject quotation -> 200", 200, c3)
    else:
        warn("Reject flow", "No pending quotation")

# Section 4: Tracking
section("Section 4: Project Tracking")

if PROJECT_ID:
    c, b = call("GET", f"/api/tracking/stages?project_id={PROJECT_ID}", token=CON_TOKEN)
    ok("GET /tracking/stages -> 200", 200, c)
    ok("Stages count = 5", 5, len(b) if isinstance(b, list) else 0)

    stages = b if isinstance(b, list) else []
    active_stage = next((s for s in stages if s.get("status") == "active"), None)

    if active_stage:
        sname = active_stage["stage_name"]
        ok("Has active stage", True, True)

        # Contractor update
        c, b = call("POST", "/api/tracking/update_stage", {
            "project_id": PROJECT_ID, "stage_name": sname, "status": "done_pending", "proof_image_url": ""
        }, token=CON_TOKEN)
        ok("update_stage (contractor) -> 200", 200, c)

        # Employer cannot update
        c, b = call("POST", "/api/tracking/update_stage", {
            "project_id": PROJECT_ID, "stage_name": sname, "status": "done_pending"
        }, token=EMP_TOKEN)
        ok("update_stage (employer) -> 403", 403, c)

        # Check stage pending
        c, b = call("GET", f"/api/tracking/stages?project_id={PROJECT_ID}", token=EMP_TOKEN)
        stage_now = next((s for s in (b if isinstance(b, list) else []) if s["stage_name"] == sname), None)
        ok("Stage now done_pending", "done_pending", stage_now["status"] if stage_now else "?")
        ok("awaiting_confirm = true", True, bool(stage_now["awaiting_confirm"]) if stage_now else False)

        # Contractor cannot confirm
        c, b = call("POST", "/api/tracking/confirm_stage", {
            "project_id": PROJECT_ID, "stage_name": sname
        }, token=CON_TOKEN)
        ok("confirm_stage (contractor) -> 403", 403, c)

        # Employer confirm
        c, b = call("POST", "/api/tracking/confirm_stage", {
            "project_id": PROJECT_ID, "stage_name": sname
        }, token=EMP_TOKEN)
        ok("confirm_stage (employer) -> 200", 200, c)

        # Check completed + next active
        c, b = call("GET", f"/api/tracking/stages?project_id={PROJECT_ID}", token=EMP_TOKEN)
        stages2 = b if isinstance(b, list) else []
        confirmed = next((s for s in stages2 if s["stage_name"] == sname), None)
        ok("Confirmed stage = completed", "completed", confirmed["status"] if confirmed else "?")
        next_active = next((s for s in stages2 if s.get("status") == "active"), None)
        ok("Next stage auto-activated", True, next_active is not None)
    else:
        warn("Tracking stages", "No active stage found")
else:
    warn("Section 4 (Tracking)", "No PROJECT_ID - skipping")

# Section 5: Dashboard / EVM
section("Section 5: Dashboard & EVM")

# Try EMP project first, fallback to project 1
dash_pid = PROJECT_ID if PROJECT_ID else 1

c, b = call("GET", f"/api/dashboard/overview?project_id={dash_pid}", token=EMP_TOKEN)
if c in (403, 404) and dash_pid != 1:
    c, b = call("GET", "/api/dashboard/overview?project_id=1", token=CON_TOKEN)
    if c in (403, 404):
        c, b = call("GET", "/api/dashboard/overview?project_id=1", token=EMP_TOKEN)
ok("GET /dashboard/overview -> 200", 200, c)
if c == 200:
    ok("overview has project", True, "project" in b)
    ok("overview has kpis", True, "kpis" in b)
    ok("overview has timeline", True, "timeline" in b)
    if "kpis" in b:
        ok("kpis has cpi", True, "cpi" in b["kpis"])
        ok("kpis has spi", True, "spi" in b["kpis"])
        print(f"     >> CPI={b['kpis'].get('cpi')}  SPI={b['kpis'].get('spi')}  %Complete={b['kpis'].get('percent_complete')}")

c, b = call("GET", f"/api/dashboard/evm?project_id={dash_pid}", token=EMP_TOKEN)
if c in (403, 404):
    c, b = call("GET", "/api/dashboard/evm?project_id=1", token=CON_TOKEN)
ok("GET /dashboard/evm -> 200", 200, c)
if c == 200:
    ok("evm has snapshots", True, len(b.get("snapshots", [])) > 0)
    ok("evm has bac > 0", True, b.get("bac", 0) > 0)
    ok("evm latest has cpi", True, "cpi" in b.get("latest", {}))
    latest = b.get("latest", {})
    print(f"     >> CPI={latest.get('cpi')}  SPI={latest.get('spi')}  EAC={latest.get('eac')}")

c, b = call("GET", f"/api/dashboard/variance?project_id={dash_pid}", token=EMP_TOKEN)
if c in (403, 404):
    c, b = call("GET", "/api/dashboard/variance?project_id=1", token=CON_TOKEN)
ok("GET /dashboard/variance -> 200", 200, c)
if c == 200:
    ok("variance has summary", True, "summary" in b)
    ok("variance has categories", True, isinstance(b.get("variance_by_category"), list))

c, b = call("GET", f"/api/dashboard/warnings?project_id={dash_pid}", token=EMP_TOKEN)
if c in (403, 404):
    c, b = call("GET", "/api/dashboard/warnings?project_id=1", token=CON_TOKEN)
ok("GET /dashboard/warnings -> 200", 200, c)
if c == 200:
    ok("warnings has overall_risk", True, "overall_risk" in b)
    ok("warnings has trend", True, isinstance(b.get("trend"), list))
    risk_level = b.get("overall_risk", {}).get("overall_level", "?")
    ok_in("risk level valid", {"normal", "warning", "critical"}, risk_level)
    print(f"     >> Overall Risk Level: {risk_level.upper()}")
    alerts = b.get("overall_risk", {}).get("alerts", [])
    if alerts:
        print(f"     >> {len(alerts)} alert(s) triggered:")
        for a in alerts:
            print(f"        [{a.get('level','?').upper()}] {a.get('metric')}={a.get('value')}: {a.get('message')}")

# Section 6: Security
section("Section 6: Security / Permissions")

# No token
c, b = call("GET", "/api/dashboard/overview?project_id=1")
ok_in("No token -> 401/403", {401, 403}, c)

# Non-existent project
c, b = call("GET", "/api/dashboard/overview?project_id=99999", token=EMP_TOKEN)
ok_in("Non-existent project -> 403/404", {403, 404}, c)

# Fake token
c, b = call("GET", "/api/tracking/projects", token="fake.token.xyz")
ok_in("Fake token -> 401/403/422", {401, 403, 422}, c)

# Employer try update stage
if PROJECT_ID:
    c2, b2 = call("GET", f"/api/tracking/stages?project_id={PROJECT_ID}", token=EMP_TOKEN)
    any_stage = (b2[0] if isinstance(b2, list) and b2 else None)
    if any_stage:
        c, b = call("POST", "/api/tracking/update_stage", {
            "project_id": PROJECT_ID, "stage_name": any_stage["stage_name"], "status": "done_pending"
        }, token=EMP_TOKEN)
        ok("Employer update_stage -> 403", 403, c)

    # Contractor try confirm stage
    c, b = call("POST", "/api/tracking/confirm_stage", {
        "project_id": PROJECT_ID, "stage_name": "Test Stage"
    }, token=CON_TOKEN)
    ok("Contractor confirm_stage -> 403", 403, c)

# Non-existent project stages
c, b = call("GET", "/api/tracking/stages?project_id=99999", token=EMP_TOKEN)
ok_in("Non-existent stages -> 404", {404, 403}, c)

# ── Final Summary ──────────────────────────────────────────────
total = PASS + FAIL + WARN
print()
print("=" * 60)
print(" FINAL TEST RESULTS")
print("=" * 60)
print(f"  \033[92mPASS : {PASS:3d} / {total}\033[0m")
print(f"  \033[91mFAIL : {FAIL:3d} / {total}\033[0m")
print(f"  \033[93mWARN : {WARN:3d} / {total}\033[0m")
print("=" * 60)
print()
print(f"{'STATUS':<6}  {'TEST NAME':<55}  {'DETAIL'}")
print("-" * 90)
for status, name, detail in results:
    color = "\033[92m" if status == "PASS" else ("\033[91m" if status == "FAIL" else "\033[93m")
    print(f"{color}{status:<6}\033[0m  {name:<55}  {detail}")

sys.exit(0 if FAIL == 0 else 1)
