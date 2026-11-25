import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import { MODE_ATTR, cssVarMap, muiPaletteValues } from "@token-bridge/tokens";
import type { Mode, TokenSet } from "@token-bridge/tokens";
import { BaseTab } from "./editor/BaseTab.tsx";
import { SemanticTab } from "./editor/SemanticTab.tsx";
import { SpecificTab } from "./editor/SpecificTab.tsx";
import { WarningsDrawer } from "./editor/WarningsDrawer.tsx";
import { ensureFontLoaded } from "./fonts.ts";
import { InspectLayer } from "./inspect/InspectLayer.tsx";
import { RuntimeSheet } from "./runtime/sheet.ts";
import { Charts } from "./showcase/Charts.tsx";
import { Dashboard } from "./showcase/Dashboard.tsx";
import { Overlays } from "./showcase/Overlays.tsx";
import { Settings } from "./showcase/Settings.tsx";
import { Signup } from "./showcase/Signup.tsx";
import { FigmaBanner } from "./sync/FigmaBanner.tsx";
import { Header } from "./shell/Header.tsx";
import { useEditor } from "./state/store.ts";
import { createVortexTheme, type VortexPaletteValues } from "./theme/createVortexTheme.ts";

const BUILDER_FONT_URL = "/fonts/Satoshi-Variable.woff2";
const THEME_DEBOUNCE_MS = 150;

const SCREENS = [
  { id: "painel", label: "Painel", View: Dashboard },
  { id: "cadastro", label: "Cadastro", View: Signup },
  { id: "configuracoes", label: "Configurações", View: Settings },
  { id: "overlays", label: "Overlays", View: Overlays },
  { id: "graficos", label: "Gráficos", View: Charts },
] as const;

type PaletteInput = { light: VortexPaletteValues; dark: VortexPaletteValues };

// Uma instância por documento: uma segunda zeraria o <style id="vx-runtime"> e deixaria a primeira órfã
// (o StrictMode chama inicializadores de useState duas vezes).
let runtimeSheet: RuntimeSheet | undefined;
const getRuntimeSheet = (): RuntimeSheet => (runtimeSheet ??= new RuntimeSheet(document));

function paletteKey(set: TokenSet): string {
  return JSON.stringify({ light: muiPaletteValues(set, "light"), dark: muiPaletteValues(set, "dark") });
}

/** Recria o tema MUI só quando a palette resolvida muda, com debounce (spec §9.3). */
function useVortexTheme(set: TokenSet) {
  const key = useMemo(() => paletteKey(set), [set]);
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    if (key === settled) return;
    const t = setTimeout(() => setSettled(key), THEME_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [key, settled]);
  return useMemo(() => createVortexTheme(JSON.parse(settled) as PaletteInput, { fontUrl: BUILDER_FONT_URL }), [settled]);
}

function ModeSync({ mode }: { mode: Mode }) {
  const { setMode } = useColorScheme();
  useLayoutEffect(() => {
    setMode(mode);
    document.documentElement.setAttribute(MODE_ATTR, mode);
  }, [mode, setMode]);
  return null;
}

export function App() {
  const set = useEditor((s) => s.set);
  const mode = useEditor((s) => s.mode);
  const tab = useEditor((s) => s.tab);
  useLayoutEffect(() => getRuntimeSheet().sync(cssVarMap(set)), [set]);

  const primaryFont = set.base["font-family/primary"]?.value;
  const secondaryFont = set.base["font-family/secondary"]?.value;
  useEffect(() => {
    for (const f of [primaryFont, secondaryFont]) if (typeof f === "string") ensureFontLoaded(f);
  }, [primaryFont, secondaryFont]);

  const [screen, setScreen] = useState<(typeof SCREENS)[number]["id"]>("painel");
  const View = SCREENS.find((s) => s.id === screen)!.View;
  const theme = useVortexTheme(set);
  const vitrineRef = useRef<HTMLElement>(null);

  return (
    <ThemeProvider theme={theme} defaultMode={mode} storageManager={null} disableTransitionOnChange>
      <CssBaseline />
      <ModeSync mode={mode} />
      <Header />
      <WarningsDrawer />
      <Box component="section" aria-label="Editor" sx={{ borderBottom: "var(--vx-border-width-default) solid var(--vx-border-subtle)" }}>
        {tab === "base" && <BaseTab />}
        {tab === "semantic" && <SemanticTab />}
        {tab === "specific" && <SpecificTab />}
      </Box>
      <Box
        component="main"
        ref={vitrineRef}
        aria-label="Vitrine"
        sx={{ display: "grid", gap: "var(--vx-space-xx-large)", p: "var(--vx-space-x-large)", maxWidth: 1280, mx: "auto" }}
      >
        <FigmaBanner />
        <Tabs value={screen} onChange={(_, v: typeof screen) => setScreen(v)} aria-label="Telas da vitrine" variant="scrollable" scrollButtons="auto">
          {SCREENS.map((s) => <Tab key={s.id} value={s.id} label={s.label} />)}
        </Tabs>
        <View />
      </Box>
      <InspectLayer root={vitrineRef} screen={screen} />
    </ThemeProvider>
  );
}
