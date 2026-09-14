"use client"

import { useEffect, useState } from "react"
import { RotateCcw, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { msUntilNextDay, type GameMode, type GameStatus, type Stats } from "@/lib/wordle"

type StatsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  stats: Stats
  mode: GameMode
  status: GameStatus
  guessCount: number
  solution: string
  onShare: () => void
  onNewGame: () => void
}

export function StatsDialog({
  open,
  onOpenChange,
  stats,
  mode,
  status,
  guessCount,
  solution,
  onShare,
  onNewGame,
}: StatsDialogProps) {
  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
  const maxBar = Math.max(1, ...stats.distribution)
  const finished = status !== "playing"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {status === "won" ? "Geschafft! 🎉" : status === "lost" ? "Knapp daneben" : "Statistik"}
          </DialogTitle>
          <DialogDescription>
            {status === "lost" ? (
              <>
                Die Lösung war <b className="font-semibold tracking-wider text-foreground">{solution}</b>
              </>
            ) : (
              <>{mode === "daily" ? "Tageswort" : "Endlos-Modus"} – deine bisherigen Runden</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          <StatTile value={stats.played} label="Gespielt" />
          <StatTile value={`${winRate}%`} label="Gewonnen" />
          <StatTile value={stats.currentStreak} label="Serie" />
          <StatTile value={stats.maxStreak} label="Beste Serie" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Verteilung der Versuche</p>
          <div className="space-y-1.5">
            {stats.distribution.map((count, i) => {
              const highlight = status === "won" && guessCount === i + 1
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-right font-medium tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div
                      className={cn(
                        "flex h-6 min-w-7 items-center justify-end rounded-md px-2 text-xs font-semibold tabular-nums transition-[width] duration-700 ease-out",
                        highlight
                          ? "bg-[var(--tile-correct)] text-white"
                          : "bg-[var(--key-bg)] text-foreground"
                      )}
                      style={{ width: `${Math.max(8, (count / maxBar) * 100)}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {finished && (
          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center">
            {mode === "daily" ? (
              <div className="flex-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Nächstes Wort in
                </p>
                <Countdown />
              </div>
            ) : (
              <Button variant="outline" size="lg" className="h-11 flex-1 text-sm" onClick={onNewGame}>
                <RotateCcw />
                Neues Wort
              </Button>
            )}
            <Button
              size="lg"
              className="h-11 flex-1 bg-[var(--tile-correct)] text-sm text-white hover:bg-[var(--tile-correct)] hover:brightness-110"
              onClick={onShare}
            >
              <Share2 />
              Ergebnis teilen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-muted/70 px-1 py-3">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-center text-[0.7rem] leading-tight text-muted-foreground">{label}</span>
    </div>
  )
}

function Countdown() {
  const [ms, setMs] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setMs(msUntilNextDay())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const format = (value: number) => {
    const total = Math.floor(value / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
  }

  return <p className="font-mono text-2xl font-semibold tabular-nums">{ms === null ? "--:--:--" : format(ms)}</p>
}
