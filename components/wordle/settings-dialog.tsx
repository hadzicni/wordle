import { Monitor, Moon, Sun } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import type { Settings, ThemePreference } from "@/lib/storage"
import { cn } from "@/lib/utils"

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Settings
  onChange: (settings: Settings) => void
  hardModeLocked: boolean
  onHardModeLocked: () => void
}

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Hell", icon: Sun },
  { value: "dark", label: "Dunkel", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onChange,
  hardModeLocked,
  onHardModeLocked,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-6 sm:max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">Einstellungen</DialogTitle>
          <DialogDescription className="sr-only">Spiel und Darstellung anpassen</DialogDescription>
        </DialogHeader>

        <SettingRow
          title="Schwerer Modus"
          description="Aufgedeckte Hinweise müssen in weiteren Versuchen verwendet werden."
        >
          <Switch
            checked={settings.hardMode}
            onCheckedChange={(checked) => {
              if (hardModeLocked) {
                onHardModeLocked()
                return
              }
              onChange({ ...settings, hardMode: checked })
            }}
            aria-label="Schwerer Modus"
          />
        </SettingRow>

        <SettingRow title="Hoher Kontrast" description="Farben für bessere Unterscheidbarkeit.">
          <Switch
            checked={settings.highContrast}
            onCheckedChange={(checked) => onChange({ ...settings, highContrast: checked })}
            aria-label="Hoher Kontrast"
          />
        </SettingRow>

        <div className="flex flex-col gap-3 pt-4">
          <p className="text-sm font-medium">Design</p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...settings, theme: value })}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  settings.theme === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={settings.theme === value}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b py-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
