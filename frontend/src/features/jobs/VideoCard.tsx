"use client";
import { StatusPill } from "@/components/ui/StatusPill";

const PALETTES = [
  "from-indigo-500 to-violet-600",
  "from-violet-500 to-fuchsia-600",
  "from-sky-500 to-indigo-600",
  "from-purple-500 to-indigo-600",
  "from-blue-500 to-violet-600",
];

function paletteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export default function VideoCard({
  job,
  assetLabel,
  onOpen,
}: {
  job: any;
  assetLabel: string;
  onOpen: () => void;
}) {
  const palette = paletteFor(job.id);
  const isDone = job.status === "done";
  const isRunning = job.status === "running" || job.status === "pending";
  const isFailed = job.status === "failed";

  return (
    <button
      onClick={onOpen}
      className="text-left group rounded-2xl overflow-hidden surface-card hover:border-indigo-400/30 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
    >
      <div className={`relative aspect-video bg-gradient-to-br ${palette} overflow-hidden`}>
        <div className="absolute inset-0 dotted-grid opacity-30" />
        {isRunning && (
          <div className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-xs font-semibold text-slate-900 shadow">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Generating…
            </div>
          </div>
        )}
        {isDone && (
          <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition bg-black/30">
            <div className="w-14 h-14 rounded-full bg-white/95 grid place-items-center shadow-xl">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-indigo-600 ml-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        {isFailed && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <div className="text-[11px] font-semibold text-white px-3 py-1.5 rounded-full bg-red-500/90 border border-red-300/30">
              Generation failed
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StatusPill status={job.status} />
        </div>
      </div>
      <div className="p-4">
        <div
          className="font-semibold text-sm truncate text-white"
          title={assetLabel}
        >
          {assetLabel}
        </div>
        <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-slate-300 text-[10px] uppercase tracking-wider font-semibold">
            {job.params?.encodeProfile || "balanced"}
          </span>
          <span>{fmtDate(job.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}
