import { describe, it, expect } from "vitest";
import { computeTargetDimensions } from "@/lib/image/compress";

describe("computeTargetDimensions", () => {
  it("ne change rien si plus petit que max", () => {
    expect(computeTargetDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("réduit en gardant le ratio si largeur > max", () => {
    expect(computeTargetDimensions(3200, 2400, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("réduit en gardant le ratio si hauteur > max", () => {
    expect(computeTargetDimensions(2400, 3200, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("gère un carré", () => {
    expect(computeTargetDimensions(2000, 2000, 1600)).toEqual({ width: 1600, height: 1600 });
  });
});
