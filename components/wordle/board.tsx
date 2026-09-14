import { cn } from "@/lib/utils"
import { MAX_GUESSES, WORD_LENGTH, evaluateGuess, type LetterState } from "@/lib/wordle"

export const REVEAL_STAGGER_MS = 260
export const REVEAL_DURATION_MS = 520
export const REVEAL_TOTAL_MS = REVEAL_STAGGER_MS * (WORD_LENGTH - 1) + REVEAL_DURATION_MS

type BoardProps = {
  guesses: string[]
  current: string
  solution: string
  revealRow: number | null
  shakeRow: number | null
  bounceRow: number | null
}

export function Board({ guesses, current, solution, revealRow, shakeRow, bounceRow }: BoardProps) {
  return (
    <div
      className="grid aspect-[5/6] grid-rows-6 gap-1.5 [container-type:inline-size]"
      style={{ width: "min(100cqw, calc(100cqh * 5 / 6), 22rem)" }}
      role="grid"
      aria-label="Spielfeld"
    >
      {Array.from({ length: MAX_GUESSES }, (_, row) => {
        const isSubmitted = row < guesses.length
        const isCurrent = row === guesses.length
        const word = isSubmitted ? guesses[row] : isCurrent ? current : ""
        const states = isSubmitted ? evaluateGuess(word, solution) : null

        return (
          <div
            key={row}
            role="row"
            className="row grid min-h-0 grid-cols-5 gap-1.5"
            data-shake={shakeRow === row}
          >
            {Array.from({ length: WORD_LENGTH }, (_, col) => (
              <Tile
                key={col}
                className="aspect-auto"
                letter={word[col] ?? ""}
                state={states?.[col]}
                animation={
                  row === revealRow
                    ? "reveal"
                    : row === bounceRow
                      ? "bounce"
                      : isCurrent && word[col]
                        ? "pop"
                        : undefined
                }
                delay={
                  row === revealRow
                    ? col * REVEAL_STAGGER_MS
                    : row === bounceRow
                      ? col * 100
                      : 0
                }
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

const STATE_LABEL: Record<LetterState, string> = {
  correct: "richtig",
  present: "falsche Stelle",
  absent: "nicht im Wort",
}

export function Tile({
  letter,
  state,
  animation,
  delay = 0,
  className,
}: {
  letter: string
  state?: LetterState
  animation?: "pop" | "reveal" | "bounce"
  delay?: number
  className?: string
}) {
  return (
    <div
      role="gridcell"
      aria-label={letter ? `${letter}${state ? `, ${STATE_LABEL[state]}` : ""}` : "leer"}
      className={cn(
        "tile flex aspect-square items-center justify-center rounded-[2.2cqw] border-2 text-[9cqw] leading-none font-bold uppercase select-none",
        state && "shadow-sm",
        className
      )}
      data-filled={Boolean(letter)}
      data-state={state}
      data-animation={animation}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
    >
      {letter}
    </div>
  )
}
