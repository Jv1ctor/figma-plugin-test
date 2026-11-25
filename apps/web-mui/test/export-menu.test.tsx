import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExportMenu } from "../src/export/ExportMenu.tsx";
import { store } from "../src/state/store.ts";

describe("ExportMenu", () => {
  it("lista os exports e restaura o padrão depois de confirmar", async () => {
    render(<ExportMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Exportar/ }));
    for (const name of ["Baixar tokens (DTCG JSON)", "Baixar CSS vars", "Baixar Tailwind v4", "Baixar tema MUI", "Importar JSON…"]) {
      expect(screen.getByRole("menuitem", { name })).toBeTruthy();
    }
    const edited = { ...store.get().seed };
    store.replaceSet(edited);
    expect(store.get().set).toBe(edited);
    fireEvent.click(screen.getByRole("menuitem", { name: "Restaurar padrão do laboratório" }));
    expect(screen.getByText(/As edições atuais serão perdidas/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    await waitFor(() => expect(store.get().set).toBe(store.get().seed));
  });
});
