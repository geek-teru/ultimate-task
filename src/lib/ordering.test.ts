import { describe, expect, it } from "vitest";
import { midpoint } from "./ordering";

describe("midpoint", () => {
  it("2つの値の中間を返す", () => {
    expect(midpoint(0, 10)).toBe(5);
  });

  it("同じ値どうしならその値を返す", () => {
    expect(midpoint(3, 3)).toBe(3);
  });
});
