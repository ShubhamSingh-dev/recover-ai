import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
        <p className="text-sm text-text-secondary">Failed transactions and recovery decision traces.</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" count={0}>All</TabsTrigger>
          <TabsTrigger value="recovered" count={0}>Recovered</TabsTrigger>
          <TabsTrigger value="pending" count={0}>Pending</TabsTrigger>
          <TabsTrigger value="awaiting_approval" count={0}>Awaiting Approval</TabsTrigger>
          <TabsTrigger value="no_action" count={0}>No Action</TabsTrigger>
          <TabsTrigger value="failed" count={0}>Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border border-border-default bg-bg-surface p-12 text-center text-sm text-text-muted">
        No payments found.
      </div>
    </div>
  );
}
