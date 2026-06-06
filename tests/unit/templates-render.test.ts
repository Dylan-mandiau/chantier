import { describe, it, expect } from "vitest";
import { renderTemplate, type TemplateVars } from "@/lib/templates/render";

describe("renderTemplate", () => {
  const baseVars: TemplateVars = {
    raison_sociale: "DORISON",
    commercial_nom: "Dylan Fournier",
    code_client_salti: null,
    chantier_titre: "Restructuration Mairie de Ruaudin",
    lot_numero: "04",
    lot_intitule: "Charpente bois",
  };

  it("substitue les variables simples {{var}}", () => {
    expect(renderTemplate("Bonjour {{raison_sociale}}", baseVars)).toBe(
      "Bonjour DORISON"
    );
  });

  it("substitue plusieurs variables dans un même corps", () => {
    expect(
      renderTemplate(
        "Lot {{lot_numero}} - {{lot_intitule}} - {{raison_sociale}}",
        baseVars
      )
    ).toBe("Lot 04 - Charpente bois - DORISON");
  });

  it("gère code_client_salti_phrase pour client connu", () => {
    const vars = { ...baseVars, code_client_salti: "AB-12345" };
    const result = renderTemplate(
      "{{commercial_nom}}{{code_client_salti_phrase}}",
      vars
    );
    expect(result).toContain("AB-12345");
    expect(result.toLowerCase()).toContain("client");
  });

  it("retourne phrase vide pour code_client_salti_phrase quand null", () => {
    const result = renderTemplate(
      "{{commercial_nom}}{{code_client_salti_phrase}}",
      baseVars
    );
    expect(result).toBe("Dylan Fournier");
  });

  it("génère un bloc PS code client quand connu", () => {
    const vars = { ...baseVars, code_client_salti: "RENOCHEV" };
    const result = renderTemplate("SALTI{{code_client_salti_ps}}", vars);
    expect(result).toContain("\n\nNB :");
    expect(result).toContain("RENOCHEV");
  });

  it("PS code client vide quand pas de code", () => {
    const result = renderTemplate("SALTI{{code_client_salti_ps}}", baseVars);
    expect(result).toBe("SALTI");
  });

  it("variables manquantes restent sous forme {{var}} sans planter", () => {
    expect(
      renderTemplate("Hello {{inconnue}} et {{raison_sociale}}", baseVars)
    ).toBe("Hello {{inconnue}} et DORISON");
  });

  it("ignore espaces autour du nom de variable {{  var  }}", () => {
    expect(renderTemplate("Hello {{  raison_sociale  }}", baseVars)).toBe(
      "Hello DORISON"
    );
  });

  it("ne casse pas sur corps vide", () => {
    expect(renderTemplate("", baseVars)).toBe("");
  });
});
