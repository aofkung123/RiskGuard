import sqlite3
import os

DB_PATH = "riskguard.db"
DW_LOCAL_PATH = "riskguard_dw.db"
DW_EXT_PATH = "C:/Users/natta/Desktop/DW&BI03/construction_dw.db"

def split_riskguard_db():
    if not os.path.exists(DB_PATH):
        print(f"[SKIP] {DB_PATH} not found")
        return
    print(f"\n[START] Splitting {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Split materials source
    cur.execute("SELECT id FROM materials WHERE source = 'Homepro'")
    ids = [r[0] for r in cur.fetchall()]
    print(f"  Found {len(ids)} materials with source='Homepro'")
    
    onestock_count = 0
    for idx, mid in enumerate(ids):
        if idx % 2 == 0:
            cur.execute("UPDATE materials SET source = 'Onestock' WHERE id = ?", (mid,))
            # If the brand was Homepro, change it to Onestock too
            cur.execute("UPDATE materials SET brand_name = 'Onestock' WHERE id = ? AND brand_name = 'Homepro'", (mid,))
            onestock_count += 1
            
    conn.commit()
    conn.close()
    print(f"[DONE] Splitted {onestock_count} materials to 'Onestock' in {DB_PATH}")

def split_local_dw():
    if not os.path.exists(DW_LOCAL_PATH):
        print(f"[SKIP] {DW_LOCAL_PATH} not found")
        return
    print(f"\n[START] Splitting {DW_LOCAL_PATH}")
    conn = sqlite3.connect(DW_LOCAL_PATH)
    cur = conn.cursor()
    
    # Split staging_material_prices
    cur.execute("SELECT id FROM staging_material_prices WHERE source = 'Homepro'")
    ids = [r[0] for r in cur.fetchall()]
    onestock_count = 0
    for idx, mid in enumerate(ids):
        if idx % 2 == 0:
            cur.execute("UPDATE staging_material_prices SET source = 'Onestock' WHERE id = ?", (mid,))
            cur.execute("UPDATE staging_material_prices SET brand_name = 'Onestock' WHERE id = ? AND brand_name = 'Homepro'", (mid,))
            onestock_count += 1
            
    # Split dim_product
    cur.execute("SELECT rowid FROM dim_product WHERE Brand_Name = 'Homepro'")
    rids = [r[0] for r in cur.fetchall()]
    dim_count = 0
    for idx, rid in enumerate(rids):
        if idx % 2 == 0:
            cur.execute("UPDATE dim_product SET Brand_Name = 'Onestock' WHERE rowid = ?", (rid,))
            dim_count += 1
            
    conn.commit()
    conn.close()
    print(f"[DONE] Splitted staging={onestock_count}, dim_product={dim_count} in {DW_LOCAL_PATH}")

def split_ext_dw():
    if not os.path.exists(DW_EXT_PATH):
        print(f"[SKIP] {DW_EXT_PATH} not found")
        return
    print(f"\n[START] Splitting {DW_EXT_PATH}")
    conn = sqlite3.connect(DW_EXT_PATH)
    cur = conn.cursor()
    
    # material_prices
    cur.execute("SELECT rowid FROM material_prices WHERE source = 'Homepro'")
    rids = [r[0] for r in cur.fetchall()]
    mp_count = 0
    for idx, rid in enumerate(rids):
        if idx % 2 == 0:
            cur.execute("UPDATE material_prices SET source = 'Onestock' WHERE rowid = ?", (rid,))
            cur.execute("UPDATE material_prices SET brand_name = 'Onestock' WHERE rowid = ? AND brand_name = 'Homepro'", (rid,))
            mp_count += 1
            
    # DimProduct
    cur.execute("SELECT rowid FROM DimProduct WHERE Brand_Name = 'Homepro'")
    rids = [r[0] for r in cur.fetchall()]
    dp_count = 0
    for idx, rid in enumerate(rids):
        if idx % 2 == 0:
            cur.execute("UPDATE DimProduct SET Brand_Name = 'Onestock' WHERE rowid = ?", (rid,))
            dp_count += 1
            
    # DimBrand
    cur.execute("SELECT rowid FROM DimBrand WHERE Brand_Name = 'Homepro'")
    rids = [r[0] for r in cur.fetchall()]
    db_count = 0
    for idx, rid in enumerate(rids):
        if idx % 2 == 0:
            cur.execute("UPDATE DimBrand SET Brand_Name = 'Onestock' WHERE rowid = ?", (rid,))
            db_count += 1
            
    # DimSource
    cur.execute("SELECT rowid FROM DimSource WHERE Source = 'Homepro'")
    rids = [r[0] for r in cur.fetchall()]
    ds_count = 0
    for idx, rid in enumerate(rids):
        if idx % 2 == 0:
            cur.execute("UPDATE DimSource SET Source = 'Onestock' WHERE rowid = ?", (rid,))
            ds_count += 1
            
    # Fact_Material_Prices
    cur.execute("SELECT rowid FROM Fact_Material_Prices WHERE Source = 'Homepro'")
    rids = [r[0] for r in cur.fetchall()]
    fmp_count = 0
    for idx, rid in enumerate(rids):
        if idx % 2 == 0:
            cur.execute("UPDATE Fact_Material_Prices SET Source = 'Onestock' WHERE rowid = ?", (rid,))
            fmp_count += 1
            
    # Fact_OneStock_Prices
    cur.execute("SELECT rowid FROM Fact_OneStock_Prices WHERE Source = 'Homepro'")
    rids = [r[0] for r in cur.fetchall()]
    fop_count = 0
    for idx, rid in enumerate(rids):
        if idx % 2 == 0:
            cur.execute("UPDATE Fact_OneStock_Prices SET Source = 'Onestock' WHERE rowid = ?", (rid,))
            fop_count += 1
            
    conn.commit()
    conn.close()
    print(f"[DONE] Splitted ext DW tables (material_prices={mp_count}, DimProduct={dp_count}, DimBrand={db_count}, DimSource={ds_count})")

if __name__ == "__main__":
    split_riskguard_db()
    split_local_dw()
    split_ext_dw()
    print("\nSource splitting successfully finished!")
