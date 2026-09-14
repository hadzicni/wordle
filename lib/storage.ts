export const STORAGE_KEYS = {
  settings: "wordle:settings",
  daily: "wordle:daily",
  endless: "wordle:endless",
  stats: (mode: string) => `wordle:stats:${mode}`,
  seenHelp: "wordle:seen-help",
} as const

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Speicher nicht verfügbar (z. B. privater Modus) – Spiel läuft trotzdem.
  }
}

export type ThemePreference = "light" | "dark" | "system"

export type Settings = {
  theme: ThemePreference
  hardMode: boolean
  highContrast: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  hardMode: false,
  highContrast: false,
}

/** Wird als Inline-Script vor dem ersten Paint ausgeführt, um Flackern zu vermeiden. */
export const THEME_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("${STORAGE_KEYS.settings}")||"{}");var t=s.theme||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.toggle("dark",d);c.toggle("high-contrast",!!s.highContrast)}catch(e){}})()`

export function applySettingsToDocument(settings: Settings) {
  const root = document.documentElement
  const dark =
    settings.theme === "dark" ||
    (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  root.classList.toggle("dark", dark)
  root.classList.toggle("high-contrast", settings.highContrast)
  root.style.colorScheme = dark ? "dark" : "light"
}
