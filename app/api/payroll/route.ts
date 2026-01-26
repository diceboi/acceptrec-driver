import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, clients } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, isNull, and } from 'drizzle-orm';

// Helper to normalize client names for fuzzy matching
function normalizeClientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,&'\"()[\]{}]/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\b(inc|incorporated|ltd|limited|llc|corp|corporation|co|company|plc)\b/g, '')
    .replace(/^(the|a|aa)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate match score between two normalized names (0-1)
function getNameMatchScore(name1: string, name2: string): number {
  if (name1 === name2) return 1.0;
  
  const words1 = name1.split(/\s+/).filter(w => w.length > 1);
  const words2 = name2.split(/\s+/).filter(w => w.length > 1);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // First significant word must match for any score
  if (words1[0] !== words2[0]) return 0;
  
  // Count matching words
  const matchingWords = words1.filter(w => words2.includes(w));
  return matchingWords.length / Math.max(words1.length, words2.length);
}

export async function GET() {
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
    // Get all approved timesheets
    const allTimesheets = await db
      .select()
      .from(timesheets)
      .where(and(
        eq(timesheets.approvalStatus, 'approved'),
        isNull(timesheets.deletedAt)
      ));

    // Get all clients for minimum hours lookup
    const allClients = await db
      .select()
      .from(clients)
      .where(isNull(clients.deletedAt));

    // Helper to find client minimum billable hours by matching name
    const getClientMinimumHours = (clientName: string): number => {
      const normalizedName = normalizeClientName(clientName);
      
      // First try exact normalized match
      let matchingClient = allClients.find(c => 
        normalizeClientName(c.companyName) === normalizedName
      );
      
      // If no exact match, find best match based on word overlap
      if (!matchingClient) {
        let bestMatch: typeof allClients[0] | undefined;
        let bestScore = 0;
        
        for (const client of allClients) {
          const clientNorm = normalizeClientName(client.companyName);
          const score = getNameMatchScore(normalizedName, clientNorm);
          
          if (score > bestScore && score > 0.5) {
            bestScore = score;
            bestMatch = client;
          }
        }
        matchingClient = bestMatch;
      }
      
      return matchingClient?.minimumBillableHours ?? 8;
    };

    // Group by week -> client -> driver
    const weeks = new Map<string, any>();

    allTimesheets.forEach(timesheet => {
      const weekStart = timesheet.weekStartDate;
      
      if (!weeks.has(weekStart)) {
        weeks.set(weekStart, {
          weekStartDate: weekStart,
          clients: [],
          totalActualHours: 0,
          totalBillableHours: 0,
          driverCount: 0,
        });
      }

      const week = weeks.get(weekStart)!;

      const days = [
        { client: timesheet.sundayClient, total: timesheet.sundayTotal },
        { client: timesheet.mondayClient, total: timesheet.mondayTotal },
        { client: timesheet.tuesdayClient, total: timesheet.tuesdayTotal },
        { client: timesheet.wednesdayClient, total: timesheet.wednesdayTotal },
        { client: timesheet.thursdayClient, total: timesheet.thursdayTotal },
        { client: timesheet.fridayClient, total: timesheet.fridayTotal },
        { client: timesheet.saturdayClient, total: timesheet.saturdayTotal },
      ];

      // Track per-client: actual hours, days worked
      const clientData = new Map<string, { actualHours: number; daysWorked: number }>();
      
      days.forEach(day => {
        if (day.client && day.client.trim()) {
          const hours = parseFloat(day.total || "0");
          if (hours > 0) {
            const existing = clientData.get(day.client) || { actualHours: 0, daysWorked: 0 };
            existing.actualHours += hours;
            existing.daysWorked += 1;
            clientData.set(day.client, existing);
          }
        }
      });

      clientData.forEach((data, client) => {
        let clientGroup = week.clients.find((c: any) => c.client === client);
        const minimumHours = getClientMinimumHours(client);
        
        if (!clientGroup) {
          clientGroup = {
            client,
            batchId: timesheet.batchId,
            minimumBillableHours: minimumHours,
            drivers: [],
            totalActualHours: 0,
            totalBillableHours: 0,
          };
          week.clients.push(clientGroup);
        }

        if (timesheet.batchId && !clientGroup.batchId) {
          clientGroup.batchId = timesheet.batchId;
        }

        // Calculate billable hours: max(actualHours, daysWorked * minimumHours)
        const billableHours = Math.max(data.actualHours, data.daysWorked * minimumHours);

        clientGroup.drivers.push({
          name: timesheet.driverName,
          actualHours: data.actualHours,
          billableHours: billableHours,
          daysWorked: data.daysWorked,
          rating: timesheet.clientRating,
          approvedAt: timesheet.clientApprovedAt,
          approvedBy: timesheet.clientApprovedBy,
          batchId: timesheet.batchId,
          hasModifications: !!(timesheet.clientModifications && Object.keys(timesheet.clientModifications).length > 0),
        });

        clientGroup.totalActualHours += data.actualHours;
        clientGroup.totalBillableHours += billableHours;
        week.totalActualHours += data.actualHours;
        week.totalBillableHours += billableHours;
      });
    });

    // Calculate unique driver count per week and sort clients
    weeks.forEach(week => {
      const uniqueDrivers = new Set<string>();
      week.clients.forEach((client: any) => {
        client.drivers.forEach((driver: any) => uniqueDrivers.add(driver.name));
      });
      week.driverCount = uniqueDrivers.size;
      
      // Sort clients alphabetically
      week.clients.sort((a: any, b: any) => a.client.localeCompare(b.client));
    });

    const weekGroups = Array.from(weeks.values())
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));

    return NextResponse.json(weekGroups);

  } catch (error) {
    console.error('Error fetching payroll data:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
