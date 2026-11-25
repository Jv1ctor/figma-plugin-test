import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { setBaseValue } from "@token-bridge/tokens";
import { Header } from "../src/shell/Header.tsx";
import { ResetButton } from "../src/shell/ResetButton.tsx";
import { store } from "../src/state/store.ts";

afterEach(() => {
  cleanup();
  act(() => store.reset());
});

function edit(): void {
  store.update((s) => ({ ...s, set: setBaseValue(s.set, "brand-1/600", "#16a34a") }));
}

describe("ResetButton", () => {
  it("restaura o padrão do laboratório depois de confirmar", async () => {
    const user = userEvent.setup();
    render(<ResetButton />);
    edit();
    expect(store.get().set).not.toBe(store.get().seed);

    await user.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Restaurar o padrão do laboratório?")).toBeTruthy();
    expect(within(dialog).getByText(/As edições atuais serão perdidas/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Restaurar" }));

    expect(store.get().set).toBe(store.get().seed);
  });

  it("cancelar fecha o diálogo sem alterar o estado", async () => {
    const user = userEvent.setup();
    render(<ResetButton />);
    edit();
    const edited = store.get().set;

    await user.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));

    expect(store.get().set).toBe(edited);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("fica no cabeçalho, antes do menu Exportar", () => {
    render(<Header />);
    const reset = screen.getByRole("button", { name: "Restaurar padrão" });
    const exportar = screen.getByRole("button", { name: /Exportar/ });
    expect(reset.compareDocumentPosition(exportar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
