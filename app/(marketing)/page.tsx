import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface px-4 py-1.5 text-xs font-medium text-text-secondary shadow-xs">
          <span>AI Revenue Recovery Agent</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          RecoverAI
        </h1>
        <p className="text-base text-text-secondary leading-relaxed max-w-lg mx-auto">
          Intelligent failed payment recovery with disclosed scoring, hard
          guardrails, and proven non-circular evaluation.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Link href="/dashboard">
            <Button variant="default">Go to Dashboard</Button>
          </Link>
          <Link href="/evaluation">
            <Button variant="secondary">View Evaluation</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
