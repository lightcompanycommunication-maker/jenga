const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const MAX_OUTPUT_TOKENS = 16000;

const MODEL_MAP = {
  "claude-sonnet-4-20250514":   "claude-sonnet-4-5-20250929",
  "claude-opus-4-20250514":     "claude-opus-4-5-20251101",
  "claude-haiku-4-5-20251001":  "claude-haiku-4-5-20251001",
  "claude-opus-4-5":            "claude-opus-4-5-20251101",
  "claude-sonnet-4-5":          "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5":           "claude-haiku-4-5-20251001",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-5-20250929",
  "claude-3-5-haiku-20241022":  "claude-haiku-4-5-20251001",
  "claude-3-opus-20240229":     "claude-opus-4-5-20251101",
};

export function resolveModel(model) {
  return (model && MODEL_MAP[model]) || DEFAULT_MODEL;
}

export function resolveMaxTokens(requested) {
  return Math.min(Math.max(Number(requested) || 7000, 1000), MAX_OUTPUT_TOKENS);
}

function repairTruncatedJson(s) {
  const stack = [];
  let inString = false;
  let escaped = false;
  let lastCharIdx = -1;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (!/\s/.test(ch)) lastCharIdx = i;

    if (inString) {
      if (escaped) { escaped = false; }
      else if (ch === "\\") { escaped = true; }
      else if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let out = s.slice(0, lastCharIdx + 1);
  if (inString) out += '"';
  out = out.replace(/,\s*$/, "");
  for (let i = stack.length - 1; i >= 0; i--) {
    out += stack[i] === "{" ? "}" : "]";
  }
  return out;
}

export function extractJson(raw) {
  let clean = (raw || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = clean.indexOf("{");
  if (start === -1) throw new Error("Aucun objet JSON trouvé dans la réponse.");
  clean = clean.slice(start);

  try { return JSON.parse(clean); } catch (_) {}

  const repaired = repairTruncatedJson(clean);
  return JSON.parse(repaired);
}

export async function generateApp({ prompt, systemPrompt, maxTokens = 7000, model }) {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY non configurée.");

  const useModel = resolveModel(model);
  const safeMaxTokens = resolveMaxTokens(maxTokens);

  console.log(`[AI] model=${useModel} maxTokens=${safeMaxTokens} (requested=${maxTokens}, original=${model})`);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: useModel,
      max_tokens: safeMaxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic: ${await res.text()}`);

  const data = await res.json();
  const raw = data.content?.map((b) => b.text || "").join("") || "";

  if (data.stop_reason === "max_tokens") {
    console.warn("[AI] Réponse tronquée (max_tokens). Tentative de réparation du JSON…");
    try {
      return extractJson(raw);
    } catch (_) {
      throw new Error(
        "L'application demandée est trop volumineuse. " +
        "Essaie une description plus ciblée, ou divise ton projet en plusieurs écrans."
      );
    }
  }

  try {
    return extractJson(raw);
  } catch (e) {
    throw new Error(
      `La réponse n'a pas pu être lue comme du JSON valide. Réessaie avec une description plus courte. (${e.message})`
    );
  }
}
