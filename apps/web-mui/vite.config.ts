import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  test: { environment: "jsdom", testTimeout: 20000 }, // MUI + user-event ficam lentos com os arquivos rodando em paralelo
});
