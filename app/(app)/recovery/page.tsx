import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RecoveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Recovery Campaigns</h1>
        <p className="text-sm text-text-secondary">Dispatched and active intervention attempts.</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" count={0}>Active</TabsTrigger>
          <TabsTrigger value="pending" count={0}>Pending</TabsTrigger>
          <TabsTrigger value="completed" count={0}>Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border border-border-default bg-bg-surface p-12 text-center text-sm text-text-muted">
        No recovery campaigns found.
      </div>
    </div>
  );
}
