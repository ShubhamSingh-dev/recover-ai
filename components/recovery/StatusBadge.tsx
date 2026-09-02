import React from "react";
import { CheckCircle2, Clock, MinusCircle, XCircle, UserCheck } from "lucide-react";
import { PaymentStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: PaymentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "recovered":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-success-subtle px-2 py-0.5 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Recovered
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning">
          <Clock className="h-3.5 w-3.5" /> Pending
        </span>
      );
    case "no_action":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-neutral-status-subtle px-2 py-0.5 text-xs font-medium text-neutral-status">
          <MinusCircle className="h-3.5 w-3.5" /> No Action
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger">
          <XCircle className="h-3.5 w-3.5" /> Failed
        </span>
      );
    case "awaiting_approval":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning">
          <UserCheck className="h-3.5 w-3.5" /> Awaiting Approval
        </span>
      );
    default:
      return null;
  }
}
