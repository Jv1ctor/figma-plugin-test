import { useMemo } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { diffSets } from "@token-bridge/tokens";
import type { TokenSet } from "@token-bridge/tokens";
import { useEditor } from "../state/store.ts";
import { importFromFigma } from "./actions.ts";
import { DiffSummary } from "./DiffSummary.tsx";

export interface PendingImport { set: TokenSet; warnings: string[] }

export function ImportFromFigma({ pending, onClose }: { pending: PendingImport | null; onClose: () => void }) {
  const current = useEditor((s) => s.set);
  const diff = useMemo(() => (pending ? diffSets(current, pending.set) : null), [current, pending]);
  return (
    <Dialog data-editor-portal="" open={pending !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Importar do Figma</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2 }}>
        {diff && <DiffSummary diff={diff} />}
        {pending && pending.warnings.length > 0 && (
          <ul>{pending.warnings.map((w, i) => <li key={i}><Typography variant="body2">{w}</Typography></li>)}</ul>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => { if (pending) importFromFigma(pending.set); onClose(); }}>Importar</Button>
      </DialogActions>
    </Dialog>
  );
}
