import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT_PANNEAU } from "./prompts";
import { AnalyzedPanneauSchema, type AnalyzedPanneau } from "./schema";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = "claude-sonnet-4-6";

export interface AnalyzeOptions {
  imageUrl: string;
}

export interface AnalyzeResult {
  parsed: AnalyzedPanneau;
  raw: unknown;
  usage: { input_tokens: number; output_tokens: number };
}

export async function analyzePanneau(opts: AnalyzeOptions): Promise<AnalyzeResult> {
  const imageResponse = await fetch(opts.imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Impossible de télécharger l'image (HTTP ${imageResponse.status})`);
  }
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = imageResponse.headers.get("content-type") ?? "image/jpeg";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT_PANNEAU,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Analyse ce panneau de chantier et retourne le JSON structuré selon le schéma.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse Claude sans texte exploitable");
  }

  const cleaned = textBlock.text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Réponse Claude non parsable en JSON : ${textBlock.text.slice(0, 200)}`);
  }

  const validated = AnalyzedPanneauSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Réponse Claude non conforme au schéma : ${JSON.stringify(validated.error.flatten())}`);
  }

  return {
    parsed: validated.data,
    raw: parsed,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
