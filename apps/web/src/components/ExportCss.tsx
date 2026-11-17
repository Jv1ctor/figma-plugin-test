import { useState } from "react";
import { themeToCss, type Theme } from "@token-bridge/protocol";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy, Download, X } from "lucide-react";

export function ExportCss({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const css = themeToCss(theme);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([css], { type: "text/css" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "globals.css" });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="dialog"
      aria-modal
    >
      <Card className="max-h-[85vh] w-full max-w-2xl gap-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>globals.css</CardTitle>
          <CardDescription>Cole no seu projeto shadcn/ui (Tailwind v4).</CardDescription>
          <CardAction>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar" autoFocus>
              <X />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="min-h-0 flex-1">
          <pre className="bg-muted max-h-[55vh] overflow-auto rounded-lg p-4 font-mono text-xs leading-relaxed">{css}</pre>
        </CardContent>
        <div className="flex justify-end gap-2 px-6">
          <Button variant="outline" onClick={download}>
            <Download /> Baixar
          </Button>
          <Button onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
