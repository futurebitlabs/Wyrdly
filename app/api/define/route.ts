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
}

async function lookupDefinition(word: string): Promise<WordDefinition> {
  try {
    const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) {
      return { word, partOfSpeech: null, definition: null };
    }
    const entries = (await res.json()) as DictionaryApiEntry[];
    const meaning = entries[0]?.meanings?.find((m) => m.definitions?.[0]?.definition);
    const definition = meaning?.definitions?.[0]?.definition ?? null;
    return { word, partOfSpeech: meaning?.partOfSpeech ?? null, definition };
  } catch (err) {
    console.error(`Failed to fetch definition for "${word}"`, err);
    return { word, partOfSpeech: null, definition: null };
  }
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
