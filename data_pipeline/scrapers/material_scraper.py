import csv
import json
import os
import datetime

def scrape_construction_prices():
    """
    Scraper that reads real scraped and normalized construction material prices 
    from the target 'newdata' source and outputs them in JSON format.
    """
    # Define paths (workspace relative and absolute fallback)
    primary_path = os.path.join("data_pipeline", "newdata", "normalized_materials.csv")
    fallback_path = r"C:\Users\natta\Desktop\DW&BI03\newdata\normalized_materials.csv"
    
    csv_path = None
    if os.path.exists(primary_path):
        csv_path = primary_path
    elif os.path.exists(fallback_path):
        csv_path = fallback_path

    if not csv_path:
        print("Error: Could not find normalized_materials.csv at primary or fallback paths.")
        print(f"Checked: {primary_path}")
        print(f"Checked: {fallback_path}")
        return

    print(f"Starting parsing scraped data from: {csv_path} at {datetime.datetime.now()}")
    
    materials = []
    try:
        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Clean and parse columns
                price = 0.0
                try:
                    price = float(row.get("Price_THB", 0.0))
                except ValueError:
                    pass
                
                material = {
                    "name": row.get("Product_Name", "").strip(),
                    "brand": row.get("Brand_Name", "").strip(),
                    "model": row.get("Model_Code", "").strip(),
                    "category": row.get("Category", "").strip(),
                    "price": price,
                    "url": row.get("Product_URL", "").strip(),
                    "source": row.get("Source", "").strip(),
                    "collection_date": row.get("Collection_Date", "").strip(),
                    "normalized_category": row.get("Normalized_Category", "").strip(),
                    "unit": "หน่วย",  # Default unit
                    "region": "South"  # Default region matching schema
                }
                materials.append(material)
                
        # Save to JSON for ETL processing
        output_path = "market_prices.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(materials, f, indent=4, ensure_ascii=False)
            
        print(f"Scraping complete. Successfully processed {len(materials)} real material records.")
        print(f"Data saved to {output_path}")
        
    except Exception as e:
        print(f"An error occurred while parsing materials: {str(e)}")

if __name__ == "__main__":
    scrape_construction_prices()
