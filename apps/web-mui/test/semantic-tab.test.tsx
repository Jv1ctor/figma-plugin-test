import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { loadSeed, muiPaletteValues, setBaseValue } from "@token-bridge/tokens";
import { SemanticTab } from "../src/editor/SemanticTab.tsx";
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
const sem = (n: string) => store.get().set.semantic[n]!;

describe("SemanticTab", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    cleanup();
    act(() => store.reset());
  });

  it("mostra o aviso de contraste e troca a referência pelo seletor", async () => {
    const user = userEvent.setup();
    act(() => store.update((s) => ({ ...s, set: setBaseValue(s.set, "brand-1/600", "#facc15") })));
    render(<Providers><SemanticTab /></Providers>);
    await user.click(screen.getByRole("tab", { name: "text" }));
    const row = screen.getByRole("row", { name: /text\/on-action-primary/ });
    expect(within(row).getByText(/⚠/)).toBeTruthy();
    expect(row.textContent).toMatch(/claro \d+,\d · escuro \d+,\d/);
    expect(store.get().warnings.some((w) => w.token === "semantic:text/on-action-primary" && w.mode === "light" && w.against === "background/action/primary")).toBe(true);
    await user.click(within(row).getByLabelText("claro"));
    await user.click(screen.getByRole("option", { name: "neutral/900" }));
    expect(sem("text/on-action-primary").values.light).toBe("neutral/900");
    // hover/pressed seguem a escala amarela gerada e continuam abaixo de 4,5: só o par com o fundo -primary some
    const light = (against: string) => store.get().warnings.some((w) => w.token === "semantic:text/on-action-primary" && w.mode === "light" && w.against === against);
    expect(light("background/action/primary")).toBe(false);
  });

  it("lista só refs de grupos permitidos e não desligados", async () => {
    const user = userEvent.setup();
    act(() => store.update((s) => ({ ...s, set: { ...s.set, disabledGroups: ["brand-2"] } })));
    render(<Providers><SemanticTab /></Providers>);
    await user.click(screen.getByRole("tab", { name: "text" }));
    await user.click(within(screen.getByRole("row", { name: /text\/primary$/ })).getByLabelText("claro"));
    expect(screen.getByRole("option", { name: "brand-1/600" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "brand-2/600" })).toBeNull();
    expect(screen.queryByRole("option", { name: "space/large" })).toBeNull();
  });

  it("esconde a sub-aba data e as linhas de tokens desligados", () => {
    act(() => store.update((s) => ({ ...s, set: { ...s.set, disabledGroups: ["data", "brand-2"] } })));
    render(<Providers><SemanticTab /></Providers>);
    expect(screen.queryByRole("tab", { name: "data" })).toBeNull();
    expect(screen.getByRole("tab", { name: "shadow" })).toBeTruthy();
  });

  it("clicar no nome expande a descrição com o Valor recalculado", async () => {
    const user = userEvent.setup();
    render(<Providers><SemanticTab /></Providers>);
    await user.click(screen.getByRole("tab", { name: "text" }));
    const row = screen.getByRole("row", { name: /text\/primary$/ });
    await user.click(within(row).getByRole("button", { name: "text/primary" }));
    expect(within(row).getByText("Uso")).toBeTruthy();
    await user.click(within(row).getByLabelText("claro"));
    await user.click(screen.getByRole("option", { name: "neutral/800" }));
    expect(within(row).getByText(/neutral\/800 \| /)).toBeTruthy();
  });

  it("agrupa typography por estilo e edita a parte do composto em shadow", async () => {
    const user = userEvent.setup();
    render(<Providers><SemanticTab /></Providers>);
    await user.click(screen.getByRole("tab", { name: "typography" }));
    const group = screen.getByRole("group", { name: "body/medium" });
    expect(within(group).getByRole("row", { name: /typography\/body\/medium\/font-size/ })).toBeTruthy();
    expect(within(group).getByRole("row", { name: /typography\/body\/font-family/ })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "shadow" }));
    const row = screen.getByRole("row", { name: /shadow\/raised\/color/ });
    await user.click(within(row).getByLabelText("claro opacidade"));
    await user.click(screen.getByRole("option", { name: /^opacity\/30/ }));
    const v = sem("shadow/raised/color").values.light;
    expect(typeof v === "object" && v.opacity).toBe("opacity/30");
  });

  it("focusToken troca a sub-aba, rola até a linha, destaca e limpa", () => {
    render(<Providers><SemanticTab /></Providers>);
    act(() => store.update((s) => ({ ...s, focusToken: "semantic:border/focus" })));
    expect(screen.getByRole("tab", { name: "border", selected: true })).toBeTruthy();
    const row = screen.getByRole("row", { name: /border\/focus/ });
    expect(row.getAttribute("data-highlighted")).toBe("true");
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    expect(store.get().focusToken).toBeUndefined();
  });
});
