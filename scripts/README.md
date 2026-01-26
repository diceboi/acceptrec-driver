# Database Backup Import Scripts

## Használat

### 1. SQL Generálás

A `generate-sql.js` szkript konvertálja a `database-backup` mappában található JSON fájlokat SQL INSERT utasításokká.

```bash
node scripts/generate-sql.js
```

Ez létrehoz egy `scripts/supabase-import.sql` fájlt, amit Supabase-be importálhatsz.

**Fontos:** A szkript automatikusan kezeli:
- ✅ **Foreign key függőségek** - A táblák a helyes sorrendben kerülnek generálásra
- ✅ **JSON adatok** - Az objektumok helyesen szerializálódnak JSON formátumba
- ✅ **SQL injection védelem** - Minden érték biztonságosan escape-elődik

### 2. Import Supabase-be

1. **Nyisd meg a Supabase Dashboard-ot**
   - Menj a projektedhez: https://app.supabase.com

2. **SQL Editor**
   - Bal oldali menüben kattints a "SQL Editor"-ra
   - Kattints "New Query"-re

3. **Futtasd a szkriptet**
   - Nyisd meg a `scripts/supabase-import.sql` fájlt
   - Másold be a teljes tartalmat az SQL Editor-ba
   - Kattints a "Run" gombra

### 3. Ellenőrzés

Ellenőrizd hogy az adatok sikeresen importálódtak:

```sql
-- Táblák rekordszámának ellenőrzése
SELECT 
  'users' as tabla, COUNT(*) as rekord_szam FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'timesheets', COUNT(*) FROM timesheets
UNION ALL
SELECT 'approval_batches', COUNT(*) FROM approval_batches
UNION ALL
SELECT 'approval_audit_log', COUNT(*) FROM approval_audit_log
UNION ALL
SELECT 'batch_timesheets', COUNT(*) FROM batch_timesheets
UNION ALL
SELECT 'client_contacts', COUNT(*) FROM client_contacts
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'system_audit_log', COUNT(*) FROM system_audit_log;
```

## 🔧 Hibaelhárítás

### Foreign Key Constraint Hibák

Ha ilyen hibát kapsz:
```
ERROR: insert or update on table "X" violates foreign key constraint
```

**Megoldás:** Futtasd újra a `node scripts/generate-sql.js` parancsot. A szkript automatikusan rendezi a táblákat függőségek szerint:

1. `users`, `clients`, `sessions`, `rosters` (nincs függőség)
2. `approval_batches`, `timesheets` (users-re hivatkozik)
3. `roster_entries`, `client_contacts` (rosters/clients-re hivatkozik)
4. `batch_timesheets`, `approval_audit_log` (több táblára hivatkozik)
5. `system_audit_log` (users-re hivatkozik)

### JSON Parsing Hibák

Ha ilyen hibát kapsz:
```
ERROR: invalid input syntax for type json
```

**Megoldás:** A szkript már javítva van, újragenerálás megoldja. A `sessions` tábla `sess` mezője JSON típusú és helyesen szerializálódik.

## Táblák listája

A szkript az alábbi táblákat dolgozza fel (függőségi sorrendben):

1. **users** - Felhasználók (16 rekord)
2. **clients** - Ügyfelek (4 rekord)
3. **sessions** - Munkamenetek (5 rekord)
4. **rosters** - Beosztások (0 rekord)
5. **approval_batches** - Jóváhagyási batch-ek (4 rekord)
6. **timesheets** - Munkaidő nyilvántartás (40 rekord)
7. **roster_entries** - Beosztási bejegyzések (0 rekord)
8. **client_contacts** - Ügyfél kapcsolattartók (1 rekord)
9. **batch_timesheets** - Batch timesheet kapcsolatok (9 rekord)
10. **approval_audit_log** - Jóváhagyási naplók (22 rekord)
11. **system_audit_log** - Rendszer naplók (57 rekord)

**Összesen:** 158 rekord

