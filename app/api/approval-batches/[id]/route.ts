import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { approvalBatches } from "@/shared/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [batch] = await db
      .select()
      .from(approvalBatches)
      .where(eq(approvalBatches.id, id));

    if (!batch) {
      return NextResponse.json({ message: "Approval batch not found" }, { status: 404 });
    }

    return NextResponse.json(batch);
  } catch (error) {
    console.error("Error fetching approval batch:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
