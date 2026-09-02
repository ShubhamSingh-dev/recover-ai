import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  // Stub for merchant approve/decline flow (Chunk 6)
  return NextResponse.json({ paymentId: id, action: body.action || "approve", success: true });
}
