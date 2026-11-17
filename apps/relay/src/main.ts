import { createRelay } from "./relay.ts";
import { c, consoleLogger } from "./log.ts";

const port = Number(process.env.PORT ?? 3055);
const relay = createRelay({ port });

relay
  .listen()
  .then((p) => {
    consoleLogger("relay", c.bold(`Token Bridge relay em ws://localhost:${p}`));
    consoleLogger("relay", c.dim(`HTTP: POST /theme · GET /snapshot · GET /status`));
  })
  .catch((e: NodeJS.ErrnoException) => {
    consoleLogger("relay", c.red(e.code === "EADDRINUSE" ? `porta ${port} já está em uso` : String(e)));
    process.exit(1);
  });

for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => void relay.close().then(() => process.exit(0)));
