import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { importFromFigma, keepDraft } from "./actions.ts";
import { useSync } from "./sync-store.ts";

export function FigmaBanner() {
  const banner = useSync((s) => s.banner);
  if (!banner) return null;
  return (
    <Alert
      severity="info"
      action={(
        <>
          <Button color="inherit" size="small" onClick={() => importFromFigma(banner.snapshot)}>Importar do Figma</Button>
          <Button color="inherit" size="small" onClick={() => keepDraft()}>Manter meu rascunho</Button>
        </>
      )}
    >
      {`O Figma tem ${banner.diff.total} diferenças em relação ao seu rascunho`}
    </Alert>
  );
}
