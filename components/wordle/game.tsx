"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CalendarDays, ChartColumn, CircleHelp, Infinity as InfinityIcon, RotateCcw, Settings as SettingsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Board, REVEAL_TOTAL_MS } from "@/components/wordle/board"
import { HelpDialog } from "@/components/wordle/help-dialog"
import { Keyboard } from "@/components/wordle/keyboard"
import { SettingsDialog } from "@/components/wordle/settings-dialog"
import { StatsDialog } from "@/components/wordle/stats-dialog"
import { Toasts, type Toast } from "@/components/wordle/toasts"
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  applySettingsToDocument,
  loadJSON,
  saveJSON,
  type Settings,
} from "@/lib/storage"
import { cn } from "@/lib/utils"
import {
  EMPTY_STATS,
  MAX_GUESSES,
  WORD_LENGTH,
  buildShareText,
  getDailyWord,
  getDayIndex,
  getKeyStates,
  getRandomWord,
  hardModeViolation,
  isValidGuess,
  type GameMode,
  type GameStatus,
  type Stats,
} from "@/lib/wordle"

type DailyState = { dayIndex: number; guesses: string[]; hardMode: boolean }
type EndlessState = { solution: string; guesses: string[]; hardMode: boolean }
type StoredStats = Stats & { lastWonDay?: number }

const WIN_MESSAGES = ["Genial!", "Großartig!", "Beeindruckend!", "Super!", "Gut gemacht!", "Puh, knapp!"]

function getStatus(guesses: string[], solution: string): GameStatus {
  if (guesses.at(-1) === solution) return "won"
  if (guesses.length >= MAX_GUESSES) return "lost"
  return "playing"
}

