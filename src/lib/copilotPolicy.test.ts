import { describe, expect, it } from "vitest";
import {
  COPILOT_REQUESTS_PER_HOUR,
  isCopilotRateLimited,
} from "@/lib/copilotPolicy";

describe("copilotPolicy", () => {
  it("autorise les usages sous le plafond horaire", () => {
    expect(isCopilotRateLimited(0)).toBe(false);
    expect(isCopilotRateLimited(COPILOT_REQUESTS_PER_HOUR - 1)).toBe(false);
  });

  it("bloque dès que le plafond horaire est atteint", () => {
    expect(isCopilotRateLimited(COPILOT_REQUESTS_PER_HOUR)).toBe(true);
    expect(isCopilotRateLimited(COPILOT_REQUESTS_PER_HOUR + 5)).toBe(true);
  });

  it("refuse un compteur incohérent", () => {
    expect(() => isCopilotRateLimited(-1)).toThrow();
    expect(() => isCopilotRateLimited(1.5)).toThrow();
  });
});
