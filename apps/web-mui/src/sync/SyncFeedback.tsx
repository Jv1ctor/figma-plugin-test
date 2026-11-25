import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Snackbar from "@mui/material/Snackbar";
import { useSync, type SyncResult } from "./sync-store.ts";

const MODE_LIMIT = "O arquivo do Figma só permite 1 modo por coleção (plano Starter). Use um arquivo em plano Professional ou superior.";
const QUEUED = "Na fila: será aplicado quando o plugin reconectar";

export function SyncFeedback() {
  const result = useSync((s) => s.result);
  const [dismissed, setDismissed] = useState<SyncResult | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);
  const open = result !== null && result !== dismissed;
  const close = () => setDismissed(result);

  let severity: "success" | "info" | "warning" | "error" = "info";
  let message = "";
  let action: React.ReactNode;
  if (result?.kind === "ack") {
    severity = "success";
    const v = result.ack.variables;
    message = `Figma atualizado · ${v.created} criadas · ${v.updated} atualizadas · ${v.removed} removidas`;
    const w = result.ack.warnings;
    if (w.length > 0) {
      action = (
        <Button color="inherit" size="small" onClick={() => { setWarnings(w); close(); }}>
          {`ver avisos (${w.length})`}
        </Button>
      );
    }
  } else if (result?.kind === "queued") {
    message = QUEUED;
  } else if (result?.kind === "timeout") {
    severity = "warning";
    message = "Sem resposta do plugin ainda; o status avisará quando aplicar";
  } else if (result?.kind === "error") {
    severity = "error";
    message = result.error.code === "mode-limit" ? MODE_LIMIT : result.error.message;
  }

  return (
    <>
      <Snackbar data-editor-portal="" open={open} autoHideDuration={8000} onClose={(_, reason) => { if (reason !== "clickaway") close(); }}>
        <Alert severity={severity} action={action} onClose={close}>{message}</Alert>
      </Snackbar>
      <Dialog data-editor-portal="" open={warnings !== null} onClose={() => setWarnings(null)} fullWidth maxWidth="sm">
        <DialogTitle>Avisos do Figma</DialogTitle>
        <DialogContent>
          <ul>{(warnings ?? []).map((w, i) => <li key={i}>{w}</li>)}</ul>
        </DialogContent>
        <DialogActions><Button onClick={() => setWarnings(null)}>Fechar</Button></DialogActions>
      </Dialog>
    </>
  );
}
