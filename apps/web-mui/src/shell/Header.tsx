import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import WarningAmberIcon from "@mui/icons-material/WarningAmberRounded";
import type { Mode } from "@token-bridge/tokens";
import { store, useEditor, type Tab as EditorTab } from "../state/store.ts";

const TABS: Array<{ value: EditorTab; label: string }> = [
  { value: "base", label: "Base" },
  { value: "semantic", label: "Semantic" },
  { value: "specific", label: "Specific" },
];

export function Header() {
  const tab = useEditor((s) => s.tab);
  const mode = useEditor((s) => s.mode);
  const count = useEditor((s) => s.warnings.length);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "var(--vx-background-surface)",
        color: "var(--vx-text-primary)",
        borderBottom: "var(--vx-border-width-default) solid var(--vx-border-subtle)",
      }}
    >
      <Toolbar sx={{ gap: 3 }}>
        <Typography variant="h6" component="h1" sx={{ whiteSpace: "nowrap" }}>
          Vortex Builder
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, value: EditorTab) => store.update((s) => ({ ...s, tab: value }))}
          aria-label="Camada em edição"
        >
          {TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
        </Tabs>
        <Box sx={{ flex: 1 }} />
        <Button
          color="inherit"
          aria-label={`Avisos (${count})`}
          onClick={() => store.update((s) => ({ ...s, warningsOpen: true }))}
          startIcon={(
            <Badge badgeContent={count} color="warning" max={999}>
              <WarningAmberIcon />
            </Badge>
          )}
        >
          Avisos
        </Button>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_, value: Mode | null) => { if (value) store.update((s) => ({ ...s, mode: value })); }}
          aria-label="Modo da vitrine"
        >
          <ToggleButton value="light">☀ claro</ToggleButton>
          <ToggleButton value="dark">☾ escuro</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="outlined" color="inherit" disabled endIcon={<ArrowDropDownIcon />}>
          Exportar
        </Button>
      </Toolbar>
    </AppBar>
  );
}
