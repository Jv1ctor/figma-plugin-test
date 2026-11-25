import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Snackbar from "@mui/material/Snackbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import HelpIcon from "@mui/icons-material/HelpOutline";
import { Spot } from "./Spot.tsx";

export function Overlays() {
  const [dialog, setDialog] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [popAnchor, setPopAnchor] = useState<HTMLElement | null>(null);
  const [snack, setSnack] = useState(false);
  const [drawer, setDrawer] = useState(false);

  return (
    <Box component="section" aria-labelledby="overlays-titulo" sx={{ display: "grid", gap: "var(--vx-space-large)" }}>
      <div>
        <Spot id="typography-display">
          <Typography id="overlays-titulo" variant="h3" component="h2">Overlays</Typography>
        </Spot>
        <Spot id="typography-body">
          <Typography variant="body1" color="text.secondary">Diálogos, menus, avisos e painéis laterais sobre a página.</Typography>
        </Spot>
      </div>

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--vx-space-medium)" }}>
        <Spot id="button-contained-primary"><Button variant="contained" onClick={() => setDialog(true)}>Abrir diálogo</Button></Spot>
        <Spot id="button-outlined"><Button variant="outlined" onClick={(e) => setMenuAnchor(e.currentTarget)}>Abrir menu</Button></Spot>
        <Spot id="button-outlined"><Button variant="outlined" onClick={(e) => setPopAnchor(e.currentTarget)}>Abrir popover</Button></Spot>
        <Spot id="button-outlined"><Button variant="outlined" onClick={() => setSnack(true)}>Mostrar snackbar</Button></Spot>
        <Spot id="button-outlined"><Button variant="outlined" onClick={() => setDrawer(true)}>Abrir gaveta</Button></Spot>
        <Spot id="tooltip">
          <Tooltip title="Central de ajuda" arrow>
            <IconButton aria-label="Ajuda"><HelpIcon /></IconButton>
          </Tooltip>
        </Spot>
      </Box>

      <Spot id="dialog">
        <Dialog open={dialog} onClose={() => setDialog(false)} aria-labelledby="dialogo-titulo">
          <DialogTitle id="dialogo-titulo">Excluir pedido?</DialogTitle>
          <DialogContent>
            <DialogContentText>O pedido #4821 será removido da lista e não poderá ser recuperado.</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(false)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={() => setDialog(false)}>Excluir</Button>
          </DialogActions>
        </Dialog>
      </Spot>

      <Spot id="menu">
        <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => setMenuAnchor(null)}>Editar</MenuItem>
          <MenuItem onClick={() => setMenuAnchor(null)}>Duplicar</MenuItem>
          <MenuItem disabled>Arquivar</MenuItem>
        </Menu>
      </Spot>

      <Spot id="popover">
        <Popover
          anchorEl={popAnchor}
          open={popAnchor !== null}
          onClose={() => setPopAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Typography variant="body2" sx={{ p: "var(--vx-space-medium)" }}>Conteúdo do popover</Typography>
        </Popover>
      </Spot>

      <Spot id="snackbar">
        <Snackbar
          open={snack}
          autoHideDuration={4000}
          onClose={() => setSnack(false)}
          message="Alterações salvas"
          action={<Button size="small" color="inherit" onClick={() => setSnack(false)}>Desfazer</Button>}
        />
      </Spot>

      <Spot id="drawer">
        <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)}>
          <Box sx={{ width: 280, p: "var(--vx-space-medium)" }}>
            <Typography variant="h5" component="h3">Navegação</Typography>
            <List>
              <ListItemButton><ListItemText primary="Painel" /></ListItemButton>
              <ListItemButton><ListItemText primary="Pedidos" /></ListItemButton>
              <ListItemButton disabled><ListItemText primary="Relatórios" /></ListItemButton>
            </List>
          </Box>
        </Drawer>
      </Spot>
    </Box>
  );
}
