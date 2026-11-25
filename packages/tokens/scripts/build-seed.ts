import { readFileSync, writeFileSync } from "node:fs";
import { toDtcg } from "../src/dtcg.ts";
import { fromFigmaExport } from "../src/raw.ts";

const from = new URL("../seed/figma-export.json", import.meta.url);
const to = new URL("../seed/vortex.tokens.json", import.meta.url);
const set = fromFigmaExport(JSON.parse(readFileSync(from, "utf8")));
writeFileSync(to, JSON.stringify(toDtcg(set), null, 2) + "\n");
console.log(`seed escrito: ${Object.keys(set.base).length} base, ${Object.keys(set.semantic).length} semantic`);
