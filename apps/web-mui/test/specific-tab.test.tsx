import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { loadSeed, muiPaletteValues } from "@token-bridge/tokens";
import { SpecificTab } from "../src/editor/SpecificTab.tsx";
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

describe("SpecificTab", () => {
  afterEach(() => {
    cleanup();
    act(() => store.reset());
  });

  it("nome igual ao de um semantic: aviso ao digitar e Alert ao criar, sem criar", async () => {
    const user = userEvent.setup();
    render(<Providers><SpecificTab /></Providers>);
    await user.type(screen.getByLabelText("Nome"), "text/primary");
    expect(screen.getByText(/igual ao de um semantic/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Criar" }));
    expect(screen.getByRole("alert").textContent).toMatch(/já existe/);
    expect(store.get().set.specific["text/primary"]).toBeUndefined();
  });

  it("EditError do upsert aparece no Alert (já existe)", async () => {
    const user = userEvent.setup();
    render(<Providers><SpecificTab /></Providers>);
    await user.type(screen.getByLabelText("Nome"), "text/helper");
    await user.click(screen.getByRole("button", { name: "Criar" }));
    expect(store.get().set.specific["text/helper"]).toBeDefined();
    await user.type(screen.getByLabelText("Nome"), "text/helper");
    await user.click(screen.getByRole("button", { name: "Criar" }));
    expect(screen.getByRole("alert").textContent).toMatch(/já existe/);
  });

  it("cria com refs, escopos e descrição; remove pela lista", async () => {
    const user = userEvent.setup();
    render(<Providers><SpecificTab /></Providers>);
    await user.type(screen.getByLabelText("Nome"), "space/gutter");
    await user.click(screen.getByLabelText("claro"));
    await user.click(screen.getByRole("option", { name: /^space\/16/ }));
    await user.type(screen.getByLabelText("Uso"), "Respiro lateral");
    await user.click(screen.getByRole("button", { name: "Criar" }));
    const t = store.get().set.specific["space/gutter"]!;
    expect(t.type).toBe("dimension");
    expect(t.scopes).toEqual(["GAP"]);
    expect(t.flex).toBe("free");
    expect(t.values.light).toBe("space/16");
    expect(t.description).toContain("Uso: Respiro lateral");
    expect(t.description).toContain("Situação: Proposto");
    const item = screen.getByRole("listitem", { name: /space\/gutter/ });
    await user.click(within(item).getByRole("button", { name: /Remover space\/gutter/ }));
    expect(store.get().set.specific["space/gutter"]).toBeUndefined();
  });

  it("nome com formato inválido mostra Formato: e bloqueia Criar", async () => {
    const user = userEvent.setup();
    render(<Providers><SpecificTab /></Providers>);
    await user.type(screen.getByLabelText("Nome"), "Foo");
    expect(screen.getAllByText(/^Formato:/).length).toBeGreaterThan(0);
    expect((screen.getByRole("button", { name: "Criar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("o prefixo do nome decide a propriedade: Propriedade não contradiz o nome", async () => {
    const user = userEvent.setup();
    render(<Providers><SpecificTab /></Providers>);
    await user.type(screen.getByLabelText("Nome"), "text/caption");
    await user.click(screen.getByRole("combobox", { name: "Propriedade" }));
    const space = screen.queryByRole("option", { name: "space" });
    if (space) await user.click(space);
    await user.click(screen.getByRole("button", { name: "Criar" }));
    const t = store.get().set.specific["text/caption"]!;
    expect(t.type).toBe("color");
    expect(t.scopes).toEqual(["TEXT_FILL"]);
    expect(String(t.values.light)).not.toMatch(/^space\//);
  });

  it("escolher a propriedade com o nome vazio define o prefixo; letter-spacing é number", async () => {
    const user = userEvent.setup();
    render(<Providers><SpecificTab /></Providers>);
    await user.click(screen.getByRole("combobox", { name: "Propriedade" }));
    await user.click(screen.getByRole("option", { name: "typography" }));
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("typography/");
    await user.type(screen.getByLabelText("Nome"), "body/xx-large/letter-spacing");
    await user.click(screen.getByRole("button", { name: "Criar" }));
    const t = store.get().set.specific["typography/body/xx-large/letter-spacing"]!;
    expect(t.type).toBe("number");
    expect(t.scopes).toEqual(["LETTER_SPACING"]);
  });
});
