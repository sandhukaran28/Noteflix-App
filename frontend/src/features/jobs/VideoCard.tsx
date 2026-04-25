"use client";
import { StatusPill } from "@/components/ui/StatusPill";

const PALETTES = [
  "from-[#b1d0fc] to-[#f4d6ff]",
  "from-[#ffd7e0] to-[#c9b6ff]",
  "from-[#c9efff] to-[#d4b6ff]",
  "from-[#fff0c2] to-[#ffb6e6]",
  "from-[#cfe9ff] to-[#a28ff3]",
];

function paletteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

function fmtDate(s?: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
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
      className="text-left group rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-200 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-[#a28ff3]"
    >
      <div className={`relative aspect-video bg-gradient-to-br ${palette}`}>
        {isRunning && (
          <div className="absolute inset-0 grid place-items-center bg-black/10 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 text-xs font-medium text-gray-700">
              <span className="w-2 h-2 rounded-full bg-[#a28ff3] animate-pulse" />
              Generating…
            </div>
          </div>
        )}
        {isDone && (
          <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition bg-black/20">
            <div className="w-14 h-14 rounded-full bg-white/90 grid place-items-center shadow">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-[#a28ff3] ml-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        {isFailed && (
          <div className="absolute inset-0 grid place-items-center bg-black/20">
            <div className="text-xs font-medium text-white px-3 py-1.5 rounded-full bg-red-500/80">
              Generation failed
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StatusPill status={job.status} />
        </div>
      </div>
      <div className="p-3">
        <div className="font-medium text-sm truncate" title={assetLabel}>{assetLabel}</div>
        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
          <span>{job.params?.encodeProfile || "balanced"}</span>
          <span>{fmtDate(job.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}
