"""
Database Backup to Supabase SQL Import Generator
Konvertálja a JSON backup fájlokat SQL INSERT utasításokká
"""

import json
import os
from pathlib import Path
from datetime import datetime

def escape_sql_value(value):
    """Biztonságosan escape-eli az SQL értékeket"""
    if value is None:
        return 'NULL'
    elif isinstance(value, bool):
        return 'true' if value else 'false'
    elif isinstance(value, (int, float)):
        return str(value)
    elif isinstance(value, str):
        # Escape single quotes
        escaped = value.replace("'", "''")
        return f"'{escaped}'"
    else:
        # JSON objektum vagy tömb
        escaped = json.dumps(value).replace("'", "''")
        return f"'{escaped}'"

def generate_insert_statements(table_name, data):
    """Generál INSERT utasításokat egy táblához"""
    if not data or len(data) == 0:
        return f"-- Nincs adat a '{table_name}' táblához\n\n"
    
    sql_statements = []
    sql_statements.append(f"-- Adatok importálása: {table_name}")
    sql_statements.append(f"-- Rekordok száma: {len(data)}\n")
    
    # Oszlopnevek az első rekordból
    columns = list(data[0].keys())
    columns_str = ', '.join(columns)
    
    # INSERT utasítások generálása
    for record in data:
        values = []
        for col in columns:
            values.append(escape_sql_value(record.get(col)))
        
        values_str = ', '.join(values)
        sql_statements.append(
            f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});"
        )
    
    sql_statements.append("")  # Üres sor a végén
    return '\n'.join(sql_statements)

def main():
    # Backup mappa útvonala
    backup_dir = Path(__file__).parent.parent / 'database-backup'
    output_file = Path(__file__).parent / 'supabase-import.sql'
    
    print(f"📁 Backup mappa: {backup_dir}")
    print(f"📝 Output fájl: {output_file}")
    
    # SQL fájl kezdete
    sql_content = []
    sql_content.append("-- ================================================")
    sql_content.append("-- Database Backup Import - Supabase SQL")
    sql_content.append(f"-- Generálva: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sql_content.append("-- ================================================")
    sql_content.append("")
    sql_content.append("-- FONTOS: Futtasd ezt a szkriptet a Supabase SQL Editor-ban!")
    sql_content.append("-- Ha már léteznek adatok, ezt a szkriptet futtatás előtt módosítsd:")
    sql_content.append("-- - Használj UPSERT-et (ON CONFLICT ... DO UPDATE SET)")
    sql_content.append("-- - Vagy töröld az ütköző rekordokat")
    sql_content.append("")
    sql_content.append("BEGIN;")
    sql_content.append("")
    
    # JSON fájlok feldolgozása
    json_files = sorted(backup_dir.glob('*.json'))
    
    if not json_files:
        print("❌ Nem találhatók JSON fájlok a backup mappában!")
        return
    
    print(f"\n🔍 Talált fájlok: {len(json_files)}")
    
    for json_file in json_files:
        table_name = json_file.stem  # Fájlnév kiterjesztés nélkül
        print(f"  ⚙️  Feldolgozás: {table_name}.json")
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # INSERT utasítások generálása
            insert_sql = generate_insert_statements(table_name, data)
            sql_content.append(insert_sql)
            
            print(f"     ✅ {len(data)} rekord")
            
        except Exception as e:
            print(f"     ❌ Hiba: {e}")
            sql_content.append(f"-- HIBA: {table_name} - {str(e)}\n")
    
    # SQL fájl vége
    sql_content.append("")
    sql_content.append("COMMIT;")
    sql_content.append("")
    sql_content.append("-- ================================================")
    sql_content.append("-- Import befejezve!")
    sql_content.append("-- ================================================")
    
    # Fájl írása
    output_file.parent.mkdir(exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_content))
    
    print(f"\n✅ SQL fájl sikeresen generálva!")
    print(f"📄 Fájl helye: {output_file}")
    print(f"\n📋 Következő lépések:")
    print(f"   1. Nyisd meg a Supabase Dashboard-ot")
    print(f"   2. Menj a SQL Editor-ba")
    print(f"   3. Másold be a {output_file.name} tartalmát")
    print(f"   4. Futtasd a szkriptet")

if __name__ == "__main__":
    main()
