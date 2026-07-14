import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import DictCursor

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import engine
from app.models.models import Base

# Topological order to respect foreign key constraints
TABLES_TO_MIGRATE = [
    "users",
    "user_profiles",
    "portfolios",
    "projects",
    "project_analytics",
    "material_categories",
    "materials",
    "project_material_budgets",
    "quotations",
    "project_tracking",
    "messages"
]

def migrate():
    # 1. Connect to SQLite
    sqlite_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "riskguard.db")
    if not os.path.exists(sqlite_db_path):
        print(f"[-] SQLite database not found at {sqlite_db_path}")
        return
    
    print(f"[+] Connecting to SQLite: {sqlite_db_path}")
    lite_conn = sqlite3.connect(sqlite_db_path)
    lite_conn.row_factory = sqlite3.Row
    lite_cur = lite_conn.cursor()

    # 2. Connect to PostgreSQL
    pg_url = settings.DATABASE_URL
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)
    
    if not (pg_url.startswith("postgresql://") or pg_url.startswith("postgresql+psycopg2://")):
        print(f"[-] Invalid DATABASE_URL for PostgreSQL migration: {pg_url}")
        print("Please set the DATABASE_URL environment variable to your Supabase PostgreSQL connection string.")
        return

    print(f"[+] Connecting to PostgreSQL (Supabase)")
    pg_conn = psycopg2.connect(pg_url)
    pg_cur = pg_conn.cursor()

    # 3. Create tables in PostgreSQL via SQLAlchemy
    print("[+] Creating database schema in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    pg_conn.commit()

    try:
        # 4. Migrate tables in order
        for table in TABLES_TO_MIGRATE:
            print(f"[~] Migrating table: {table}")
            
            # Fetch all rows from SQLite
            lite_cur.execute(f"SELECT * FROM {table}")
            rows = lite_cur.fetchall()
            
            if not rows:
                print(f"    - Table {table} is empty. Skipping.")
                continue

            # Clear existing data in PostgreSQL
            pg_cur.execute(f"TRUNCATE TABLE {table} CASCADE")
            
            # Get columns from the first row
            columns = list(rows[0].keys())
            col_list = ", ".join(columns)
            val_placeholders = ", ".join(["%s"] * len(columns))
            
            insert_query = f"INSERT INTO {table} ({col_list}) VALUES ({val_placeholders})"
            
            # Insert each row into PostgreSQL
            for row in rows:
                values = [row[col] for col in columns]
                # Convert boolean/integer flags if needed
                pg_cur.execute(insert_query, values)
            
            print(f"    - Successfully migrated {len(rows)} rows.")

        pg_conn.commit()
        print("[+] All data migrated successfully!")

        # 5. Reset PostgreSQL auto-increment sequences
        print("[+] Resetting auto-increment sequences...")
        for table in TABLES_TO_MIGRATE:
            # check if table has an 'id' column before resetting
            pg_cur.execute(f"""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='{table}' AND column_name='id'
                )
            """)
            has_id = pg_cur.fetchone()[0]
            if has_id:
                try:
                    pg_cur.execute(f"""
                        SELECT setval(
                            pg_get_serial_sequence('{table}', 'id'), 
                            COALESCE(MAX(id), 1)
                        ) FROM {table}
                    """)
                    new_val = pg_cur.fetchone()[0]
                    print(f"    - Reset sequence for table '{table}' to {new_val}")
                except Exception as e:
                    # Ignore table without serial sequence
                    pg_conn.rollback()
                    # print(f"    - Skipped sequence reset for table '{table}' (no sequence found)")
            else:
                print(f"    - Table '{table}' has no 'id' column. Skipping sequence reset.")
        
        pg_conn.commit()
        print("[+] Sequences reset successfully!")

    except Exception as e:
        pg_conn.rollback()
        print(f"[-] Migration failed: {e}")
    finally:
        lite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    # Check if a custom connection string was provided as an argument
    if len(sys.argv) > 1:
        os.environ["DATABASE_URL"] = sys.argv[1]
        # Re-import settings to pick up new env variable
        import importlib
        import app.core.config
        importlib.reload(app.core.config)
        
    migrate()
