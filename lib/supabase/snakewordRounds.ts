import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSnakewordPuzzle } from "@/lib/snakeword/generate";
import { getSnakewordLevel, SNAKEWORD_MULTIPLAYER_LEVEL } from "@/lib/snakeword/levels";

export async function createSnakewordRound(
  supabase: SupabaseClient,
  roomId: string,
  roundNumber: number,
  levelNumber: number | null,
  seed?: number,
) {
  const resolvedLevelNumber = levelNumber ?? SNAKEWORD_MULTIPLAYER_LEVEL;
  const level = getSnakewordLevel(resolvedLevelNumber);
  const puzzle = generateSnakewordPuzzle(level, seed);

  const { data: round, error: roundError } = await supabase
    .from("snakeword_puzzles")
    .insert({
      room_id: roomId,
      round_number: roundNumber,
      level_number: resolvedLevelNumber,
      grid_size: puzzle.gridSize,
      cells: puzzle.cells,
      words: puzzle.words,
    })
    .select("id")
    .single();

  if (roundError || !round) {
    throw new Error(roundError?.message ?? "Could not create Snakeword round");
  }

  const { error: stateError } = await supabase.from("snakeword_state").insert({
    round_id: round.id,
    room_id: roomId,
    round_number: roundNumber,
    level_number: resolvedLevelNumber,
    grid_size: puzzle.gridSize,
    cells: puzzle.cells,
    word_lengths: puzzle.words.map((w) => w.word.length),
  });

  if (stateError) {
    throw new Error(stateError.message);
  }

  return { roundId: round.id as string, roundNumber, levelNumber: resolvedLevelNumber };
}
