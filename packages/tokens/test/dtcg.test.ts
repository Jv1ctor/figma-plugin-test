import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fromFigmaExport, loadSeed, parseDtcg, toDtcg, TokenFormatError } from "../src/index.ts";

const raw = JSON.parse(readFileSync(new URL("../seed/figma-export.json", import.meta.url), "utf8"));

describe("dtcg", () => {
  it("round-trips the seed", () => {
    const set = fromFigmaExport(raw);
    expect(parseDtcg(JSON.parse(JSON.stringify(toDtcg(set))))).toEqual(set);
  });
  it("round-trips disabledGroups", () => {
    const set = fromFigmaExport(raw);
    set.disabledGroups = ["data", "brand-2"];
    expect(parseDtcg(JSON.parse(JSON.stringify(toDtcg(set))))).toEqual(set);
  });
  it("writes aliases, not values", () => {
    const d = toDtcg(fromFigmaExport(raw)) as any;
    expect(d.semantic.text.primary.$extensions.vortex.modes).toEqual({ light: "{base.neutral.900}", dark: "{base.neutral.50}" });
    expect(d.base.space["16"].$value).toEqual({ value: 16, unit: "px" });
    expect(d.base.opacity["40"].$value).toBe(40);
  });
  it("rejects foreign json", () => {
    expect(() => parseDtcg({ hello: 1 })).toThrow(TokenFormatError);
    expect(() => parseDtcg(null)).toThrow(TokenFormatError);
  });
  it("rejects a non-hex color value, naming the token", () => {
    const d = JSON.parse(JSON.stringify(toDtcg(fromFigmaExport(raw))));
    d.base.neutral["900"].$value = "#zzzzzz";
    expect(() => parseDtcg(d)).toThrow(TokenFormatError);
    expect(() => parseDtcg(d)).toThrow(/base\.neutral\.900/);
  });
  it("rejects a non-finite number value", () => {
    const d = JSON.parse(JSON.stringify(toDtcg(fromFigmaExport(raw))));
    d.base.opacity["40"].$value = null;
    expect(() => parseDtcg(d)).toThrow(TokenFormatError);
  });
  it("rejects bad alias", () => {
    const d = JSON.parse(JSON.stringify(toDtcg(fromFigmaExport(raw))));
    d.semantic.text.primary.$extensions.vortex.modes.light = "neutral.900";
    expect(() => parseDtcg(d)).toThrow(TokenFormatError);
  });
  it("seed file is current", () => {
    expect(loadSeed()).toEqual(fromFigmaExport(raw));
  });
});
