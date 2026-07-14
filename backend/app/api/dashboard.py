"""
Dashboard API — ดึงข้อมูลจาก construction_dw.db เพื่อ Contractor BI Dashboard 4 Steps
"""
from app.core import db_compat as sqlite3
from fastapi import APIRouter, HTTPException, Query, Header
from app.core.config import settings
from app.core.security import get_current_user

router = APIRouter()

DW_DB = settings.dw_database_file_path
APP_DB = settings.database_file_path


def get_dw_conn():
    conn = sqlite3.connect(DW_DB, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def get_app_conn():
    conn = sqlite3.connect(APP_DB, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def verify_project_access(project_id: int, user: dict):
    """Verify the authenticated user has access to this project. Returns project row."""
    conn = get_app_conn()
    p = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not p:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")
    # Employer owns the project, contractor is contracted
    if p["owner_id"] != user["id"] and p["contractor_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ดูข้อมูลโครงการนี้")
    conn.close()
    return p


def get_project_data(project_id: int):
    conn = get_app_conn()
    p = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not p:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    analytics = conn.execute(
        "SELECT * FROM project_analytics WHERE project_id = ? ORDER BY date ASC",
        (project_id,),
    ).fetchall()
    conn.close()

    from datetime import datetime
    try:
        end_date = datetime.strptime(p["end_date"][:10], "%Y-%m-%d")
        days_remaining = (end_date - datetime.now()).days
        if days_remaining < 0:
            days_remaining = 0
    except Exception:
        days_remaining = 0

    bac = float(p["budget"])
    latest_ev = analytics[-1]["ev"] if analytics else 0
    percent_complete = int((latest_ev / bac) * 100) if bac > 0 else 0

    project = {
        "id": p["id"],
        "title": p["title"],
        "type": p["description"],
        "status": p["status"],
        "total_budget": bac,
        "planned_start": p["start_date"],
        "planned_end": p["end_date"],
        "percent_complete": percent_complete,
        "days_remaining": days_remaining,
    }

    snapshots = []
    for i, a in enumerate(analytics):
        snapshots.append({
            "week": f"Week {i+1}",
            "date": a["date"][:10],
            "pv": float(a["pv"]),
            "ev": float(a["ev"]),
            "ac": float(a["ac"])
        })

    return project, snapshots


def calc_evm(pv: float, ev: float, ac: float, bac: float):
    cpi  = round(ev / ac, 4)        if ac  > 0 else 0
    spi  = round(ev / pv, 4)        if pv  > 0 else 0
    cv   = round(ev - ac, 2)
    sv   = round(ev - pv, 2)
    eac  = round(bac / cpi, 2)      if cpi > 0 else bac
    vac  = round(bac - eac, 2)
    tcpi = round((bac - ev) / (bac - ac), 4) if (bac - ac) > 0 else 0
    return dict(cpi=cpi, spi=spi, cv=cv, sv=sv, eac=eac, vac=vac, tcpi=tcpi)


# ══════════════════════════════════════════════════════════════════════════════
# Step 1: Project Overview
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/overview")
def get_project_overview(project_id: int = Query(1), authorization: str = Header(None)):
    user = get_current_user(authorization)
    verify_project_access(project_id, user)
    project, snapshots = get_project_data(project_id)
    bac = project["total_budget"]
    latest = snapshots[-1] if snapshots else {"pv": 0, "ev": 0, "ac": 0}
    evm = calc_evm(latest["pv"], latest["ev"], latest["ac"], bac)

    app = get_app_conn()
    category_rows = app.execute("""
        SELECT c.name AS category,
               AVG(m.price_thb) AS avg_price,
               COUNT(m.id) AS items
        FROM material_categories c
        JOIN materials m ON m.category_id = c.id
        GROUP BY c.name
        ORDER BY items DESC
    """).fetchall()
    category_split = [
        {"category": r["category"], "avg_price": round(r["avg_price"] or 0, 2), "items": r["items"]}
        for r in category_rows
    ]

    activity_rows = app.execute("""
        SELECT stage_name, status, timestamp, awaiting_confirm
        FROM project_tracking
        WHERE project_id = ?
        ORDER BY timestamp DESC, id DESC
        LIMIT 10
    """, (project_id,)).fetchall()
    app.close()
    activities = [
        {
            "date": (r["timestamp"] or "")[:10],
            "type": "stage",
            "message": f"{r['stage_name']} - {r['status']}",
            "status": r["status"],
        }
        for r in activity_rows
    ]

    return {
        "project": project,
        "kpis": {
            "total_budget": bac,
            "actual_cost": latest["ac"],
            "percent_complete": project["percent_complete"],
            "days_remaining": project["days_remaining"],
            "eac": evm["eac"],
            "cpi": evm["cpi"],
            "spi": evm["spi"],
        },
        "timeline": [
            {"week": s["week"], "date": s["date"],
             "planned": s["pv"] / bac * 100 if bac > 0 else 0,
             "actual":  s["ev"] / bac * 100 if bac > 0 else 0}
            for s in snapshots
        ],
        "category_split": category_split,
        "activities": activities,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Step 2: EVM Metrics (CPI / SPI)
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/evm")
def get_evm_metrics(project_id: int = Query(1), authorization: str = Header(None)):
    user = get_current_user(authorization)
    verify_project_access(project_id, user)
    project, db_snapshots = get_project_data(project_id)
    bac = project["total_budget"]
    snapshots = []
    for s in db_snapshots:
        evm = calc_evm(s["pv"], s["ev"], s["ac"], bac)
        snapshots.append({
            "week": s["week"], "date": s["date"],
            "pv": s["pv"], "ev": s["ev"], "ac": s["ac"],
            **evm
        })

    latest = snapshots[-1] if snapshots else {
        "week": "-", "date": "", "pv": 0, "ev": 0, "ac": 0,
        "cpi": 0, "spi": 0, "cv": 0, "sv": 0, "eac": 0, "vac": 0, "tcpi": 0,
    }
    return {
        "project_id": project_id,
        "bac": bac,
        "latest": latest,
        "snapshots": snapshots,
        "thresholds": {"critical": 0.85, "warning": 0.95},
    }


# ══════════════════════════════════════════════════════════════════════════════
# Step 3: Variance Analysis (ข้อมูลจาก construction_dw.db จริง)
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/variance")
def get_variance_analysis(project_id: int = Query(1), authorization: str = Header(None)):
    user = get_current_user(authorization)
    verify_project_access(project_id, user)
    try:
        project, _ = get_project_data(project_id)
        app = get_app_conn()

        budget_rows = app.execute("""
            SELECT c.name AS category,
                   SUM(pmb.quantity) AS total_quantity,
                   SUM(pmb.total_cost) AS planned_cost
            FROM project_material_budgets pmb
            JOIN material_categories c ON c.id = pmb.category_id
            WHERE pmb.project_id = ?
            GROUP BY c.name
        """, (project["id"],)).fetchall()

        if not budget_rows:
            app.close()
            return {
                "project_id": project_id,
                "variance_by_category": [],
                "source_breakdown": {},
                "summary": {"total_planned": 0, "total_actual": 0, "total_variance": 0},
            }

        market_rows = app.execute("""
            SELECT c.name AS category,
                   AVG(m.price_thb) AS avg_market_price,
                   MIN(m.price_thb) AS min_price,
                   MAX(m.price_thb) AS max_price,
                   COUNT(m.id) AS items
            FROM material_categories c
            JOIN materials m ON m.category_id = c.id
            GROUP BY c.name
        """).fetchall()

        source_rows = app.execute("""
            SELECT c.name AS category, m.source, COUNT(*) AS cnt, AVG(m.price_thb) AS avg_price
            FROM materials m
            JOIN material_categories c ON c.id = m.category_id
            GROUP BY c.name, m.source
        """).fetchall()
        app.close()

        market_by_category = {r["category"]: r for r in market_rows}

        variance_data = []
        for budget in budget_rows:
            cat = budget["category"]
            market = market_by_category.get(cat)
            planned = round(budget["planned_cost"] or 0, 2)
            quantity = budget["total_quantity"] or 0
            avg_market_price = float(market["avg_market_price"]) if market and market["avg_market_price"] else 0
            actual = round(quantity * avg_market_price, 2) if quantity and avg_market_price else 0
            variance = round(actual - planned, 2) if actual else 0
            variance_pct = round(variance / planned * 100, 2) if planned > 0 else 0
            variance_data.append({
                "category": cat,
                "planned": planned,
                "actual": actual,
                "variance": variance,
                "variance_pct": variance_pct,
                "avg_market_price": round(avg_market_price, 2),
                "min_price": round(market["min_price"] or 0, 2) if market else 0,
                "max_price": round(market["max_price"] or 0, 2) if market else 0,
                "items_in_market": market["items"] if market else 0,
            })

        variance_data.sort(key=lambda x: abs(x["variance"]), reverse=True)

        sources = {}
        for r in source_rows:
            cat = r["category"]
            if cat not in sources:
                sources[cat] = []
            sources[cat].append({
                "source": r["source"],
                "count": r["cnt"],
                "avg_price": round(r["avg_price"], 2),
            })

        return {
            "project_id": project_id,
            "variance_by_category": variance_data,
            "source_breakdown": sources,
            "summary": {
                "total_planned":  sum(v["planned"]  for v in variance_data),
                "total_actual":   sum(v["actual"]   for v in variance_data),
                "total_variance": sum(v["variance"] for v in variance_data),
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# Step 4: Early Warning
# ══════════════════════════════════════════════════════════════════════════════
THRESHOLDS = {
    "cpi_critical": 0.85, "cpi_warning": 0.95,
    "spi_critical": 0.85, "spi_warning": 0.95,
    "variance_pct_critical": 20.0, "variance_pct_warning": 10.0,
    "tcpi_warning": 1.10,
}


def evaluate_risk(cpi, spi, variance_pct, tcpi) -> dict:
    alerts = []
    level = "normal"

    def add(risk_level, metric, value, threshold, message, action):
        nonlocal level
        alerts.append({
            "level": risk_level, "metric": metric, "value": value,
            "threshold": threshold, "message": message, "action": action,
        })
        if risk_level == "critical" or (risk_level == "warning" and level == "normal"):
            level = risk_level

    if cpi < THRESHOLDS["cpi_critical"]:
        add("critical", "CPI", cpi, 0.85,
            f"ดัชนีต้นทุนวิกฤต (CPI={cpi:.2f})",
            "ตรวจสอบต้นทุนจริงและประชุมด่วนทีมงาน")
    elif cpi < THRESHOLDS["cpi_warning"]:
        add("warning", "CPI", cpi, 0.95,
            f"ดัชนีต้นทุนต่ำกว่าเกณฑ์ (CPI={cpi:.2f})",
            "ทบทวนรายการวัสดุราคาสูงและเจรจาซัพพลายเออร์")

    if spi < THRESHOLDS["spi_critical"]:
        add("critical", "SPI", spi, 0.85,
            f"ดัชนีเวลาวิกฤต (SPI={spi:.2f})",
            "เพิ่มแรงงานหรือทำงานล่วงเวลาเพื่อเร่งงาน")
    elif spi < THRESHOLDS["spi_warning"]:
        add("warning", "SPI", spi, 0.95,
            f"ดัชนีเวลาต่ำกว่าเกณฑ์ (SPI={spi:.2f})",
            "ปรับลำดับความสำคัญกิจกรรมและแผนการทำงาน")

    if abs(variance_pct) > THRESHOLDS["variance_pct_critical"]:
        add("critical", "Variance", variance_pct, 20.0,
            f"ต้นทุนวัสดุเบี่ยงเบนสูงมาก ({variance_pct:.1f}%)",
            "รายงานผู้บริหารและทบทวน Scope of Work")
    elif abs(variance_pct) > THRESHOLDS["variance_pct_warning"]:
        add("warning", "Variance", variance_pct, 10.0,
            f"ต้นทุนวัสดุเริ่มเบี่ยงเบน ({variance_pct:.1f}%)",
            "ตรวจสอบหมวดวัสดุที่เกินแผน")

    if tcpi > THRESHOLDS["tcpi_warning"]:
        add("warning", "TCPI", tcpi, 1.10,
            f"ต้องเพิ่มประสิทธิภาพ {(tcpi-1)*100:.0f}%+ เพื่ออยู่ในงบ (TCPI={tcpi:.2f})",
            "วางแผนการประหยัดต้นทุนในช่วงที่เหลือ")

    return {"overall_level": level, "alerts": alerts}


@router.get("/warnings")
def get_early_warnings(project_id: int = Query(1), authorization: str = Header(None)):
    user = get_current_user(authorization)
    verify_project_access(project_id, user)
    project, db_snapshots = get_project_data(project_id)
    bac = project["total_budget"]

    trend = []
    for s in db_snapshots:
        evm = calc_evm(s["pv"], s["ev"], s["ac"], bac)
        trend.append({
            "week": s["week"], "date": s["date"],
            "cpi": evm["cpi"], "spi": evm["spi"], "tcpi": evm["tcpi"]
        })

    try:
        variance = get_variance_analysis(project_id, authorization)
        variance_rows = variance.get("variance_by_category", [])
        worst_variance_pct = max((abs(v["variance_pct"]) for v in variance_rows), default=0)
    except Exception:
        variance_rows = []
        worst_variance_pct = 0

    latest = trend[-1] if trend else {"cpi": 1, "spi": 1, "tcpi": 0}
    risk = evaluate_risk(latest["cpi"], latest["spi"], worst_variance_pct, latest["tcpi"])

    alert_log = []
    for item in trend:
        item_risk = evaluate_risk(item["cpi"], item["spi"], 0, item["tcpi"])
        for alert in item_risk["alerts"]:
            alert_log.append({
                "date": item["date"],
                "level": alert["level"],
                "metric": alert["metric"],
                "value": alert["value"],
                "message": alert["message"],
            })

    for row in variance_rows:
        row_risk = evaluate_risk(1, 1, abs(row["variance_pct"]), 0)
        for alert in row_risk["alerts"]:
            alert_log.append({
                "date": "",
                "level": alert["level"],
                "metric": alert["metric"],
                "value": alert["value"],
                "message": f"{row['category']}: {alert['message']}",
            })

    return {
        "project_id": project_id,
        "overall_risk": risk,
        "trend": trend,
        "thresholds": {"cpi_warning": 0.95, "spi_warning": 0.95},
        "alert_log": alert_log,
        "risk_matrix": [],
    }
