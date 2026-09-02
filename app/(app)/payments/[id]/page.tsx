import React from "react";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Payment Details</h1>
      <p className="text-sm text-text-secondary">ID: {id}</p>
    </div>
  );
}
