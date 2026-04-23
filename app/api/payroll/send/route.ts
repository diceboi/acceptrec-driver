import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timesheets, clients, driverClasses, driverClassRates } from "@/shared/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import ExcelJS from 'exceljs';
import { Resend } from 'resend';
import { format, parseISO, addDays } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

// Class assignments: timesheetId -> day -> classId
type ClassAssignments = Record<string, Record<string, string>>;

export async function POST(req: Request) {
  try {
    const { email, fallbackChargeRate, chargeRate, weekStartDate, clientId: requestedClientId } = await req.json() as {
      email: string;
      fallbackChargeRate?: string;
      chargeRate?: string; // backward compat
      weekStartDate?: string;
      clientId?: string;
    };

    if (!email || !email.includes('@')) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    const fallbackRate = parseFloat(fallbackChargeRate || chargeRate || "0");

    // 1. Fetch all approved timesheets (filtered by week if provided)
    const filters = [
      eq(timesheets.approvalStatus, "approved"),
      isNull(timesheets.deletedAt)
    ];
    if (weekStartDate) {
      filters.push(eq(timesheets.weekStartDate, weekStartDate));
    }

    const approvedTimesheets = await db
      .select()
      .from(timesheets)
      .where(and(...filters))
      .orderBy(desc(timesheets.weekStartDate));

    if (approvedTimesheets.length === 0) {
      return NextResponse.json({ message: "No approved timesheets found to report" }, { status: 404 });
    }

    // 2. Fetch clients to get minimum billable hours
    const allClients = await db.select().from(clients).where(isNull(clients.deletedAt));
    const clientMap = new Map(allClients.map(c => [c.companyName.toLowerCase().trim(), c]));
    const clientIdMap = new Map(allClients.map(c => [c.id, c]));

    const getClientMinHours = (name: string): number => {
      const client = clientMap.get(name.toLowerCase().trim());
      return client?.minimumBillableHours ?? 8;
    };

    // Find client ID by name (fuzzy)
    const findClientId = (name: string): string | null => {
      const client = clientMap.get(name.toLowerCase().trim());
      if (client) return client.id;
      // Fuzzy match
      for (const [, c] of clientMap) {
        if (c.companyName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.companyName.toLowerCase())) {
          return c.id;
        }
      }
      return null;
    };

    // 3. Fetch all driver classes and rates
    const allDriverClasses = await db.select().from(driverClasses).where(isNull(driverClasses.deletedAt));
    const classNameMap = new Map(allDriverClasses.map(dc => [dc.id, dc.name]));

    const allRates = await db.select().from(driverClassRates);
    // Map: classId-clientId -> hourlyRate
    const rateMap = new Map(allRates.map(r => [`${r.driverClassId}-${r.clientId}`, r.hourlyRate]));

    const getClassRateForClient = (classId: string, clientName: string): number | null => {
      const clientId = findClientId(clientName);
      if (!clientId) return null;
      const key = `${classId}-${clientId}`;
      return rateMap.get(key) ?? null;
    };

    // 4. Process Data into hierarchical structure (Week -> Client -> Drivers[])
    const weeks = new Map<string, Map<string, any[]>>();

    approvedTimesheets.forEach(ts => {
      const weekStart = ts.weekStartDate;
      if (!weeks.has(weekStart)) {
        weeks.set(weekStart, new Map());
      }
      const weekClients = weeks.get(weekStart)!;

      const days = [
        { name: "Sunday", dayKey: "sunday", dayIndex: 0, client: ts.sundayClient, total: ts.sundayTotal, start: ts.sundayStart, end: ts.sundayEnd, break: ts.sundayBreak, poa: ts.sundayPoa, otherWork: ts.sundayOtherWork, nightOut: ts.sundayNightOut, expense: (ts as any).sundayExpenseAmount },
        { name: "Monday", dayKey: "monday", dayIndex: 1, client: ts.mondayClient, total: ts.mondayTotal, start: ts.mondayStart, end: ts.mondayEnd, break: ts.mondayBreak, poa: ts.mondayPoa, otherWork: ts.mondayOtherWork, nightOut: ts.mondayNightOut, expense: (ts as any).mondayExpenseAmount },
        { name: "Tuesday", dayKey: "tuesday", dayIndex: 2, client: ts.tuesdayClient, total: ts.tuesdayTotal, start: ts.tuesdayStart, end: ts.tuesdayEnd, break: ts.tuesdayBreak, poa: ts.tuesdayPoa, otherWork: ts.tuesdayOtherWork, nightOut: ts.tuesdayNightOut, expense: (ts as any).tuesdayExpenseAmount },
        { name: "Wednesday", dayKey: "wednesday", dayIndex: 3, client: ts.wednesdayClient, total: ts.wednesdayTotal, start: ts.wednesdayStart, end: ts.wednesdayEnd, break: ts.wednesdayBreak, poa: ts.wednesdayPoa, otherWork: ts.wednesdayOtherWork, nightOut: ts.wednesdayNightOut, expense: (ts as any).wednesdayExpenseAmount },
        { name: "Thursday", dayKey: "thursday", dayIndex: 4, client: ts.thursdayClient, total: ts.thursdayTotal, start: ts.thursdayStart, end: ts.thursdayEnd, break: ts.thursdayBreak, poa: ts.thursdayPoa, otherWork: ts.thursdayOtherWork, nightOut: ts.thursdayNightOut, expense: (ts as any).thursdayExpenseAmount },
        { name: "Friday", dayKey: "friday", dayIndex: 5, client: ts.fridayClient, total: ts.fridayTotal, start: ts.fridayStart, end: ts.fridayEnd, break: ts.fridayBreak, poa: ts.fridayPoa, otherWork: ts.fridayOtherWork, nightOut: ts.fridayNightOut, expense: (ts as any).fridayExpenseAmount },
        { name: "Saturday", dayKey: "saturday", dayIndex: 6, client: ts.saturdayClient, total: ts.saturdayTotal, start: ts.saturdayStart, end: ts.saturdayEnd, break: ts.saturdayBreak, poa: ts.saturdayPoa, otherWork: ts.saturdayOtherWork, nightOut: ts.saturdayNightOut, expense: (ts as any).saturdayExpenseAmount },
      ];

      // Figure out which clients this driver worked for
      const clientNamesForDriver = new Set<string>();
      days.forEach(day => {
        if (day.client && parseFloat(day.total || "0") > 0) {
          clientNamesForDriver.add(day.client.trim());
        }
      });

      clientNamesForDriver.forEach(clientName => {
        // If a specific clientId was requested, skip clients that don't match it
        if (requestedClientId && findClientId(clientName) !== requestedClientId) {
          return;
        }

        if (!weekClients.has(clientName)) {
          weekClients.set(clientName, []);
        }
        
        const clientDrivers = weekClients.get(clientName)!;
        
        const minHours = getClientMinHours(clientName);
        const workedDays = days.filter(d => d.client && d.client.trim() === clientName && parseFloat(d.total || "0") > 0);
        
        let totalBillable = 0;
        let discrepancies = 0;
        let totalBreaks = 0;
        let totalActual = 0;
        let totalPoa = 0;
        let totalOther = 0;
        let totalNightsOut = 0;
        let totalExpenses = 0;
        let totalClassRevenue = 0;
        
        const dayRows = workedDays.map(day => {
          const actualHours = parseFloat(day.total || "0");
          const billableHours = Math.max(actualHours, minHours);
          const hasDiscrepancy = actualHours > 0 && actualHours < 8;
          
          // Look up class assignment for this timesheet + day from the database record
          const driverClassesByDay = (ts as any).driverClassesByDay as Record<string, string> || {};
          const assignedClassId = driverClassesByDay[day.dayKey] || "";
          const className = assignedClassId ? (classNameMap.get(assignedClassId) ?? "") : "";
          let dayRate = fallbackRate;
          
          if (assignedClassId) {
            const classRate = getClassRateForClient(assignedClassId, clientName);
            if (classRate !== null) {
              dayRate = classRate;
            }
          }
          
          const dayRevenue = billableHours * dayRate;
          totalClassRevenue += dayRevenue;
          
          totalBillable += billableHours;
          totalActual += actualHours;
          totalBreaks += parseInt(day.break || "0");
          totalPoa += parseFloat(day.poa || "0");
          totalOther += parseFloat(day.otherWork || "0");
          if (day.nightOut === "true") totalNightsOut++;
          totalExpenses += parseFloat(day.expense || "0");
          if (hasDiscrepancy) discrepancies++;

          return {
            ...day,
            actualHours,
            billableHours,
            hasDiscrepancy,
            minApplied: billableHours > actualHours,
            date: addDays(parseISO(ts.weekStartDate), day.dayIndex),
            className,
            dayRate,
            dayRevenue,
          };
        });

        if (dayRows.length > 0) {
          clientDrivers.push({
            driverName: ts.driverName,
            timesheetId: ts.id,
            approvalStatus: ts.approvalStatus,
            clientApprovedBy: ts.clientApprovedBy,
            clientApprovedAt: ts.clientApprovedAt,
            clientRating: ts.clientRating,
            clientComments: ts.clientComments,
            dayRows,
            totalBillable,
            totalActual,
            totalBreaks,
            totalPoa,
            totalOther,
            totalNightsOut,
            totalExpenses,
            totalClassRevenue,
            discrepancies,
            clientPoNumber: (ts as any).clientPoNumber,
          });
        }
      });
    });

    // 5. Generate ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Accept Recruitment';
    workbook.created = new Date();

    weeks.forEach((clientMap2, weekStartDate) => {
      clientMap2.forEach((drivers, clientName) => {
        const sheetName = `${clientName.substring(0, 15)}_${format(parseISO(weekStartDate), "MMM d")}`.replace(/[*?/\\[\]]/g, '');
        const ws = workbook.addWorksheet(sheetName);
        
        ws.columns = [
          { width: 25 }, // Date
          { width: 15 }, // Start
          { width: 15 }, // End
          { width: 10 }, // Breaks
          { width: 15 }, // Hours
          { width: 10 }, // PoA
          { width: 12 }, // Other
          { width: 15 }, // Charge Hours
          { width: 18 }, // Class
          { width: 12 }, // Rate
          { width: 15 }, // Total
          { width: 12 }, // Nights Out
          { width: 12 }, // Expenses
        ];

        // Overall Client Header
        ws.addRow(["Driver Timesheet Approval"]);
        ws.getCell('A1').font = { size: 20, bold: true, color: { argb: 'FF00008B' } };
        ws.addRow([`Client: ${clientName} | Week of ${format(parseISO(weekStartDate), "MMMM d, yyyy")}`]);
        ws.getCell('A2').font = { size: 14 };
        
        if (fallbackRate > 0) {
          ws.addRow([`Fallback Charge Rate: £${fallbackRate.toFixed(2)}/hr`]);
          ws.getCell('A3').font = { size: 12, italic: true };
          ws.addRow([]);
        } else {
          ws.addRow([]);
        }

        let currentRow = fallbackRate > 0 ? 5 : 4;
        let totalRevenueSum = 0;

        drivers.forEach(driver => {
          // Driver Header Info
          const driverTitleRow = ws.addRow([driver.driverName, '', '', '', '', '', '', '', '', '', driver.approvalStatus === 'approved' ? 'Approved' : '']);
          ws.mergeCells(`A${currentRow}:D${currentRow}`);
          ws.getCell(`A${currentRow}`).font = { size: 16, bold: true };
          
          if (driver.clientPoNumber) {
            ws.getCell(`L${currentRow}`).value = `PO Number: ${driver.clientPoNumber}`;
            ws.getCell(`L${currentRow}`).font = { size: 12, bold: true };
            ws.getCell(`L${currentRow}`).alignment = { horizontal: 'right' };
          }
          
          if (driver.discrepancies > 0) {
            ws.getCell(`E${currentRow}`).value = `${driver.discrepancies} Discrepancy`;
            ws.getCell(`E${currentRow}`).font = { color: { argb: 'FFFF0000' }, bold: true };
          }

          if (driver.approvalStatus === 'approved') {
             ws.getCell(`K${currentRow}`).font = { color: { argb: 'FF008000' }, bold: true };
             ws.getCell(`K${currentRow}`).alignment = { horizontal: 'right' };
          }
          currentRow++;

          ws.addRow([`Total Hours: ${driver.totalBillable.toFixed(2)}h | Total Pay: £${driver.totalClassRevenue.toFixed(2)}`]);
          ws.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;

          // Table Header
          const headerRow = ws.addRow(['Date', 'Start Time', 'End Time', 'Breaks', 'Hours', 'PoA', 'Other Work', 'Charge Hours', 'Class', 'Rate (£/hr)', 'Total (£)', 'Nights Out?', 'Expenses (£)']);
          headerRow.font = { bold: true };
          headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
          currentRow++;

          // Data Rows
          driver.dayRows.forEach((day: any) => {
            const tableRow = ws.addRow([
              `${day.name.substring(0, 3)} ${format(day.date, "d MMM")}`,
              day.start || "—",
              day.end || "—",
              day.break ? `${day.break}m` : "—",
              day.actualHours.toFixed(2),
              day.poa || "0",
              day.otherWork || "0",
              day.billableHours.toFixed(2),
              day.className || "—",
              day.dayRate > 0 ? `£${day.dayRate.toFixed(2)}` : "—",
              day.dayRevenue > 0 ? `£${day.dayRevenue.toFixed(2)}` : "—",
              day.nightOut === "Yes" || day.nightOut === "true" ? "Yes" : "No",
              parseFloat(day.expense || "0") > 0 ? parseFloat(day.expense || "0").toFixed(2) : "—"
            ]);
            
            if (day.hasDiscrepancy) {
               tableRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEB' } };
            }
            if (day.minApplied) {
               ws.getCell(`H${currentRow}`).font = { color: { argb: 'FF0000FF' } };
               ws.getCell(`H${currentRow}`).note = 'Minimum Billable Applied';
            }
            // Highlight class column if a class is set
            if (day.className) {
              ws.getCell(`I${currentRow}`).font = { bold: true, color: { argb: 'FF006400' } };
              ws.getCell(`J${currentRow}`).font = { bold: true, color: { argb: 'FF006400' } };
            }
            currentRow++;
          });

          // Table Total Row
          const totalRow = ws.addRow([
            'Total', '', '', `${driver.totalBreaks}m`, `${driver.totalActual.toFixed(2)}h`, `${driver.totalPoa.toFixed(2)}h`, `${driver.totalOther.toFixed(2)}h`, `${driver.totalBillable.toFixed(2)}h`, '', '', driver.totalNightsOut
          ]);
          totalRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000080' } };
          currentRow++;

          // Revenue calculation — use per-day class rates
          const extraNightOutMoney = driver.totalNightsOut * 25;
          const driverRevenue = driver.totalClassRevenue + extraNightOutMoney;
          totalRevenueSum += driverRevenue;
          
          if (driverRevenue > 0) {
            const breakDownStr = driver.totalNightsOut > 0 
                ? `(Per-day Rate * Charge Hours) + (${driver.totalNightsOut} Night Out(s) * £25)`
                : `(Per-day Rate * Charge Hours)`;
                
            const revRow = ws.addRow([`Total Invoiced for Driver ${breakDownStr}`, '', '', '', '', '', '', '', '', `£${driverRevenue.toFixed(2)}`, '']);
            revRow.font = { bold: true };
            currentRow++;
          }

          // Approver Signoff
          ws.addRow([]); currentRow++;
          ws.addRow([`Approved by: ${driver.clientApprovedBy || 'Unknown'}`]); currentRow++;
          if (driver.clientApprovedAt) {
            ws.addRow([`Date: ${format(new Date(driver.clientApprovedAt), "MMM d, yyyy 'at' h:mm a")}`]); currentRow++;
          }
          if (driver.clientRating) {
            ws.addRow([`Client Rating: ${driver.clientRating}/10`]); currentRow++;
          }
          ws.addRow([]); currentRow++;
          ws.addRow([]); currentRow++;
        });

        if (totalRevenueSum > 0) {
          const grandTotalRow = ws.addRow([`GRAND TOTAL REVENUE FOR ${clientName} (${format(parseISO(weekStartDate), "MMM d")}):`, '', '', '', '', '', '', '', '', `£${totalRevenueSum.toFixed(2)}`]);
          grandTotalRow.font = { size: 14, bold: true };
          grandTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        }
      });
    });

    // Write Excel to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 6. Send Email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Accept Recruitment <timesheets@acceptrec.co.uk>',
      to: [email],
      subject: `Detailed Payroll Report - ${new Date().toLocaleDateString()}`,
      html: `
        <h1>Payroll Report Generated</h1>
        <p>Please find the attached detailed payroll report.</p>
        <p>Fallback Charge Rate: ${fallbackRate > 0 ? `£${fallbackRate.toFixed(2)}/hr` : 'None'}</p>
        <p>Driver class assignments were loaded from the approved timesheets where available.</p>
        <p>Generated at: ${new Date().toLocaleString()}</p>
      `,
      attachments: [
        {
          filename: `Payroll_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
          content: Buffer.from(buffer),
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
