const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
export const c = {
  dim: paint(2),
  red: paint(31),
  green: paint(32),
  yellow: paint(33),
  blue: paint(34),
  magenta: paint(35),
  cyan: paint(36),
  bold: paint(1),
};

const roleColor: Record<string, (s: string) => string> = {
  plugin: c.magenta,
  web: c.cyan,
  agent: c.yellow,
  http: c.yellow,
  relay: c.blue,
};

export type Logger = (who: string, msg: string) => void;

export const consoleLogger: Logger = (who, msg) => {
  const time = new Date().toLocaleTimeString("pt-BR", { hour12: false });
  const tag = (roleColor[who] ?? ((s: string) => s))(who.padEnd(6));
  console.log(`${c.dim(time)} ${tag} ${msg}`);
};

export const silentLogger: Logger = () => {};
