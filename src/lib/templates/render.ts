// src/lib/templates/render.ts

export interface TemplateVars {
  raison_sociale: string;
  commercial_nom: string;
  code_client_salti: string | null;
  chantier_titre: string;
  lot_numero: string | null;
  lot_intitule: string | null;
}

/**
 * Substitue les variables {{var}} dans un corps de template.
 *
 * Variables supportées :
 *   {{raison_sociale}}, {{commercial_nom}}, {{code_client_salti}},
 *   {{code_client_salti_phrase}} (phrase inline entre parenthèses OU vide),
 *   {{code_client_salti_ps}} (bloc PS "NB : Votre code client actif est…"
 *      sur sa propre ligne, OU vide si pas de code — style du commercial),
 *   {{chantier_titre}}, {{lot_numero}}, {{lot_intitule}}.
 *
 * Politique : si une variable est inconnue, on laisse le pattern {{xxx}}
 * tel quel — l'utilisateur voit clairement l'erreur et peut corriger.
 */
export function renderTemplate(corps: string, vars: TemplateVars): string {
  const codeClientPhrase = vars.code_client_salti
    ? ` (votre code client SALTI : ${vars.code_client_salti})`
    : "";

  const codeClientPs = vars.code_client_salti
    ? `\n\nNB : Votre code client actif chez SALTI est ${vars.code_client_salti}`
    : "";

  const lookup: Record<string, string> = {
    raison_sociale: vars.raison_sociale,
    commercial_nom: vars.commercial_nom,
    code_client_salti: vars.code_client_salti ?? "",
    code_client_salti_phrase: codeClientPhrase,
    code_client_salti_ps: codeClientPs,
    chantier_titre: vars.chantier_titre,
    lot_numero: vars.lot_numero ?? "",
    lot_intitule: vars.lot_intitule ?? "",
  };

  return corps.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => {
    return name in lookup ? lookup[name] : match;
  });
}
