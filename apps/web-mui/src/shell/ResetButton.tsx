import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { store } from "../state/store.ts";

export function ResetButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button color="inherit" variant="outlined" startIcon={<RestartAltIcon />} onClick={() => setOpen(true)}>
        Restaurar padrão
      </Button>
      <Dialog data-editor-portal="" open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Restaurar o padrão do laboratório?</DialogTitle>
        <DialogContent>
          <DialogContentText>As edições atuais serão perdidas.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={() => { setOpen(false); store.reset(); }}>Restaurar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
