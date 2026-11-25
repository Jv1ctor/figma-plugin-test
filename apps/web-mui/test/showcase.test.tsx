import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { loadSeed, muiPaletteValues } from "@token-bridge/tokens";
import { App } from "../src/App.tsx";
import { Overlays } from "../src/showcase/Overlays.tsx";
import { Settings } from "../src/showcase/Settings.tsx";
import { SPOTS } from "../src/showcase/spots.ts";
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

describe("telas Configurações e Overlays", () => {
  afterEach(() => {
    cleanup();
    act(() => store.reset());
  });

  it("Configurações: 3 estilos × 4 paletas de Alert, cada um com role=alert", () => {
    render(<Wrapped><Settings /></Wrapped>);
    expect(screen.getAllByRole("alert")).toHaveLength(12);
    for (const id of ["alert-standard", "alert-filled", "alert-outlined"]) {
      expect(document.querySelectorAll(`[data-spot="${id}"] [role="alert"]`)).toHaveLength(4);
    }
    expect(emotionCss()).toContain("var(--vx-background-danger-subtle)");
  });

  it("Configurações: controles interativos renderizados", () => {
    render(<Wrapped><Settings /></Wrapped>);
    expect(screen.getAllByRole("switch").length).toBeGreaterThan(1);
    expect(screen.getAllByRole("slider").length).toBeGreaterThan(0);
    expect(screen.getByRole("navigation", { name: "Trilha de navegação" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Paginação" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Pergunta|Pagamento|Entrega/ }).length).toBeGreaterThan(0);
  });

  it("Overlays: o diálogo abre com o Backdrop Vortex", async () => {
    const user = userEvent.setup();
    render(<Wrapped><Overlays /></Wrapped>);
    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(emotionCss()).toContain("var(--vx-background-backdrop)");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
  });

  it("Overlays: menu, popover, snackbar, gaveta e tooltip", async () => {
    const user = userEvent.setup();
    render(<Wrapped><Overlays /></Wrapped>);

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Abrir popover" }));
    expect(screen.getByText("Conteúdo do popover")).toBeTruthy();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Mostrar snackbar" }));
    expect(screen.getByText("Alterações salvas")).toBeTruthy();

    await user.hover(screen.getByRole("button", { name: "Ajuda" }));
    expect((await screen.findByRole("tooltip")).textContent).toContain("Central de ajuda");

    await user.click(screen.getByRole("button", { name: "Abrir gaveta" }));
    const drawer = document.querySelector(".MuiDrawer-paper") as HTMLElement;
    expect(drawer).toBeTruthy();
    expect(within(drawer).getByText("Navegação")).toBeTruthy();
    await user.keyboard("{Escape}");

  });

  it("a vitrine tem abas internas e troca de tela", async () => {
    const user = userEvent.setup();
    render(<App />);
    const main = screen.getByRole("main", { name: "Vitrine" });
    const tabs = within(within(main).getByRole("tablist", { name: "Telas da vitrine" })).getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual(["Painel", "Cadastro", "Configurações", "Overlays"]);
    await user.click(within(main).getByRole("tab", { name: "Configurações" }));
    expect(within(main).getAllByRole("alert")).toHaveLength(12);
    await user.click(within(main).getByRole("tab", { name: "Overlays" }));
    expect(within(main).getByRole("button", { name: "Abrir diálogo" })).toBeTruthy();
  });

  it("todo spot renderizado existe em SPOTS e só lista tokens do seed", () => {
    render(<Wrapped><Settings /><Overlays /></Wrapped>);
    const ids = Array.from(document.querySelectorAll("[data-spot]"), (e) => e.getAttribute("data-spot")!);
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) expect(SPOTS, id).toHaveProperty(id);
    for (const [id, tokens] of Object.entries(SPOTS)) for (const t of tokens) expect(seed.semantic, `${id}: ${t}`).toHaveProperty([t]);
  });

  it("SPOTS: fixa as correções da revisão (overrides são a fonte)", () => {
    const has = (id: keyof typeof SPOTS, ...t: string[]) => { for (const x of t) expect(SPOTS[id], `${id} deve ter ${x}`).toContain(x); };
    const lacks = (id: keyof typeof SPOTS, ...t: string[]) => { for (const x of t) expect(SPOTS[id], `${id} não deve ter ${x}`).not.toContain(x); };
    // carregadas da Task 10
    has("chip-default", "space/small", "space/x-small", "typography/body/font-family");
    lacks("chip-default", "typography/body/small/font-size");
    lacks("checkbox", "space/x-small"); has("checkbox", "opacity/disabled", "text/secondary", "typography/body/small/font-size");
    lacks("radio", "space/x-small"); has("radio", "opacity/disabled", "text/secondary");
    has("card", "typography/heading/medium/font-size", "typography/heading/large/font-size");
    has("autocomplete", "typography/label/medium/font-size");
    lacks("button-text", "border/strong", "border-width/default");
    has("tabs", "opacity/disabled");
    // novas
    has("menu", "typography/label/medium/font-size");
    for (const id of ["alert-standard", "alert-filled", "alert-outlined"] as const) has(id, "typography/body/small/font-size");
    lacks("alert-filled", "text/primary");
    has("breadcrumbs", "typography/body/medium/font-size", "text/primary"); lacks("breadcrumbs", "typography/body/small/font-size");
    has("accordion", "shadow/raised/blur", "opacity/disabled");
    has("snackbar", "shadow/raised/blur", "typography/body/small/font-size");
    has("toggle-button", "opacity/disabled"); has("icon-button", "opacity/disabled");
    has("pagination", "typography/body/small/font-size"); lacks("pagination", "radius/xx-small", "border-width/default");
    has("stepper", "typography/body/small/font-size");
    has("fab", "background/action/primary"); lacks("fab", "background/action/primary-hover", "background/action/primary-pressed", "text/on-action-primary");
    has("button-group", "background/action/tertiary-hover", "background/action/tertiary-pressed", "space/medium");
    has("dialog", "text/secondary");
  });

  it("Overlays: cada Spot tem conteúdo em fluxo (gatilho) e nenhum Spot fica vazio", () => {
    render(<Wrapped><Overlays /></Wrapped>);
    const triggers = { dialog: "Abrir diálogo", menu: "Abrir menu", popover: "Abrir popover", snackbar: "Mostrar snackbar", drawer: "Abrir gaveta" };
    for (const [id, name] of Object.entries(triggers)) {
      const spot = screen.getByRole("button", { name }).closest("[data-spot]")!;
      expect(spot.getAttribute("data-spot"), name).toBe(id);
    }
    for (const spot of document.querySelectorAll("[data-spot]")) expect(spot.childElementCount, spot.getAttribute("data-spot")!).toBeGreaterThan(0);
  });
});
