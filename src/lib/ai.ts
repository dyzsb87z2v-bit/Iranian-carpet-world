import "server-only";
import { env } from "./env";

/**
 * Turns a seller's Persian answers (and optionally the first photo) into a
 * polished English/German listing. The model only suggests: origin, age,
 * materials and authenticity always come from the seller and are confirmed
 * by an admin. Nothing here is published without review.
 */

export interface ListingAnswers {
  titleFa: string;
  originCity: string;
  lengthCm: number;
  widthCm: number;
  weave: string;
  pileMaterial?: string;
  approxAgeYears?: number;
  condition: string;
  notesFa?: string;
}

export interface ListingSuggestion {
  titleEn: string;
  titleDe: string;
  descriptionEn: string;
  descriptionDe: string;
  descriptionFa: string;
  suggestedCategory: "city" | "tribal" | "kilim" | "runner" | "silk" | "antique";
  /** Questions to ask the seller, in Persian, about missing or inconsistent details. */
  followUpQuestionsFa: string[];
  /** What the photo appears to show, for the admin only. Never shown to buyers as fact. */
  visualObservations: string;
  priceHintEur: { low: number; high: number } | null;
}

const tool = {
  name: "save_listing",
  description: "Save the structured listing draft for admin review.",
  input_schema: {
    type: "object",
    properties: {
      titleEn: { type: "string", description: "Concise English title, e.g. 'Tabriz medallion rug, wool and silk'" },
      titleDe: { type: "string" },
      descriptionEn: { type: "string", description: "2–4 factual sentences. Only state facts the seller gave." },
      descriptionDe: { type: "string" },
      descriptionFa: { type: "string", description: "Cleaned-up Persian description" },
      suggestedCategory: { type: "string", enum: ["city", "tribal", "kilim", "runner", "silk", "antique"] },
      followUpQuestionsFa: { type: "array", items: { type: "string" } },
      visualObservations: { type: "string" },
      priceHintEur: {
        type: ["object", "null"],
        properties: { low: { type: "number" }, high: { type: "number" } },
        required: ["low", "high"],
      },
    },
    required: ["titleEn", "titleDe", "descriptionEn", "descriptionDe", "descriptionFa", "suggestedCategory", "followUpQuestionsFa", "visualObservations", "priceHintEur"],
  },
} as const;

const system = `You prepare Persian rug listings for a European marketplace.
Rules:
- Write titles and descriptions only from the seller's answers. Do not invent origin, age, knot count, materials, dyes or provenance.
- If the photo seems to contradict the seller (for example it looks machine-made but the seller says hand-knotted), do not change the listing; mention it in visualObservations and add a polite Persian follow-up question.
- Tone: calm, precise, no superlatives, no "masterpiece", no emojis.
- German must be natural German, not a word-for-word translation.
- priceHintEur is a rough retail range for the EU market, for the admin's reference only; use null if unsure.`;

export function fallbackSuggestion(a: ListingAnswers): ListingSuggestion {
  const weaveEn = a.weave === "hand_woven_kilim" ? "kilim" : a.weave === "machine_made" ? "machine-made rug" : "hand-knotted rug";
  const weaveDe = a.weave === "hand_woven_kilim" ? "Kelim" : a.weave === "machine_made" ? "maschinell gefertigter Teppich" : "handgeknüpfter Teppich";
  return {
    titleEn: `${a.originCity} ${weaveEn}, ${a.lengthCm} × ${a.widthCm} cm`,
    titleDe: `${a.originCity} ${weaveDe}, ${a.lengthCm} × ${a.widthCm} cm`,
    descriptionEn: `${a.originCity} ${weaveEn}, ${a.lengthCm} × ${a.widthCm} cm.`,
    descriptionDe: `${weaveDe[0].toUpperCase()}${weaveDe.slice(1)} aus ${a.originCity}, ${a.lengthCm} × ${a.widthCm} cm.`,
    descriptionFa: a.notesFa ?? "",
    suggestedCategory: a.weave === "hand_woven_kilim" ? "kilim" : a.lengthCm / a.widthCm > 2.5 ? "runner" : "city",
    followUpQuestionsFa: [],
    visualObservations: "",
    priceHintEur: null,
  };
}

export async function suggestListing(
  answers: ListingAnswers,
  photo?: { bytes: ArrayBuffer; mediaType: string },
): Promise<{ suggestion: ListingSuggestion; model: string | null }> {
  if (!env.anthropicKey) return { suggestion: fallbackSuggestion(answers), model: null };

  const content: unknown[] = [];
  if (photo) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: photo.mediaType, data: Buffer.from(photo.bytes).toString("base64") },
    });
  }
  content.push({ type: "text", text: `Seller's answers (JSON):\n${JSON.stringify(answers, null, 2)}` });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.anthropicModel,
        max_tokens: 1500,
        system,
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { content: { type: string; name?: string; input?: ListingSuggestion }[] };
    const block = json.content.find((c) => c.type === "tool_use" && c.name === tool.name);
    if (!block?.input) throw new Error("No structured output");
    return { suggestion: { ...fallbackSuggestion(answers), ...block.input }, model: env.anthropicModel };
  } catch (e) {
    console.error("suggestListing failed, using fallback", e);
    return { suggestion: fallbackSuggestion(answers), model: null };
  }
}
