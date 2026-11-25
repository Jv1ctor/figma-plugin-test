import { describe, expect, it } from "vitest";
import { SCALE_STEPS, checkSpecificName, loadSeed, validate, type AliasToken, type TokenSet } from "../src/index.ts";

const seed = loadSeed();
const STEPS = SCALE_STEPS;
const clone = () => structuredClone(seed);
const rules = (s: TokenSet) => validate(s).map((w) => w.rule);
const specific = (name: string, light: AliasToken["values"]["light"], dark = light): AliasToken => ({
  name, type: "color", scopes: [], description: "", flex: "free", values: { light, dark },
});

describe("structural rules", () => {
  it("seed has no structural warnings", () => {
    expect(validate(seed).filter((w) => !w.rule.startsWith("contrast"))).toEqual([]);
  });
  it("feedback palette", () => {
    const s = clone(); s.semantic["text/danger"].values.light = "brand-1/700";
    expect(rules(s)).toContain("feedback-palette");
  });
  it("feedback palette ignores on- pairs and covers state suffixes", () => {
    const s = clone(); s.semantic["text/on-danger-strong"].values.light = "neutral/0";
    expect(rules(s)).not.toContain("feedback-palette");
    s.semantic["background/action/danger-hover"].values.dark = "brand-1/700";
    expect(rules(s)).toContain("feedback-palette");
  });
  it("wrong group", () => {
    const s = clone(); s.semantic["space/medium"].values.light = "radius/16";
    expect(rules(s)).toContain("wrong-group");
  });
  it("wrong group in a composite part", () => {
    const s = clone(); s.semantic["shadow/raised/color"].values.light = { color: "neutral/1000", opacity: "space/4" };
    expect(rules(s)).toContain("wrong-group");
  });
  it("size order", () => {
    const s = clone(); s.semantic["space/small"].values.light = "space/20";
    const w = validate(s).filter((w) => w.rule === "size-order");
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ token: "semantic:space/small", mode: "light" });
    expect(w[0].message).toMatch(/space\/medium/);
  });
  it("size order for radius keeps full out", () => {
    const s = clone(); s.semantic["radius/large"].values.dark = "radius/48";
    expect(validate(s).filter((w) => w.rule === "size-order").map((w) => w.token)).toEqual(["semantic:radius/large"]);
  });
  it("line height", () => {
    const s = clone(); s.semantic["typography/body/medium/line-height"].values.light = "line-height/20";
    const w = validate(s).find((w) => w.rule === "line-height");
    expect(w).toMatchObject({ token: "semantic:typography/body/medium/line-height", mode: "light", actual: "20", expected: "24" });
  });
  it("line height tie rounds up (heading 20px: 26 → 28)", () => {
    const s = clone(); s.semantic["typography/heading/small/line-height"].values.dark = "line-height/24";
    expect(validate(s).find((w) => w.rule === "line-height")?.expected).toBe("28");
  });
  it("focus width", () => {
    const s = clone(); s.semantic["border-width/focus"].values.dark = "border-width/1";
    expect(rules(s)).toContain("focus-width");
  });
  it("neutral endpoints", () => {
    const s = clone(); s.base["neutral/0"].value = "#fefefe";
    expect(rules(s)).toContain("neutral");
    const t = clone(); t.base["neutral/1000"].value = "#010101";
    expect(rules(t)).toContain("neutral");
  });
  it("neutral monotonic", () => {
    const s = clone(); s.base["neutral/400"].value = s.base["neutral/300"].value;
    expect(validate(s).filter((w) => w.rule === "neutral").map((w) => w.token)).toEqual(["base:neutral/400"]);
  });
  it("data distinct", () => {
    const s = clone(); for (const k of STEPS) s.base[`data-2/${k}`].value = s.base[`data-1/${k}`].value;
    expect(rules(s)).toContain("data-palettes");
  });
  it("data vs status hue", () => {
    const s = clone(); for (const k of STEPS) s.base[`data-1/${k}`].value = s.base[`danger/${k}`].value;
    expect(rules(s)).toContain("data-palettes");
  });
  it("data rule is off when data is disabled", () => {
    const s = clone(); for (const k of STEPS) s.base[`data-2/${k}`].value = s.base[`data-1/${k}`].value;
    s.disabledGroups = ["data"];
    expect(rules(s)).not.toContain("data-palettes");
  });
  it("warning ids are unique on a heavily broken set", () => {
    const s = clone();
    for (const k of STEPS) {
      for (const n of [1, 2, 3]) s.base[`data-${n}/${k}`].value = s.base[`danger/${k}`].value;
    }
    s.base["neutral/950"].value = "#000000"; s.base["neutral/1000"].value = "#010101";
    const w = validate(s);
    expect(w.filter((x) => x.rule === "data-palettes").length).toBeGreaterThan(3);
    expect(w.filter((x) => x.token === "base:neutral/1000").length).toBe(2);
    const ids = w.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("font weight", () => {
    expect(validate(seed, { fontWeights: { "Satoshi Variable": [400, 500] } }).some((w) => w.rule === "font-weight")).toBe(true);
    expect(validate(seed, { fontWeights: { "Satoshi Variable": [400, 500, 700] } }).some((w) => w.rule === "font-weight")).toBe(false);
    expect(validate(seed, { fontWeights: { Other: [400] } }).some((w) => w.rule === "font-weight")).toBe(false);
  });
  it("disabled group in use", () => {
    const s = clone(); s.disabledGroups = ["brand-2"];
    s.specific["background/reading"] = specific("background/reading", "brand-1/50", "brand-2/900");
    expect(validate(s)).toContainEqual(expect.objectContaining({ rule: "disabled-group-in-use", token: "specific:background/reading", mode: "dark" }));
    s.specific["background/reading"] = specific("background/reading", { color: "brand-2/600", opacity: "opacity/10" } as never);
    expect(rules(s)).toContain("disabled-group-in-use");
  });
});

