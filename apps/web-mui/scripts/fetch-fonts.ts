// Baixa a Satoshi da Fontshare para public/fonts/. A licença (ITF FFL) não permite distribuí-la pelo
// repositório, então o arquivo não é versionado. Sem rede: avisa e sai com 0 (o app usa o fallback).
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const URL_ZIP = "https://api.fontshare.com/v2/fonts/download/satoshi";
const ENTRY_SUFFIX = "/WEB/fonts/Satoshi-Variable.woff2";
const OUT_DIR = fileURLToPath(new URL("../public/fonts/", import.meta.url));
const OUT_FILE = `${OUT_DIR}Satoshi-Variable.woff2`;

/** Extrai uma entrada de um zip (stored ou deflate) lendo o diretório central. */
export function extractEntry(zip: Buffer, matches: (name: string) => boolean): Buffer | undefined {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("zip sem diretório central");
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error("entrada do diretório central inválida");
    const method = zip.readUInt16LE(p + 10);
    const compSize = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (!matches(name)) continue;
    if (zip.readUInt32LE(local) !== 0x04034b50) throw new Error("cabeçalho local inválido");
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(start, start + compSize);
    if (method === 0) return Buffer.from(data);
    if (method === 8) return inflateRawSync(data);
    throw new Error(`método de compressão ${method} não suportado`);
  }
  return undefined;
}

async function main(): Promise<void> {
  if (existsSync(OUT_FILE)) return;
  try {
    const res = await fetch(URL_ZIP, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const font = extractEntry(Buffer.from(await res.arrayBuffer()), (name) => name.endsWith(ENTRY_SUFFIX));
    if (!font || font.toString("latin1", 0, 4) !== "wOF2") throw new Error("Satoshi-Variable.woff2 não encontrado no zip");
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(`${OUT_FILE}.tmp`, font);
    renameSync(`${OUT_FILE}.tmp`, OUT_FILE);
    console.log(`Satoshi baixada em ${OUT_FILE}`);
  } catch (err) {
    console.warn(`[fonts] Não foi possível baixar a Satoshi (${(err as Error).message}). O app usa o fallback system-ui; veja public/fonts/README.md.`);
  }
}

await main();
