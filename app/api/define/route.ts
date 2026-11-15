import { NextResponse } from "next/server";

const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";
const MAX_WORDS = 20;

interface DictionaryApiEntry {
  meanings?: {
    partOfSpeech?: string;
    definitions?: { definition?: string }[];
  }[];
}

export interface WordDefinition {
  word: string;
  partOfSpeech: string | null;
  definition: string | null;
  debug?: string;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function lookupDefinition(word: string, debug: boolean): Promise<WordDefinition> {
  let lastDebug = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word.toLowerCase())}`);
      if (res.status === 404) {
        // The dictionary genuinely has no entry for this word — not a transient failure.
        return { word, partOfSpeech: null, definition: null, ...(debug ? { debug: "404" } : {}) };
      }
      if (!res.ok) {
        lastDebug = `status:${res.status} body:${(await res.text()).slice(0, 120)}`;
        throw new Error(`Dictionary API returned ${res.status}`);
      }
      const entries = (await res.json()) as DictionaryApiEntry[];
      const meaning = entries[0]?.meanings?.find((m) => m.definitions?.[0]?.definition);
      const definition = meaning?.definitions?.[0]?.definition ?? null;
      return { word, partOfSpeech: meaning?.partOfSpeech ?? null, definition, ...(debug ? { debug: `ok:${attempt}` } : {}) };
    } catch (err) {
      lastDebug = lastDebug || `err:${err instanceof Error ? err.message : String(err)}`;
      if (attempt === MAX_ATTEMPTS) {
        console.error(`Failed to fetch definition for "${word}" after ${attempt} attempts`, err);
        return { word, partOfSpeech: null, definition: null, ...(debug ? { debug: lastDebug } : {}) };
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
  const debug = searchParams.get("debug") === "1";

  if (words.length === 0) {
    return NextResponse.json({ error: "No words provided" }, { status: 400 });
  }

  const results = await Promise.all(words.map((w) => lookupDefinition(w, debug)));

  return NextResponse.json({ results });
}
