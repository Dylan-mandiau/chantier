import { describe, it, expect } from "vitest";
import { AnalyzedPanneauSchema } from "@/lib/ai/schema";

describe("AnalyzedPanneauSchema", () => {
  const validPayload = {
    projet: {
      titre: "Restructuration Mairie",
      adresse: "1 Place François Mitterand",
      ville: "Ruaudin",
      code_postal: "72230",
      permis_construire: "PC 72260 24 Z0011",
      date_pc: "2024-11-19",
      montant_travaux_ht: 2049261,
    },
    intervenants: [
      {
        role: "lot",
        raison_sociale: "MASCI",
        lot_numero: "01",
        lot_intitule: "Désamiantage",
        rang: 1,
        adresse: null,
        ville: null,
        code_postal: null,
        telephone: "02 50 63 92 93",
        email: "conducteur1@mascidta.fr",
        confiance_lecture: 0.95,
      },
    ],
  };

  it("accepte un payload valide", () => {
    expect(AnalyzedPanneauSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejette un role inconnu", () => {
    const bad = {
      ...validPayload,
      intervenants: [{ ...validPayload.intervenants[0], role: "invalide" }],
    };
    expect(AnalyzedPanneauSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette un rang autre que 1 ou 2", () => {
    const bad = {
      ...validPayload,
      intervenants: [{ ...validPayload.intervenants[0], rang: 3 }],
    };
    expect(AnalyzedPanneauSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette une confiance hors [0, 1]", () => {
    const bad = {
      ...validPayload,
      intervenants: [{ ...validPayload.intervenants[0], confiance_lecture: 1.5 }],
    };
    expect(AnalyzedPanneauSchema.safeParse(bad).success).toBe(false);
  });

  it("accepte un projet sans intervenants", () => {
    const minimal = {
      projet: {
        titre: "Test",
        adresse: null,
        ville: null,
        code_postal: null,
        permis_construire: null,
        date_pc: null,
        montant_travaux_ht: null,
      },
      intervenants: [],
    };
    expect(AnalyzedPanneauSchema.safeParse(minimal).success).toBe(true);
  });
});
