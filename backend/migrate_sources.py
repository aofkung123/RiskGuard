import sqlite3
import os

DB_PATH = "riskguard.db"
DW_LOCAL_PATH = "riskguard_dw.db"
DW_EXT_PATH = "C:/Users/natta/Desktop/DW&BI03/construction_dw.db"

MAPPING = {
    "OneStockHome": "Homepro",
    "Global House": "Dohome",
    "Legacy_DB": "ThaiWatsadu"
}

def migrate_db(db_path):
    if not os.path.exists(db_path):
        print(f"[SKIP] Database not found at {db_path}")
        return

    print(f"\n[START] Migrating database: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Get all tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall() if not r[0].startswith("sqlite_")]

    for table in tables:
        # Get table columns
        cur.execute(f"PRAGMA table_info({table})")
        cols = [r[1] for r in cur.fetchall()]
        
        # Check columns of interest
        for col in cols:
            # Let's perform case-sensitive exact updates for each mapping
            for old_val, new_val in MAPPING.items():
                try:
                    # Update source and brand columns
                    cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {col} = ?", (old_val,))
                    count = cur.fetchone()[0]
                    if count > 0:
                        cur.execute(f"UPDATE {table} SET {col} = ? WHERE {col} = ?", (new_val, old_val))
                        conn.commit()
                        print(f"  [{table}.{col}] Updated {count} rows: '{old_val}' -> '{new_val}'")
                except Exception as e:
                    # Column might not support text query or is a different type
                    pass

    conn.close()
    print(f"[DONE] Migration completed for: {db_path}")

if __name__ == "__main__":
    print("Starting source migration to Homepro, Dohome, and ThaiWatsadu...")
    migrate_db(DB_PATH)
    migrate_db(DW_LOCAL_PATH)
    migrate_db(DW_EXT_PATH)
    print("\nAll database migrations finished successfully.")
