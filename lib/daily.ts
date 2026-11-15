import { WORDS } from "@/lib/words";

const EPOCH = Date.UTC(2024, 0, 1);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDayNumber(dateKey: string): number {
  return Math.floor((Date.parse(`${dateKey}T00:00:00Z`) - EPOCH) / MS_PER_DAY);
}

export function getDailyWord(dateKey: string): string {
  const dayNumber = getDayNumber(dateKey);
  const index = ((dayNumber % WORDS.length) + WORDS.length) % WORDS.length;
  return WORDS[index];
}

// A stable per-day seed for other deterministic daily puzzles (e.g. Wend).
export function getDailySeed(dateKey: string): number {
  return getDayNumber(dateKey);
}
