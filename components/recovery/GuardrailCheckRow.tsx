import React from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface GuardrailCheckRowProps {
  name: string;
  status: "passed" | "blocked" | "escalated";
  reason?: string | null;
}

export function GuardrailCheckRow({ name, status, reason }: GuardrailCheckRowProps) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border-default last:border-b-0 text-sm">
      <div className="space-y-0.5">
        <span className="font-medium text-text-primary">{name}</span>
        {reason && <p className="text-xs text-text-secondary">{reason}</p>}
      </div>
      <div>
        {status === "passed" && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-success-subtle px-2 py-0.5 text-xs font-medium text-success">
            <CheckCircle2 className="h-3 w-3" /> Passed
          </span>
        )}
        {status === "blocked" && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger">
            <XCircle className="h-3 w-3" /> Blocked
          </span>
        )}
        {status === "escalated" && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning">
            <AlertCircle className="h-3 w-3" /> Escalated
          </span>
        )}
      </div>
    </div>
  );
}