describe("specific names", () => {
  const msgs = (n: string) => checkSpecificName(n).map((w) => w.message).join("\n");
  it("format", () => {
    expect(checkSpecificName("background/reading").filter((w) => w.message.startsWith("Formato"))).toEqual([]);
    expect(checkSpecificName("Background/Reading")[0]?.rule).toBe("specific-name");
    expect(checkSpecificName("background/action/primary/hover").length).toBeGreaterThan(0);
    expect(checkSpecificName("typography/body/large/font-size").filter((w) => w.message.startsWith("Formato"))).toEqual([]);
    expect(checkSpecificName("background").some((w) => w.message.startsWith("Formato"))).toBe(true);
    expect(checkSpecificName("background/leitura-é").some((w) => w.message.startsWith("Formato"))).toBe(true);
  });
  it("first level must be a property", () => {
    expect(checkSpecificName("surface/reading").some((w) => w.message.startsWith("Formato"))).toBe(true);
    expect(checkSpecificName("border-width/reading").filter((w) => w.message.startsWith("Formato"))).toEqual([]);
  });
  it("heuristics", () => {
    expect(msgs("background/sepia")).toMatch(/cor/);
    expect(msgs("background/reader-card")).toMatch(/componente/);
    expect(msgs("background/reading")).toMatch(/nova/);
    expect(msgs("background/brand-2")).toMatch(/cor/);
    expect(checkSpecificName("background/surface-raised")).toEqual([]);
    expect(checkSpecificName("text/on-accent-1-strong")).toEqual([]);
  });
  it("heuristic warnings share the rule but differ in message", () => {
    const w = checkSpecificName("background/sepia");
    expect(w.every((x) => x.rule === "specific-name" && x.token === "specific:background/sepia")).toBe(true);
    expect(new Set(w.map((x) => x.id)).size).toBe(w.length);
  });
  it("rejects a name equal to a semantic", () => {
    const s = clone(); s.specific["background/surface"] = specific("background/surface", "neutral/0");
    expect(validate(s).some((w) => w.rule === "specific-name" && /semantic/.test(w.message))).toBe(true);
  });
  it("validate checks specific names and wrong-group", () => {
    const s = clone(); s.specific["background/sepia"] = specific("background/sepia", "space/4");
    const w = validate(s);
    expect(w.some((x) => x.rule === "specific-name" && x.token === "specific:background/sepia")).toBe(true);
    expect(w.some((x) => x.rule === "wrong-group" && x.token === "specific:background/sepia")).toBe(true);
  });
});
