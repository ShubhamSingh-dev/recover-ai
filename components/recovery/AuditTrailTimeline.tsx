import React from "react";
import { AuditLog } from "@/lib/types";

interface AuditTrailTimelineProps {
  logs: AuditLog[];
}

export function AuditTrailTimeline({ logs }: AuditTrailTimelineProps) {
  return (
    <div className="relative pl-4 space-y-4 border-l border-border-default text-sm">
      {logs.map((log) => (
        <div key={log.id} className="relative">
          <div className="absolute -left-5.25 top-1 h-2.5 w-2.5 rounded-full bg-border-strong border-2 border-bg-surface" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-muted">
              {new Date(log.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="font-medium text-text-primary">{log.event_type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
