import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rosters, rosterEntries, users, timesheets } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and, isNull } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await req.json();
    const { weekStartDate, fileName, fileData, notes } = body;

    if (!weekStartDate || !fileName || !fileData) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Parse Excel file directly from base64
    const workbook = XLSX.read(fileData, { type: 'base64' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);

    if (!data || data.length === 0) {
      return new NextResponse("No data found in spreadsheet", { status: 400 });
    }

    // Log first row to see column names
    console.log("First row of Excel data:", data[0]);
    console.log("Available columns:", Object.keys(data[0] || {}));

    // Expected columns: "Driver Name", "Email", "Phone", "Expected Client"
    // We'll be flexible with column names (case-insensitive, trimmed)
    const normalizeKey = (key: string) => key.toLowerCase().trim().replace(/\s+/g, '').replace(/[_-]/g, '');
    
    const entries = data.map((row: any) => {
      const rowKeys = Object.keys(row).reduce((acc, key) => {
        const normalized = normalizeKey(key);
        acc[normalized] = row[key];
        return acc;
      }, {} as Record<string, any>);

      // Try various column name variations
      const driverName = rowKeys['drivername'] || rowKeys['name'] || rowKeys['driver'] || rowKeys['sofor'] || rowKeys['sofornev'] || '';
      const driverEmail = rowKeys['email'] || rowKeys['driveremail'] || rowKeys['emailcim'] || '';
      const driverPhone = rowKeys['phone'] || rowKeys['driverphone'] || rowKeys['telefon'] || rowKeys['tel'] || '';
      const expectedClient = rowKeys['expectedclient'] || rowKeys['client'] || rowKeys['kliens'] || rowKeys['ceg'] || '';

      return {
        driverName: String(driverName || '').trim(),
        driverEmail: String(driverEmail || '').trim(),
        driverPhone: String(driverPhone || '').trim(),
        expectedClient: String(expectedClient || '').trim(),
        notes: String(rowKeys['notes'] || rowKeys['megjegyzes'] || '').trim(),
      };
    }).filter(entry => entry.driverName); // Filter out empty rows

    console.log(`Parsed ${entries.length} valid entries from ${data.length} rows`);

    if (entries.length === 0) {
      const availableColumns = Object.keys(data[0] || {}).join(', ');
      return new NextResponse(
        `No valid entries found. Available columns: ${availableColumns}. Expected columns like: Driver Name, Email, Phone, Expected Client`, 
        { status: 400 }
      );
    }

    // Create roster record
    const [roster] = await db.insert(rosters).values({
      weekStartDate,
      fileName,
      uploadedBy: user.id,
      totalEntries: entries.length,
      notes: notes || null,
    }).returning();

    // Find matching users for email linking
    const emails = entries.map(e => e.driverEmail).filter(Boolean);
    const matchedUsers = emails.length > 0 
      ? await db.select().from(users).where(and(
          eq(users.email, emails[0]), // This is wrong, need inArray
          isNull(users.deletedAt)
        ))
      : [];
    
    // Better approach: create a map
    const usersByEmail = new Map<string, string>();
    if (emails.length > 0) {
      const allUsers = await db.select().from(users).where(isNull(users.deletedAt));
      allUsers.forEach(u => {
        usersByEmail.set(u.email.toLowerCase(), u.id);
      });
    }

    // Insert roster entries
    await db.insert(rosterEntries).values(
      entries.map(entry => ({
        rosterId: roster.id,
        driverName: entry.driverName,
        driverEmail: entry.driverEmail || null,
        driverPhone: entry.driverPhone || null,
        expectedClient: entry.expectedClient || null,
        notes: entry.notes || null,
        userId: entry.driverEmail ? usersByEmail.get(entry.driverEmail.toLowerCase()) || null : null,
      }))
    );

    return NextResponse.json(roster);

  } catch (error: any) {
    console.error('Error uploading roster:', error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
