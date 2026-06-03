const SUFFIXES = ["sas", "sarl", "sa", "eurl", "sci", "snc", "sasu", "scop"];

export function normalizeRaisonSociale(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,;:!?()'"\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .filter((w) => !SUFFIXES.includes(w))
    .join(" ")
    .trim();
}

export function buildDedupKey(input: {
  raison_sociale: string;
  code_postal: string | null;
}): string {
  const normalisee = normalizeRaisonSociale(input.raison_sociale);
  return `${normalisee}|${input.code_postal ?? ""}`;
}
