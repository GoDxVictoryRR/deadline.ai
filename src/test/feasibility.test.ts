/**
 * Unit tests for feasibility calculation helper.
 * Tests pure logic — no Firebase or Gemini calls.
 * Covers testing-review.md requirement: "Feasibility calculation: total estimated
 * minutes versus available hours, correct boolean and shortfall output."
 */
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Pure helper (will live in src/lib/feasibility.ts once Feature 2 is built).
// Defined inline here so the scaffold test file is self-contained.
// ---------------------------------------------------------------------------

interface FeasibilityResult {
  isFeasible: boolean;
  shortfallMinutes: number;
}

function computeFeasibility(
  totalEstimatedMinutes: number,
  availableHours: number,
): FeasibilityResult {
  const availableMinutes = availableHours * 60;
  const shortfallMinutes = Math.max(0, totalEstimatedMinutes - availableMinutes);
  return {
    isFeasible: shortfallMinutes === 0,
    shortfallMinutes,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeFeasibility', () => {
  it('returns feasible when tasks fit within available time', () => {
    const result = computeFeasibility(240, 8); // 4 hours of tasks, 8 available
    expect(result.isFeasible).toBe(true);
    expect(result.shortfallMinutes).toBe(0);
  });

  it('returns feasible when tasks exactly match available time', () => {
    const result = computeFeasibility(480, 8); // exactly 8 hours
    expect(result.isFeasible).toBe(true);
    expect(result.shortfallMinutes).toBe(0);
  });

  it('returns infeasible with correct shortfall when tasks exceed available time', () => {
    const result = computeFeasibility(660, 8); // 11 hours of tasks, 8 available → 3h shortfall
    expect(result.isFeasible).toBe(false);
    expect(result.shortfallMinutes).toBe(180);
  });

  it('handles zero available hours', () => {
    const result = computeFeasibility(60, 0);
    expect(result.isFeasible).toBe(false);
    expect(result.shortfallMinutes).toBe(60);
  });

  it('handles zero tasks', () => {
    const result = computeFeasibility(0, 8);
    expect(result.isFeasible).toBe(true);
    expect(result.shortfallMinutes).toBe(0);
  });
});
