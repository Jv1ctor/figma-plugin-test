import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { createRelayClient, RELAY_URL } from "./sync/relay-client.ts";
import { startSync } from "./sync/actions.ts";

startSync(createRelayClient(RELAY_URL));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
