import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { TokenFormatError, parseDtcg, toCss, toDtcg, toTailwind } from "@token-bridge/tokens";
import { store } from "../state/store.ts";
import { downloadText } from "./download.ts";
import { toMuiModule } from "./mui-module.ts";

interface Notice { severity: "success" | "error"; message: string }

type Notify = (notice: Notice) => void;
let notify: Notify | undefined;

/** Lê um arquivo DTCG. Em erro avisa e deixa o estado como está. */
export async function importFile(file: File): Promise<void> {
  try {
    const set = parseDtcg(JSON.parse(await file.text()));
    store.replaceSet(set);
    notify?.({ severity: "success", message: "Tema importado" });
  } catch (e) {
    const message = e instanceof TokenFormatError
      ? e.message
      : e instanceof SyntaxError
        ? "O arquivo não é um JSON válido."
        : "Não foi possível ler o arquivo";
    notify?.({ severity: "error", message });
  }
}

const DOWNLOADS = [
  { label: "Baixar tokens (DTCG JSON)", file: "vortex.tokens.json", mime: "application/json", make: () => JSON.stringify(toDtcg(store.get().set), null, 2) },
  { label: "Baixar CSS vars", file: "vortex.css", mime: "text/css", make: () => toCss(store.get().set) },
  { label: "Baixar Tailwind v4", file: "vortex.tailwind.css", mime: "text/css", make: () => toTailwind(store.get().set) },
  { label: "Baixar tema MUI", file: "vortex.mui.ts", mime: "text/typescript", make: () => toMuiModule(store.get().set) },
];

export function ExportMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  notify = setNotice;

  const close = () => setAnchor(null);

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        endIcon={<ArrowDropDownIcon />}
        aria-haspopup="menu"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Exportar
      </Button>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={close}>
        {DOWNLOADS.map((d) => (
          <MenuItem key={d.file} onClick={() => { close(); downloadText(d.file, d.make(), d.mime); }}>
            {d.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => { close(); fileInput.current?.click(); }}>Importar JSON…</MenuItem>
      </Menu>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        data-testid="import-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importFile(file);
        }}
      />
      <Snackbar open={notice !== null} autoHideDuration={5000} onClose={() => setNotice(null)}>
        {notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.message}</Alert> : undefined}
      </Snackbar>
    </>
  );
}
