import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { loadSeed, muiPaletteValues } from "@token-bridge/tokens";
import { WarningsDrawer } from "../src/editor/WarningsDrawer.tsx";
import { store } from "../src/state/store.ts";
import { createVortexTheme } from "../src/theme/createVortexTheme.ts";

const seed = loadSeed();
const pal = { light: muiPaletteValues(seed, "light"), dark: muiPaletteValues(seed, "dark") };
function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={createVortexTheme(pal)} defaultMode="light" storageManager={null}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

describe("WarningsDrawer", () => {
  afterEach(() => {
    cleanup();
    act(() => store.reset());
    act(() => store.update((s) => ({ ...s, tab: "base", warningsOpen: false })));
  });

  it("clicar num aviso troca a aba, define focusToken e fecha", async () => {
    const user = userEvent.setup();
    act(() => store.update((s) => ({
      ...s, warningsOpen: true,
      warnings: [{ id: "w1", rule: "contrast-text", token: "semantic:text/primary", mode: "light", message: "Contraste baixo" }],
    })));
    render(<Providers><WarningsDrawer /></Providers>);
    expect(screen.getByRole("heading", { name: /Contraste de texto/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Contraste baixo/ }));
    expect(store.get().tab).toBe("semantic");
    expect(store.get().focusToken).toBe("semantic:text/primary");
    expect(store.get().warningsOpen).toBe(false);
  });

  it("avisos de specific e base levam à aba certa", async () => {
    const user = userEvent.setup();
    act(() => store.update((s) => ({
      ...s, warningsOpen: true,
      warnings: [{ id: "w2", rule: "specific-name", token: "specific:foo/bar", message: "Palavra nova" }],
    })));
    render(<Providers><WarningsDrawer /></Providers>);
    await user.click(screen.getByRole("button", { name: /Palavra nova/ }));
    expect(store.get().tab).toBe("specific");
  });
});
