const NAME = /[a-z0-9-]+(?:\/[a-z0-9-]+)+/g;
const STATES_SUFFIX = /^\s+e seus estados/;

/** Nomes semantic da linha "Par:" de uma descrição (só os que `known` reconhece). */
export function parsePar(description: string, known: (name: string) => boolean): string[] {
  const line = description.split("\n").find((l) => l.trimStart().startsWith("Par:"));
  if (!line) return [];
  const text = line.trimStart().slice("Par:".length);
  const out: string[] = [];
  const add = (n: string) => { if (!out.includes(n)) out.push(n); };
  for (const m of text.matchAll(NAME)) {
    const name = m[0];
    if (!known(name)) continue;
    add(name);
    if (STATES_SUFFIX.test(text.slice(m.index + name.length))) {
      for (const s of ["-hover", "-pressed"]) if (known(name + s)) add(name + s);
    }
  }
  return out;
}
