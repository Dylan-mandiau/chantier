import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT_PANNEAU } from "./prompts";
import { AnalyzedPanneauSchema, type AnalyzedPanneau } from "./schema";

/**
 * Client Gemini 2.5 Flash — alternative à Claude Sonnet 4.6 pour
 * l'analyse de panneaux de chantier. ~10× moins cher, qualité quasi
 * équivalente sur extraction structurée d'images.
 *
 * Tarifs (oct 2025) : ~$0.30/MTok input, ~$2.50/MTok output.
 * Pour un panneau dense (~25 entreprises), ~0.012-0.018 € / scan.
 *
 * Lit la clé `GOOGLE_API_KEY` depuis l'env (créer sur
 * https://aistudio.google.com/apikey).
 */

const MODEL = "gemini-2.5-flash";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    throw new Error(
      "GOOGLE_API_KEY manquante. Créer une clé sur https://aistudio.google.com/apikey et l'ajouter à .env.local"
    );
  }
  return new GoogleGenAI({ apiKey });
}

export interface AnalyzeOptions {
  imageUrl: string;
}

export interface AnalyzeResult {
  parsed: AnalyzedPanneau;
  raw: unknown;
  usage: { input_tokens: number; output_tokens: number };
}

export async function analyzePanneau(
  opts: AnalyzeOptions
): Promise<AnalyzeResult> {
  // Télécharge l'image et la convertit en base64 (même approche que Claude)
  const imageResponse = await fetch(opts.imageUrl);
  if (!imageResponse.ok) {
    throw new Error(
      `Impossible de télécharger l'image (HTTP ${imageResponse.status})`
    );
  }
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = imageResponse.headers.get("content-type") ?? "image/jpeg";

  const ai = getClient();

  // Force la sortie en JSON pur via responseMimeType
  // (équivalent du "RETURN PURE JSON" qu'on demande dans le prompt Claude,
  //  mais Gemini garantit le format au niveau API)
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mediaType,
              data: base64,
            },
          },
          {
            text: "Analyse ce panneau de chantier et retourne le JSON structuré selon le schéma fourni dans les instructions système.",
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT_PANNEAU,
      responseMimeType: "application/json",
      // Pas de responseSchema ici : on garde la validation zod côté serveur
      // (plus flexible que le format Gemini schema et déjà testé)
      temperature: 0.1, // faible température = sortie déterministe pour extraction structurée
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Réponse Gemini sans texte exploitable");
  }

  // Avec responseMimeType: application/json, Gemini retourne du JSON pur.
  // On garde quand même un nettoyage défensif (au cas où).
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Réponse Gemini non parsable en JSON : ${text.slice(0, 200)}`
    );
  }

  // Validation zod identique à Claude (le schéma de sortie est le même)
  const validated = AnalyzedPanneauSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Réponse Gemini non conforme au schéma : ${JSON.stringify(validated.error.flatten())}`
    );
  }

  // usageMetadata est optionnel selon les versions du SDK
  const usage = response.usageMetadata;
  return {
    parsed: validated.data,
    raw: parsed,
    usage: {
      input_tokens: usage?.promptTokenCount ?? 0,
      output_tokens: usage?.candidatesTokenCount ?? 0,
    },
  };
}
