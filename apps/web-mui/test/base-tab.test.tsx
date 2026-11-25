import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { loadSeed, muiPaletteValues, upsertSpecific } from "@token-bridge/tokens";
import { BaseTab } from "../src/editor/BaseTab.tsx";
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
const base = (name: string) => store.get().set.base[name]!.value;

describe("BaseTab", () => {
  afterEach(() => {
    cleanup();
    act(() => store.reset());
  });

  it("gera a escala a partir do hex", async () => {
    const user = userEvent.setup();
    render(<Providers><BaseTab /></Providers>);
    const before = base("brand-1/600");
    const input = screen.getByLabelText("Hex de brand-1");
    await user.clear(input);
    await user.type(input, "#16a34a");
    await user.click(screen.getByRole("button", { name: "Gerar escala de brand-1" }));
    expect(base("brand-1/600")).not.toBe(before);
    expect(screen.queryByLabelText("Hex de space")).toBeNull();
  });

  it("o campo de hex acompanha o set depois de reset", async () => {
    const user = userEvent.setup();
    render(<Providers><BaseTab /></Providers>);
    const seedHex = String(base("brand-1/600"));
    const input = screen.getByLabelText("Hex de brand-1") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "#16a34a");
    await user.click(screen.getByRole("button", { name: "Gerar escala de brand-1" }));
    expect(base("brand-1/600")).not.toBe(seedHex);
    act(() => store.reset());
    expect((screen.getByLabelText("Hex de brand-1") as HTMLInputElement).value).toBe(seedHex);
  });

  it("hex inválido mostra erro e não altera o estado", async () => {
    const user = userEvent.setup();
    render(<Providers><BaseTab /></Providers>);
    const set = store.get().set;
    const input = screen.getByLabelText("Hex de brand-1");
    await user.clear(input);
    await user.type(input, "xyz");
    await user.click(screen.getByRole("button", { name: "Gerar escala de brand-1" }));
    expect(screen.getByText("Hex inválido. Use o formato #rrggbb.")).toBeTruthy();
    expect(store.get().set).toBe(set);
  });

  it("edita um passo pela amostra", async () => {
    const user = userEvent.setup();
    render(<Providers><BaseTab /></Providers>);
    await user.click(screen.getByRole("button", { name: "brand-1/600" }));
    const field = screen.getByLabelText("Hex do passo brand-1/600");
    await user.clear(field);
    await user.type(field, "#112233");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(base("brand-1/600")).toBe("#112233");
  });

  it("neutral /0 e /1000 são somente leitura", () => {
    render(<Providers><BaseTab /></Providers>);
    expect(screen.queryByRole("button", { name: "neutral/0" })).toBeNull();
    expect(screen.queryByRole("button", { name: "neutral/1000" })).toBeNull();
    expect(screen.getByRole("button", { name: "neutral/500" })).toBeTruthy();
  });

  it("liga e desliga uma paleta opcional", async () => {
    const user = userEvent.setup();
    render(<Providers><BaseTab /></Providers>);
    const sw = screen.getByRole("switch", { name: "Ativar brand-4" });
    const wasOn = (sw as HTMLInputElement).checked;
    await user.click(sw);
    expect(store.get().set.disabledGroups.includes("brand-4")).toBe(wasOn);
  });

  it("bloqueio mostra Alert com os specifics", async () => {
    const user = userEvent.setup();
    const semantic = seed.semantic["background/canvas"]!;
    const ref = Object.keys(seed.base).find((n) => n.startsWith("brand-3/"))!;
    act(() => store.update((s) => ({
      ...s,
      set: upsertSpecific(s.set, { ...semantic, name: "background/reading", values: { light: ref, dark: ref } }),
    })));
    render(<Providers><BaseTab /></Providers>);
    await user.click(screen.getByRole("switch", { name: "Ativar brand-3" }));
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText(/background\/reading/)).toBeTruthy();
    expect(store.get().set.disabledGroups.includes("brand-3")).toBe(false);
  });

  it("travados ficam recolhidos e só para leitura", async () => {
    const user = userEvent.setup();
    render(<Providers><BaseTab /></Providers>);
    await user.click(screen.getByRole("button", { name: /Travado/ }));
    expect(screen.getByText("danger")).toBeTruthy();
    expect(screen.getByText("space")).toBeTruthy();
    expect(screen.queryByLabelText("Hex de danger")).toBeNull();
  });

  it("troca a fonte primária", async () => {
    const user = userEvent.setup();
    render(<Providers><BaseTab /></Providers>);
    await user.click(screen.getByRole("combobox", { name: "Fonte primária" }));
    await user.click(screen.getByRole("option", { name: "Inter" }));
    expect(base("font-family/primary")).toBe("Inter");
    expect(document.head.querySelector('link[href*="family=Inter"]')).toBeTruthy();
  });

  it("avisos da base aparecem como ícone no cartão", () => {
    act(() => store.update((s) => ({
      ...s,
      warnings: [{ id: "x", rule: "contrast" as never, token: "base:brand-1/600", message: "aviso de teste" }],
    })));
    render(<Providers><BaseTab /></Providers>);
    expect(screen.getByLabelText("1 aviso em brand-1")).toBeTruthy();
  });
});
