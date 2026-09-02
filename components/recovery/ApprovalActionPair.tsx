import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApprovalActionPairProps {
  onApprove: () => void;
  onDecline: () => void;
  isLoading?: boolean;
}

export function ApprovalActionPair({ onApprove, onDecline, isLoading }: ApprovalActionPairProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={isLoading}
        onClick={onApprove}
        className="border-success/30 text-success hover:bg-success-subtle"
      >
        <Check className="h-4 w-4 mr-1" />
        Approve
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={isLoading}
        onClick={onDecline}
        className="border-danger/30 text-danger hover:bg-danger-subtle"
      >
        <X className="h-4 w-4 mr-1" />
        Decline
      </Button>
    </div>
  );
}
