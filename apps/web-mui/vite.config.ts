import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const VIRTUAL_ID = "virtual:vortex-theme-source";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const THEME_ENTRY = fileURLToPath(new URL("./src/theme/createVortexTheme.ts", import.meta.url));

/** Expõe o tema Vortex empacotado (só @mui/material fica de fora) como string, para o export "tema MUI" (spec §10). */
function vortexThemeSource() {
  return {
    name: "vortex-theme-source",
    resolveId(id: string) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    async load(id: string) {
      if (id !== RESOLVED_ID) return undefined;
      const result = await build({
        entryPoints: [THEME_ENTRY],
        bundle: true,
        format: "esm",
        platform: "browser",
        external: ["@mui/material", "@mui/material/*"],
        write: false,
      });
      return `export default ${JSON.stringify(result.outputFiles[0]!.text)};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), vortexThemeSource()],
  server: { port: 5174 },
  test: { environment: "jsdom", testTimeout: 20000 }, // MUI + user-event ficam lentos com os arquivos rodando em paralelo
});
