import { cn } from "@/lib/utils";
import type { RelayState } from "@/lib/relay";

export function StatusPill({ state }: { state: RelayState }) {
  const { socket, status } = state;
  const [tone, label] =
    socket !== "open"
      ? (["red", socket === "connecting" ? "Conectando ao relay…" : "Relay offline"] as const)
      : status?.plugin === "connected"
        ? (["green", "Figma conectado"] as const)
        : (["amber", status?.queued ? "Figma offline · tema na fila" : "Figma offline"] as const);

  return (
    <div
      className="bg-card inline-flex shrink-0 items-center whitespace-nowrap gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-xs"
      title={status?.lastApplied ? `Último aplicado: ${status.lastApplied.name}` : undefined}
      aria-live="polite"
    >
      <span className="relative flex size-2">
        {tone === "green" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            tone === "green" && "bg-emerald-500",
            tone === "amber" && "bg-amber-500",
            tone === "red" && "bg-red-500",
          )}
        />
      </span>
      {label}
    </div>
  );
}
