import { AuditLog } from "@/lib/types";

export async function logAuditEvent(params: {
  paymentId: string;
  eventType: string;
  eventDetail: Record<string, unknown>;
}): Promise<AuditLog | null> {
  // Single write path for audit_logs table (Chunk 5)
  return null;
}
