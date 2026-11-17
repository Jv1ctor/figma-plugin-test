import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BASE_COLORS, BASE_COLOR_NAMES, PRIMARY_COLORS, PRIMARY_NAMES, RADIUS_PRESETS, TOKENS, buildTheme, cssToHex,
  type AckPayload, type BaseColor, type PrimaryChoice, type Theme, type ThemeMode,
} from "@token-bridge/protocol";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Preview } from "@/components/Preview";
import { StatusPill } from "@/components/StatusPill";
import { ExportCss } from "@/components/ExportCss";
import { RelayError, relay, useRelay } from "@/lib/relay";
import { cn } from "@/lib/utils";
import { Check, Download, FileCode2, Loader2, Moon, Send, Sun } from "lucide-react";

const DEBOUNCE_MS = 150;

type Sync =
  | { state: "idle" }
  | { state: "sending"; since: number }
  | { state: "ok"; at: Date; ms: number; ack: AckPayload }
  | { state: "queued"; at: Date }
  | { state: "replayed"; at: Date; name: string }
  | { state: "error"; at: Date; message: string };

interface Controls {
  base: BaseColor;
  primary: PrimaryChoice;
  radius: number;
}

export function App() {
  const conn = useRelay();
  const [controls, setControls] = useState<Controls>({ base: "zinc", primary: "base", radius: 0.625 });
  /** A theme pulled from Figma; cleared when base/primary change. */
  const [imported, setImported] = useState<Theme | null>(null);
  const [mode, setMode] = useState<ThemeMode>("light");
  const [auto, setAuto] = useState(true);
  const [sync, setSync] = useState<Sync>({ state: "idle" });
  const [importing, setImporting] = useState(false);
  const [showCss, setShowCss] = useState(false);
  /** Bumped on every user edit; drives auto-send (page load and imports don't push). */
  const [edits, setEdits] = useState(0);

  const theme: Theme = imported ? { ...imported, radius: controls.radius } : buildTheme(controls);

  // Apply the live theme to the whole page, like ui.shadcn.com/themes.
  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const t of TOKENS) root.style.setProperty(`--${t}`, theme[mode][t]);
    root.style.setProperty("--radius", `${theme.radius}rem`);
    root.classList.toggle("dark", mode === "dark");
    root.style.colorScheme = mode;
  }, [theme, mode]);

  const edit = (patch: Partial<Controls>, keepImported = false) => {
    setControls((c) => ({ ...c, ...patch }));
    if (!keepImported) setImported(null);
    setEdits((n) => n + 1);
  };

  const themeRef = useRef(theme);
  themeRef.current = theme;

  const send = useCallback(async () => {
    const t0 = performance.now();
    // Plugin offline: the relay keeps the latest theme and replays it on reconnect.
    const offline = relay.state.status?.plugin === "disconnected";
    setSync(offline ? { state: "queued", at: new Date() } : { state: "sending", since: Date.now() });
    try {
      const reply = await relay.request("upsert-theme", themeRef.current);
      setSync({ state: "ok", at: new Date(), ms: Math.round(performance.now() - t0), ack: reply.payload as AckPayload });
    } catch (e) {
      const stillQueued = e instanceof RelayError && e.payload.code === "timeout" && relay.state.status?.queued;
      // "plugin-offline" here means a newer edit replaced this one in the queue: nothing to report.
      const superseded = e instanceof RelayError && e.payload.code === "plugin-offline" && relay.state.status?.queued;
      if (stillQueued) setSync({ state: "queued", at: new Date() });
      else if (superseded) return;
      else {
        setSync({ state: "error", at: new Date(), message: (e as Error).message });
      }
    }
  }, []);

  useEffect(() => {
    if (!auto || edits === 0) return;
    const t = setTimeout(send, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [edits, auto, send]);

  // A queued theme whose ack we stopped waiting for: the status broadcast tells us it landed.
  const lastApplied = conn.status?.lastApplied;
  useEffect(() => {
    if (sync.state === "queued" && conn.status && !conn.status.queued && lastApplied && new Date(lastApplied.at) >= sync.at) {
      setSync({ state: "replayed", at: new Date(lastApplied.at), name: lastApplied.name });
    }
  }, [sync, conn.status, lastApplied]);

  const importFromFigma = async () => {
    setImporting(true);
    try {
      const reply = await relay.request("get-snapshot");
      const snap = reply.payload as Theme;
      setImported(snap);
      setControls((c) => ({ ...c, radius: snap.radius }));
      setSync({ state: "idle" });
    } catch (e) {
      setSync({ state: "error", at: new Date(), message: `Importar: ${(e as Error).message}` });
    } finally {
      setImporting(false);
    }
  };

  const online = conn.socket === "open";
  const pluginOnline = conn.status?.plugin === "connected";
  const customPrimary = controls.primary !== "base" && !(controls.primary in PRIMARY_COLORS);

  return (
    <div className="min-h-svh">
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md">
            <FileCode2 className="size-4" />
          </div>
          <div className="mr-auto leading-tight">
            <h1 className="text-sm font-semibold">Token Bridge</h1>
            <p className="text-muted-foreground text-xs">shadcn theme → Figma Variables</p>
          </div>
          <StatusPill state={conn} />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <Card className="gap-0 py-0">
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr_auto]">
            <Field label="Base">
              <div className="flex flex-wrap gap-1.5">
                {BASE_COLOR_NAMES.map((b) => (
                  <Swatch
                    key={b}
                    label={b}
                    color={BASE_COLORS[b][500]}
                    active={!imported && controls.base === b}
                    onClick={() => edit({ base: b })}
                  />
                ))}
              </div>
            </Field>

            <Field label="Cor primária">
              <div className="flex flex-wrap gap-1.5">
                <Swatch
                  label="padrão"
                  color={BASE_COLORS[controls.base][mode === "light" ? 900 : 200]}
                  active={!imported && controls.primary === "base"}
                  onClick={() => edit({ primary: "base" })}
                />
                {PRIMARY_NAMES.map((p) => (
                  <Swatch
                    key={p}
                    label={p}
                    color={PRIMARY_COLORS[p].light}
                    active={!imported && controls.primary === p}
                    onClick={() => edit({ primary: p })}
                  />
                ))}
                <label
                  className={cn(
                    "hover:bg-accent relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium",
                    !imported && customPrimary && "border-primary ring-primary/30 ring-2",
                  )}
                >
                  <span
                    className="size-3.5 rounded-full border"
                    style={{ background: customPrimary ? controls.primary : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
                  />
                  custom
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={customPrimary ? cssToHex(controls.primary) : "#3b82f6"}
                    onChange={(e) => edit({ primary: e.target.value })}
                  />
                </label>
              </div>
            </Field>

            <Field label={`Radius · ${controls.radius}rem`}>
              <div className="grid w-full gap-3 lg:w-64">
                <div className="flex gap-1">
                  {RADIUS_PRESETS.map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={controls.radius === r ? "default" : "outline"}
                      className="h-7 flex-1 px-0 text-xs"
                      onClick={() => edit({ radius: r }, true)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
                <Slider
                  min={0}
                  max={1.5}
                  step={0.025}
                  value={[controls.radius]}
                  onValueChange={([r]) => edit({ radius: Math.round(r! * 1000) / 1000 }, true)}
                  aria-label="Radius"
                />
              </div>
            </Field>
          </CardContent>

          <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
            <div className="bg-muted inline-flex rounded-lg p-[3px]">
              {(["light", "dark"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition",
                    mode === m ? "bg-background text-foreground shadow-sm dark:bg-input/40" : "text-muted-foreground",
                  )}
                >
                  {m === "light" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                  {m}
                </button>
              ))}
            </div>

            <Label className="text-muted-foreground ml-2 text-xs font-normal">
              <Switch checked={auto} onCheckedChange={setAuto} /> Envio automático
            </Label>

            <SyncLine sync={sync} imported={imported} />

            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={importFromFigma} disabled={!online || !pluginOnline || importing}>
                {importing ? <Loader2 className="animate-spin" /> : <Download />} Importar do Figma
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCss(true)}>
                <FileCode2 /> Exportar CSS
              </Button>
              <Button size="sm" onClick={send} disabled={!online}>
                <Send /> Enviar agora
              </Button>
            </div>
          </div>
        </Card>

        <Preview theme={theme} mode={mode} />
      </main>

      {showCss && <ExportCss theme={theme} onClose={() => setShowCss(false)} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}

function Swatch({ label, color, active, onClick }: { label: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "hover:bg-accent inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium capitalize transition",
        active && "border-primary ring-primary/30 ring-2",
      )}
    >
      <span className="grid size-3.5 place-items-center rounded-full ring-1 ring-black/10 dark:ring-white/20" style={{ background: color }}>
        {active && <Check className="size-2.5 text-white mix-blend-difference" strokeWidth={4} />}
      </span>
      {label}
    </button>
  );
}

function SyncLine({ sync, imported }: { sync: Sync; imported: Theme | null }) {
  const time = (d: Date) => d.toLocaleTimeString("pt-BR", { hour12: false });
  let content: React.ReactNode = imported ? `Importado do Figma: "${imported.name}"` : "Nenhuma alteração enviada ainda";
  let tone = "text-muted-foreground";
  let title: string | undefined;

  if (sync.state === "sending") content = <><Loader2 className="size-3 animate-spin" /> enviando…</>;
  if (sync.state === "queued") {
    content = `${time(sync.at)} · na fila; será aplicado quando o plugin reconectar`;
    tone = "text-amber-600 dark:text-amber-400";
  }
  if (sync.state === "replayed") content = `${time(sync.at)} · "${sync.name}" aplicado da fila após o plugin reconectar`;
  if (sync.state === "error") {
    content = `${time(sync.at)} · ${sync.message}`;
    tone = "text-destructive";
  }
  if (sync.state === "ok") {
    const { ack } = sync;
    const clamped = ack.clamped.length ? ` · ${ack.clamped.length} ajustados p/ sRGB` : "";
    title = ack.clamped.length
      ? `Gamut-mapped para sRGB (Figma não guarda P3 em variáveis):\n${ack.clamped.map((c) => `${c.mode}.${c.token}  ${c.from}`).join("\n")}`
      : undefined;
    const via = ack.replayed ? "aplicado da fila · " : "";
    content = `${time(sync.at)} · ${via}${sync.ms}ms · ${ack.created} criadas, ${ack.updated} atualizadas, ${ack.unchanged} iguais${clamped}`;
    tone = "text-muted-foreground";
  }

  return (
    <p
      className={cn("inline-flex min-w-0 items-center gap-1.5 truncate text-xs", tone, title && "cursor-help underline decoration-dotted underline-offset-2")}
      title={title ?? (typeof content === "string" ? content : undefined)}
    >
      {content}
    </p>
  );
}
