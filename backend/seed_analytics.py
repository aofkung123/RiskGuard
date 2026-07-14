import sqlite3
import datetime

DB_PATH = "riskguard.db"

def seed_analytics():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Clear existing analytics
    cur.execute("DELETE FROM project_analytics")
    
    # 2. Define 4 weeks of realistic data for project_id = 1 (Budget = 25900)
    # Week 1
    w1_date = "2026-06-05 12:00:00"
    pv1, ev1, ac1 = 5000.0, 5200.0, 4800.0
    cpi1, spi1 = round(ev1 / ac1, 4), round(ev1 / pv1, 4)
    cur.execute("""
        INSERT INTO project_analytics (project_id, date, cpi, spi, ev, ac, pv)
        VALUES (1, ?, ?, ?, ?, ?, ?)
    """, (w1_date, cpi1, spi1, ev1, ac1, pv1))
    
    # Week 2
    w2_date = "2026-06-12 12:00:00"
    pv2, ev2, ac2 = 10000.0, 9800.0, 9200.0
    cpi2, spi2 = round(ev2 / ac2, 4), round(ev2 / pv2, 4)
    cur.execute("""
        INSERT INTO project_analytics (project_id, date, cpi, spi, ev, ac, pv)
        VALUES (1, ?, ?, ?, ?, ?, ?)
    """, (w2_date, cpi2, spi2, ev2, ac2, pv2))
    
    # Week 3
    w3_date = "2026-06-19 12:00:00"
    pv3, ev3, ac3 = 15000.0, 14800.0, 14500.0
    cpi3, spi3 = round(ev3 / ac3, 4), round(ev3 / pv3, 4)
    cur.execute("""
        INSERT INTO project_analytics (project_id, date, cpi, spi, ev, ac, pv)
        VALUES (1, ?, ?, ?, ?, ?, ?)
    """, (w3_date, cpi3, spi3, ev3, ac3, pv3))
    
    # Week 4 (Latest snapshot)
    w4_date = "2026-06-26 12:00:00"
    pv4, ev4, ac4 = 20000.0, 21000.0, 20500.0
    cpi4, spi4 = round(ev4 / ac4, 4), round(ev4 / pv4, 4)
    cur.execute("""
        INSERT INTO project_analytics (project_id, date, cpi, spi, ev, ac, pv)
        VALUES (1, ?, ?, ?, ?, ?, ?)
    """, (w4_date, cpi4, spi4, ev4, ac4, pv4))
    
    conn.commit()
    conn.close()
    print("Successfully seeded 4 weeks of EVM snapshot data for Project ID = 1!")

if __name__ == "__main__":
    seed_analytics()
