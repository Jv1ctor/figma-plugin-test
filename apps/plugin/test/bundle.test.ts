import { describe, expect, it } from "vitest";
import { build } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("main bundle", () => {
  it("does not embed the seed and stays under 150 KB", async () => {
    const res = await build({
      entryPoints: [join(root, "src/code.ts")],
      bundle: true, format: "iife", target: "es2017", write: false, minify: true, logLevel: "silent",
    });
    const out = res.outputFiles![0]!;
    expect(out.text).not.toContain("Uso: Texto principal");
    expect(out.contents.byteLength).toBeLessThan(150 * 1024);
  });
});
