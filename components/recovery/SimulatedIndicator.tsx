import React from "react";
import { FlaskConical, Link2 } from "lucide-react";

interface SimulatedIndicatorProps {
  isSimulated: boolean;
}

export function SimulatedIndicator({ isSimulated }: SimulatedIndicatorProps) {
  if (isSimulated) {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-dashed border-border-strong bg-bg-sunken px-2 py-0.5 text-xs text-text-secondary">
        <FlaskConical className="h-3 w-3" />
        Simulated
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-solid border-accent/40 bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
      <Link2 className="h-3 w-3" />
      Live (test mode)
    </span>
  );
}
