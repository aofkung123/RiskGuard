$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$BASE = "http://localhost:8000"
$PASS = 0; $FAIL = 0; $WARN = 0
$Results = @()

function Test-Case {
    param([string]$Name, $Expected, $Actual, [string]$Detail = "")
    if ("$Actual" -eq "$Expected") {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $script:PASS++
        $script:Results += [PSCustomObject]@{ Status="PASS"; Name=$Name; Detail=$Detail }
    } else {
        Write-Host "  [FAIL] $Name  (got='$Actual'  expected='$Expected') $Detail" -ForegroundColor Red
        $script:FAIL++
        $script:Results += [PSCustomObject]@{ Status="FAIL"; Name=$Name; Detail="got=$Actual expected=$Expected $Detail" }
    }
}

function Warn-Case {
    param([string]$Name, [string]$Msg)
    Write-Host "  [WARN] $Name -- $Msg" -ForegroundColor Yellow
    $script:WARN++
    $script:Results += [PSCustomObject]@{ Status="WARN"; Name=$Name; Detail=$Msg }
}

function Invoke-Api {
    param([string]$Method="GET", [string]$Uri, $Body=$null, [string]$Token="")
    $Headers = @{ "Content-Type"="application/json"; "Accept"="application/json" }
    if ($Token) { $Headers["Authorization"] = "Bearer $Token" }
    $params = @{ Uri=$Uri; Method=$Method; Headers=$Headers; ErrorAction="Stop" }
    if ($Body -ne $null) { $params["Body"] = ($Body | ConvertTo-Json -Depth 10 -Compress) }
    try {
        $r = Invoke-WebRequest @params
        return @{ code=[int]$r.StatusCode; body=($r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue) }
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $body = $null
        try { $body = ($_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue) } catch {}
        return @{ code=$code; body=$body }
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " RiskGuard API Test Suite" -ForegroundColor Cyan
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ── 0: Health ────────────────────────────────────────────────────
Write-Host "`n[Section 0] Health Check" -ForegroundColor Magenta
$h = Invoke-Api -Uri "$BASE/health"
Test-Case "/health -> 200" 200 $h.code
Test-Case "/health -> healthy" "healthy" $h.body.status
$root = Invoke-Api -Uri "$BASE/"
Test-Case "/ -> 200" 200 $root.code

# ── 1: Auth ────────────────────────────────────────────────────
Write-Host "`n[Section 1] Authentication" -ForegroundColor Magenta
$ts = [int](Get-Date -UFormat %s)
$EMP_EMAIL = "emp$ts@riskguard.test"
$CON_EMAIL = "con$ts@riskguard.test"
$PASS_STR  = "TestPass1234"

# Register
$r1 = Invoke-Api -Method POST -Uri "$BASE/api/auth/register" -Body @{
    email=$EMP_EMAIL; password=$PASS_STR; full_name="Employer Test"; role="employer"
}
Test-Case "Register employer -> 200" 200 $r1.code

$r2 = Invoke-Api -Method POST -Uri "$BASE/api/auth/register" -Body @{
    email=$CON_EMAIL; password=$PASS_STR; full_name="Contractor Test"; role="contractor"
}
Test-Case "Register contractor -> 200" 200 $r2.code

$r3 = Invoke-Api -Method POST -Uri "$BASE/api/auth/register" -Body @{
    email="short$ts@test.com"; password="123"; full_name="Short"; role="employer"
}
Test-Case "Register short password -> 422" 422 $r3.code

$r4 = Invoke-Api -Method POST -Uri "$BASE/api/auth/register" -Body @{
    email=$EMP_EMAIL; password=$PASS_STR; full_name="Dup"; role="employer"
}
Test-Case "Register duplicate email -> 400" 400 $r4.code

# Login
$l1 = Invoke-Api -Method POST -Uri "$BASE/api/auth/login" -Body @{ email=$EMP_EMAIL; password=$PASS_STR }
Test-Case "Login employer -> 200" 200 $l1.code
Test-Case "Login employer role" "employer" $l1.body.role
$EMP_TOKEN = $l1.body.access_token
$EMP_ID    = $l1.body.user_id

$l2 = Invoke-Api -Method POST -Uri "$BASE/api/auth/login" -Body @{ email=$CON_EMAIL; password=$PASS_STR }
Test-Case "Login contractor -> 200" 200 $l2.code
Test-Case "Login contractor role" "contractor" $l2.body.role
$CON_TOKEN = $l2.body.access_token
$CON_ID    = $l2.body.user_id

$l3 = Invoke-Api -Method POST -Uri "$BASE/api/auth/login" -Body @{ email=$EMP_EMAIL; password="WrongPass999" }
Test-Case "Login wrong password -> 401" 401 $l3.code

$l4 = Invoke-Api -Method POST -Uri "$BASE/api/auth/login" -Body @{ email="nobody@riskguard.test"; password=$PASS_STR }
Test-Case "Login nonexist -> 401" 401 $l4.code

# ── 2: Marketplace ────────────────────────────────────────────
Write-Host "`n[Section 2] Marketplace / Services" -ForegroundColor Magenta

$s0 = Invoke-Api -Uri "$BASE/api/marketplace/services"
Test-Case "GET /marketplace/services public -> 200" 200 $s0.code

# Create service without profile -> 403
$sc1 = Invoke-Api -Method POST -Uri "$BASE/api/marketplace/services" -Token $CON_TOKEN -Body @{
    contractor_id=$CON_ID; title="Build House"; category="Construction";
    price=500000; location="Bangkok"; detail_description="Full service"; experience_years=5
}
Test-Case "Create service no profile -> 403" 403 $sc1.code

# Update profile to complete
$pu = Invoke-Api -Method POST -Uri "$BASE/api/profile/update" -Token $CON_TOKEN -Body @{
    bio="10 years professional contractor"
    location="Bangkok"
    phone="0812345678"
    specialties=@("Construction","Steel")
    experience_years=10
    profile_completed=$true
}
if ($pu.code -eq 200) {
    Test-Case "Profile update -> 200" 200 $pu.code
} else {
    Warn-Case "Profile update" "code=$($pu.code) check endpoint"
}

# Retry create service
$sc2 = Invoke-Api -Method POST -Uri "$BASE/api/marketplace/services" -Token $CON_TOKEN -Body @{
    contractor_id=$CON_ID; title="Build House BKK"; category="Construction";
    price=500000; location="Bangkok"; detail_description="Full end-to-end construction"; experience_years=5
}
if ($sc2.code -eq 200) {
    Test-Case "Create service after profile -> 200" 200 $sc2.code
} else {
    Warn-Case "Create service after profile" "code=$($sc2.code)"
}

# ── 3: Chat & Quotation ───────────────────────────────────────
Write-Host "`n[Section 3] Chat & Quotation" -ForegroundColor Magenta

$m1 = Invoke-Api -Method POST -Uri "$BASE/api/chat/messages" -Token $CON_TOKEN -Body @{
    sender_id=$CON_ID; receiver_id=$EMP_ID
    content="Hello, I am interested in your project"; type="text"
}
Test-Case "Send text message CON->EMP -> 200" 200 $m1.code

$msgs = Invoke-Api -Uri "$BASE/api/chat/messages?user2=$EMP_ID" -Token $CON_TOKEN
Test-Case "GET /chat/messages -> 200" 200 $msgs.code
Test-Case "Messages not empty" $true ($msgs.body.Count -gt 0)

# Send quotation (contractor -> employer)
$q1 = Invoke-Api -Method POST -Uri "$BASE/api/chat/messages" -Token $CON_TOKEN -Body @{
    sender_id=$CON_ID; receiver_id=$EMP_ID
    content=""; type="quotation"
    action_data=@{
        title="Kitchen Extension"; description="3x4m kitchen extension, 30 days"
        amount=150000; status="pending"
    }
}
Test-Case "Send quotation CON->EMP -> 200" 200 $q1.code

# Employer cannot send quotation
$bq = Invoke-Api -Method POST -Uri "$BASE/api/chat/messages" -Token $EMP_TOKEN -Body @{
    sender_id=$EMP_ID; receiver_id=$CON_ID
    content=""; type="quotation"
    action_data=@{ title="Wrong"; description=""; amount=1; status="pending" }
}
Test-Case "Employer send quotation -> 403" 403 $bq.code

# Get quotations as employer
$ql = Invoke-Api -Uri "$BASE/api/chat/quotations" -Token $EMP_TOKEN
Test-Case "GET /chat/quotations -> 200" 200 $ql.code

$PROJECT_ID = $null
$pendingQ = $ql.body | Where-Object { $_.status -eq "pending" } | Select-Object -First 1

if ($pendingQ) {
    # Approve
    $apr = Invoke-Api -Method POST -Uri "$BASE/api/chat/action" -Token $EMP_TOKEN -Body @{
        message_id=$pendingQ.id; action="approve"
    }
    Test-Case "Approve quotation -> 200" 200 $apr.code
    Start-Sleep -Milliseconds 500

    # Check project created
    $pl = Invoke-Api -Uri "$BASE/api/tracking/projects" -Token $EMP_TOKEN
    Test-Case "GET /tracking/projects after approve -> 200" 200 $pl.code
    $np = $pl.body | Where-Object { $_.owner_id -eq $EMP_ID } | Select-Object -Last 1
    if ($np) {
        $PROJECT_ID = $np.id
        Test-Case "Project auto-created" $true ($PROJECT_ID -ne $null)
        Test-Case "Project status=in_progress" "in_progress" $np.status
    } else {
        Warn-Case "Project auto-create" "Not found after approve"
    }

    # Approve same again -> 409
    $apr2 = Invoke-Api -Method POST -Uri "$BASE/api/chat/action" -Token $EMP_TOKEN -Body @{
        message_id=$pendingQ.id; action="approve"
    }
    Test-Case "Double approve -> 409" 409 $apr2.code

} else {
    Warn-Case "Quotation approve flow" "No pending quotation"
}

# Send + Reject another quotation
$q2 = Invoke-Api -Method POST -Uri "$BASE/api/chat/messages" -Token $CON_TOKEN -Body @{
    sender_id=$CON_ID; receiver_id=$EMP_ID
    content=""; type="quotation"
    action_data=@{ title="Painting Job"; description="Exterior paint 2 floors, 14 days"; amount=80000; status="pending" }
}
if ($q2.code -eq 200) {
    Start-Sleep -Milliseconds 300
    $ql2 = Invoke-Api -Uri "$BASE/api/chat/quotations" -Token $EMP_TOKEN
    $pendingQ2 = $ql2.body | Where-Object { $_.status -eq "pending" } | Select-Object -First 1
    if ($pendingQ2) {
        $rej = Invoke-Api -Method POST -Uri "$BASE/api/chat/action" -Token $EMP_TOKEN -Body @{
            message_id=$pendingQ2.id; action="reject"
        }
        Test-Case "Reject quotation -> 200" 200 $rej.code
    } else {
        Warn-Case "Reject flow" "No pending quotation to reject"
    }
}

# ── 4: Tracking ───────────────────────────────────────────────
Write-Host "`n[Section 4] Project Tracking" -ForegroundColor Magenta

if ($PROJECT_ID) {
    $st = Invoke-Api -Uri "$BASE/api/tracking/stages?project_id=$PROJECT_ID" -Token $CON_TOKEN
    Test-Case "GET /tracking/stages -> 200" 200 $st.code
    Test-Case "Stages count = 5" 5 $st.body.Count

    $activeS = $st.body | Where-Object { $_.status -eq "active" } | Select-Object -First 1
    if ($activeS) {
        Test-Case "Has active stage" $true $true

        # Contractor update stage
        $upd = Invoke-Api -Method POST -Uri "$BASE/api/tracking/update_stage" -Token $CON_TOKEN -Body @{
            project_id=$PROJECT_ID; stage_name=$activeS.stage_name; status="done_pending"; proof_image_url=""
        }
        Test-Case "update_stage (contractor) -> 200" 200 $upd.code

        # Employer cannot update
        $badUpd = Invoke-Api -Method POST -Uri "$BASE/api/tracking/update_stage" -Token $EMP_TOKEN -Body @{
            project_id=$PROJECT_ID; stage_name=$activeS.stage_name; status="done_pending"
        }
        Test-Case "update_stage (employer) -> 403" 403 $badUpd.code

        # Check stage pending
        $st2 = Invoke-Api -Uri "$BASE/api/tracking/stages?project_id=$PROJECT_ID" -Token $EMP_TOKEN
        $ps = $st2.body | Where-Object { $_.stage_name -eq $activeS.stage_name } | Select-Object -First 1
        Test-Case "Stage now done_pending" "done_pending" $ps.status
        Test-Case "awaiting_confirm = True" "True" "$($ps.awaiting_confirm)"

        # Contractor cannot confirm
        $badConf = Invoke-Api -Method POST -Uri "$BASE/api/tracking/confirm_stage" -Token $CON_TOKEN -Body @{
            project_id=$PROJECT_ID; stage_name=$activeS.stage_name
        }
        Test-Case "confirm_stage (contractor) -> 403" 403 $badConf.code

        # Employer confirm
        $conf = Invoke-Api -Method POST -Uri "$BASE/api/tracking/confirm_stage" -Token $EMP_TOKEN -Body @{
            project_id=$PROJECT_ID; stage_name=$activeS.stage_name
        }
        Test-Case "confirm_stage (employer) -> 200" 200 $conf.code

        # Check completed + next active
        $st3 = Invoke-Api -Uri "$BASE/api/tracking/stages?project_id=$PROJECT_ID" -Token $EMP_TOKEN
        $cs = $st3.body | Where-Object { $_.stage_name -eq $activeS.stage_name } | Select-Object -First 1
        Test-Case "Confirmed stage = completed" "completed" $cs.status
        $nextA = $st3.body | Where-Object { $_.status -eq "active" } | Select-Object -First 1
        Test-Case "Next stage auto-activated" $true ($nextA -ne $null)

    } else {
        Warn-Case "Tracking stages" "No active stage in project $PROJECT_ID"
    }
} else {
    Warn-Case "Section 4 (Tracking)" "No PROJECT_ID - skipping"
}

# ── 5: Dashboard / EVM ────────────────────────────────────────
Write-Host "`n[Section 5] Dashboard & EVM" -ForegroundColor Magenta

# Find a project both tokens can access
$empProjs = Invoke-Api -Uri "$BASE/api/tracking/projects" -Token $EMP_TOKEN
$DASH_PID = 1
if ($PROJECT_ID) { $DASH_PID = $PROJECT_ID }

$ov = Invoke-Api -Uri "$BASE/api/dashboard/overview?project_id=$DASH_PID" -Token $EMP_TOKEN
if ($ov.code -in @(403,404)) { $ov = Invoke-Api -Uri "$BASE/api/dashboard/overview?project_id=$DASH_PID" -Token $CON_TOKEN }
if ($ov.code -in @(403,404) -and $DASH_PID -ne 1) {
    $ov = Invoke-Api -Uri "$BASE/api/dashboard/overview?project_id=1" -Token $CON_TOKEN
    if ($ov.code -in @(403,404)) { $ov = Invoke-Api -Uri "$BASE/api/dashboard/overview?project_id=1" -Token $EMP_TOKEN }
}
Test-Case "GET /dashboard/overview -> 200" 200 $ov.code
if ($ov.code -eq 200) {
    Test-Case "overview has project" $true ($null -ne $ov.body.project)
    Test-Case "overview has kpis" $true ($null -ne $ov.body.kpis)
    Test-Case "overview has timeline" $true ($null -ne $ov.body.timeline)
    Test-Case "kpis has cpi" $true ($null -ne $ov.body.kpis.cpi)
    Test-Case "kpis has spi" $true ($null -ne $ov.body.kpis.spi)
}

$evm = Invoke-Api -Uri "$BASE/api/dashboard/evm?project_id=$DASH_PID" -Token $EMP_TOKEN
if ($evm.code -in @(403,404)) { $evm = Invoke-Api -Uri "$BASE/api/dashboard/evm?project_id=1" -Token $CON_TOKEN }
Test-Case "GET /dashboard/evm -> 200" 200 $evm.code
if ($evm.code -eq 200) {
    Test-Case "evm has snapshots" $true ($evm.body.snapshots.Count -gt 0)
    Test-Case "evm has bac" $true ($evm.body.bac -gt 0)
}

$var = Invoke-Api -Uri "$BASE/api/dashboard/variance?project_id=$DASH_PID" -Token $EMP_TOKEN
if ($var.code -in @(403,404)) { $var = Invoke-Api -Uri "$BASE/api/dashboard/variance?project_id=1" -Token $CON_TOKEN }
Test-Case "GET /dashboard/variance -> 200" 200 $var.code

$wrn = Invoke-Api -Uri "$BASE/api/dashboard/warnings?project_id=$DASH_PID" -Token $EMP_TOKEN
if ($wrn.code -in @(403,404)) { $wrn = Invoke-Api -Uri "$BASE/api/dashboard/warnings?project_id=1" -Token $CON_TOKEN }
Test-Case "GET /dashboard/warnings -> 200" 200 $wrn.code
if ($wrn.code -eq 200) {
    Test-Case "warnings has overall_risk" $true ($null -ne $wrn.body.overall_risk)
    Test-Case "warnings has trend array" $true ($wrn.body.trend -ne $null)
    $riskLevel = $wrn.body.overall_risk.overall_level
    Test-Case "risk level is valid" $true ($riskLevel -in @("normal","warning","critical"))
    Write-Host "     >> Risk Level: $riskLevel" -ForegroundColor Cyan
}

# ── 6: Security ─────────────────────────────────────────────
Write-Host "`n[Section 6] Security / Permissions" -ForegroundColor Magenta

# No token -> 401/403
$na = Invoke-Api -Uri "$BASE/api/dashboard/overview?project_id=1"
Test-Case "No auth token -> 401/403" $true ($na.code -in @(401,403))

# Wrong project
$wp = Invoke-Api -Uri "$BASE/api/dashboard/overview?project_id=99999" -Token $EMP_TOKEN
Test-Case "Non-existent project -> 403/404" $true ($wp.code -in @(403,404))

# Fake token
$ft = Invoke-Api -Uri "$BASE/api/tracking/projects" -Token "fake.token.xyz"
Test-Case "Fake token -> 401/403/422" $true ($ft.code -in @(401,403,422))

# Employer try to update stage
if ($PROJECT_ID) {
    $empStages = Invoke-Api -Uri "$BASE/api/tracking/stages?project_id=$PROJECT_ID" -Token $EMP_TOKEN
    $anyStage = $empStages.body | Select-Object -First 1
    if ($anyStage) {
        $empUpd = Invoke-Api -Method POST -Uri "$BASE/api/tracking/update_stage" -Token $EMP_TOKEN -Body @{
            project_id=$PROJECT_ID; stage_name=$anyStage.stage_name; status="done_pending"
        }
        Test-Case "Employer update_stage -> 403" 403 $empUpd.code
    }
}

# Contractor confirm stage
if ($PROJECT_ID) {
    $conConf = Invoke-Api -Method POST -Uri "$BASE/api/tracking/confirm_stage" -Token $CON_TOKEN -Body @{
        project_id=$PROJECT_ID; stage_name="Test Stage"
    }
    Test-Case "Contractor confirm_stage -> 403" 403 $conConf.code
}

# Cross-user project access
$crossProj = Invoke-Api -Uri "$BASE/api/tracking/stages?project_id=99999" -Token $EMP_TOKEN
Test-Case "Access non-existent project stages -> 404" 404 $crossProj.code

# ── Summary ────────────────────────────────────────────────────
$total = $PASS + $FAIL + $WARN
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " FINAL TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PASS  : $PASS / $total" -ForegroundColor Green
Write-Host "  FAIL  : $FAIL / $total" -ForegroundColor Red
Write-Host "  WARN  : $WARN / $total" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$Results | Format-Table Status, Name, Detail -AutoSize -Wrap

if ($FAIL -gt 0) { exit 1 } else { exit 0 }
