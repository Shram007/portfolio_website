import { describe, expect, it } from "vitest";
import { missionSystems } from "./missionControl";

describe("missionSystems", () => {
  it("has four systems with unique ids", () => {
    expect(missionSystems).toHaveLength(4);
    expect(new Set(missionSystems.map((s) => s.id)).size).toBe(4);
  });

  it.each(missionSystems.map((s) => [s.name, s] as const))("%s has one answer and hints for the rest", (_name, system) => {
    expect(system.options.filter((o) => o.correct)).toHaveLength(1);
    for (const option of system.options.filter((o) => !o.correct)) {
      expect(option.hint).toBeTruthy();
    }
    expect(system.options.map((o) => o.key)).toEqual(["A", "B", "C"]);
    expect(system.code[system.badLine]).toBeDefined();
    expect(system.stats.length).toBeGreaterThan(0);
  });
});
