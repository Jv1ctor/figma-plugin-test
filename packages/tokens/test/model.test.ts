import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allowedBaseGroups, flexOfBase, fromFigmaExport, isDisabled, resolve } from "../src/index.ts";

const set = fromFigmaExport(JSON.parse(readFileSync(new URL("../seed/figma-export.json", import.meta.url), "utf8")));

describe("tokens model", () => {
  it("loads counts", () => {
    expect(Object.keys(set.base)).toHaveLength(270);
    expect(Object.keys(set.semantic)).toHaveLength(184);
    expect(set.textStyles).toHaveLength(12);
    expect(set.shadowStyles).toHaveLength(2);
    expect(set.base["brand-1/600"].value).toBe("#9246d7");
  });
  it("resolves by mode", () => {
    expect(resolve(set, "semantic", "text/primary", "light")).toEqual({ kind: "color", hex: "#1a1a1a", alpha: 1 });
    expect(resolve(set, "semantic", "text/primary", "dark")).toEqual({ kind: "color", hex: "#fafafa", alpha: 1 });
    expect(resolve(set, "semantic", "space/medium", "light")).toEqual({ kind: "number", value: 16 });
    expect(resolve(set, "semantic", "typography/body/font-family", "dark")).toEqual({ kind: "string", value: "Satoshi Variable" });
  });
  it("resolves composite shadow color", () => {
    expect(resolve(set, "semantic", "shadow/raised/color", "light")).toEqual({ kind: "color", hex: "#000000", alpha: 0.1 });
  });
  it("missing ref does not throw", () => {
    const s = structuredClone(set);
    s.semantic["text/primary"].values.light = "neutral/123";
    expect(resolve(s, "semantic", "text/primary", "light")).toEqual({ kind: "missing", ref: "neutral/123" });
  });
  it("flex and groups", () => {
    expect(flexOfBase("brand-1/500")).toBe("free");
    expect(flexOfBase("neutral/500")).toBe("adjustable");
    expect(flexOfBase("space/16")).toBe("locked");
    expect(allowedBaseGroups("semantic", "radius/small")).toEqual(["radius"]);
    expect(isDisabled({ ...set, disabledGroups: ["brand-2"] }, "semantic", "text/on-accent-2-strong")).toBe(true);
  });
  it("disabled groups: base tokens and references", () => {
    const off = { ...set, disabledGroups: ["data" as const, "brand-3" as const] };
    expect(isDisabled(off, "base", "data-4/500")).toBe(true);
    expect(isDisabled(off, "base", "brand-3/500")).toBe(true);
    expect(isDisabled(off, "base", "brand-1/500")).toBe(false);
    expect(isDisabled(off, "semantic", "data/categorical-1")).toBe(true);
    expect(resolve(off, "base", "data-1/500", "light")).toEqual({ kind: "missing", ref: "data-1/500" });
  });
  it("type mapping and allowed groups", () => {
    expect(set.semantic["typography/display/large/font-weight"].type).toBe("fontWeight");
    expect(set.base["opacity/10"].type).toBe("number");
    expect(set.base["space/16"].type).toBe("dimension");
    expect(allowedBaseGroups("semantic", "shadow/raised/color")).toContain("opacity");
    expect(allowedBaseGroups("semantic", "shadow/raised/blur")).toEqual(["space"]);
    expect(allowedBaseGroups("semantic", "typography/body/font-family")).toEqual(["font-family"]);
  });
});
