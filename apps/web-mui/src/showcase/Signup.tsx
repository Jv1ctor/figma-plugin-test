import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Spot } from "./Spot.tsx";

const STATES = ["São Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Paraná", "Rio Grande do Sul", "Pernambuco"];
const CITIES = ["Campinas", "Ribeirão Preto", "Santos", "São José dos Campos", "Sorocaba", "São Paulo"];

export function Signup() {
  return (
    <Box component="section" aria-labelledby="cadastro-titulo" sx={{ display: "grid", gap: 3 }}>
      <div>
        <Spot id="typography-display">
          <Typography id="cadastro-titulo" variant="h3" component="h2">Cadastro</Typography>
        </Spot>
        <Spot id="typography-body">
          <Typography variant="body1" color="text.secondary">Crie sua conta para acompanhar pedidos, trocas e notas fiscais.</Typography>
        </Spot>
      </div>

      <Spot id="card">
        <Card>
          <CardContent>
            <Box component="form" noValidate onSubmit={(e) => e.preventDefault()} aria-label="Criar conta" sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
              <Spot id="textfield-empty">
                <TextField label="Nome completo" placeholder="Como aparece no documento" fullWidth />
              </Spot>
              <Spot id="textfield-filled">
                <TextField label="E-mail" type="email" defaultValue="ana.souza@exemplo.com.br" fullWidth />
              </Spot>
              <Spot id="textfield-focus">
                <TextField label="Celular" placeholder="(11) 98765-4321" helperText="Enviaremos um código por SMS" focused fullWidth />
              </Spot>
              <Spot id="textfield-error">
                <TextField label="CPF" defaultValue="123.456.789-00" error helperText="CPF inválido. Confira os dígitos." fullWidth />
              </Spot>
              <Spot id="select">
                <FormControl fullWidth>
                  <InputLabel id="cadastro-estado">Estado</InputLabel>
                  <Select labelId="cadastro-estado" label="Estado" defaultValue="São Paulo">
                    {STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Spot>
              <Spot id="autocomplete">
                <Autocomplete
                  options={CITIES}
                  defaultValue="Campinas"
                  renderInput={(params) => <TextField {...params} label="Cidade" />}
                />
              </Spot>
              <Spot id="textfield-disabled">
                <TextField label="Código de convite" defaultValue="VORTEX-2026" helperText="Preenchido pelo convite" disabled fullWidth />
              </Spot>

              <Spot id="radio">
                <FormControl>
                  <FormLabel id="cadastro-tipo">Tipo de conta</FormLabel>
                  <RadioGroup row aria-labelledby="cadastro-tipo" defaultValue="pf" name="tipo">
                    <FormControlLabel value="pf" control={<Radio />} label="Pessoa física" />
                    <FormControlLabel value="pj" control={<Radio />} label="Pessoa jurídica" />
                    <FormControlLabel value="estrangeiro" control={<Radio />} label="Estrangeiro" disabled />
                  </RadioGroup>
                </FormControl>
              </Spot>

              <Spot id="checkbox">
                <FormControl>
                  <FormGroup>
                    <FormControlLabel control={<Checkbox defaultChecked />} label="Aceito os termos de uso" />
                    <FormControlLabel control={<Checkbox />} label="Quero receber ofertas por e-mail" />
                    <FormControlLabel control={<Checkbox defaultChecked />} label="Conta verificada" disabled />
                  </FormGroup>
                  <FormHelperText>Você pode mudar as preferências depois, no seu perfil.</FormHelperText>
                </FormControl>
              </Spot>

              <Box sx={{ gridColumn: "1 / -1" }}>
                <Spot id="link">
                  <Typography variant="body2">
                    Ao criar a conta, você concorda com os <Link href="#termos">termos de uso</Link> e a{" "}
                    <Link href="#privacidade">política de privacidade</Link>. Já tem conta? <Link href="#entrar">Entrar</Link>
                  </Typography>
                </Spot>
              </Box>

              <Stack direction="row" useFlexGap sx={{ gridColumn: "1 / -1", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                <Spot id="button-contained-primary"><Button variant="contained" type="submit">Criar conta</Button></Spot>
                <Spot id="button-contained-secondary"><Button variant="contained" color="secondary">Salvar rascunho</Button></Spot>
                <Spot id="button-outlined"><Button variant="outlined">Cancelar</Button></Spot>
                <Spot id="button-text"><Button startIcon={<ArrowBackIcon />}>Voltar</Button></Spot>
                <Spot id="button-disabled"><Button variant="contained" disabled>Enviando…</Button></Spot>
                <Spot id="button-disabled"><Button variant="outlined" disabled>Indisponível</Button></Spot>
                <Box sx={{ flex: 1 }} />
                <Spot id="button-contained-danger"><Button variant="contained" color="error">Excluir dados</Button></Spot>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Spot>
    </Box>
  );
}
