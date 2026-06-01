// src/types/domain.ts

export type IntervenantRole =
  | "maitrise_ouvrage"
  | "maitrise_ouvrage_mandataire"
  | "architecte"
  | "maitre_oeuvre"
  | "economiste"
  | "be_structure"
  | "be_fluides"
  | "be_electricite"
  | "be_vrd"
  | "be_acoustique"
  | "controle"
  | "sps"
  | "opc"
  | "lot";

export type ConfidenceSource = "panneau" | "sirene" | "tavily" | "manuel";

export interface ConfidenceField {
  src: ConfidenceSource;
  conf: number; // 0 - 1
}

export interface SourceInfo {
  telephone?: ConfidenceField;
  email?: ConfidenceField;
  siret?: ConfidenceField;
  adresse?: ConfidenceField;
  site_web?: ConfidenceField;
}
