import { describe, it, expect } from "vitest";
import { normalizeRaisonSociale, buildDedupKey } from "@/lib/dedup/entreprise";

describe("normalizeRaisonSociale", () => {
  it("met en minuscules", () => {
    expect(normalizeRaisonSociale("DORISON")).toBe("dorison");
  });

  it("retire les accents", () => {
    expect(normalizeRaisonSociale("Soderef Développement")).toBe("soderef developpement");
  });

  it("retire les suffixes juridiques", () => {
    expect(normalizeRaisonSociale("VALLEE SAS")).toBe("vallee");
    expect(normalizeRaisonSociale("SOPREMA SARL")).toBe("soprema");
    expect(normalizeRaisonSociale("Le Batimans SA")).toBe("le batimans");
    expect(normalizeRaisonSociale("SCI LE MANS INVESTISSEMENT")).toBe("le mans investissement");
  });

  it("normalise les espaces multiples", () => {
    expect(normalizeRaisonSociale("  Atelier   Bleu  d'Archi  ")).toBe("atelier bleu d archi");
  });

  it("retire la ponctuation", () => {
    expect(normalizeRaisonSociale("MORIN, MTD")).toBe("morin mtd");
  });
});

describe("buildDedupKey", () => {
  it("combine raison_sociale normalisée et code_postal", () => {
    expect(buildDedupKey({ raison_sociale: "DORISON", code_postal: "72400" })).toBe("dorison|72400");
  });

  it("fonctionne sans code postal", () => {
    expect(buildDedupKey({ raison_sociale: "SOPREMA", code_postal: null })).toBe("soprema|");
  });
});
