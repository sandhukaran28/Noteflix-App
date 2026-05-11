"use client";

const STYLES: Record<string, { dot: string; cls: string; label?: string }> = {
  done:    { dot: "bg-emerald-400", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  error:   { dot: "bg-red-400",     cls: "bg-red-500/10 text-red-300 border-red-500/20" },
  failed:  { dot: "bg-red-400",     cls: "bg-red-500/10 text-red-300 border-red-500/20" },
  queued:  { dot: "bg-amber-400",   cls: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  pending: { dot: "bg-amber-400",   cls: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  running: { dot: "bg-indigo-400 animate-pulse", cls: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STYLES[status] || STYLES.running;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize tracking-wide ${s.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
