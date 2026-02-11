import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timesheets, clients } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import * as XLSX from 'xlsx';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ClientWorkData {
  clientName: string;
  actualHours: number;
  billableHours: number;
  daysWorked: number;
  driverCount: number;
  drivers: Set<string>;
}

interface WeekData {
  weekStartDate: string;
  clients: Map<string, ClientWorkData>;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    // 1. Fetch all approved timesheets
    const approvedTimesheets = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.approvalStatus, "approved"))
      .orderBy(desc(timesheets.weekStartDate));

    if (approvedTimesheets.length === 0) {
      return NextResponse.json({ message: "No approved timesheets found to report" }, { status: 404 });
    }

    // 2. Fetch clients to get minimum billable hours
    const allClients = await db.select().from(clients);
    const clientMap = new Map(allClients.map(c => [c.companyName.toLowerCase().trim(), c]));

    // Helper to find client minimum hours (fuzzy matching logic could be added here, but exact match first)
    // For now, simpler matching or default to 8
    const getClientMinHours = (name: string): number => {
      const client = clientMap.get(name.toLowerCase().trim());
      return client?.minimumBillableHours ?? 8;
    };

    // 3. Process Data
    const weeks = new Map<string, WeekData>();

    approvedTimesheets.forEach(ts => {
      const weekStart = ts.weekStartDate;
      if (!weeks.has(weekStart)) {
        weeks.set(weekStart, { weekStartDate: weekStart, clients: new Map() });
      }
      const week = weeks.get(weekStart)!;

      const days = [
        { client: ts.mondayClient, total: ts.mondayTotal },
        { client: ts.tuesdayClient, total: ts.tuesdayTotal },
        { client: ts.wednesdayClient, total: ts.wednesdayTotal },
        { client: ts.thursdayClient, total: ts.thursdayTotal },
        { client: ts.fridayClient, total: ts.fridayTotal },
        { client: ts.saturdayClient, total: ts.saturdayTotal },
        { client: ts.sundayClient, total: ts.sundayTotal },
      ];

      // Temporary map to aggregate hours per client FOR THIS DRIVER within this week
      const driverClientWork = new Map<string, { actual: number, days: number }>();

      days.forEach(day => {
        const clientName = day.client?.trim();
        const hours = parseFloat(day.total || "0");
        
        if (clientName && hours > 0) {
          const entry = driverClientWork.get(clientName) || { actual: 0, days: 0 };
          entry.actual += hours;
          entry.days += 1;
          driverClientWork.set(clientName, entry);
        }
      });

      // Now merge this driver's work into the week's client aggregation
      driverClientWork.forEach((data, clientName) => {
        if (!week.clients.has(clientName)) {
            week.clients.set(clientName, {
                clientName,
                actualHours: 0,
                billableHours: 0,
                daysWorked: 0,
                driverCount: 0,
                drivers: new Set()
            });
        }
        
        const clientGroup = week.clients.get(clientName)!;
        const minHours = getClientMinHours(clientName);
        
        // Calculate billable for this driver: max(actual, days * min)
        const driverBillable = Math.max(data.actual, data.days * minHours);

        clientGroup.actualHours += data.actual;
        clientGroup.billableHours += driverBillable;
        clientGroup.daysWorked += data.days;
        clientGroup.drivers.add(ts.driverName);
        clientGroup.driverCount = clientGroup.drivers.size;
      });
    });

    // 4. Generate Excel
    const summaryData: any[] = [];
    const detailData: any[] = [];

    weeks.forEach(week => {
        week.clients.forEach(client => {
            summaryData.push({
                "Week Start": week.weekStartDate,
                "Client": client.clientName,
                "Total Drivers": client.driverCount,
                "Total Actual Hours": client.actualHours.toFixed(2),
                "Total Billable Hours": client.billableHours.toFixed(2),
                "Total Shifts": client.daysWorked
            });
        });
    });

    // Sort summary by date descending
    summaryData.sort((a, b) => b["Week Start"].localeCompare(a["Week Start"]));

    // Separate Detail Sheet generation (could be added if needed, sticking to Summary for now based on legacy reqs)
    // Actually legacy calculated billable, so summary is most important.

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    
    // Auto-width columns
    const wscols = [
        { wch: 15 }, // Week
        { wch: 30 }, // Client
        { wch: 15 }, // Drivers
        { wch: 20 }, // Actual
        { wch: 20 }, // Billable
        { wch: 15 }, // Shifts
    ];
    wsSummary['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 5. Send Email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Accept Recruitment <timesheets@acceptrec.co.uk>',
      to: [email],
      subject: `Payroll Report - ${new Date().toLocaleDateString()}`,
      html: `
        <h1>Payroll Report Generated</h1>
        <p>Please find the attached payroll report.</p>
        <p>Generated at: ${new Date().toLocaleString()}</p>
      `,
      attachments: [
        {
          filename: `Payroll_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
          content: buffer,
        },
      ],
    });

    if (emailError) {
      console.error("Resend Error:", emailError);
      return NextResponse.json({ message: "Failed to send email via provider" }, { status: 500 });
    }

    return NextResponse.json({ message: "Payroll report sent successfully" });

  } catch (error) {
    console.error("Payroll Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
