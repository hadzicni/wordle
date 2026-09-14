import { Delete } from "lucide-react"

import { cn } from "@/lib/utils"
import type { LetterState } from "@/lib/wordle"

const ROWS = [
  ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Y", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
]

const STATE_CLASSES: Record<LetterState, string> = {
  correct: "bg-[var(--tile-correct)] text-white hover:brightness-110",
  present: "bg-[var(--tile-present)] text-white hover:brightness-110",
  absent: "bg-[var(--tile-absent)] text-white/90 hover:brightness-110",
}

type KeyboardProps = {
  keyStates: Record<string, LetterState>
  onKey: (key: string) => void
  disabled?: boolean
}

export function Keyboard({ keyStates, onKey, disabled }: KeyboardProps) {
  return (
    <div className="flex w-full max-w-lg flex-col gap-1.5 sm:gap-2" aria-label="Tastatur">
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 sm:gap-1.5">
          {row.map((key) => {
            const isWide = key === "ENTER" || key === "BACKSPACE"
            const state = keyStates[key]
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => onKey(key)}
                aria-label={
                  key === "BACKSPACE" ? "Löschen" : key === "ENTER" ? "Eingabe" : key
                }
                className={cn(
                  "flex h-14 min-w-0 flex-1 items-center justify-center rounded-lg text-sm font-semibold uppercase transition-[background-color,filter,transform] duration-300 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 sm:text-base",
                  isWide ? "max-w-18 flex-[1.5] text-xs sm:text-sm" : "max-w-11",
                  state
                    ? STATE_CLASSES[state]
                    : "bg-[var(--key-bg)] text-foreground hover:bg-[var(--key-bg-hover)]"
                )}
              >
                {key === "BACKSPACE" ? (
                  <Delete className="size-5" />
                ) : key === "ENTER" ? (
                  "Enter"
                ) : (
                  key
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