export function Game() {
  const [loaded, setLoaded] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [mode, setMode] = useState<GameMode>("daily")
  const [daily, setDaily] = useState<DailyState>({ dayIndex: 0, guesses: [], hardMode: false })
  const [endless, setEndless] = useState<EndlessState>({ solution: "", guesses: [], hardMode: false })
  const [stats, setStats] = useState<Record<GameMode, StoredStats>>({
    daily: EMPTY_STATS,
    endless: EMPTY_STATS,
  })

  const [current, setCurrent] = useState("")
  const [revealRow, setRevealRow] = useState<number | null>(null)
  const [shakeRow, setShakeRow] = useState<number | null>(null)
  const [bounceRow, setBounceRow] = useState<number | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [dialog, setDialog] = useState<"help" | "stats" | "settings" | null>(null)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const toastId = useRef(0)

  const session = mode === "daily" ? daily : endless
  const solution = mode === "daily" ? getDailyWord(daily.dayIndex) : endless.solution
  const guesses = session.guesses
  const status = getStatus(guesses, solution)
  const isRevealing = revealRow !== null
  // Der schwere Modus wird beim ersten Versuch einer Runde festgeschrieben.
  const hardMode = guesses.length === 0 ? settings.hardMode : session.hardMode
  const keyStates = getKeyStates(isRevealing ? guesses.slice(0, revealRow) : guesses, solution)

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  const showToast = useCallback(
    (message: string, duration = 1600) => {
      const id = ++toastId.current
      setToasts((prev) => [...prev, { id, message }])
      later(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
    },
    [later]
  )

  // --- Laden & Speichern ---------------------------------------------------

  useEffect(() => {
    const today = getDayIndex()
    const storedDaily = loadJSON<DailyState>(STORAGE_KEYS.daily, { dayIndex: today, guesses: [], hardMode: false })
    const storedEndless = loadJSON<EndlessState>(STORAGE_KEYS.endless, { solution: "", guesses: [], hardMode: false })

    /* eslint-disable react-hooks/set-state-in-effect -- einmaliges Laden aus localStorage nach Hydration */
    setSettings(loadJSON(STORAGE_KEYS.settings, DEFAULT_SETTINGS))
    setDaily(storedDaily.dayIndex === today ? storedDaily : { dayIndex: today, guesses: [], hardMode: false })
    setEndless(storedEndless.solution ? storedEndless : { solution: getRandomWord(), guesses: [], hardMode: false })
    setStats({
      daily: loadJSON(STORAGE_KEYS.stats("daily"), EMPTY_STATS),
      endless: loadJSON(STORAGE_KEYS.stats("endless"), EMPTY_STATS),
    })
    if (!loadJSON(STORAGE_KEYS.seenHelp, { seen: false }).seen) {
      setDialog("help")
      saveJSON(STORAGE_KEYS.seenHelp, { seen: true })
    }
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (loaded) saveJSON(STORAGE_KEYS.daily, daily)
  }, [daily, loaded])

  useEffect(() => {
    if (loaded) saveJSON(STORAGE_KEYS.endless, endless)
  }, [endless, loaded])

  useEffect(() => {
    if (!loaded) return
    saveJSON(STORAGE_KEYS.settings, settings)
    applySettingsToDocument(settings)
    if (settings.theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applySettingsToDocument(settings)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [settings, loaded])

  // Neuer Tag, während die Seite offen ist
  useEffect(() => {
    const check = () => {
      const today = getDayIndex()
      setDaily((prev) => (prev.dayIndex === today ? prev : { dayIndex: today, guesses: [], hardMode: false }))
    }
    document.addEventListener("visibilitychange", check)
    const id = setInterval(check, 30_000)
    return () => {
      document.removeEventListener("visibilitychange", check)
      clearInterval(id)
    }
  }, [])

  // --- Spielablauf -----------------------------------------------------------

  const recordResult = useCallback(
    (won: boolean, attempts: number) => {
      setStats((prev) => {
        const s = prev[mode]
        const today = daily.dayIndex
        const continues = mode === "endless" || s.lastWonDay === today - 1
        const currentStreak = won ? (continues ? s.currentStreak + 1 : 1) : 0
        const next: StoredStats = {
          played: s.played + 1,
          wins: s.wins + (won ? 1 : 0),
          currentStreak,
          maxStreak: Math.max(s.maxStreak, currentStreak),
          distribution: s.distribution.map((n, i) => (won && i === attempts - 1 ? n + 1 : n)),
          lastWonDay: mode === "daily" && won ? today : s.lastWonDay,
        }
        saveJSON(STORAGE_KEYS.stats(mode), next)
        return { ...prev, [mode]: next }
      })
    },
    [mode, daily.dayIndex]
  )

  const rejectGuess = useCallback(
    (message: string) => {
      setShakeRow(guesses.length)
      showToast(message)
      later(() => setShakeRow(null), 600)
    },
    [guesses.length, showToast, later]
  )

  const submitGuess = useCallback(() => {
    if (current.length < WORD_LENGTH) return rejectGuess("Zu wenige Buchstaben")
    if (!isValidGuess(current)) return rejectGuess("Nicht in der Wortliste")
    if (hardMode) {
      const violation = hardModeViolation(current, guesses, solution)
      if (violation) return rejectGuess(violation)
    }

    const nextGuesses = [...guesses, current]
    const row = guesses.length
    const nextStatus = getStatus(nextGuesses, solution)

    if (mode === "daily") setDaily((prev) => ({ ...prev, guesses: nextGuesses, hardMode }))
    else setEndless((prev) => ({ ...prev, guesses: nextGuesses, hardMode }))

    setCurrent("")
    setRevealRow(row)

    if (nextStatus !== "playing") recordResult(nextStatus === "won", nextGuesses.length)

    later(() => {
      setRevealRow(null)
      if (nextStatus === "won") {
        setBounceRow(row)
        showToast(WIN_MESSAGES[row], 2000)
        later(() => setBounceRow(null), 1400)
        later(() => setDialog("stats"), 1900)
      } else if (nextStatus === "lost") {
        showToast(solution, 2800)
        later(() => setDialog("stats"), 2200)
      }
    }, REVEAL_TOTAL_MS)
  }, [current, guesses, solution, hardMode, mode, rejectGuess, recordResult, showToast, later])

  const handleKey = useCallback(
    (key: string) => {
      if (!loaded || isRevealing || status !== "playing") return
      if (key === "ENTER") return submitGuess()
      if (key === "BACKSPACE") return setCurrent((prev) => prev.slice(0, -1))
      if (/^[A-Z]$/.test(key)) setCurrent((prev) => (prev.length < WORD_LENGTH ? prev + key : prev))
    },
    [loaded, isRevealing, status, submitGuess]
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialog || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === "Enter") {
        event.preventDefault()
        handleKey("ENTER")
      } else if (event.key === "Backspace") {
        handleKey("BACKSPACE")
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        handleKey(event.key.toUpperCase())
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleKey, dialog])

  const switchMode = (next: GameMode) => {
    if (next === mode || isRevealing) return
    setMode(next)
    setCurrent("")
  }

  const newEndlessGame = () => {
    setEndless((prev) => ({ solution: getRandomWord(prev.solution), guesses: [], hardMode: settings.hardMode }))
    setCurrent("")
    setDialog(null)
  }

  const share = async () => {
    const text = buildShareText({
      guesses,
      solution,
      status,
      mode,
      dayIndex: daily.dayIndex,
      hardMode,
      highContrast: settings.highContrast,
    })
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    try {
      if (isTouch && navigator.share) {
        await navigator.share({ text })
        return
      }
      await copyToClipboard(text)
      showToast("In die Zwischenablage kopiert")
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") showToast("Teilen nicht möglich")
    }
  }

  const gameInProgress = guesses.length > 0 && status === "playing"

  return (
    <div className="app-background flex h-dvh flex-col overflow-hidden">
      <header className="border-b border-border/60 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-3">
          <Button variant="ghost" size="icon-lg" onClick={() => setDialog("help")} aria-label="Anleitung">
            <CircleHelp className="size-5" />
          </Button>
          <Logo />
          <div className="flex items-center">
            <Button variant="ghost" size="icon-lg" onClick={() => setDialog("stats")} aria-label="Statistik">
              <ChartColumn className="size-5" />
            </Button>
            <Button variant="ghost" size="icon-lg" onClick={() => setDialog("settings")} aria-label="Einstellungen">
              <SettingsIcon className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex justify-center px-4 pt-4">
        <div className="relative grid grid-cols-2 rounded-full bg-muted/80 p-1 text-sm font-medium shadow-inner">
          <span
            className={cn(
              "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm transition-transform duration-300 ease-out",
              mode === "endless" && "translate-x-full"
            )}
            aria-hidden
          />
          <ModeButton active={mode === "daily"} onClick={() => switchMode("daily")}>
            <CalendarDays className="size-4" />
            Tageswort
          </ModeButton>
          <ModeButton active={mode === "endless"} onClick={() => switchMode("endless")}>
            <InfinityIcon className="size-4" />
            Endlos
          </ModeButton>
        </div>
      </div>

      <main className="flex min-h-0 flex-1 flex-col items-center gap-3 px-4 py-4">
        <p className="h-5 text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {loaded &&
            (mode === "daily" ? `Rätsel #${daily.dayIndex + 1}` : `Runde · ${guesses.length}/${MAX_GUESSES}`)}
          {loaded && hardMode && " · Schwer"}
        </p>
        <div
          className={cn(
            "flex min-h-0 w-full flex-1 items-center justify-center transition-opacity duration-300 [container-type:size]",
            loaded ? "opacity-100" : "opacity-0"
          )}
        >
          <Board
            guesses={guesses}
            current={current}
            solution={solution}
            revealRow={revealRow}
            shakeRow={shakeRow}
            bounceRow={bounceRow}
          />
        </div>
        <div className="flex h-10 items-center">
          {status !== "playing" && !isRevealing && (
            <div className="flex gap-2 animate-in fade-in-0 slide-in-from-bottom-2">
              <Button variant="outline" size="lg" className="rounded-full px-4" onClick={() => setDialog("stats")}>
                <ChartColumn />
                Ergebnis
              </Button>
              {mode === "endless" && (
                <Button size="lg" className="rounded-full px-4" onClick={newEndlessGame}>
                  <RotateCcw />
                  Neues Wort
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Keyboard keyStates={keyStates} onKey={handleKey} />
      </footer>

      <Toasts toasts={toasts} />

      <HelpDialog open={dialog === "help"} onOpenChange={(open) => setDialog(open ? "help" : null)} />
      <StatsDialog
        open={dialog === "stats"}
        onOpenChange={(open) => setDialog(open ? "stats" : null)}
        stats={stats[mode]}
        mode={mode}
        status={status}
        guessCount={guesses.length}
        solution={solution}
        onShare={share}
        onNewGame={newEndlessGame}
      />
      <SettingsDialog
        open={dialog === "settings"}
        onOpenChange={(open) => setDialog(open ? "settings" : null)}
        settings={settings}
        onChange={setSettings}
        hardModeLocked={gameInProgress}
        onHardModeLocked={() => showToast("Schwerer Modus nur zu Rundenbeginn änderbar")}
      />
    </div>
  )
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback für Umgebungen ohne Clipboard-API-Berechtigung
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand("copy")
    textarea.remove()
    if (!ok) throw new Error("Kopieren fehlgeschlagen")
  }
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function Logo() {
  const letters: { char: string; tone?: "correct" | "present" }[] = [
    { char: "W", tone: "correct" },
    { char: "O" },
    { char: "R", tone: "present" },
    { char: "D" },
    { char: "L" },
    { char: "E", tone: "correct" },
  ]
  return (
    <h1 className="flex items-center gap-1" aria-label="Wordle">
      {letters.map(({ char, tone }, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-sm font-extrabold",
            tone === "correct" && "bg-[var(--tile-correct)] text-white",
            tone === "present" && "bg-[var(--tile-present)] text-white",
            !tone && "border-2 border-[var(--tile-border-filled)]"
          )}
        >
          {char}
        </span>
      ))}
    </h1>
  )
}
