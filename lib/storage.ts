const PREFIX = "wordly:player:";

export interface StoredPlayer {
  playerId: string;
  name: string;
}

export function savePlayer(code: string, player: StoredPlayer) {
  try {
    localStorage.setItem(PREFIX + code.toUpperCase(), JSON.stringify(player));
  } catch {
    // ignore (private browsing, storage disabled, etc.)
  }
}

export function loadPlayer(code: string): StoredPlayer | null {
  try {
    const raw = localStorage.getItem(PREFIX + code.toUpperCase());
    if (!raw) return null;
    return JSON.parse(raw) as StoredPlayer;
  } catch {
    return null;
  }
}

const SNAKEWORD_LEVEL_KEY = "wordly:snakeword:level";

export function loadSnakewordLevel(): number {
  try {
    const raw = localStorage.getItem(SNAKEWORD_LEVEL_KEY);
    const n = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(n) && n >= 1 ? n : 1;
  } catch {
    return 1;
  }
}

export function saveSnakewordLevel(level: number) {
  try {
    localStorage.setItem(SNAKEWORD_LEVEL_KEY, String(level));
  } catch {
    // ignore
  }
}

export type DailyGame = "fivefold" | "snakeword";

const DAILY_STREAK_KEY_PREFIX = "wordly:dailyStreak:";

export interface DailyStreakState {
  lastPlayedDate: string | null;
  lastResultWon: boolean;
  currentStreak: number;
  maxStreak: number;
}

const EMPTY_STREAK: DailyStreakState = {
  lastPlayedDate: null,
  lastResultWon: false,
  currentStreak: 0,
  maxStreak: 0,
};

export function loadDailyStreak(game: DailyGame): DailyStreakState {
  try {
    const raw = localStorage.getItem(DAILY_STREAK_KEY_PREFIX + game);
    if (!raw) return EMPTY_STREAK;
    return { ...EMPTY_STREAK, ...(JSON.parse(raw) as Partial<DailyStreakState>) };
  } catch {
    return EMPTY_STREAK;
  }
}

export function hasPlayedDailyOn(game: DailyGame, dateKey: string): boolean {
  return loadDailyStreak(game).lastPlayedDate === dateKey;
}

function dayBefore(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Idempotent for a given dateKey: calling it again for the same day (e.g. on
// re-render or page reload) returns the already-recorded state unchanged.
export function recordDailyResult(game: DailyGame, dateKey: string, won: boolean): DailyStreakState {
  const existing = loadDailyStreak(game);
  if (existing.lastPlayedDate === dateKey) return existing;

  const continuesStreak = existing.lastPlayedDate === dayBefore(dateKey) && existing.lastResultWon;
  const currentStreak = won ? (continuesStreak ? existing.currentStreak + 1 : 1) : 0;
  const next: DailyStreakState = {
    lastPlayedDate: dateKey,
    lastResultWon: won,
    currentStreak,
    maxStreak: Math.max(existing.maxStreak, currentStreak),
  };

  try {
    localStorage.setItem(DAILY_STREAK_KEY_PREFIX + game, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
