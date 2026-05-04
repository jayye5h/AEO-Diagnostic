export function extractJsonFromModelText<T>(text: string): T | null {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return null;

  // Strip common markdown code fences
  const noFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Fast path: pure JSON
  try {
    return JSON.parse(noFences) as T;
  } catch {
    // continue
  }

  // Best-effort extraction: first {...} block
  const first = noFences.indexOf("{");
  const last = noFences.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  const candidate = noFences.slice(first, last + 1);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}
