export interface FontEntry { family: string; weights: number[]; source: "local" | "google" }

const range = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let w = from; w <= to; w += 100) out.push(w);
  return out;
};

/** Satoshi servida pelo app + famílias populares do Google Fonts com os pesos (romanos) que elas oferecem. */
export const FONT_CATALOG: FontEntry[] = [
  { family: "Satoshi Variable", weights: range(300, 900), source: "local" },
  { family: "Inter", weights: range(100, 900), source: "google" },
  { family: "Roboto", weights: range(100, 900), source: "google" },
  { family: "Open Sans", weights: range(300, 800), source: "google" },
  { family: "Lato", weights: [100, 300, 400, 700, 900], source: "google" },
  { family: "Montserrat", weights: range(100, 900), source: "google" },
  { family: "Poppins", weights: range(100, 900), source: "google" },
  { family: "Nunito", weights: range(200, 1000), source: "google" },
  { family: "Work Sans", weights: range(100, 900), source: "google" },
  { family: "DM Sans", weights: range(100, 1000), source: "google" },
  { family: "Manrope", weights: range(200, 800), source: "google" },
  { family: "Source Sans 3", weights: range(200, 900), source: "google" },
  { family: "IBM Plex Sans", weights: range(100, 700), source: "google" },
  { family: "Rubik", weights: range(300, 900), source: "google" },
  { family: "Raleway", weights: range(100, 900), source: "google" },
  { family: "Playfair Display", weights: range(400, 900), source: "google" },
  { family: "Merriweather", weights: range(300, 900), source: "google" },
  { family: "Lora", weights: range(400, 700), source: "google" },
  { family: "Space Grotesk", weights: range(300, 700), source: "google" },
  { family: "Outfit", weights: range(100, 900), source: "google" },
  { family: "Figtree", weights: range(300, 900), source: "google" },
];

const loaded = new Set<string>();

/** Injeta o <link> do Google Fonts (css2) da família uma única vez. Fontes locais ou fora do catálogo: nada a fazer. */
export function ensureFontLoaded(family: string): void {
  const entry = FONT_CATALOG.find((f) => f.family === family);
  if (!entry || entry.source !== "google" || loaded.has(family)) return;
  loaded.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${entry.weights.join(";")}&display=swap`;
  document.head.appendChild(link);
}
