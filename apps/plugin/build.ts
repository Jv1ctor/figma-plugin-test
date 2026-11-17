import { build, context, type BuildOptions } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

// The plugin sandbox (QuickJS-ish) is conservative: lower syntax to ES2017.
const main: BuildOptions = {
  entryPoints: [join(root, "src/code.ts")],
  outfile: join(root, "dist/code.js"),
  bundle: true,
  format: "iife",
  target: "es2017",
  logLevel: "info",
};

const uiScript: BuildOptions = {
  entryPoints: [join(root, "src/ui.ts")],
  bundle: true,
  format: "iife",
  target: "es2020",
  write: false,
  minify: !watch,
};

async function buildUi() {
  const [result, template] = await Promise.all([build(uiScript), readFile(join(root, "src/ui.html"), "utf8")]);
  const js = result.outputFiles![0]!.text.replace(/<\/script/gi, "<\\/script");
  await mkdir(join(root, "dist"), { recursive: true });
  await writeFile(join(root, "dist/ui.html"), template.replace("/*__UI_SCRIPT__*/", () => js));
  console.log(`  dist/ui.html  ${(js.length / 1024).toFixed(1)}kb (inline script)`);
}

if (watch) {
  const ctx = await context(main);
  await ctx.watch();
  const uiCtx = await context({
    ...uiScript,
    plugins: [{ name: "inline-ui", setup: (b) => b.onEnd(() => void buildUi()) }],
  });
  await uiCtx.watch();
  console.log("watching…");
} else {
  await Promise.all([build(main), buildUi()]);
}
