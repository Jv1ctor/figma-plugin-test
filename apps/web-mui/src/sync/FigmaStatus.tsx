import Chip from "@mui/material/Chip";
import { useSync } from "./sync-store.ts";

export function FigmaStatus() {
  const socket = useSync((s) => s.relay.socket);
  const status = useSync((s) => s.relay.status);
  if (socket !== "open") return <Chip size="small" color="error" label="Relay offline" />;
  if (status?.tokensQueued) return <Chip size="small" color="warning" label="Na fila" />;
  if (status?.plugin === "connected") return <Chip size="small" color="success" label="Figma conectado" />;
  return <Chip size="small" color="default" label="Figma offline" />;
}
