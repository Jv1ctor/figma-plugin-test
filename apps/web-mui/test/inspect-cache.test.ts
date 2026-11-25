// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { loadSeed } from "@token-bridge/tokens";
import { InspectCache } from "../src/inspect/InspectLayer.tsx";

afterEach(() => {
  document.head.querySelectorAll("style").forEach((s) => s.remove());
  document.body.innerHTML = "";
});

describe("InspectCache", () => {
  it("o resultado muda quando a classe do elemento muda, sem mudar as folhas", () => {
    const style = document.createElement("style");
    style.textContent = ".a{color:var(--vx-text-primary)} .b{color:var(--vx-text-secondary)}";
    document.head.append(style);
    const root = document.createElement("main");
    const el = document.createElement("div");
    el.className = "MuiButton-root a";
    root.append(el);
    document.body.append(root);
    const cache = new InspectCache();
    const set = loadSeed();
    const tokens = () => cache.get(el, document, set, "light", root).componentRows.map((r) => r.token);
    expect(tokens()).toEqual(["text/primary"]);
    el.className = "MuiButton-root b";
    expect(tokens()).toEqual(["text/secondary"]);
  });
});
