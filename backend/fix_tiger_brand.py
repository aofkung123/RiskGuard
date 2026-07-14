import sqlite3
import os

DB_PATH = "riskguard.db"
DW_LOCAL_PATH = "riskguard_dw.db"
DW_EXT_PATH = "C:/Users/natta/Desktop/DW&BI03/construction_dw.db"

def fix_riskguard_db():
    if not os.path.exists(DB_PATH):
        return
    print(f"\n[START] Fixing brand names in {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Query products containing 'เสือ'
    cur.execute("SELECT id, product_name, brand_name FROM materials WHERE product_name LIKE '%เสือ%'")
    rows = cur.fetchall()
    print(f"  Found {len(rows)} products with 'เสือ' in their name")
    
    updated = 0
    for mid, name, brand in rows:
        cur.execute("UPDATE materials SET brand_name = 'เสือ' WHERE id = ?", (mid,))
        updated += 1
            
    conn.commit()
    conn.close()
    print(f"[DONE] Updated {updated} products to brand_name='เสือ' in {DB_PATH}")

def fix_local_dw():
    if not os.path.exists(DW_LOCAL_PATH):
        return
    print(f"\n[START] Fixing brand names in {DW_LOCAL_PATH}")
    conn = sqlite3.connect(DW_LOCAL_PATH)
    cur = conn.cursor()
    
    # 1. staging_material_prices
    cur.execute("SELECT id FROM staging_material_prices WHERE product_name LIKE '%เสือ%'")
    ids = [r[0] for r in cur.fetchall()]
    for mid in ids:
        cur.execute("UPDATE staging_material_prices SET brand_name = 'เสือ' WHERE id = ?", (mid,))
        
    # 2. dim_product
    cur.execute("SELECT rowid FROM dim_product WHERE Product_Name LIKE '%เสือ%'")
    rids = [r[0] for r in cur.fetchall()]
    for rid in rids:
        cur.execute("UPDATE dim_product SET Brand_Name = 'เสือ' WHERE rowid = ?", (rid,))
        
    conn.commit()
    conn.close()
    print(f"[DONE] Updated staging={len(ids)}, dim_product={len(rids)} in {DW_LOCAL_PATH}")

def fix_ext_dw():
    if not os.path.exists(DW_EXT_PATH):
        return
    print(f"\n[START] Fixing brand names in {DW_EXT_PATH}")
    conn = sqlite3.connect(DW_EXT_PATH)
    cur = conn.cursor()
    
    # 1. material_prices
    cur.execute("SELECT rowid FROM material_prices WHERE product_name LIKE '%เสือ%'")
    rids = [r[0] for r in cur.fetchall()]
    for rid in rids:
        cur.execute("UPDATE material_prices SET brand_name = 'เสือ' WHERE rowid = ?", (rid,))
        
    # 2. DimProduct
    cur.execute("SELECT rowid FROM DimProduct WHERE Product_Name LIKE '%เสือ%'")
    rids = [r[0] for r in cur.fetchall()]
    for rid in rids:
        cur.execute("UPDATE DimProduct SET Brand_Name = 'เสือ' WHERE rowid = ?", (rid,))
        
    # 3. Fact_OneStock_Prices
    cur.execute("SELECT rowid FROM Fact_OneStock_Prices WHERE Product_Name LIKE '%เสือ%'")
    rids = [r[0] for r in cur.fetchall()]
    for rid in rids:
        cur.execute("UPDATE Fact_OneStock_Prices SET Brand_Name = 'เสือ' WHERE rowid = ?", (rid,))
        
    # 4. DimBrand - Ensure 'เสือ' exists
    cur.execute("SELECT COUNT(*) FROM DimBrand WHERE Brand_Name = 'เสือ'")
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO DimBrand (Brand_Name) VALUES ('เสือ')")
        
    conn.commit()
    conn.close()
    print(f"[DONE] Updated ext DW tables (material_prices={len(rids)})")

if __name__ == "__main__":
    fix_riskguard_db()
    fix_local_dw()
    fix_ext_dw()
    print("\nTiger brand fix successfully completed!")
