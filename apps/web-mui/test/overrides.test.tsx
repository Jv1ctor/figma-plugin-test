import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Backdrop from "@mui/material/Backdrop";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CssBaseline from "@mui/material/CssBaseline";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Radio from "@mui/material/Radio";
import Slider from "@mui/material/Slider";
import Snackbar from "@mui/material/Snackbar";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { ThemeProvider } from "@mui/material/styles";
import { loadSeed, muiPaletteValues } from "@token-bridge/tokens";
import { Dashboard } from "../src/showcase/Dashboard.tsx";
import { Signup } from "../src/showcase/Signup.tsx";
import { Spot } from "../src/showcase/Spot.tsx";
import { SPOTS } from "../src/showcase/spots.ts";
import { store } from "../src/state/store.ts";
import { createVortexTheme, type VortexPaletteValues } from "../src/theme/createVortexTheme.ts";
import { emotionCss, winningValue } from "./helpers.ts";

const seed = loadSeed();
const pal = { light: muiPaletteValues(seed, "light"), dark: muiPaletteValues(seed, "dark") };
const vx = (name: string) => `var(--vx-${name})`;

function Wrapped({ children, palette = pal }: { children: ReactNode; palette?: { light: VortexPaletteValues; dark: VortexPaletteValues } }) {
  return (
    <ThemeProvider theme={createVortexTheme(palette)} defaultMode="light" storageManager={null}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

/** Um exemplar de cada componente da tabela de Correspondências (§8), com overlays abertos. */
function Everything() {
  const anchor = typeof document === "undefined" ? null : document.body;
  return (
    <>
      <Dashboard />
      <Signup />
      <IconButton aria-label="i">x</IconButton>
      <ButtonGroup><Button>a</Button><Button>b</Button></ButtonGroup>
      <Fab aria-label="f">+</Fab>
      <Switch defaultChecked />
      <Slider defaultValue={30} />
      <Tabs value={0}><Tab label="a" /><Tab label="b" /></Tabs>
      <Pagination count={3} />
      <Stepper activeStep={1}><Step><StepLabel>a</StepLabel></Step><Step><StepLabel>b</StepLabel></Step></Stepper>
      <Badge badgeContent={3} color="primary"><span>b</span></Badge>
      <Avatar>JV</Avatar>
      {(["error", "warning", "info", "success"] as const).flatMap((s) =>
        (["standard", "filled", "outlined"] as const).map((v) => <Alert key={s + v} severity={s} variant={v}>m</Alert>))}
      <Snackbar open message="s" />
      <Tooltip open title="t"><span>t</span></Tooltip>
      <Paper>p</Paper>
      <Paper variant="outlined">p</Paper>
      <Card>c</Card>
      <Accordion><AccordionSummary>s</AccordionSummary><AccordionDetails>d</AccordionDetails></Accordion>
      <Menu open anchorEl={anchor}><MenuItem>m</MenuItem></Menu>
      <Popover open anchorEl={anchor}>p</Popover>
      <Dialog open>d</Dialog>
      <Drawer open>d</Drawer>
      <Backdrop open />
      <Divider />
      <TableContainer><Table><TableBody><TableRow><TableCell>c</TableCell></TableRow></TableBody></Table></TableContainer>
      <Link href="#">l</Link>
    </>
  );
}

afterEach(() => {
  cleanup();
  act(() => store.reset());
});

describe("overrides da tabela de Correspondências (spec §8)", () => {
  it("botão, campo com erro e chip usam vars semantic; nada lê --vx-base-*", () => {
    render(<Wrapped><Button variant="contained">x</Button><TextField error label="e" /><Chip color="primary" label="c" /></Wrapped>);
    const css = emotionCss();
    for (const v of ["background-action-primary", "text-on-action-primary", "border-danger", "background-accent-1-strong", "radius-x-small"]) {
      expect(css).toContain(vx(v));
    }
    expect(css).not.toMatch(/var\(--vx-base-/);
  });

  it("cada linha da tabela aparece no CSS emitido com todos os componentes montados", () => {
    render(<Wrapped><Everything /></Wrapped>);
    const css = emotionCss();
    const rows: Record<string, string[]> = {
      "Button Contained Primary": ["background-action-primary", "background-action-primary-hover", "background-action-primary-pressed", "text-on-action-primary"],
      "Button Contained Secondary": ["background-action-secondary", "background-action-secondary-hover", "background-action-secondary-pressed", "text-on-action-secondary"],
      "Button Contained Error": ["background-action-danger", "background-action-danger-hover", "background-action-danger-pressed", "text-on-action-danger"],
      "Outlined/Text Primary, IconButton": ["text-primary", "icon-primary", "border-strong", "background-action-tertiary-hover"],
      Disabled: ["opacity-disabled"],
      Campo: ["border-strong", "border-focus", "border-width-focus", "border-danger", "text-danger"],
      "Checkbox, Radio, Switch, Slider": ["border-selected", "border-strong", "background-surface-raised"],
      "Aba, página e passo": ["border-selected", "background-selected", "text-primary"],
      "Chip e Badge": ["background-neutral-subtle", "background-accent-1-strong", "text-on-accent-1-strong", "background-accent-2-strong",
        "text-on-accent-2-strong", "background-danger-strong", "text-on-danger-strong", "background-warning-strong", "text-on-warning-strong",
        "background-success-strong", "text-on-success-strong", "background-information-strong", "text-on-information-strong"],
      Avatar: ["background-neutral-strong", "text-on-neutral-strong", "radius-full"],
      Alert: ["background-danger-subtle", "icon-danger", "background-warning-subtle", "icon-warning", "background-success-subtle",
        "icon-success", "background-information-subtle", "icon-information", "border-danger", "border-warning", "border-success", "border-information"],
      "Snackbar e Tooltip": ["background-inverse", "text-on-inverse"],
      Superfícies: ["background-surface", "background-surface-raised", "shadow-raised", "shadow-overlay"],
      Divisores: ["border-subtle"],
      Backdrop: ["background-backdrop", "opacity-backdrop"],
      Link: ["text-link"],
      Raio: ["radius-x-small", "radius-small", "radius-medium", "radius-large", "radius-none", "radius-full"],
      "Espaço e espessura": ["space-x-small", "space-small", "space-medium", "space-large", "border-width-default", "border-width-strong"],
    };
    for (const [row, vars] of Object.entries(rows)) for (const v of vars) expect(css, `${row}: ${v}`).toContain(vx(v));
    expect(css).not.toMatch(/var\(--vx-base-/);
  });

  it("Chip e Badge secondary só usam accent-2 quando brand-2 está ligado", () => {
    // O Emotion não remove CSS entre testes: confere a regra que vence em cada elemento, não o CSS todo.
    const off = { light: { ...pal.light, secondary: null }, dark: { ...pal.dark, secondary: null } };
    const paint = () => [
      winningValue(document.querySelector(".MuiChip-root")!, "background-color"),
      winningValue(document.querySelector(".MuiBadge-badge")!, "background-color"),
    ];
    render(<Wrapped palette={off}><Chip color="secondary" label="s" /><Badge color="secondary" badgeContent={1}><span>b</span></Badge></Wrapped>);
    expect(paint()).toEqual(["var(--mui-palette-secondary-main)", "var(--mui-palette-secondary-main)"]);
    cleanup();
    render(<Wrapped><Chip color="secondary" label="s" /><Badge color="secondary" badgeContent={1}><span>b</span></Badge></Wrapped>);
    expect(paint()).toEqual([vx("background-accent-2-strong"), vx("background-accent-2-strong")]);
    expect(winningValue(document.querySelector(".MuiChip-root")!, "color")).toBe(vx("text-on-accent-2-strong"));
  });

  it("Button Contained Primary resolve fundo e texto da ação principal", () => {
    render(<Wrapped><Button variant="contained">Salvar</Button></Wrapped>);
    const btn = screen.getByRole("button", { name: "Salvar" });
    expect(winningValue(btn, "--variant-containedBg")).toBe(vx("background-action-primary"));
    expect(winningValue(btn, "--variant-containedColor")).toBe(vx("text-on-action-primary"));
    expect(winningValue(btn, "border-radius")).toBe(vx("radius-x-small"));
  });

  it("campo: foco é a borda (cor e espessura de foco); erro pinta borda, rótulo e ajuda", () => {
    render(<Wrapped><TextField focused label="Foco" /><TextField error label="Erro" helperText="Ajuda" /></Wrapped>);
    const [focused, errored] = Array.from(document.querySelectorAll(".MuiOutlinedInput-notchedOutline"));
    expect(winningValue(focused!, "border-color")).toBe(vx("border-focus"));
    expect(winningValue(focused!, "border-width")).toBe(vx("border-width-focus"));
    expect(winningValue(errored!, "border-color")).toBe(vx("border-danger"));
    expect(winningValue(screen.getByText("Ajuda"), "color")).toBe(vx("text-danger"));
    expect(winningValue(document.querySelector("label.Mui-error")!, "color")).toBe(vx("text-danger"));
  });

  it("disabled mantém a aparência habilitada", () => {
    render(<Wrapped><Button variant="contained" disabled>Off</Button><TextField disabled label="Desligado" /></Wrapped>);
    const btn = screen.getByRole("button", { name: "Off" });
    expect(winningValue(btn, "background-color")).toBe("var(--variant-containedBg)");
    expect(winningValue(btn, "color")).toBe("var(--variant-containedColor)");
    expect(winningValue(btn, "--variant-containedBg")).toBe(vx("background-action-primary"));
    const outline = document.querySelector(".MuiOutlinedInput-notchedOutline")!;
    expect(winningValue(outline, "border-color")).toBe(vx("border-strong"));
  });

  it("a opacidade de disabled vale uma vez por componente, sem empilhar nos elementos aninhados", () => {
    render(
      <Wrapped>
        <TextField disabled label="Campo" helperText="Ajuda" defaultValue="x" />
        <FormControlLabel disabled control={<Checkbox />} label="Marcar" />
        <FormControlLabel disabled control={<Switch />} label="Ligar" />
        <Switch disabled data-testid="solo" />
        <Radio disabled />
        <Button disabled>Off</Button>
        <Chip disabled label="Chip" />
      </Wrapped>,
    );
    const dimmed = (el: Element | null): number => {
      let n = 0;
      for (let e = el; e; e = e.parentElement) if (winningValue(e, "opacity") === vx("opacity-disabled")) n++;
      return n;
    };
    const leaves = [
      document.querySelector("input[value='x']"), // input dentro do InputBase desabilitado
      document.querySelector("label"), // rótulo do campo
      screen.getByText("Ajuda"),
      document.querySelector(".MuiCheckbox-root svg"),
      screen.getByText("Marcar"),
      ...Array.from(document.querySelectorAll(".MuiSwitch-thumb")),
      ...Array.from(document.querySelectorAll(".MuiSwitch-track")),
      document.querySelector(".MuiRadio-root svg"),
      screen.getByRole("button", { name: "Off" }),
      screen.getByText("Chip"),
    ];
    for (const leaf of leaves) expect(dimmed(leaf), leaf?.outerHTML.slice(0, 80)).toBe(1);
    expect(emotionCss()).toMatch(/\.Mui-disabled \.Mui-disabled\s*\{\s*opacity:\s*1;?\s*\}/); // o neutralizador
  });
});

describe("telas e spots", () => {
  it("Painel e Cadastro montam com os tokens da tabela", () => {
    render(<Wrapped><Dashboard /></Wrapped>);
    render(<Wrapped><Signup /></Wrapped>);
    expect(screen.getByRole("heading", { name: "Painel" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Cadastro" })).toBeTruthy();
    expect(emotionCss()).not.toMatch(/var\(--vx-base-/);
  });

  it("todo spot renderizado existe em SPOTS e só lista tokens semantic do seed", () => {
    render(<Wrapped><Dashboard /><Signup /></Wrapped>);
    const ids = Array.from(document.querySelectorAll("[data-spot]"), (e) => e.getAttribute("data-spot")!);
    expect(ids.length).toBeGreaterThan(20);
    for (const id of ids) expect(SPOTS, id).toHaveProperty(id);
    for (const [id, tokens] of Object.entries(SPOTS)) for (const t of tokens) expect(seed.semantic, `${id}: ${t}`).toHaveProperty([t]);
  });

  it("Spot ganha contorno âmbar quando um token dele tem aviso", () => {
    render(<Wrapped><Spot id="chip-primary"><span>c</span></Spot><Spot id="link"><span>l</span></Spot></Wrapped>);
    const chip = document.querySelector('[data-spot="chip-primary"]')!;
    const link = document.querySelector('[data-spot="link"]')!;
    expect(chip.getAttribute("data-warn")).toBeNull();
    act(() => store.update((s) => ({
      ...s,
      warnings: [{ id: "w", token: "semantic:background/accent-1/strong", rule: "contrast-text", message: "m" }],
    })));
    expect(chip.getAttribute("data-warn")).toBe("true");
    expect(link.getAttribute("data-warn")).toBeNull();
    expect(winningValue(chip, "outline")).toContain(vx("border-warning"));
  });
});
