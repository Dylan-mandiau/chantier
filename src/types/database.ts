// src/types/database.ts
// Types BDD écrits à la main (en attendant que `supabase gen types` soit utilisable).
// À régénérer plus tard avec :
//   npx supabase gen types typescript --project-id axpeuldwrheivcmkrxgw > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      agences: {
        Row: {
          id: string;
          nom: string;
          ville: string | null;
          code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          ville?: string | null;
          code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          ville?: string | null;
          code?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          nom: string | null;
          prenom: string | null;
          role: "commercial" | "rc" | "chef_secteur" | "directeur_commercial" | "admin";
          agence_id: string | null;
          manager_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nom?: string | null;
          prenom?: string | null;
          role?: "commercial" | "rc" | "chef_secteur" | "directeur_commercial" | "admin";
          agence_id?: string | null;
          manager_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nom?: string | null;
          prenom?: string | null;
          role?: "commercial" | "rc" | "chef_secteur" | "directeur_commercial" | "admin";
          agence_id?: string | null;
          manager_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      entreprises: {
        Row: {
          id: string;
          siret: string | null;
          raison_sociale: string;
          raison_sociale_normalisee: string;
          ville: string | null;
          code_postal: string | null;
          adresse: string | null;
          telephone: string | null;
          email: string | null;
          site_web: string | null;
          code_client_salti: string | null;
          source_info: Json;
          enrichi_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          siret?: string | null;
          raison_sociale: string;
          raison_sociale_normalisee: string;
          ville?: string | null;
          code_postal?: string | null;
          adresse?: string | null;
          telephone?: string | null;
          email?: string | null;
          site_web?: string | null;
          code_client_salti?: string | null;
          source_info?: Json;
          enrichi_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          siret?: string | null;
          raison_sociale?: string;
          raison_sociale_normalisee?: string;
          ville?: string | null;
          code_postal?: string | null;
          adresse?: string | null;
          telephone?: string | null;
          email?: string | null;
          site_web?: string | null;
          code_client_salti?: string | null;
          source_info?: Json;
          enrichi_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chantiers: {
        Row: {
          id: string;
          titre: string;
          adresse: string | null;
          ville: string | null;
          code_postal: string | null;
          latitude: number | null;
          longitude: number | null;
          permis_construire: string | null;
          date_pc: string | null;
          montant_travaux_ht: number | null;
          photo_principale_url: string;
          status: "actif" | "archive";
          notes: string | null;
          created_by: string;
          agence_id: string | null;
          dedup_key: string | null;
          dedup_key_adresse: string | null;
          panneau_id: string | null;
          ia_raw_json: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titre: string;
          adresse?: string | null;
          ville?: string | null;
          code_postal?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          permis_construire?: string | null;
          date_pc?: string | null;
          montant_travaux_ht?: number | null;
          photo_principale_url: string;
          status?: "actif" | "archive";
          notes?: string | null;
          created_by: string;
          agence_id?: string | null;
          dedup_key?: string | null;
          dedup_key_adresse?: string | null;
          panneau_id?: string | null;
          ia_raw_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titre?: string;
          adresse?: string | null;
          ville?: string | null;
          code_postal?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          permis_construire?: string | null;
          date_pc?: string | null;
          montant_travaux_ht?: number | null;
          photo_principale_url?: string;
          status?: "actif" | "archive";
          notes?: string | null;
          created_by?: string;
          agence_id?: string | null;
          dedup_key?: string | null;
          dedup_key_adresse?: string | null;
          panneau_id?: string | null;
          ia_raw_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      panneaux: {
        Row: {
          id: string;
          dedup_key: string;
          titre: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          dedup_key: string;
          titre?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          dedup_key?: string;
          titre?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          entreprise_id: string;
          agence_id: string | null;
          created_by: string | null;
          prenom: string | null;
          nom: string | null;
          fonction: string | null;
          telephone: string | null;
          telephone_portable: string | null;
          email: string | null;
          compte_extranet: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entreprise_id: string;
          agence_id?: string | null;
          created_by?: string | null;
          prenom?: string | null;
          nom?: string | null;
          fonction?: string | null;
          telephone?: string | null;
          telephone_portable?: string | null;
          email?: string | null;
          compte_extranet?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entreprise_id?: string;
          agence_id?: string | null;
          created_by?: string | null;
          prenom?: string | null;
          nom?: string | null;
          fonction?: string | null;
          telephone?: string | null;
          telephone_portable?: string | null;
          email?: string | null;
          compte_extranet?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_modifications: {
        Row: {
          id: string;
          contact_id: string | null;
          entreprise_id: string | null;
          agence_id: string | null;
          modifie_par: string | null;
          contact_label: string | null;
          action: string;
          changements: Json;
          modifie_at: string;
        };
        Insert: {
          id?: string;
          contact_id?: string | null;
          entreprise_id?: string | null;
          agence_id?: string | null;
          modifie_par?: string | null;
          contact_label?: string | null;
          action: string;
          changements?: Json;
          modifie_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string | null;
          entreprise_id?: string | null;
          agence_id?: string | null;
          modifie_par?: string | null;
          contact_label?: string | null;
          action?: string;
          changements?: Json;
          modifie_at?: string;
        };
        Relationships: [];
      };
      chantier_modifications: {
        Row: {
          id: string;
          chantier_id: string | null;
          panneau_id: string | null;
          agence_id: string | null;
          modifie_par: string | null;
          chantier_titre: string | null;
          action: string;
          changements: Json;
          modifie_at: string;
        };
        Insert: {
          id?: string;
          chantier_id?: string | null;
          panneau_id?: string | null;
          agence_id?: string | null;
          modifie_par?: string | null;
          chantier_titre?: string | null;
          action: string;
          changements?: Json;
          modifie_at?: string;
        };
        Update: {
          id?: string;
          chantier_id?: string | null;
          panneau_id?: string | null;
          agence_id?: string | null;
          modifie_par?: string | null;
          chantier_titre?: string | null;
          action?: string;
          changements?: Json;
          modifie_at?: string;
        };
        Relationships: [];
      };
      intervenant_suivi: {
        Row: {
          id: string;
          chantier_id: string;
          entreprise_id: string;
          agence_id: string | null;
          statut: string;
          note: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chantier_id: string;
          entreprise_id: string;
          agence_id?: string | null;
          statut: string;
          note?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chantier_id?: string;
          entreprise_id?: string;
          agence_id?: string | null;
          statut?: string;
          note?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chantier_intervenants: {
        Row: {
          id: string;
          chantier_id: string;
          entreprise_id: string;
          role:
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
          lot_numero: string | null;
          lot_intitule: string | null;
          rang: number;
          source_info: Json;
          ordre: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chantier_id: string;
          entreprise_id: string;
          role:
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
          lot_numero?: string | null;
          lot_intitule?: string | null;
          rang?: number;
          source_info?: Json;
          ordre?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          chantier_id?: string;
          entreprise_id?: string;
          role?:
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
          lot_numero?: string | null;
          lot_intitule?: string | null;
          rang?: number;
          source_info?: Json;
          ordre?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      email_templates: {
        Row: {
          id: string;
          nom: string;
          sujet: string;
          corps: string;
          type: "premier_contact" | "relance" | "rdv";
          created_by: string | null;
          actif: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          sujet: string;
          corps: string;
          type: "premier_contact" | "relance" | "rdv";
          created_by?: string | null;
          actif?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          sujet?: string;
          corps?: string;
          type?: "premier_contact" | "relance" | "rdv";
          created_by?: string | null;
          actif?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      contacts_envoyes: {
        Row: {
          id: string;
          entreprise_id: string;
          intervenant_id: string | null;
          template_id: string | null;
          envoye_par: string;
          envoye_at: string;
          sujet: string;
          corps: string;
          statut: "envoye" | "repondu" | "pas_de_reponse" | "refus" | "converti";
          notes: string | null;
        };
        Insert: {
          id?: string;
          entreprise_id: string;
          intervenant_id?: string | null;
          template_id?: string | null;
          envoye_par: string;
          envoye_at?: string;
          sujet: string;
          corps: string;
          statut?: "envoye" | "repondu" | "pas_de_reponse" | "refus" | "converti";
          notes?: string | null;
        };
        Update: {
          id?: string;
          entreprise_id?: string;
          intervenant_id?: string | null;
          template_id?: string | null;
          envoye_par?: string;
          envoye_at?: string;
          sujet?: string;
          corps?: string;
          statut?: "envoye" | "repondu" | "pas_de_reponse" | "refus" | "converti";
          notes?: string | null;
        };
        Relationships: [];
      };
      relances: {
        Row: {
          id: string;
          entreprise_id: string;
          created_by: string;
          date_relance: string;
          motif: string;
          chantier_id: string | null;
          status: "planifiee" | "faite" | "reportee" | "annulee";
          fait_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entreprise_id: string;
          created_by: string;
          date_relance: string;
          motif: string;
          chantier_id?: string | null;
          status?: "planifiee" | "faite" | "reportee" | "annulee";
          fait_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entreprise_id?: string;
          created_by?: string;
          date_relance?: string;
          motif?: string;
          chantier_id?: string | null;
          status?: "planifiee" | "faite" | "reportee" | "annulee";
          fait_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
