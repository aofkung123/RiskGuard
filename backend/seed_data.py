import sqlite3
c = sqlite3.connect('/app/riskguard.db')

print("Resetting projects and tracking data...")

c.execute("DELETE FROM project_tracking")
c.execute("DELETE FROM projects")
c.execute("DELETE FROM project_analytics")
c.execute("DELETE FROM project_material_budgets")
c.execute("DELETE FROM messages WHERE content LIKE 'quotation%'")

c.execute("""INSERT INTO projects (id, title, description, budget, start_date, end_date, status, owner_id, contractor_id)
    VALUES (1, 'โครงการต่อเติมหลังคาโรงรถ (ถ.สุขุมวิท)', 'ต่อเติมหลังคาโรงรถ หลังคาไวนิล SCG Wave', 25900, '2026-06-01', '2026-06-30', 'in_progress', 1, 4)""")

stages = [
    ('เสนอราคาและทำสัญญา', 'completed'),
    ('เริ่มงาน - สำรวจพื้นที่', 'active'),
    ('จัดหาวัสดุ', 'pending'),
    ('เริ่มก่อสร้าง', 'pending'),
    ('ตรวจรับและส่งมอบ', 'pending'),
]
for name, status in stages:
    awaiting = 1 if status == 'completed' else 0
    c.execute("INSERT INTO project_tracking (project_id, stage_name, status, awaiting_confirm) VALUES (?, ?, ?, ?)",
              (1, name, status, awaiting))

c.commit()
print(f"Projects: {c.execute('SELECT COUNT(*) FROM projects').fetchone()[0]}")
print(f"Tracking: {c.execute('SELECT COUNT(*) FROM project_tracking').fetchone()[0]}")
print("Done!")
