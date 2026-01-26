const fs = require('fs');
const path = require('path');

// Escape SQL értékek
function escapeSQLValue(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'object') {
        // JSON objektum vagy tömb - serialize majd escape
        const jsonStr = JSON.stringify(value);
        const escaped = jsonStr.replace(/'/g, "''");
        return `'${escaped}'`;
    }
    // String escape - single quote megduplázása
    const escaped = String(value).replace(/'/g, "''");
    return `'${escaped}'`;
}

// SQL INSERT generálás
function generateInsertStatements(tableName, data) {
    if (!data || data.length === 0) {
        return `-- Nincs adat a '${tableName}' táblához\n`;
    }

    const statements = [];
    statements.push(`-- Tábla: ${tableName}`);
    statements.push(`-- Rekordok száma: ${data.length}\n`);

    const columns = Object.keys(data[0]);
    const columnsStr = columns.join(', ');

    data.forEach((row, index) => {
        const values = columns.map(col => escapeSQLValue(row[col]));
        const valuesStr = values.join(', ');
        statements.push(`INSERT INTO ${tableName} (${columnsStr}) VALUES (${valuesStr});`);
        
        // Progress minden 100 rekordnál
        if ((index + 1) % 100 === 0) {
            console.log(`  ✓ ${tableName}: ${index + 1}/${data.length}`);
        }
    });

    statements.push(''); // Üres sor
    return statements.join('\n');
}

// Main
async function main() {
    const backupDir = path.join(__dirname, '..', 'database-backup');
    const outputFile = path.join(__dirname, 'supabase-import.sql');

    console.log('📁 Backup mappa:', backupDir);
    console.log('📝 Output fájl:', outputFile);
    console.log('');

    // SQL header
    const sqlParts = [];
    sqlParts.push('-- ================================================');
    sqlParts.push('-- Database Backup Import - Supabase SQL');
    sqlParts.push(`-- Generálva: ${new Date().toISOString()}`);
    sqlParts.push('-- ================================================');
    sqlParts.push('');
    sqlParts.push('-- FONTOS: Futtasd ezt a szkriptet a Supabase SQL Editor-ban!');
    sqlParts.push('');
    sqlParts.push('BEGIN;');
    sqlParts.push('');

    // Tábla függőségek meghatározása (szülő -> gyerek)
    const tableOrder = [
        'users',              // Nincs függősége
        'clients',            // Nincs függősége
        'sessions',           // Nincs függősége
        'rosters',            // Nincs függősége
        'approval_batches',   // users-re hivatkozik (created_by)
        'timesheets',         // users-re hivatkozik (user_id)
        'roster_entries',     // rosters-re hivatkozik
        'client_contacts',    // clients-re hivatkozik
        'batch_timesheets',   // approval_batches & timesheets-re hivatkozik
        'approval_audit_log', // approval_batches-re hivatkozik
        'system_audit_log'    // users-re hivatkozik
    ];

    // JSON fájlok rendezése függőségek szerint
    const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => {
            const tableA = path.basename(a, '.json');
            const tableB = path.basename(b, '.json');
            const indexA = tableOrder.indexOf(tableA);
            const indexB = tableOrder.indexOf(tableB);
            
            // Ha valamelyik nincs a listában, az megy hátrébb
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            
            return indexA - indexB;
        });

    console.log(`🔍 Talált fájlok: ${files.length}`);
    console.log('📋 Importálási sorrend:');
    files.forEach((f, i) => console.log(`   ${i + 1}. ${path.basename(f, '.json')}`));
    console.log('');

    for (const file of files) {
        const tableName = path.basename(file, '.json');
        const filePath = path.join(backupDir, file);

        console.log(`⚙️  Feldolgozás: ${file}`);

        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const insertSQL = generateInsertStatements(tableName, data);
            sqlParts.push(insertSQL);
            
            console.log(`   ✅ ${data.length} rekord\n`);
        } catch (error) {
            console.error(`   ❌ Hiba: ${error.message}\n`);
            sqlParts.push(`-- HIBA: ${tableName} - ${error.message}\n`);
        }
    }

    // SQL footer
    sqlParts.push('COMMIT;');
    sqlParts.push('');
    sqlParts.push('-- ================================================');
    sqlParts.push('-- Import befejezve!');
    sqlParts.push('-- ================================================');

    // Fájl írása
    fs.writeFileSync(outputFile, sqlParts.join('\n'), 'utf8');

    console.log('✅ SQL fájl sikeresen generálva!');
    console.log(`📄 Fájl helye: ${outputFile}`);
    console.log('');
    console.log('📋 Következő lépések:');
    console.log('   1. Nyisd meg a Supabase Dashboard-ot');
    console.log('   2. Menj a SQL Editor-ba');
    console.log('   3. Másold be a supabase-import.sql tartalmát');
    console.log('   4. Futtasd a szkriptet');
}

main().catch(console.error);
