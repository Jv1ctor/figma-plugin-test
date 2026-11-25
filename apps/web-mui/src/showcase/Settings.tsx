import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Fab from "@mui/material/Fab";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Pagination from "@mui/material/Pagination";
import Slider from "@mui/material/Slider";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import { Spot } from "./Spot.tsx";

const SEVERITIES = [
  { severity: "error", label: "Erro", text: "Não foi possível salvar as alterações." },
  { severity: "warning", label: "Atenção", text: "Seu plano expira em 3 dias." },
  { severity: "info", label: "Informação", text: "Há uma nova versão disponível." },
  { severity: "success", label: "Sucesso", text: "Preferências atualizadas." },
] as const;

const VARIANTS = [
  { variant: "standard", spot: "alert-standard", title: "Padrão" },
  { variant: "filled", spot: "alert-filled", title: "Preenchido" },
  { variant: "outlined", spot: "alert-outlined", title: "Contornado" },
] as const;

const STEPS = ["Conta", "Endereço", "Pagamento", "Revisão"];
const section = { display: "grid", gap: "var(--vx-space-medium)" } as const;

export function Settings() {
  const [align, setAlign] = useState<string | null>("esquerda");
  const [page, setPage] = useState(3);

  return (
    <Box component="section" aria-labelledby="config-titulo" sx={{ display: "grid", gap: "var(--vx-space-large)" }}>
      <div>
        <Spot id="typography-display">
          <Typography id="config-titulo" variant="h3" component="h2">Configurações</Typography>
        </Spot>
        <Spot id="typography-body">
          <Typography variant="body1" color="text.secondary">Notificações, privacidade e preferências da conta.</Typography>
        </Spot>
      </div>

      <Spot id="breadcrumbs">
        <Breadcrumbs aria-label="Trilha de navegação">
          <Link href="#inicio">Início</Link>
          <Link href="#conta">Conta</Link>
          <Typography color="text.primary">Configurações</Typography>
        </Breadcrumbs>
      </Spot>

      <Box sx={{ display: "grid", gap: "var(--vx-space-large)", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Spot id="card">
          <Card>
            <CardContent sx={section}>
              <Typography variant="h5" component="h3">Preferências</Typography>
              <Spot id="switch">
                <Box sx={{ display: "grid" }}>
                  <FormControlLabel control={<Switch defaultChecked />} label="Notificações por e-mail" />
                  <FormControlLabel control={<Switch />} label="Notificações push" />
                  <FormControlLabel control={<Switch defaultChecked />} label="Modo economia de dados" disabled />
                </Box>
              </Spot>
              <Spot id="slider">
                <Box sx={{ display: "grid", gap: "var(--vx-space-small)" }}>
                  <Typography id="config-volume" variant="body2" color="text.secondary">Volume dos alertas</Typography>
                  <Slider aria-labelledby="config-volume" defaultValue={40} />
                  <Slider aria-label="Brilho (indisponível)" defaultValue={70} disabled />
                </Box>
              </Spot>
              <Spot id="divider"><Divider /></Spot>
              <Spot id="toggle-button">
                <ToggleButtonGroup exclusive value={align} onChange={(_, v: string | null) => setAlign(v)} aria-label="Alinhamento do texto" size="small">
                  <ToggleButton value="esquerda" aria-label="Alinhar à esquerda"><FormatAlignLeftIcon /></ToggleButton>
                  <ToggleButton value="centro" aria-label="Centralizar"><FormatAlignCenterIcon /></ToggleButton>
                  <ToggleButton value="direita" aria-label="Alinhar à direita"><FormatAlignRightIcon /></ToggleButton>
                  <ToggleButton value="justificado" aria-label="Justificar" disabled><FormatAlignLeftIcon /></ToggleButton>
                </ToggleButtonGroup>
              </Spot>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--vx-space-medium)" }}>
                <Spot id="button-group">
                  <ButtonGroup variant="outlined" aria-label="Período">
                    <Button>Dia</Button>
                    <Button>Semana</Button>
                    <Button>Mês</Button>
                  </ButtonGroup>
                </Spot>
                <Spot id="icon-button">
                  <Box sx={{ display: "flex", gap: "var(--vx-space-x-small)" }}>
                    <IconButton aria-label="Editar perfil"><EditIcon /></IconButton>
                    <IconButton aria-label="Excluir conta" disabled><DeleteIcon /></IconButton>
                  </Box>
                </Spot>
                <Spot id="fab"><Fab color="primary" size="small" aria-label="Editar"><EditIcon /></Fab></Spot>
              </Box>
            </CardContent>
          </Card>
        </Spot>

        <Box sx={{ display: "grid", gap: "var(--vx-space-large)", alignContent: "start" }}>
          <Spot id="list">
            <List aria-label="Dispositivos conectados" disablePadding>
              <ListItem divider><ListItemText primary="Notebook" secondary="Último acesso hoje, 09:14" /></ListItem>
              <ListItemButton divider><ListItemText primary="Celular" secondary="Último acesso ontem" /></ListItemButton>
              <ListItemButton disabled><ListItemText primary="Tablet" secondary="Sessão encerrada" /></ListItemButton>
            </List>
          </Spot>
          <Spot id="accordion">
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Pergunta: como altero minha senha?</AccordionSummary>
                <AccordionDetails>Acesse Conta, Segurança e escolha “Alterar senha”.</AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Pergunta: posso exportar meus dados?</AccordionSummary>
                <AccordionDetails>Sim, em Privacidade você baixa um arquivo com todas as informações.</AccordionDetails>
              </Accordion>
              <Accordion disabled>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Pergunta: planos corporativos</AccordionSummary>
                <AccordionDetails>Indisponível.</AccordionDetails>
              </Accordion>
            </Box>
          </Spot>
        </Box>
      </Box>

      <Box sx={section}>
        <Spot id="stepper">
          <Stepper activeStep={1} alternativeLabel aria-label="Etapas da configuração">
            {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>
        </Spot>
        <Spot id="pagination">
          <Pagination count={8} page={page} onChange={(_, p) => setPage(p)} aria-label="Paginação" />
        </Spot>
      </Box>

      <Box sx={{ display: "grid", gap: "var(--vx-space-medium)", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
        {VARIANTS.map(({ variant, spot, title }) => (
          <Spot key={variant} id={spot}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: "var(--vx-space-x-small)" }}>{title}</Typography>
            <Box sx={{ display: "grid", gap: "var(--vx-space-small)" }}>
              {SEVERITIES.map((s) => (
                <Alert key={s.severity} severity={s.severity} variant={variant}>{s.label}: {s.text}</Alert>
              ))}
            </Box>
          </Spot>
        ))}
      </Box>
    </Box>
  );
}
