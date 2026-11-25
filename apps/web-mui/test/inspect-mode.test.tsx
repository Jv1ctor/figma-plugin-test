import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App.tsx";
import { INSPECT_THROTTLE } from "../src/inspect/InspectLayer.tsx";
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
});
