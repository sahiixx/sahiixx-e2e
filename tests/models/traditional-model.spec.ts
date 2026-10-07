import { test, expect } from "@playwright/test";
import { TraditionalClassificationSchema, TraditionalScoreSchema } from "../../contracts/model-matrix";
import { classifyLead, scoreLead } from "../../tools/traditional-model";

test.describe("Traditional model lane", () => {
  test("classifies a qualified lead deterministically", () => {
    const input = "I have a budget, need a 2 bedroom investment property and want a viewing this week";
    const first = classifyLead(input);
    const second = classifyLead(input);

    expect(first).toEqual(second);
    expect(TraditionalClassificationSchema.parse(first).label).toBe("qualified");
    expect(first.matched_signals).toEqual(["budget", "viewing", "investment", "bedroom"]);
  });

  test("scores the same signals identically on replay", () => {
    const signals = { budgetConfirmed: true, viewingRequested: true, timelineDays: 14, fitScore: 12 };
    const result = scoreLead(signals);

    expect(TraditionalScoreSchema.parse(result)).toEqual(result);
    expect(result).toEqual(scoreLead(signals));
    expect(result.score).toBe(97);
    expect(result.band).toBe("high");
  });

  test("does not promote an unqualified lead", () => {
    const result = scoreLead({ budgetConfirmed: false, viewingRequested: false, timelineDays: null, fitScore: 2 });
    expect(result.band).toBe("low");
    expect(result.score).toBe(2);
  });
});
