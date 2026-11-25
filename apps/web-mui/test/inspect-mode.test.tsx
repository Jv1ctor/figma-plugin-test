import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App.tsx";
import { setBaseValue } from "@token-bridge/tokens";
import { INSPECT_THROTTLE, pickTarget } from "../src/inspect/InspectLayer.tsx";
import { store } from "../src/state/store.ts";

INSPECT_THROTTLE.ms = 0;

afterEach(() => {
  cleanup();
  act(() => store.reset());
  act(() => store.update((s) => ({ ...s, inspect: false })));
});

async function enter(user: ReturnType<typeof userEvent.setup>, screenName?: string): Promise<void> {
  if (screenName) await user.click(screen.getByRole("tab", { name: screenName }));
  await user.click(screen.getByRole("button", { name: "Inspecionar" }));
}

function hover(el: Element): HTMLElement {
  fireEvent.pointerMove(el);
  return el as HTMLElement;
}

describe("modo Inspecionar", () => {
  it("hover num botão contained primary mostra property → token por estado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    hover(screen.getByRole("button", { name: "Criar conta" }));
    const card = await screen.findByRole("tooltip");
    expect(within(card).getAllByText("background/action/primary").length).toBeGreaterThan(0);
    expect(within(card).getByText("Hover")).toBeTruthy();
    expect(within(card).getAllByText("background/action/primary-hover").length).toBeGreaterThan(0);
  });

  it("Alert filled danger mostra fundo e texto", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Configurações");
    const alert = document.querySelector<HTMLElement>('[data-spot="alert-filled"] .MuiAlert-filledError')!;
    hover(alert);
    const card = await screen.findByRole("tooltip");
    expect(within(card).getAllByText("background/danger/strong").length).toBeGreaterThan(0);
    expect(within(card).getAllByText("text/on-danger-strong").length).toBeGreaterThan(0);
  });

  it("bloqueia o clique na vitrine", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Overlays");
    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Esc volta para Usar sem fechar o diálogo aberto", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Overlays" }));
    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    act(() => store.update((s) => ({ ...s, inspect: true })));
    await user.keyboard("{Escape}");
    expect(store.get().inspect).toBe(false);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("clicar no token leva ao editor e desliga Inspecionar", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    hover(screen.getByRole("button", { name: "Criar conta" }));
    const card = await screen.findByRole("tooltip");
    const focused: Array<string | undefined> = [];
    const unsubscribe = store.subscribe(() => focused.push(store.get().focusToken)); // a aba consome o focusToken logo em seguida
    const row = within(card).getAllByText("background/action/primary")[0]!.closest("button")!;
    await user.click(row);
    unsubscribe();
    expect(focused).toContain("semantic:background/action/primary");
    expect(store.get().inspect).toBe(false);
    expect(store.get().tab).toBe("semantic");
  });

  it("elemento sem token mostra o estado vazio", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    hover(screen.getByRole("tablist", { name: "Telas da vitrine" }));
    const card = await screen.findByRole("tooltip");
    expect(within(card).getByText("Nenhum token aplicado")).toBeTruthy();
  });

  it("o editor continua clicável com Inspecionar ligado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user);
    await user.click(screen.getByRole("tab", { name: "Semantic" }));
    expect(store.get().tab).toBe("semantic");
  });

  it("restaurar padrão não desliga Inspecionar", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user);
    act(() => store.reset());
    expect(store.get().inspect).toBe(true);
  });

  it("clique prende o cartão e a troca de modo solta", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    hover(screen.getByRole("button", { name: "Criar conta" }));
    await screen.findByRole("tooltip");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    hover(screen.getByRole("tablist", { name: "Telas da vitrine" }));
    expect(within(screen.getByRole("tooltip")).queryByText("Nenhum token aplicado")).toBeNull();
    act(() => store.update((s) => ({ ...s, mode: "dark" })));
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("o diálogo de Restaurar padrão do cabeçalho funciona em Inspecionar", async () => {
    const user = userEvent.setup();
    render(<App />);
    act(() => store.update((s) => ({ ...s, set: setBaseValue(s.set, "brand-1/600", "#16a34a") })));
    await enter(user);
    await user.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Restaurar" }));
    expect(store.get().set).toBe(store.get().seed);
    expect(store.get().inspect).toBe(true);
  });

  it("o seletor de ref do editor funciona em Inspecionar", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Semantic" }));
    await enter(user);
    const before = store.get().set;
    const select = screen.getAllByRole("combobox")[0]!;
    await user.click(select);
    const options = screen.getAllByRole("option");
    const other = options.find((o) => o.getAttribute("aria-selected") !== "true")!;
    await user.click(other);
    expect(store.get().set).not.toBe(before);
    expect(store.get().inspect).toBe(true);
  });

  it("trocar de tela pela tablist funciona em Inspecionar e solta o cartão", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    hover(screen.getByRole("button", { name: "Criar conta" }));
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(screen.getByRole("tooltip")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Gráficos" }));
    expect(screen.getByRole("tab", { name: "Gráficos" }).getAttribute("aria-selected")).toBe("true");
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("o cartão do Chip mostra os tokens do componente ao passar no rótulo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user);
    const label = Array.from(document.querySelectorAll<HTMLElement>("main .MuiChip-label")).find((e) => e.textContent === "Rascunho")!;
    hover(label);
    const card = await screen.findByRole("tooltip");
    const componente = within(card).getByText("Componente").closest("section")!;
    expect(within(componente).getAllByText("background/neutral/subtle").length).toBeGreaterThan(0);
    expect(within(componente).getAllByText("radius/full").length).toBeGreaterThan(0);
  });

  it("o cartão do TextField mostra a borda em Partes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    hover(document.querySelector<HTMLElement>("main .MuiTextField-root input")!);
    const card = await screen.findByRole("tooltip");
    const partes = within(card).getByText("Partes").closest("section")!;
    expect(within(partes).getAllByText("border/strong").length).toBeGreaterThan(0);
  });

  it("o cabeçalho não repete o componente quando não há peça", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    hover(screen.getByRole("tablist", { name: "Telas da vitrine" }));
    const card = await screen.findByRole("tooltip");
    expect(within(card).getAllByText("MuiTabs-root")).toHaveLength(1);
  });

  it("o cache não guarda o estado antigo entre Usar e Inspecionar", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    const box = () => document.querySelector<HTMLElement>("main .MuiCheckbox-root:not(.Mui-checked)")!;
    const target = box();
    hover(target);
    const first = (await screen.findByRole("tooltip")).textContent;
    await user.click(screen.getByRole("button", { name: "Usar" }));
    await user.click(target.querySelector("input")!);
    expect(target.classList.contains("Mui-checked")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Inspecionar" }));
    hover(target);
    await waitFor(() => expect(screen.getByRole("tooltip").textContent).not.toBe(first));
  });

  it("o seletor de fonte da aba Base funciona em Inspecionar", async () => {
    const user = userEvent.setup();
    act(() => store.update((s) => ({ ...s, tab: "base" })));
    render(<App />);
    await enter(user);
    const before = store.get().set;
    await user.click(screen.getByRole("combobox", { name: "Fonte primária" }));
    const other = screen.getAllByRole("option").find((o) => o.getAttribute("aria-selected") !== "true")!;
    await user.click(other);
    expect(store.get().set).not.toBe(before);
    expect(store.get().inspect).toBe(true);
  });

  it("o ícone dentro de um IconButton resolve para o IconButton", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user);
    hover(document.querySelector<HTMLElement>("main .MuiIconButton-root svg")!);
    const card = await screen.findByRole("tooltip");
    expect(within(card).queryByText("MuiSvgIcon-root")).toBeNull();
    expect(within(card).getAllByText("MuiIconButton-root").length).toBeGreaterThan(0);
  });

  it("Partes não lista as partes de componentes aninhados", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    const card = document.querySelector<HTMLElement>("main .MuiCard-root")!;
    expect(card.querySelector(".MuiTextField-root")).toBeTruthy();
    hover(card);
    const tip = await screen.findByRole("tooltip");
    expect(within(tip).queryByText("MuiOutlinedInput-notchedOutline")).toBeNull();
    hover(document.querySelector<HTMLElement>("main .MuiTextField-root input")!);
    await waitFor(() => expect(within(screen.getByRole("tooltip")).getAllByText("MuiOutlinedInput-notchedOutline").length).toBeGreaterThan(0));
  });

  it("o Card do Painel mostra a sombra shadow/raised", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user);
    hover(document.querySelector<HTMLElement>('main [data-spot="card"] .MuiCard-root')!);
    const card = await screen.findByRole("tooltip");
    expect(within(card).getAllByText("shadow/raised").length).toBeGreaterThan(0);
  });

  it("o papel do Dialog mostra shadow/overlay", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Overlays" }));
    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    act(() => store.update((st) => ({ ...st, inspect: true })));
    hover(document.querySelector<HTMLElement>(".MuiDialog-paper")!);
    const card = await screen.findByRole("tooltip");
    expect(within(card).getAllByText("shadow/overlay").length).toBeGreaterThan(0);
  });

  it("o TextField mostra borda e largura de foco em Partes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    hover(document.querySelector<HTMLElement>("main .MuiTextField-root input")!);
    const card = await screen.findByRole("tooltip");
    const partes = within(card).getByText("Partes").closest("section")!;
    expect(within(partes).getAllByText("border/focus").length).toBeGreaterThan(0);
    expect(within(partes).getAllByText("border-width/focus").length).toBeGreaterThan(0);
  });

  it("Espaço solto não ativa item de menu com Inspecionar ligado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Overlays" }));
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const item = screen.getByRole("menuitem", { name: "Editar" });
    act(() => store.update((s) => ({ ...s, inspect: true })));
    act(() => item.focus());
    await user.keyboard(" ");
    expect(screen.queryByRole("menu")).toBeTruthy();
  });

  it("o cabeçalho nomeia o componente específico", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user, "Cadastro");
    hover(screen.getByRole("button", { name: "Criar conta" }));
    const card = await screen.findByRole("tooltip");
    expect(within(card).getAllByText("MuiButton-root").length).toBeGreaterThan(0);
    expect(within(card).queryByText("MuiButtonBase-root")).toBeNull();
  });

  it("clicar numa sombra leva ao primeiro token do estilo na aba Semantic", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enter(user);
    hover(document.querySelector<HTMLElement>('main [data-spot="card"] .MuiCard-root')!);
    const card = await screen.findByRole("tooltip");
    const focused: Array<string | undefined> = [];
    const unsubscribe = store.subscribe(() => focused.push(store.get().focusToken));
    await user.click(within(card).getAllByText("shadow/raised")[0]!.closest("button")!);
    unsubscribe();
    expect(focused).toContain("semantic:shadow/raised/offset-x");
  });

  it("clicar num token da Base leva à aba Base", () => {
    const row = { state: "rest", property: "color", label: "texto", token: "brand-1/600", layer: "base", value: "#000", inherited: false } as const;
    expect(pickTarget(row)).toEqual({ tab: "base" });
    expect(pickTarget({ ...row, layer: "semantic", token: "shadow/overlay" })).toEqual({ tab: "semantic", focusToken: "semantic:shadow/overlay/offset-x" });
    expect(pickTarget({ ...row, layer: "semantic", token: "text/primary" })).toEqual({ tab: "semantic", focusToken: "semantic:text/primary" });
  });
});
