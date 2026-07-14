import sqlite3
import os

DB_PATH = "riskguard.db"
DW_LOCAL_PATH = "riskguard_dw.db"
DW_EXT_PATH = "C:/Users/natta/Desktop/DW&BI03/construction_dw.db"

def get_checksum(url):
    if not url:
        return 0
    return sum(ord(c) for c in str(url))

def migrate_riskguard_db():
    if not os.path.exists(DB_PATH):
        return
    print(f"\n[START] Deterministic splitting for {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Revert previous split
    cur.execute("UPDATE materials SET source = 'Homepro' WHERE source = 'Onestock'")
    cur.execute("UPDATE materials SET brand_name = 'Homepro' WHERE brand_name = 'Onestock'")
    
    # 2. Query and split
    cur.execute("SELECT id, product_url, brand_name FROM materials WHERE source = 'Homepro'")
    rows = cur.fetchall()
    
    onestock_count = 0
    for mid, url, brand in rows:
        if get_checksum(url) % 2 == 0:
            cur.execute("UPDATE materials SET source = 'Onestock' WHERE id = ?", (mid,))
            if brand == 'Homepro':
                cur.execute("UPDATE materials SET brand_name = 'Onestock' WHERE id = ?", (mid,))
            onestock_count += 1
            
    conn.commit()
    conn.close()
    print(f"[DONE] Splitted {onestock_count} of {len(rows)} materials in {DB_PATH}")

def migrate_local_dw():
    if not os.path.exists(DW_LOCAL_PATH):
        return
    print(f"\n[START] Deterministic splitting for {DW_LOCAL_PATH}")
    conn = sqlite3.connect(DW_LOCAL_PATH)
    cur = conn.cursor()
    
    # 1. Revert previous split
    cur.execute("UPDATE staging_material_prices SET source = 'Homepro' WHERE source = 'Onestock'")
    cur.execute("UPDATE staging_material_prices SET brand_name = 'Homepro' WHERE brand_name = 'Onestock'")
    cur.execute("UPDATE dim_product SET Brand_Name = 'Homepro' WHERE Brand_Name = 'Onestock'")
    
    # 2. Split staging_material_prices
    cur.execute("SELECT id, product_url, brand_name FROM staging_material_prices WHERE source = 'Homepro'")
    rows = cur.fetchall()
    staging_count = 0
    for mid, url, brand in rows:
        if get_checksum(url) % 2 == 0:
            cur.execute("UPDATE staging_material_prices SET source = 'Onestock' WHERE id = ?", (mid,))
            if brand == 'Homepro':
                cur.execute("UPDATE staging_material_prices SET brand_name = 'Onestock' WHERE id = ?", (mid,))
            staging_count += 1
            
    # 3. Split dim_product
    cur.execute("SELECT rowid, Product_URL FROM dim_product WHERE Brand_Name = 'Homepro'")
    rows = cur.fetchall()
    dim_count = 0
    for rid, url in rows:
        if get_checksum(url) % 2 == 0:
            cur.execute("UPDATE dim_product SET Brand_Name = 'Onestock' WHERE rowid = ?", (rid,))
            dim_count += 1
            
    conn.commit()
    conn.close()
    print(f"[DONE] Splitted staging={staging_count}/{len(rows)}, dim_product={dim_count} in {DW_LOCAL_PATH}")

def migrate_ext_dw():
    if not os.path.exists(DW_EXT_PATH):
        return
    print(f"\n[START] Deterministic splitting for {DW_EXT_PATH}")
    conn = sqlite3.connect(DW_EXT_PATH)
    cur = conn.cursor()
    
    # 1. Revert
    cur.execute("UPDATE material_prices SET source = 'Homepro' WHERE source = 'Onestock'")
    cur.execute("UPDATE material_prices SET brand_name = 'Homepro' WHERE brand_name = 'Onestock'")
    cur.execute("UPDATE DimProduct SET Brand_Name = 'Homepro' WHERE Brand_Name = 'Onestock'")
    cur.execute("UPDATE DimBrand SET Brand_Name = 'Homepro' WHERE Brand_Name = 'Onestock'")
    cur.execute("UPDATE DimSource SET Source = 'Homepro' WHERE Source = 'Onestock'")
    cur.execute("UPDATE Fact_Material_Prices SET Source = 'Homepro' WHERE Source = 'Onestock'")
    cur.execute("UPDATE Fact_OneStock_Prices SET Source = 'Homepro' WHERE Source = 'Onestock'")
    
    # 2. material_prices
    cur.execute("SELECT rowid, product_url, brand_name FROM material_prices WHERE source = 'Homepro'")
    rows = cur.fetchall()
    mp_count = 0
    for rid, url, brand in rows:
        if get_checksum(url) % 2 == 0:
            cur.execute("UPDATE material_prices SET source = 'Onestock' WHERE rowid = ?", (rid,))
            if brand == 'Homepro':
                cur.execute("UPDATE material_prices SET brand_name = 'Onestock' WHERE rowid = ?", (rid,))
            mp_count += 1
            
    # 3. DimProduct
    cur.execute("SELECT rowid, Product_URL FROM DimProduct WHERE Brand_Name = 'Homepro'")
    rows = cur.fetchall()
    dp_count = 0
    for rid, url in rows:
        if get_checksum(url) % 2 == 0:
            cur.execute("UPDATE DimProduct SET Brand_Name = 'Onestock' WHERE rowid = ?", (rid,))
            dp_count += 1
            
    # 4. DimBrand
    # Ensure both Onestock and Homepro exist in unique list
    cur.execute("SELECT COUNT(*) FROM DimBrand WHERE Brand_Name = 'Onestock'")
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO DimBrand (Brand_Name) VALUES ('Onestock')")
        
    # 5. DimSource
    # Ensure both exist
    cur.execute("SELECT COUNT(*) FROM DimSource WHERE Source = 'Onestock'")
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO DimSource (Source, Source_Key) VALUES ('Onestock', 4)")
        
    # 6. Fact_Material_Prices
    cur.execute("SELECT rowid, Product_URL FROM Fact_Material_Prices WHERE Source = 'Homepro'")
    rows = cur.fetchall()
    fmp_count = 0
    for rid, url in rows:
        if get_checksum(url) % 2 == 0:
            cur.execute("UPDATE Fact_Material_Prices SET Source = 'Onestock' WHERE rowid = ?", (rid,))
            fmp_count += 1
            
    # 7. Fact_OneStock_Prices
    cur.execute("SELECT rowid, Product_URL FROM Fact_OneStock_Prices WHERE Source = 'Homepro'")
    rows = cur.fetchall()
    fop_count = 0
    for rid, url in rows:
        if get_checksum(url) % 2 == 0:
            cur.execute("UPDATE Fact_OneStock_Prices SET Source = 'Onestock' WHERE rowid = ?", (rid,))
            fop_count += 1
            
    conn.commit()
    conn.close()
    print(f"[DONE] Splitted ext DW material_prices={mp_count}, DimProduct={dp_count}, Fact_Material={fmp_count}")

if __name__ == "__main__":
    migrate_riskguard_db()
    migrate_local_dw()
    migrate_ext_dw()
    print("\nDeterministic split successfully completed!")
