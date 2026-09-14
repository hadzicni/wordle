import { ANSWERS, VALID_GUESSES } from "@/lib/words"

export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

export type LetterState = "correct" | "present" | "absent"
export type GameMode = "daily" | "endless"
export type GameStatus = "playing" | "won" | "lost"

export type Stats = {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  distribution: number[]
}

export const EMPTY_STATS: Stats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: Array(MAX_GUESSES).fill(0),
}

export function isValidGuess(word: string) {
  return VALID_GUESSES.has(word)
}

/** Bewertet einen Rateversuch – doppelte Buchstaben werden korrekt behandelt. */
export function evaluateGuess(guess: string, solution: string): LetterState[] {
  const result: LetterState[] = Array(WORD_LENGTH).fill("absent")
  const remaining: Record<string, number> = {}

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === solution[i]) {
      result[i] = "correct"
    } else {
      remaining[solution[i]] = (remaining[solution[i]] ?? 0) + 1
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue
    if (remaining[guess[i]]) {
      result[i] = "present"
      remaining[guess[i]]--
    }
  }

  return result
}

const STATE_RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 }

export function getKeyStates(guesses: string[], solution: string) {
  const states: Record<string, LetterState> = {}
  for (const guess of guesses) {
    evaluateGuess(guess, solution).forEach((state, i) => {
      const letter = guess[i]
      const current = states[letter]
      if (!current || STATE_RANK[state] > STATE_RANK[current]) {
        states[letter] = state
      }
    })
  }
  return states
}

/** Prüft, ob ein Rateversuch alle bisherigen Hinweise nutzt (schwerer Modus). */
export function hardModeViolation(guess: string, guesses: string[], solution: string) {
  for (const previous of guesses) {
    const evaluation = evaluateGuess(previous, solution)
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (evaluation[i] === "correct" && guess[i] !== previous[i]) {
        return `${i + 1}. Buchstabe muss ${previous[i]} sein`
      }
    }
    const required: Record<string, number> = {}
    evaluation.forEach((state, i) => {
      if (state !== "absent") required[previous[i]] = (required[previous[i]] ?? 0) + 1
    })
    for (const [letter, count] of Object.entries(required)) {
      if (guess.split(letter).length - 1 < count) {
        return `Wort muss ${letter} enthalten`
      }
    }
  }
  return null
}

// --- Tägliches Wort -------------------------------------------------------

const EPOCH = new Date(2026, 0, 1)
const DAY_MS = 86_400_000

function seededShuffle<T>(items: T[], seed: number) {
  const result = [...items]
  let s = seed
  const random = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const DAILY_ORDER = seededShuffle(ANSWERS, 20260101)

export function getDayIndex(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((today.getTime() - EPOCH.getTime()) / DAY_MS)
}

export function getDailyWord(dayIndex: number) {
  const n = DAILY_ORDER.length
  return DAILY_ORDER[((dayIndex % n) + n) % n]
}

export function getRandomWord(exclude?: string) {
  let word = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]
  while (word === exclude) {
    word = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]
  }
  return word
}

export function msUntilNextDay(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}

// --- Teilen ---------------------------------------------------------------

const EMOJI: Record<LetterState, string> = { correct: "🟩", present: "🟨", absent: "⬛" }
const EMOJI_CONTRAST: Record<LetterState, string> = { correct: "🟧", present: "🟦", absent: "⬛" }

export function buildShareText(options: {
  guesses: string[]
  solution: string
  status: GameStatus
  mode: GameMode
  dayIndex: number
  hardMode: boolean
  highContrast: boolean
}) {
  const { guesses, solution, status, mode, dayIndex, hardMode, highContrast } = options
  const emoji = highContrast ? EMOJI_CONTRAST : EMOJI
  const score = status === "won" ? guesses.length : "X"
  const title = mode === "daily" ? `Wordle #${dayIndex + 1}` : "Wordle Endlos"
  const grid = guesses
    .map((guess) => evaluateGuess(guess, solution).map((s) => emoji[s]).join(""))
    .join("\n")
  return `${title} ${score}/${MAX_GUESSES}${hardMode ? "*" : ""}\n\n${grid}`
}
