import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setBaseValue } from "@token-bridge/tokens";
import type { TokenSet } from "@token-bridge/tokens";
import { diffSets } from "@token-bridge/tokens";
import { ExportMenu } from "../src/export/ExportMenu.tsx";
import { Header } from "../src/shell/Header.tsx";
import { FigmaBanner } from "../src/sync/FigmaBanner.tsx";
import { FigmaStatus } from "../src/sync/FigmaStatus.tsx";
import * as actions from "../src/sync/actions.ts";
import { RelayError } from "../src/sync/relay-client.ts";
import { SyncFeedback } from "../src/sync/SyncFeedback.tsx";
import { syncStore } from "../src/sync/sync-store.ts";
import { store } from "../src/state/store.ts";

const initialSync = syncStore.get();
const status = (over: Record<string, unknown> = {}) => ({ plugin: "connected" as const, queued: false, tokensQueued: false, ...over });

beforeEach(() => {
  vi.spyOn(actions, "sendToFigma").mockResolvedValue({ kind: "queued" });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  act(() => {
    store.reset();
    syncStore.update({ ...initialSync });
  });
});

const edited = (): TokenSet => setBaseValue(store.get().seed, "brand-1/600", "#16a34a");

describe("sync UI", () => {
  it("status pill shows the 4 states", () => {
    render(<FigmaStatus />);
    act(() => syncStore.update({ relay: { socket: "closed", status: null } }));
    expect(screen.getByText("Relay offline")).toBeTruthy();
    act(() => syncStore.update({ relay: { socket: "open", status: status({ plugin: "disconnected" }) } }));
    expect(screen.getByText("Figma offline")).toBeTruthy();
    act(() => syncStore.update({ relay: { socket: "open", status: status({ plugin: "disconnected", tokensQueued: true }) } }));
    expect(screen.getByText("Na fila")).toBeTruthy();
    act(() => syncStore.update({ relay: { socket: "open", status: status() } }));
    expect(screen.getByText("Figma conectado")).toBeTruthy();
  });

  it("send dialog lists diff, unknown-state note and tombstones; unchecking excludes a removal", async () => {
    const user = userEvent.setup();
    const seed = store.get().seed;
    act(() => {
      store.update((s) => ({ ...s, set: edited(), removedSpecifics: ["btn-a", "btn-b"] }));
      syncStore.update({ synced: seed, relay: { socket: "open", status: status() } });
    });
    render(<Header />);
    await user.click(screen.getByRole("button", { name: "Enviar para o Figma" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Base: 0 novos · 1 alterados · 0 removidos/)).toBeTruthy();
    expect(within(dialog).getByText(/Estilos: 0 novos · 0 alterados · 0 removidos/)).toBeTruthy();
    expect(within(dialog).getByText("Remover do Figma")).toBeTruthy();
    await user.click(within(dialog).getByRole("checkbox", { name: "btn-b" }));
    await user.click(within(dialog).getByRole("button", { name: "Enviar" }));
    expect(actions.sendToFigma).toHaveBeenCalledWith({ remove: ["btn-a"] });
  });

  it("send dialog shows unknown-state, offline warning and disables Enviar while sending", async () => {
    const user = userEvent.setup();
    act(() => syncStore.update({ synced: null, relay: { socket: "open", status: status({ plugin: "disconnected" }) } }));
    render(<Header />);
    await user.click(screen.getByRole("button", { name: "Enviar para o Figma" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Estado do Figma desconhecido: tudo será enviado")).toBeTruthy();
    expect(within(dialog).getByText("Na fila: será aplicado quando o plugin reconectar")).toBeTruthy();
    expect(within(dialog).getByRole("switch", { name: "Envio automático" })).toBeTruthy();
    act(() => syncStore.update({ sending: true }));
    expect((within(dialog).getByRole("button", { name: "Enviar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("send dialog hides the queued note when the relay itself is down", async () => {
    const user = userEvent.setup();
    act(() => syncStore.update({ synced: null, relay: { socket: "closed", status: null } }));
    render(<Header />);
    await user.click(screen.getByRole("button", { name: "Enviar para o Figma" }));
    expect(within(screen.getByRole("dialog")).queryByText("Na fila: será aplicado quando o plugin reconectar")).toBeNull();
  });

  it("send dialog re-checks tombstones every time it opens", async () => {
    const user = userEvent.setup();
    act(() => {
      store.update((s) => ({ ...s, removedSpecifics: ["btn-a"] }));
      syncStore.update({ synced: store.get().seed, relay: { socket: "open", status: status() } });
    });
    render(<Header />);
    await user.click(screen.getByRole("button", { name: "Enviar para o Figma" }));
    let dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("checkbox", { name: "btn-a" }));
    expect((within(dialog).getByRole("checkbox", { name: "btn-a" }) as HTMLInputElement).checked).toBe(false);
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(screen.getByRole("button", { name: "Enviar para o Figma" }));
    dialog = screen.getByRole("dialog");
    expect((within(dialog).getByRole("checkbox", { name: "btn-a" }) as HTMLInputElement).checked).toBe(true);
  });

  it("ack snackbar shows counts and opens warnings dialog", async () => {
    const user = userEvent.setup();
    render(<SyncFeedback />);
    act(() => syncStore.update({
      result: {
        kind: "ack",
        ack: {
          for: "upsert-tokens", variables: { created: 3, updated: 2, unchanged: 0, removed: 1 },
          styles: { created: 0, updated: 0, unchanged: 0 }, warnings: ["aviso um", "aviso dois"], tokens: {}, durationMs: 1,
        },
      },
    }));
    expect(screen.getByText("Figma atualizado · 3 criadas · 2 atualizadas · 1 removidas")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "ver avisos (2)" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Avisos do Figma")).toBeTruthy();
    expect(within(dialog).getByText("aviso dois")).toBeTruthy();
  });

  it("queued, timeout and generic error messages", () => {
    render(<SyncFeedback />);
    act(() => syncStore.update({ result: { kind: "queued" } }));
    expect(screen.getByText("Na fila: será aplicado quando o plugin reconectar")).toBeTruthy();
    act(() => syncStore.update({ result: { kind: "timeout" } }));
    expect(screen.getByText("Sem resposta do plugin ainda; o status avisará quando aplicar")).toBeTruthy();
    act(() => syncStore.update({ result: { kind: "error", error: { code: "figma", message: "falhou x" } } }));
    expect(screen.getByText("falhou x")).toBeTruthy();
  });

  it("mode-limit error shows the plan message", () => {
    render(<SyncFeedback />);
    act(() => syncStore.update({ result: { kind: "error", error: { code: "mode-limit", message: "x" } } }));
    expect(screen.getByText("O arquivo do Figma só permite 1 modo por coleção (plano Starter). Use um arquivo em plano Professional ou superior.")).toBeTruthy();
  });

  it("banner appears only with a diff; buttons call importFromFigma / keepDraft", async () => {
    const user = userEvent.setup();
    const imp = vi.spyOn(actions, "importFromFigma").mockImplementation(() => {});
    const keep = vi.spyOn(actions, "keepDraft").mockImplementation(() => {});
    render(<FigmaBanner />);
    expect(screen.queryByRole("alert")).toBeNull();
    const snapshot = edited();
    const diff = diffSets(store.get().set, snapshot);
    act(() => syncStore.update({ banner: { diff, snapshot, warnings: [] } }));
    expect(screen.getByText(`O Figma tem ${diff.total} diferenças em relação ao seu rascunho`)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Importar do Figma" }));
    expect(imp).toHaveBeenCalledWith(snapshot);
    await user.click(screen.getByRole("button", { name: "Manter meu rascunho" }));
    expect(keep).toHaveBeenCalled();
  });

  it("Importar do Figma… opens confirmation with diff and warnings", async () => {
    const user = userEvent.setup();
    const snapshot = setBaseValue(store.get().set, "brand-1/600", "#16a34a");
    vi.spyOn(actions, "fetchSnapshot").mockResolvedValue({ set: snapshot, warnings: ["snap warn"] });
    const imp = vi.spyOn(actions, "importFromFigma").mockImplementation(() => {});
    render(<ExportMenu />);
    await user.click(screen.getByRole("button", { name: /Exportar/ }));
    await user.click(screen.getByRole("menuitem", { name: "Importar do Figma…" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Importar do Figma")).toBeTruthy();
    expect(within(dialog).getByText(/Base: 0 novos · 1 alterados · 0 removidos/)).toBeTruthy();
    expect(within(dialog).getByText("snap warn")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Importar" }));
    expect(imp).toHaveBeenCalledWith(snapshot);
  });

  it("Importar do Figma… shows the error message when the snapshot fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(actions, "fetchSnapshot").mockRejectedValue(new RelayError({ code: "plugin-offline", message: "plugin fora" }));
    render(<ExportMenu />);
    await user.click(screen.getByRole("button", { name: /Exportar/ }));
    await user.click(screen.getByRole("menuitem", { name: "Importar do Figma…" }));
    await waitFor(() => expect(screen.getByText("plugin fora")).toBeTruthy());
  });
});
