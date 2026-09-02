// Core Entity Types matching DATABASE.md

export type PaymentMethod = "card" | "upi" | "netbanking" | "wallet";

export type PaymentStatus =
  | "pending"
  | "awaiting_approval"
  | "recovered"
  | "no_action"
  | "failed";

export type FailureClassification = "recoverable" | "not_recoverable";

export type InterventionType = "payment_link" | "reminder_message";

export type GuardrailResult = "passed" | "blocked" | "escalated";

export type AttemptOutcome = "pending" | "succeeded" | "failed";

export interface Merchant {
  id: string;
  auth_user_id: string;
  name: string;
  created_at: string;
}

export interface Customer {
  id: string;
  merchant_id: string;
  name: string;
  contact_info: string;
  created_at: string;
}

export interface Payment {
  id: string;
  merchant_id: string;
  customer_id: string;
  amount: number;
  method: PaymentMethod;
  failure_reason: string;
  status: PaymentStatus;
  is_synthetic: boolean;
  synthetic_ground_truth_recoverable?: boolean | null;
  razorpay_payment_link_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecoveryAttempt {
  id: string;
  payment_id: string;
  attempt_number: number;
  intervention_type: InterventionType;
  is_simulated: boolean;
  sent_at: string | null;
  outcome: AttemptOutcome | null;
  outcome_at: string | null;
}

export interface ScoreFactor {
  factor: string;
  points: number;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreFactor[];
}

export interface AgentDecision {
  id: string;
  payment_id: string;
  classification: FailureClassification;
  score: number;
  score_breakdown: ScoreFactor[];
  guardrail_result: GuardrailResult;
  guardrail_reason: string | null;
  llm_explanation: string | null;
  llm_proposed_intervention: InterventionType | null;
  decided_at: string;
}

export interface AuditLog {
  id: string;
  payment_id: string;
  event_type: string;
  event_detail: Record<string, unknown>;
  occurred_at: string;
}

// Evaluation Types
export interface BaselineMetrics {
  revenueRecovered: number;
  recoveryRate: number;
  contactAttempts: number;
}

export interface EvaluationResults {
  agent: BaselineMetrics & { precision?: number; recall?: number };
  contactEveryone: BaselineMetrics;
  doNothing: BaselineMetrics;
  totalAtRisk: number;
  totalPayments: number;
}
