import React from "react";
import { Info } from "lucide-react";
import Link from "next/link";

export function MethodologyBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border-l-4 border-l-accent border-y border-r border-border-default bg-accent-subtle p-4 text-sm">
      <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-text-primary font-medium">Independent Evaluation Methodology</p>
        <p className="text-text-secondary text-xs">
          Recovery outcomes are benchmarked against an independent, hidden ground-truth function
          never exposed to the agent&apos;s scoring layer.{" "}
          <Link href="/docs/evaluation" className="text-accent underline hover:text-accent-hover font-medium">
            Read the full methodology &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
