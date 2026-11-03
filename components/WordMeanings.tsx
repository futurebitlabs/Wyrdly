"use client";

import { useState } from "react";

interface WordDefinition {
  word: string;
  partOfSpeech: string | null;
  definition: string | null;
}

export function WordMeanings({ words, label }: { words: string[]; label: string }) {
  const [definitions, setDefinitions] = useState<WordDefinition[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const reveal = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/define?words=${encodeURIComponent(words.join(","))}`);
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setDefinitions(data.results ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!definitions && !loading && !error) {
    return (
      <button
        onClick={reveal}
        className="mt-1 text-xs font-medium text-foreground/60 underline underline-offset-2 transition-colors hover:text-foreground"
      >
        {label}
      </button>
    );
  }

  if (loading) {
    return <p className="mt-1 text-xs text-foreground/50">Loading definitions…</p>;
  }

  if (error) {
    return <p className="mt-1 text-xs text-foreground/50">Couldn&apos;t load definitions.</p>;
  }

  return (
    <div className="mt-2 flex w-full flex-col gap-1.5 rounded-lg border border-foreground/10 px-3 py-2 text-left">
      {definitions!.map(({ word, partOfSpeech, definition }) => (
        <p key={word} className="text-xs text-foreground/70">
          <span className="font-semibold uppercase text-foreground">{word}</span>
          {partOfSpeech && <span className="italic text-foreground/50"> ({partOfSpeech})</span>}
          {": "}
          {definition ?? "No definition found."}
        </p>
      ))}
    </div>
  );
}
