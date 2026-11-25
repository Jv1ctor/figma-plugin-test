import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import ChatIcon from "@mui/icons-material/ChatBubbleOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsIcon from "@mui/icons-material/NotificationsNone";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { Spot } from "./Spot.tsx";
import type { SpotId } from "./spots.ts";

type Status = { label: string; color: "success" | "warning" | "error" | "info"; spot: SpotId };
const PAGO: Status = { label: "Pago", color: "success", spot: "chip-success" };
const PENDENTE: Status = { label: "Pendente", color: "warning", spot: "chip-warning" };
const ATRASADO: Status = { label: "Atrasado", color: "error", spot: "chip-danger" };
const ANALISE: Status = { label: "Em análise", color: "info", spot: "chip-information" };

const ORDERS: Record<string, Array<{ id: string; client: string; status: Status; total: string }>> = {
  recentes: [
    { id: "#4821", client: "Mariana Albuquerque", status: PAGO, total: "R$ 1.240,00" },
    { id: "#4820", client: "Padaria Pão de Mel", status: PENDENTE, total: "R$ 389,90" },
    { id: "#4819", client: "Rafael Nogueira", status: ANALISE, total: "R$ 2.015,50" },
    { id: "#4817", client: "Studio Ipê Arquitetura", status: ATRASADO, total: "R$ 7.800,00" },
  ],
  devolucoes: [
    { id: "#4799", client: "Lucas Teixeira", status: ANALISE, total: "R$ 159,00" },
    { id: "#4781", client: "Beatriz Campos", status: PAGO, total: "R$ 74,90" },
  ],
};

const TEAM = [
  { name: "Ana Souza", initials: "AS" },
  { name: "Bruno Lima", initials: "BL" },
  { name: "Carla Mendes", initials: "CM" },
  { name: "Diego Rocha", initials: "DR" },
  { name: "Elisa Prado", initials: "EP" },
];

function Kpi({ title, value, delta, progress, goal }: { title: string; value: string; delta: Status; progress: number; goal: string }) {
  return (
    <Spot id="card">
      <Card>
        <CardHeader
          title={title}
          subheader="Atualizado há 5 min"
          action={(
            <Spot id="icon-button">
              <IconButton aria-label={`Mais opções de ${title.toLowerCase()}`}><MoreVertIcon /></IconButton>
            </Spot>
          )}
        />
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
            <Typography variant="h4" component="p">{value}</Typography>
            <Spot id={delta.spot}><Chip size="small" color={delta.color} label={delta.label} /></Spot>
          </Stack>
          <Spot id="progress">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{goal}</Typography>
            <LinearProgress variant="determinate" value={progress} aria-label={goal} />
          </Spot>
        </CardContent>
      </Card>
    </Spot>
  );
}

