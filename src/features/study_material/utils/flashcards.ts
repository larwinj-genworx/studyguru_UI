import type { FlashcardKind } from "@/features/study_material/types";

const KIND_LABELS: Record<FlashcardKind, string> = {
  core: "Core Idea",
  intuition: "Insight",
  step: "Key Step",
  formula: "Formula",
  pitfall: "Pitfall",
  summary: "Recall",
  practice: "Practice",
  concept: "Concept"
};

const cleanText = (value: unknown) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().replace(/^[\-\s]+|[\-\s]+$/g, "")
    : "";

const truncateText = (value: string, maxChars: number) => {
  if (value.length <= maxChars) {
    return value;
  }
  const shortened = value.slice(0, maxChars).trim();
  const safe = shortened.includes(" ") ? shortened.slice(0, shortened.lastIndexOf(" ")) : shortened;
  return `${safe || shortened}...`;
};

export const formatFlashcardKindLabel = (kind?: FlashcardKind | null) =>
  kind ? KIND_LABELS[kind] : KIND_LABELS.concept;

export const splitFlashcardAnswer = (answer?: string | null) => {
  const cleaned = cleanText(answer);
  if (!cleaned) {
    return [];
  }

  const lineParts = cleaned
    .split(/\r?\n+/)
    .map((part) => cleanText(part))
    .filter(Boolean);
  if (lineParts.length > 1) {
    return lineParts;
  }

  const bulletParts = cleaned
    .split(/\s*[•]\s*|\s*;\s*/)
    .map((part) => cleanText(part))
    .filter(Boolean);

  if (bulletParts.length > 1) {
    return bulletParts;
  }

  return [truncateText(cleaned, 320)];
};
