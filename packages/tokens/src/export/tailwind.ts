import { isDisabled } from "../groups.ts";
import type { TokenSet } from "../types.ts";
import { MODE_ATTR, cssVarName, toCss } from "./css.ts";

const COLOR_HEADS = new Set(["text", "icon", "background", "border", "data"]);

export function toTailwind(set: TokenSet, opts: { inlineCss?: boolean } = {}): string {
  const lines: string[] = [];
  const seen = new Set<string>();
  const add = (twVar: string, name: string) => {
    if (seen.has(twVar)) return;
    seen.add(twVar);
    lines.push(`  ${twVar}: var(${cssVarName("semantic", name)});`);
  };
  for (const layer of ["semantic", "specific"] as const) {
    for (const name of Object.keys(set[layer])) {
      if (isDisabled(set, layer, name)) continue;
      const parts = name.split("/");
      const head = parts[0]!;
      const rest = parts.slice(1).join("-");
      if (COLOR_HEADS.has(head)) add(`--color-${name.replace(/\//g, "-")}`, name);
      else if (head === "space") add(`--spacing-${rest}`, name);
      else if (head === "radius") add(`--radius-${rest}`, name);
      else if (head === "typography") {
        const last = parts[parts.length - 1]!;
        if (last === "font-family" && parts.length === 3) add(`--font-${parts[1]}`, name);
        else if (parts.length === 4) {
          const base = `--text-${parts[1]}-${parts[2]}`;
          if (last === "font-size") add(base, name);
          else if (last === "line-height") add(`${base}--line-height`, name);
          else if (last === "font-weight") add(`${base}--font-weight`, name);
        }
      }
    }
  }
  for (const s of set.shadowStyles) add(`--${s.name.replace(/\//g, "-")}`, s.name);
  const head = opts.inlineCss ? toCss(set).trimEnd() : '@import "./vortex.css";';
  return [
    head,
    `@custom-variant dark (&:where([${MODE_ATTR}="dark"], [${MODE_ATTR}="dark"] *));`,
    `@theme inline {\n${lines.join("\n")}\n}`,
  ].join("\n\n") + "\n";
}
