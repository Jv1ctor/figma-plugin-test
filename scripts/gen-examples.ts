/** Regenerates examples/*.json from the protocol presets. */
import { writeFileSync } from "node:fs";
import { buildTheme, type BaseColor, type PrimaryChoice } from "../packages/protocol/src/index.ts";

const examples: Array<{ file: string; base: BaseColor; primary: PrimaryChoice; radius: number }> = [
  { file: "zinc", base: "zinc", primary: "base", radius: 0.625 },
  { file: "slate-blue", base: "slate", primary: "blue", radius: 0.5 },
  { file: "stone-orange", base: "stone", primary: "orange", radius: 0.75 },
];

for (const e of examples) {
  const path = new URL(`../examples/${e.file}.json`, import.meta.url);
  writeFileSync(path, JSON.stringify(buildTheme(e), null, 2) + "\n");
  console.log(`examples/${e.file}.json`);
}
