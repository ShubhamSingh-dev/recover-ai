// API Client wrappers for /api routes

export async function decidePayment(paymentId: string) {
  const res = await fetch(`/api/payments/${paymentId}/decide`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to process recovery decision");
  return res.json();
}

export async function approvePayment(paymentId: string, action: "approve" | "decline") {
  const res = await fetch(`/api/payments/${paymentId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`Failed to ${action} payment`);
  return res.json();
}

export async function runEvaluation() {
  const res = await fetch("/api/evaluation/run", {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to run evaluation benchmark");
  return res.json();
}
