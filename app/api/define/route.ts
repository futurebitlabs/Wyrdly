import { NextResponse } from "next/server";

// api.dictionaryapi.dev sits behind a Cloudflare bot challenge that blocks
// server-to-server requests from datacenter IPs (e.g. Vercel's), so every
// lookup from production failed with a 403 "Just a moment..." page even
// though the same request worked fine from a residential IP. Datamuse has
// no such challenge and needs no API key.
const DATAMUSE_API = "https://api.datamuse.com/words";
const MAX_WORDS = 20;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

interface DatamuseEntry {
  word: string;
  defs?: string[];
}

export interface WordDefinition {
  word: string;
  partOfSpeech: string | null;
  definition: string | null;
}

const POS_LABELS: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  u: "other",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function lookupDefinition(word: string): Promise<WordDefinition> {
  const lower = word.toLowerCase();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${DATAMUSE_API}?sp=${encodeURIComponent(lower)}&md=d&max=1`);
      if (!res.ok) {
        throw new Error(`Datamuse API returned ${res.status}`);
      }
      const entries = (await res.json()) as DatamuseEntry[];
      const entry = entries.find((e) => e.word.toLowerCase() === lower);
      const firstDef = entry?.defs?.[0];
      if (!firstDef) {
        return { word, partOfSpeech: null, definition: null };
      }
      const [posCode, ...rest] = firstDef.split("\t");
      const definition = rest.join("\t").trim() || null;
      return { word, partOfSpeech: POS_LABELS[posCode] ?? null, definition };
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        console.error(`Failed to fetch definition for "${word}" after ${attempt} attempts`, err);
        return { word, partOfSpeech: null, definition: null };
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return { word, partOfSpeech: null, definition: null };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const words = (searchParams.get("words") ?? "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, MAX_WORDS);

  if (words.length === 0) {
    return NextResponse.json({ error: "No words provided" }, { status: 400 });
  }

  const results = await Promise.all(words.map(lookupDefinition));

  return NextResponse.json({ results });
}
