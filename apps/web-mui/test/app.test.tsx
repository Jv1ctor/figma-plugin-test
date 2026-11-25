import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { loadSeed, muiPaletteValues, setBaseValue } from "@token-bridge/tokens";
import { App } from "../src/App.tsx";
import { store } from "../src/state/store.ts";
import { createVortexTheme } from "../src/theme/createVortexTheme.ts";
import { cssText, emotionCss } from "./helpers.ts";

describe("App", () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    act(() => store.reset());
  });

  it("publica as vars Vortex e o tema-base", () => {
    render(<App />);
    expect(cssText()).toContain("--vx-text-primary");
    const css = emotionCss();
    expect(css).toContain("var(--vx-shadow-raised)");
    expect(css).toContain("var(--vx-shadow-overlay)");
    expect(css).toContain("var(--vx-background-canvas)");
    expect(css).toContain('[data-mode="dark"]');
    expect(css).not.toMatch(/var\(--vx-base-/);
  });

  it("mantém as vars no StrictMode (inicializadores chamados duas vezes)", () => {
    render(<StrictMode><App /></StrictMode>);
    expect(cssText()).toContain("--vx-text-primary");
  });

  it("atualiza as vars na hora e recria a palette do tema com debounce de 150 ms", () => {
    vi.useFakeTimers();
    render(<App />);
    act(() => store.update((s) => ({ ...s, set: setBaseValue(s.set, "brand-1/600", "#16a34a") })));
    expect(cssText()).toContain("--vx-base-brand-1-600: #16a34a");
    expect(emotionCss()).not.toContain("#16a34a");
    act(() => vi.advanceTimersByTime(149));
    expect(emotionCss()).not.toContain("#16a34a");
    act(() => vi.advanceTimersByTime(1));
    expect(emotionCss()).toContain("--mui-palette-primary-main:#16a34a");
  });

  it("mostra o cabeçalho e troca o modo da vitrine", () => {
    render(<App />);
    expect(screen.getByText("Vortex Builder")).toBeTruthy();
    for (const name of ["Base", "Semantic", "Specific"]) expect(screen.getByRole("tab", { name })).toBeTruthy();
    expect((screen.getByRole("button", { name: /Exportar/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /escuro/ }));
    expect(store.get().mode).toBe("dark");
    expect(document.documentElement.dataset.mode).toBe("dark");
    fireEvent.click(screen.getByRole("tab", { name: "Semantic" }));
    expect(store.get().tab).toBe("semantic");
  });

  it("o botão de avisos mostra a contagem e abre o drawer", () => {
    render(<App />);
    act(() => store.update((s) => ({ ...s, set: { ...s.set, disabledGroups: ["brand-2"] } })));
    const btn = screen.getByRole("button", { name: /Avisos/ });
    expect(btn.textContent).toContain(String(store.get().warnings.length));
    fireEvent.click(btn);
    expect(store.get().warningsOpen).toBe(true);
  });
});

describe("createVortexTheme", () => {
  const seed = loadSeed();
  const pal = { light: muiPaletteValues(seed, "light"), dark: muiPaletteValues(seed, "dark") };

  it("usa o seletor data-mode e a palette resolvida", () => {
    const theme = createVortexTheme(pal);
    expect(theme.colorSchemeSelector).toBe('[data-mode="%s"]');
    expect(theme.colorSchemes.light!.palette.primary.main).toBe(pal.light.primary);
    expect(theme.colorSchemes.dark!.palette.primary.main).toBe(pal.dark.primary);
    expect(theme.shadows).toHaveLength(25);
    expect(theme.shadows[0]).toBe("none");
    expect(theme.shadows[11]).toBe("var(--vx-shadow-raised)");
    expect(theme.shadows[12]).toBe("var(--vx-shadow-overlay)");
    expect(theme.typography.button.textTransform).toBe("none");
    expect(theme.typography.h1.fontSize).toBe("var(--vx-typography-display-large-font-size)");
    expect(theme.typography.body2.fontSize).toBe("var(--vx-typography-body-small-font-size)");
    expect(theme.components?.MuiButtonBase?.defaultProps?.disableRipple).toBe(true);
  });

  it("secondary nulo volta ao padrão do MUI", () => {
    const theme = createVortexTheme({ light: { ...pal.light, secondary: null }, dark: { ...pal.dark, secondary: null } });
    expect(createVortexTheme(pal).colorSchemes.light!.palette.secondary.main).toBe(pal.light.secondary);
    expect(theme.colorSchemes.light!.palette.secondary.main).toBe("#9c27b0"); // padrão do MUI
  });
});
