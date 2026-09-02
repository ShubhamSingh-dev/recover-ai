import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">Overview of revenue recovery performance and active interventions.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs font-medium text-text-secondary">Revenue at Risk</span>
            <CardTitle className="text-2xl font-bold">₹0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Total failed transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs font-medium text-text-secondary">Revenue Recovered (Agent)</span>
            <CardTitle className="text-2xl font-bold text-success">₹0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">0% recovery rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs font-medium text-text-secondary">Agent Lift vs Baseline</span>
            <CardTitle className="text-2xl font-bold text-accent">+0%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Over best baseline</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
