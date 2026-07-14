import re
import sqlite3
import psycopg2
import psycopg2.extras
from app.core.config import settings

# Export sqlite3.Row for code using it directly, e.g., conn.row_factory = sqlite3.Row
Row = sqlite3.Row

# Simple check to see if we should use PostgreSQL
def is_postgres():
    url = settings.DATABASE_URL
    return url.startswith("postgres://") or url.startswith("postgresql://")

class PostgresCursorWrapper:
    def __init__(self, cur, conn_wrapper):
        self.cur = cur
        self.conn_wrapper = conn_wrapper
        self.lastrowid = None

    def execute(self, sql, parameters=None):
        sql_mod = sql

        # 1. Rewrite SQLite last_insert_rowid() query
        if "last_insert_rowid()" in sql_mod.lower():
            last_id = getattr(self.conn_wrapper, 'lastrowid', 0) or 0
            sql_mod = f"SELECT {last_id} AS id"
            parameters = None

        # 2. Replace SQLite ? with PostgreSQL %s
        if parameters is not None:
            sql_mod = sql_mod.replace('?', '%s')

        # 3. Replace SQLite datetime('now') with CURRENT_TIMESTAMP
        sql_mod = re.sub(r"datetime\(\s*'now'\s*\)", "CURRENT_TIMESTAMP", sql_mod, flags=re.IGNORECASE)

        # 4. Add RETURNING id on INSERT to mimic cursor.lastrowid
        is_insert = sql_mod.strip().upper().startswith("INSERT")
        if is_insert and "RETURNING" not in sql_mod.upper():
            sql_mod = sql_mod.rstrip('; \t\n') + " RETURNING id"

        try:
            self.cur.execute(sql_mod, parameters)
            if is_insert and "RETURNING" in sql_mod.upper():
                try:
                    row = self.cur.fetchone()
                    if row:
                        self.lastrowid = row[0]
                        self.conn_wrapper.lastrowid = row[0]
                except Exception:
                    pass
        except Exception as e:
            print(f"[DB COMPAT ERROR] Failed executing SQL:\n{sql_mod}\nParameters: {parameters}\nError: {e}")
            raise e
        return self

    def fetchone(self):
        row = self.cur.fetchone()
        if row is None:
            return None
        return row

    def fetchall(self):
        return self.cur.fetchall()

    def fetchmany(self, size=None):
        if size is None:
            return self.cur.fetchmany()
        return self.cur.fetchmany(size)

    @property
    def description(self):
        return self.cur.description

    def close(self):
        self.cur.close()

    def __iter__(self):
        return iter(self.cur)

class PostgresConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn
        self.row_factory = None
        self.lastrowid = None

    def cursor(self):
        # DictCursor provides name and index access (behaves like sqlite3.Row / list)
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        return PostgresCursorWrapper(cur, self)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

    def execute(self, sql, parameters=None):
        cur = self.cursor()
        cur.execute(sql, parameters)
        return cur

def connect(database, *args, **kwargs):
    if is_postgres():
        db_url = settings.DATABASE_URL
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        conn = psycopg2.connect(db_url)
        return PostgresConnectionWrapper(conn)
    else:
        # Fallback to standard SQLite
        return sqlite3.connect(database, *args, **kwargs)
