import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { store, useEditor } from "../state/store.ts";
import { CategoricalLegend } from "./charts/CategoricalLegend.tsx";
import { Heatmap } from "./charts/Heatmap.tsx";
import { Spot } from "./Spot.tsx";

const CATEGORICAL = [1, 2, 3, 4, 5, 6].map((n) => `var(--vx-data-categorical-${n})`);
const MONTHS = ["Jan", "Fev", "Mar", "Abr"];
const CHANNELS = ["Site", "App", "Loja", "Parceiros", "Telefone", "Outros"];
const BAR_SERIES = CHANNELS.map((label, i) => ({ label, data: [12 + i * 3, 20 - i, 15 + i * 2, 24 - i * 2] }));
const LINE_SERIES = CHANNELS.slice(0, 3).map((label, i) => ({ label, data: [10 + i * 6, 18 + i * 2, 14 + i * 5, 26 - i * 3], showMark: false }));
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS = ["8h", "12h", "16h", "20h"];
const HEAT = [[3, 18, 9, 4], [7, 24, 15, 10], [12, 30, 21, 6], [5, 16, 27, 14], [1, 9, 12, 20]];

const HEIGHT = 280;

export function Charts() {
  const dataOff = useEditor((s) => s.set.disabledGroups.includes("data"));

  if (dataOff) {
    return (
      <Box component="section" aria-labelledby="graficos-titulo" sx={{ display: "grid", gap: "var(--vx-space-large)", justifyItems: "start" }}>
        <Typography id="graficos-titulo" variant="h3" component="h2">Gráficos</Typography>
        <Typography variant="body1" color="text.secondary">Gráficos desligados na Base (grupo data)</Typography>
        <Button variant="contained" onClick={() => store.update((s) => ({ ...s, tab: "base" }))}>Ir para a Base</Button>
      </Box>
    );
  }

  return (
    <Box component="section" aria-labelledby="graficos-titulo" sx={{ display: "grid", gap: "var(--vx-space-large)" }}>
      <div>
        <Spot id="typography-display">
          <Typography id="graficos-titulo" variant="h3" component="h2">Gráficos</Typography>
        </Spot>
        <Spot id="typography-body">
          <Typography variant="body1" color="text.secondary">Séries categóricas e escala sequencial dos tokens de dados.</Typography>
        </Spot>
      </div>

      <Box sx={{ display: "grid", gap: "var(--vx-space-large)", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Spot id="chart-bar">
          <Card>
            <CardHeader title="Vendas por canal" slotProps={{ title: { variant: "h6", component: "h3" } }} />
            <CardContent>
              <BarChart
                height={HEIGHT}
                colors={CATEGORICAL}
                hideLegend
                xAxis={[{ scaleType: "band", data: MONTHS }]}
                series={BAR_SERIES}
                grid={{ horizontal: true }}
              />
            </CardContent>
          </Card>
        </Spot>
        <Spot id="chart-line">
          <Card>
            <CardHeader title="Acessos por canal" slotProps={{ title: { variant: "h6", component: "h3" } }} />
            <CardContent>
              <LineChart
                height={HEIGHT}
                colors={CATEGORICAL.slice(0, 3)}
                hideLegend
                xAxis={[{ scaleType: "point", data: MONTHS }]}
                series={LINE_SERIES}
                grid={{ horizontal: true }}
              />
            </CardContent>
          </Card>
        </Spot>
        <Spot id="chart-heatmap">
          <Card>
            <CardHeader title="Pedidos por dia e horário" slotProps={{ title: { variant: "h6", component: "h3" } }} />
            <CardContent>
              <Heatmap rows={DAYS} cols={HOURS} values={HEAT} max={30} />
            </CardContent>
          </Card>
        </Spot>
        <Spot id="chart-legend">
          <Card>
            <CardHeader title="Legenda categórica" slotProps={{ title: { variant: "h6", component: "h3" } }} />
            <CardContent>
              <CategoricalLegend series={CHANNELS} />
            </CardContent>
          </Card>
        </Spot>
      </Box>
    </Box>
  );
}
