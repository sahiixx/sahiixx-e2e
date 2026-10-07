import {
  TraditionalClassificationSchema,
  TraditionalScoreSchema,
  type TraditionalClassification,
  type TraditionalScore,
} from "../contracts/model-matrix";

const URGENT_SIGNALS = ["urgent", "today", "asap", "immediately", "ready to buy"];
const QUALIFIED_SIGNALS = ["budget", "viewing", "finance", "mortgage", "investment", "bedroom"];
const NURTURE_SIGNALS = ["research", "maybe", "later", "exploring", "information"];

function matchingSignals(text: string, signals: string[]): string[] {
  const normalized = text.toLowerCase();
  return signals.filter((signal) => normalized.includes(signal));
}

/** Deterministic reference model for the lane where an LLM adds no value. */
export function classifyLead(text: string): TraditionalClassification {
  const urgent = matchingSignals(text, URGENT_SIGNALS);
  const qualified = matchingSignals(text, QUALIFIED_SIGNALS);
  const nurture = matchingSignals(text, NURTURE_SIGNALS);

  let label: TraditionalClassification["label"] = "unknown";
  let matchedSignals: string[] = [];
  if (urgent.length > 0) {
    label = "urgent";
    matchedSignals = urgent;
  } else if (qualified.length > 0) {
    label = "qualified";
    matchedSignals = qualified;
  } else if (nurture.length > 0) {
    label = "nurture";
    matchedSignals = nurture;
  }

  const confidence = label === "unknown"
    ? 0.25
    : Math.min(0.99, 0.65 + matchedSignals.length * 0.1);
  return TraditionalClassificationSchema.parse({ label, confidence, matched_signals: matchedSignals });
}

export type LeadSignals = {
  budgetConfirmed: boolean;
  viewingRequested: boolean;
  timelineDays: number | null;
  fitScore: number;
};

/** Stable point-based score used as the non-generative oracle. */
export function scoreLead(signals: LeadSignals): TraditionalScore {
  const score = Math.max(0, Math.min(100,
    (signals.budgetConfirmed ? 35 : 0)
    + (signals.viewingRequested ? 30 : 0)
    + (signals.timelineDays !== null && signals.timelineDays <= 30 ? 20 : 0)
    + Math.max(0, Math.min(15, signals.fitScore)),
  ));
  const band: TraditionalScore["band"] = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
  const reasons = [
    signals.budgetConfirmed ? "budget-confirmed" : "budget-unconfirmed",
    signals.viewingRequested ? "viewing-requested" : "viewing-not-requested",
    signals.timelineDays !== null && signals.timelineDays <= 30 ? "near-term-timeline" : "long-or-unknown-timeline",
    `fit-score-${Math.max(0, Math.min(15, signals.fitScore))}`,
  ];
  return TraditionalScoreSchema.parse({ score, band, reasons });
}
