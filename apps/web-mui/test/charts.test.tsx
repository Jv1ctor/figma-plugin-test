import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { loadSeed, muiPaletteValues } from "@token-bridge/tokens";
import { App } from "../src/App.tsx";
import { Charts } from "../src/showcase/Charts.tsx";
import { store } from "../src/state/store.ts";
import { createVortexTheme } from "../src/theme/createVortexTheme.ts";
import { emotionCss } from "./helpers.ts";

const seed = loadSeed();
const pal = { light: muiPaletteValues(seed, "light"), dark: muiPaletteValues(seed, "dark") };

function Wrapped({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={createVortexTheme(pal)} defaultMode="light" storageManager={null}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

describe("tela Gráficos", () => {
  afterEach(() => {
    cleanup();
    act(() => store.reset());
  });

  it("consome data/* como var(), nunca base", () => {
    render(<Wrapped><Charts /></Wrapped>);
    const css = emotionCss() + document.body.innerHTML;
    for (let n = 1; n <= 6; n++) expect(css).toContain(`var(--vx-data-categorical-${n})`);
    for (let n = 1; n <= 5; n++) expect(css).toContain(`var(--vx-data-sequential-${n})`);
    expect(css).not.toMatch(/var\(--vx-base-/);
    expect(screen.getByText("80–100%")).toBeTruthy();
  });

  it("grupo data desligado mostra estado vazio e leva à Base", async () => {
    const user = userEvent.setup();
    render(<Wrapped><Charts /></Wrapped>);
    act(() => store.update((s) => ({ ...s, set: { ...s.set, disabledGroups: ["data"] } })));
    expect(screen.getByText("Gráficos desligados na Base (grupo data)")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ir para a Base" }));
    expect(store.get().tab).toBe("base");
  });

  it("a vitrine tem a aba", () => {
    render(<App />);
    expect(screen.getByRole("tab", { name: "Gráficos" })).toBeTruthy();
  });
});
