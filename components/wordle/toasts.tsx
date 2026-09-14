export type Toast = { id: number; message: string }

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-28 z-[60] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
