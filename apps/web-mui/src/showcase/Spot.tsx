import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useEditor } from "../state/store.ts";
import { SPOTS, type SpotId } from "./spots.ts";

const KEYS: Record<string, ReadonlySet<string>> = Object.fromEntries(
  Object.entries(SPOTS).map(([id, tokens]) => [id, new Set(tokens.map((t) => `semantic:${t}`))]),
);

/** Peça da vitrine: ganha contorno âmbar tracejado quando algum token que ela consome tem aviso (spec §9.2). */
export function Spot({ id, children }: { id: SpotId; children: ReactNode }) {
  const keys = KEYS[id]!;
  const warned = useEditor((s) => s.warnings.some((w) => keys.has(w.token)));
  return (
    <Box
      data-spot={id}
      data-warn={warned ? "true" : undefined}
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        borderRadius: "var(--vx-radius-xx-small)",
        outlineOffset: "4px",
        ...(warned && { outline: "1px dashed var(--vx-border-warning)" }),
      }}
    >
      {children}
    </Box>
  );
}