export function Dashboard() {
  const [tab, setTab] = useState<keyof typeof ORDERS>("recentes");

  return (
    <Box component="section" aria-labelledby="painel-titulo" sx={{ display: "grid", gap: 3 }}>
      <div>
        <Spot id="typography-display">
          <Typography id="painel-titulo" variant="h3" component="h2">Painel</Typography>
        </Spot>
        <Spot id="typography-body">
          <Typography variant="body1" color="text.secondary">Loja Vortex · resumo de novembro de 2026</Typography>
        </Spot>
      </div>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
        <Kpi title="Receita do mês" value="R$ 182.430" delta={{ ...PAGO, label: "+12,4%" }} progress={68} goal="68% da meta do trimestre" />
        <Kpi title="Pedidos" value="1.284" delta={{ ...ANALISE, label: "+3,1%" }} progress={41} goal="41% da meta de pedidos" />
        <Kpi title="Ticket médio" value="R$ 142,07" delta={{ ...ATRASADO, label: "−2,8%" }} progress={85} goal="85% do ticket esperado" />
      </Box>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, alignItems: "start" }}>
        <Spot id="card">
          <Card>
            <CardHeader title="Pedidos" subheader="Últimos 7 dias" />
            <Spot id="tabs">
              <Tabs value={tab} onChange={(_, v: keyof typeof ORDERS) => setTab(v)} aria-label="Lista de pedidos" sx={{ px: 2 }}>
                <Tab value="recentes" label="Recentes" />
                <Tab value="devolucoes" label="Devoluções" />
                <Tab value="arquivados" label="Arquivados" disabled />
              </Tabs>
            </Spot>
            <Spot id="table">
              <TableContainer>
                <Table size="small" aria-label="Pedidos">
                  <TableHead>
                    <TableRow>
                      <TableCell>Pedido</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Situação</TableCell>
                      <TableCell align="right">Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(ORDERS[tab] ?? []).map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{o.id}</TableCell>
                        <TableCell>{o.client}</TableCell>
                        <TableCell>
                          <Spot id={o.status.spot}>
                            <Box><Chip size="small" color={o.status.color} label={o.status.label} /></Box>
                          </Spot>
                        </TableCell>
                        <TableCell align="right">{o.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Spot>
          </Card>
        </Spot>

        <Box sx={{ display: "grid", gap: 3 }}>
          <Spot id="card">
            <Card>
              <CardHeader
                avatar={<Spot id="avatar"><Avatar aria-label="Loja"><StorefrontIcon /></Avatar></Spot>}
                title="Equipe de atendimento"
                subheader="5 pessoas em turno"
              />
              <CardContent>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Spot id="avatar-group">
                    <AvatarGroup max={4}>
                      {TEAM.map((p) => <Avatar key={p.initials} alt={p.name}>{p.initials}</Avatar>)}
                    </AvatarGroup>
                  </Spot>
                  <Stack direction="row" spacing={2}>
                    <Spot id="badge-danger">
                      <Badge badgeContent={8} color="error" aria-label="8 notificações"><NotificationsIcon /></Badge>
                    </Spot>
                    <Spot id="badge-primary">
                      <Badge badgeContent={3} color="primary" aria-label="3 conversas"><ChatIcon /></Badge>
                    </Spot>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Spot>

          <Spot id="card">
            <Card>
              <CardHeader title="Etiquetas" subheader="Situação e categorias" />
              <CardContent>
                <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
                  <Spot id="chip-default"><Chip label="Rascunho" /></Spot>
                  <Spot id="chip-primary"><Chip color="primary" label="Novo" /></Spot>
                  <Spot id="chip-secondary"><Chip color="secondary" label="Parceria" /></Spot>
                  <Spot id="badge-secondary">
                    <Badge color="secondary" variant="dot"><Chip label="Atacado" /></Badge>
                  </Spot>
                  <Spot id="chip-success"><Chip color="success" label="Pago" /></Spot>
                  <Spot id="chip-warning"><Chip color="warning" label="Pendente" /></Spot>
                  <Spot id="chip-danger"><Chip color="error" label="Atrasado" /></Spot>
                  <Spot id="chip-information"><Chip color="info" label="Em análise" /></Spot>
                </Stack>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", mt: 3 }}>
                  <Spot id="progress"><CircularProgress size={32} aria-label="Sincronizando estoque" /></Spot>
                  <Typography variant="body2" color="text.secondary">Sincronizando estoque…</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Spot>
        </Box>
      </Box>

      <Spot id="card">
        <Card>
          <CardHeader title="Tipografia" subheader="Do display ao corpo" />
          <CardContent sx={{ display: "grid", gap: 2 }}>
            <Spot id="typography-display">
              <Typography variant="h1" component="p">R$ 1,2 mi</Typography>
              <Typography variant="h2" component="p">Vendas no ano</Typography>
              <Typography variant="h3" component="p">Black Friday</Typography>
            </Spot>
            <Spot id="typography-heading">
              <Typography variant="h4" component="p">Resumo do trimestre</Typography>
              <Typography variant="h5" component="p">Canais de venda</Typography>
              <Typography variant="h6" component="p">Loja física e e-commerce</Typography>
            </Spot>
            <Spot id="typography-body">
              <Typography variant="body1">
                O faturamento cresceu puxado pelo e-commerce, que já responde por 62% das vendas. A loja física manteve o ticket médio.
              </Typography>
              <Typography variant="body2" color="text.secondary">Fonte: relatório financeiro consolidado em 24/11/2026.</Typography>
            </Spot>
          </CardContent>
        </Card>
      </Spot>
    </Box>
  );
}
