import { describe, it, expect } from "vitest";
import { computeStatutCommercial, type StatutInputs } from "@/lib/statut/compute";

describe("computeStatutCommercial", () => {
  const today = "2026-06-05";

  it("'inconnu' par défaut", () => {
    expect(
      computeStatutCommercial({
        codeClientSalti: null,
        dernierContact: null,
        prochaineRelance: null,
        today,
      })
    ).toBe("inconnu");
  });

  it("'client_salti' si code renseigné (priorité max)", () => {
    expect(
      computeStatutCommercial({
        codeClientSalti: "AB-12345",
        dernierContact: { statut: "envoye", envoye_at: "2026-05-30" },
        prochaineRelance: null,
        today,
      })
    ).toBe("client_salti");
  });

  it("'converti' si dernier contact converti", () => {
    expect(
      computeStatutCommercial({
        codeClientSalti: null,
        dernierContact: { statut: "converti", envoye_at: "2026-05-15" },
        prochaineRelance: null,
        today,
      })
    ).toBe("converti");
  });

  it("'refus' si dernier contact refus", () => {
    expect(
      computeStatutCommercial({
        codeClientSalti: null,
        dernierContact: { statut: "refus", envoye_at: "2026-05-20" },
        prochaineRelance: null,
        today,
      })
    ).toBe("refus");
  });

  it("'relance_planifiee' si relance future existe", () => {
    expect(
      computeStatutCommercial({
        codeClientSalti: null,
        dernierContact: { statut: "envoye", envoye_at: "2026-05-30" },
        prochaineRelance: { date_relance: "2026-06-10", motif: "tester" },
        today,
      })
    ).toBe("relance_planifiee");
  });

  it("'premier_contact' si contact récent (<14j) sans relance", () => {
    expect(
      computeStatutCommercial({
        codeClientSalti: null,
        dernierContact: { statut: "envoye", envoye_at: "2026-05-30" },
        prochaineRelance: null,
        today,
      })
    ).toBe("premier_contact");
  });

  it("'pas_de_reponse' si contact ancien (>14j)", () => {
    expect(
      computeStatutCommercial({
        codeClientSalti: null,
        dernierContact: { statut: "envoye", envoye_at: "2026-05-01" },
        prochaineRelance: null,
        today,
      })
    ).toBe("pas_de_reponse");
  });
});
