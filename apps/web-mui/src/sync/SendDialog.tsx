import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { diffSets } from "@token-bridge/tokens";
import type { TokenSet } from "@token-bridge/tokens";
import { useEditor } from "../state/store.ts";
import { sendToFigma, setAutoSend } from "./actions.ts";
import { DiffSummary } from "./DiffSummary.tsx";
import { useSync } from "./sync-store.ts";

const EMPTY: TokenSet = { base: {}, semantic: {}, specific: {}, textStyles: [], shadowStyles: [], disabledGroups: [] };

export function SendDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const set = useEditor((s) => s.set);
  const tombstones = useEditor((s) => s.removedSpecifics);
  const synced = useSync((s) => s.synced);
  const autoSend = useSync((s) => s.autoSend);
  const sending = useSync((s) => s.sending);
  const offline = useSync((s) => s.relay.status?.plugin !== "connected");
  const [excluded, setExcluded] = useState<string[]>([]);
  const diff = useMemo(() => diffSets(synced ?? EMPTY, set), [synced, set]);

  const send = () => {
    const remove = tombstones.filter((n) => !excluded.includes(n));
    onClose();
    void sendToFigma({ remove });
  };

  return (
    <Dialog data-editor-portal="" open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Enviar para o Figma</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2 }}>
        {synced === null && <Alert severity="info">Estado do Figma desconhecido: tudo será enviado</Alert>}
        <DiffSummary diff={diff} />
        {tombstones.length > 0 && (
          <Box>
            <Typography variant="subtitle2">Remover do Figma</Typography>
            <Box sx={{ display: "grid" }}>
              {tombstones.map((n) => (
                <FormControlLabel
                  key={n}
                  label={n}
                  control={(
                    <Checkbox
                      size="small"
                      checked={!excluded.includes(n)}
                      onChange={(e) => setExcluded((x) => (e.target.checked ? x.filter((y) => y !== n) : [...x, n]))}
                    />
                  )}
                />
              ))}
            </Box>
          </Box>
        )}
        <FormControlLabel
          label="Envio automático"
          control={<Switch checked={autoSend} onChange={(e) => setAutoSend(e.target.checked)} />}
        />
        {offline && <Alert severity="warning">Na fila: será aplicado quando o plugin reconectar</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={sending} onClick={send}>Enviar</Button>
      </DialogActions>
    </Dialog>
  );
}
