"""
ETL Sync — ดึงข้อมูลจาก DW&BI construction_dw.db มาลง RiskGuard riskguard.db

Source : C:\\Users\\natta\\Desktop\\DW&BI03\\construction_dw.db
Target : C:\\Users\\natta\\Desktop\\RiskGuard\\backend\\riskguard.db

Star Schema mapping:
  material_prices (DW flat table)
       → Material + MaterialCategory (RiskGuard)

ชื่อ Category mapping ที่ normalize แล้ว:
  Steel, Cement, Bricks, Wood, Stone (จาก normalized_category ใน DW)
"""
import sqlite3
import sys
import os
from datetime import datetime
from app.core.config import settings

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── Paths ──────────────────────────────────────────────────────────────────
DW_DB = settings.dw_database_file_path

# ── Category canonical mapping ───────────────────────────────────────────────
CATEGORY_MAP = [
    ("Steel",  "เหล็กและเหล็กรูปพรรณ",    "Gauge"),
    ("Cement", "ปูนซีเมนต์และวัสดุปูพื้น",  "Layers"),
    ("Bricks", "อิฐและคอนกรีตบล็อก",         "Box"),
    ("Wood",   "ไม้และวัสดุจากไม้",           "TreePine"),
    ("Stone",  "หินและวัสดุตกแต่ง",           "Mountain"),
]

# ── Helpers ─────────────────────────────────────────────────────────────────
def get_dw_conn():
    conn = sqlite3.connect(DW_DB, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def get_rg_conn(rg_path: str):
    conn = sqlite3.connect(rg_path, timeout=30.0)
    conn.execute("PRAGMA journal_mode=delete")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables(rg_conn):
    """Ensure MaterialCategory + Material tables exist (handled by SQLAlchemy, but safe to call)."""
    cur = rg_conn.cursor()
    # MaterialCategory
    cur.execute("""
        CREATE TABLE IF NOT EXISTS material_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            icon TEXT
        )
    """)
    # Material
    cur.execute("""
        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            brand_name TEXT,
            model_code TEXT,
            unit TEXT DEFAULT 'หน่วย',
            price_thb REAL NOT NULL,
            source TEXT DEFAULT 'Homepro',
            product_url TEXT,
            collection_date TEXT,
            dw_sync_key TEXT UNIQUE,
            category_id INTEGER REFERENCES material_categories(id)
        )
    """)
    # ProjectMaterialBudget
    cur.execute("""
        CREATE TABLE IF NOT EXISTS project_material_budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            material_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            quantity REAL DEFAULT 0,
            unit_price REAL NOT NULL,
            total_cost REAL NOT NULL,
            notes TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (material_id) REFERENCES materials(id),
            FOREIGN KEY (category_id) REFERENCES material_categories(id)
        )
    """)
    rg_conn.commit()


def sync_categories(rg_conn) -> dict:
    """Upsert categories from CATEGORY_MAP into RiskGuard DB."""
    cur = rg_conn.cursor()
    inserted = 0
    for name, display, icon in CATEGORY_MAP:
        cur.execute("""
            INSERT INTO material_categories (name, display_name, icon)
            VALUES (?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                display_name = excluded.display_name,
                icon = excluded.icon
        """, (name, display, icon))
        inserted += cur.rowcount
    rg_conn.commit()
    # ดึง id map กลับมา
    cur.execute("SELECT id, name FROM material_categories")
    return {row["name"]: row["id"] for row in cur.fetchall()}


def sync_materials(rg_conn, category_id_map: dict) -> int:
    """
    Upsert materials from DW into RiskGuard.
    Uses dw_sync_key (product_url) เป็น unique key.
    """
    dw = get_dw_conn()
    cur = rg_conn.cursor()

    total = 0
    for category_name, cat_id in category_id_map.items():
        rows = dw.execute("""
            SELECT
                mp.product_name,
                mp.brand_name,
                mp.model_code,
                mp.price_thb,
                mp.source,
                mp.product_url,
                mp.normalized_category,
                mp.collection_date
            FROM material_prices mp
            WHERE mp.normalized_category = ?
              AND mp.price_thb BETWEEN 50 AND 2000000
        """, (category_name,)).fetchall()

        for row in rows:
            cur.execute("""
                INSERT INTO materials (
                    product_name, brand_name, model_code, unit,
                    price_thb, source, product_url,
                    collection_date, dw_sync_key, category_id
                )
                VALUES (?, ?, ?, 'หน่วย', ?, ?, ?, ?, ?, ?)
                ON CONFLICT(dw_sync_key) DO UPDATE SET
                    price_thb    = excluded.price_thb,
                    collection_date = excluded.collection_date
            """, (
                row["product_name"],
                row["brand_name"],
                row["model_code"],
                row["price_thb"],
                row["source"],
                row["product_url"],
                row["collection_date"],
                row["product_url"],    # dw_sync_key = product_url
                cat_id,
            ))
            total += 1

    dw.close()
    rg_conn.commit()
    return total


def get_sync_summary(rg_conn) -> dict:
    """Return sync statistics."""
    cur = rg_conn.cursor()
    cat_count = cur.execute("SELECT COUNT(*) FROM material_categories").fetchone()[0]
    mat_count = cur.execute("SELECT COUNT(*) FROM materials").fetchone()[0]
    # Latest collection_date
    latest = cur.execute(
        "SELECT MAX(collection_date) FROM materials WHERE collection_date IS NOT NULL"
    ).fetchone()[0]
    return {
        "categories": cat_count,
        "materials": mat_count,
        "last_sync": latest,
        "status": "success",
    }


# ── CLI ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Default: resolve relative to project root (script is at backend/app/etl/)
    if len(sys.argv) > 1:
        RG_PATH = sys.argv[1]
    else:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        RG_PATH = os.path.join(project_root, "riskguard.db")
    print(f"[ETL] Source DW : {DW_DB}")
    print(f"[ETL] Target RG : {RG_PATH}")

    rg = get_rg_conn(RG_PATH)
    ensure_tables(rg)

    print("[ETL] Syncing categories...")
    cat_map = sync_categories(rg)
    print(f"[ETL]   -> {len(cat_map)} categories: {list(cat_map.keys())}")

    print("[ETL] Syncing materials from DW...")
    total = sync_materials(rg, cat_map)
    print(f"[ETL]   -> {total} material rows synced")

    summary = get_sync_summary(rg)
    print(f"[ETL] Done. {summary}")
    rg.close()
