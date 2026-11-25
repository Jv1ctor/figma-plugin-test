import { describe, expect, it } from "vitest";
import { FONT_CATALOG, ensureFontLoaded } from "../src/fonts.ts";

describe("fonts", () => {
  it("tem a Satoshi local e ~20 famílias do Google", () => {
    expect(FONT_CATALOG[0]).toEqual({ family: "Satoshi Variable", weights: [300, 400, 500, 600, 700, 800, 900], source: "local" });
    const google = FONT_CATALOG.filter((f) => f.source === "google");
    expect(google.length).toBeGreaterThanOrEqual(18);
    for (const f of FONT_CATALOG) expect(f.weights.length).toBeGreaterThan(0);
  });

  it("injeta o <link> do Google Fonts uma vez só", () => {
    ensureFontLoaded("Open Sans");
    ensureFontLoaded("Open Sans");
    const links = document.head.querySelectorAll('link[rel="stylesheet"][href^="https://fonts.googleapis.com/css2"]');
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute("href")).toBe(
      "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap",
    );
  });

  it("não injeta nada para fonte local ou desconhecida", () => {
    const before = document.head.querySelectorAll("link").length;
    ensureFontLoaded("Satoshi Variable");
    ensureFontLoaded("Fonte Que Não Existe");
    expect(document.head.querySelectorAll("link")).toHaveLength(before);
  });
});
