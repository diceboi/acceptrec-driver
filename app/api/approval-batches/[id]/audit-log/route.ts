import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { approvalAuditLog } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auditLogs = await db
      .select()
      .from(approvalAuditLog)
      .where(eq(approvalAuditLog.batchId, id))
      .orderBy(desc(approvalAuditLog.timestamp));

    return NextResponse.json(auditLogs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
