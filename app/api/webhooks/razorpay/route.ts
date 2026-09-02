import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Stub for Razorpay webhook listener (Chunk 6)
  return NextResponse.json({ received: true });
}
