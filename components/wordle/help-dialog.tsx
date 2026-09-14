import { Tile } from "@/components/wordle/board"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LetterState } from "@/lib/wordle"

type HelpDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">So wird gespielt</DialogTitle>
          <DialogDescription>Errate das Wort in 6 Versuchen.</DialogDescription>
        </DialogHeader>

        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground/90">
          <li>Jeder Versuch muss ein gültiges Wort mit 5 Buchstaben sein.</li>
          <li>Die Farbe der Kacheln zeigt, wie nah du an der Lösung bist.</li>
          <li>Umlaute werden nicht verwendet.</li>
        </ul>

        <div className="space-y-4 border-t pt-5">
          <p className="text-sm font-semibold">Beispiele</p>
          <Example word="KATZE" index={0} state="correct">
            <b>K</b> ist im Wort und an der richtigen Stelle.
          </Example>
          <Example word="BLUME" index={1} state="present">
            <b>L</b> ist im Wort, aber an der falschen Stelle.
          </Example>
          <Example word="STERN" index={3} state="absent">
            <b>R</b> kommt im Wort nicht vor.
          </Example>
        </div>

        <p className="border-t pt-5 text-sm text-muted-foreground">
          Jeden Tag gibt es ein neues Tageswort. Im <b className="text-foreground">Endlos-Modus</b>{" "}
          kannst du so viele Runden spielen, wie du willst.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function Example({
  word,
  index,
  state,
  children,
}: {
  word: string
  index: number
  state: LetterState
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="grid w-52 grid-cols-5 gap-1 [container-type:inline-size]">
        {word.split("").map((letter, i) => (
          <Tile key={i} letter={letter} state={i === index ? state : undefined} />
        ))}
      </div>
      <p className="text-sm text-muted-foreground [&_b]:text-foreground">{children}</p>
    </div>
  )
}
