import { TOKENS, type Theme, type ThemeMode } from "@token-bridge/protocol";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowUpRight, Bell, Check, CreditCard, Home, Inbox, Settings, TriangleAlert } from "lucide-react";

const bars = [
  [62, 40, 78, 30, 55],
  [80, 52, 64, 44, 70],
  [45, 70, 50, 60, 38],
  [72, 35, 88, 52, 61],
  [58, 64, 42, 74, 49],
  [90, 48, 70, 36, 66],
];

export function Preview({ theme, mode }: { theme: Theme; mode: ThemeMode }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Entre com seu e-mail para começar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="account">
            <TabsList className="w-full">
              <TabsTrigger value="account">Conta</TabsTrigger>
              <TabsTrigger value="password">Senha</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-3 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" placeholder="voce@exemplo.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" defaultValue="Ana Souza" />
              </div>
            </TabsContent>
            <TabsContent value="password" className="mt-3 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="pw">Nova senha</Label>
                <Input id="pw" type="password" defaultValue="hunter22" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pw2">Confirmar</Label>
                <Input id="pw2" type="password" aria-invalid defaultValue="hunter2" />
                <p className="text-destructive text-xs">As senhas não coincidem.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="gap-2">
          <Button className="flex-1">Criar conta</Button>
          <Button variant="outline">Cancelar</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receita</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
          <CardAction>
            <Badge variant="secondary">
              <ArrowUpRight /> 12,5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="text-3xl font-semibold tabular-nums">R$ 45.231,89</div>
          <div className="flex h-32 items-end gap-2">
            {bars.map((group, i) => (
              <div key={i} className="flex h-full flex-1 items-end gap-0.5">
                {group.map((h, j) => (
                  <div
                    key={j}
                    className="flex-1 rounded-t-[calc(var(--radius)/3)]"
                    style={{ height: `${h}%`, background: `var(--chart-${j + 1})` }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-[2px]" style={{ background: `var(--chart-${n})` }} /> chart-{n}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>Você tem 3 mensagens não lidas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Bell className="text-muted-foreground size-5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Push</p>
              <p className="text-muted-foreground text-xs">Enviar para o celular.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">
              <TriangleAlert /> Erro
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">
              <Check /> Primary
            </Button>
            <Button size="sm" variant="secondary">Secondary</Button>
            <Button size="sm" variant="ghost">Ghost</Button>
            <Button size="sm" variant="destructive">Excluir</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0 md:col-span-2 xl:col-span-1">
        <div className="flex h-full min-h-56">
          <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-44 flex-col gap-1 border-r p-2 text-sm">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground grid size-6 place-items-center rounded-md text-xs font-bold">
                TB
              </div>
              <span className="font-semibold">Acme</span>
            </div>
            {[
              [Home, "Início", true],
              [Inbox, "Caixa", false],
              [CreditCard, "Pagamentos", false],
              [Settings, "Ajustes", false],
            ].map(([Icon, label, active]) => {
              const I = Icon as typeof Home;
              return (
                <div
                  key={label as string}
                  className={
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 font-medium"
                      : "flex items-center gap-2 rounded-md px-2 py-1.5 opacity-80"
                  }
                >
                  <I className="size-4" /> {label as string}
                </div>
              );
            })}
          </aside>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-sm font-medium">Sidebar</p>
            <p className="text-muted-foreground text-xs">Tokens sidebar-* usados no shadcn Sidebar.</p>
            <Input placeholder="Buscar…" className="mt-auto" />
          </div>
        </div>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Tokens · {mode}</CardTitle>
          <CardDescription>
            {theme.name} · radius {theme.radius}rem ({theme.radius * 16}px)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {TOKENS.map((t) => (
              <div key={t} className="flex min-w-0 items-center gap-2" title={theme[mode][t]}>
                <span
                  className="size-6 shrink-0 rounded-md border shadow-xs"
                  style={{ background: theme[mode][t] }}
                />
                <span className="truncate font-mono text-[11px]">{t}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
