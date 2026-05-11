"use client";
import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { api } from "@/lib/api";

type Tab = "overview" | "logs" | "script";

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const isoish = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(isoish);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 text-sm border-b border-white/5 last:border-b-0">
      <div className="text-slate-400">{label}</div>
      <div className="col-span-2 text-white">{value ?? "—"}</div>
    </div>
  );
}

function assetTitle(a: any, jobId: string) {
  if (!a) return `Job ${jobId.slice(0, 8)}`;
  try {
    const m = typeof a.meta === "string" ? JSON.parse(a.meta) : a.meta;
    if (m?.originalName) return String(m.originalName).replace(/\.[^.]+$/, "");
  } catch {}
  return `Job ${jobId.slice(0, 8)}`;
}

export default function JobDetails({
  token,
  job,
  onClose,
}: {
  token: string;
  job: any;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(job);
  const [logs, setLogs] = useState("");
  const [script, setScript] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const params = useMemo(() => {
    try {
      const p = data?.params ?? job?.params;
      return typeof p === "string" ? JSON.parse(p) : p || {};
    } catch {
      return {};
    }
  }, [data?.params, job?.params]);

  const status = data?.status || job.status;
  const isDone = status === "done";

  const reload = async () => {
    try {
      const d = await api<any>(`/jobs/${job.id}`, { token });
      if (d) setData(d);
    } catch {}
    try {
      const l = await api<string>(`/jobs/${job.id}/logs`, { token });
      if (typeof l === "string") setLogs(l);
    } catch {}
  };

  useEffect(() => {
    reload();
    const id = setInterval(reload, 4000);
    return () => clearInterval(id);
  }, [job.id, token]);

  useEffect(() => {
    if (!isDone || videoUrl) return;
    (async () => {
      try {
        const r = await api<{ url: string }>(`/jobs/${job.id}/output-url`, { token });
        if (r?.url) setVideoUrl(r.url);
      } catch {}
    })();
  }, [isDone, job.id, token, videoUrl]);

  useEffect(() => {
    if (!isDone) return;
    (async () => {
      try {
        const s = await api<string>(`/jobs/${job.id}/script`, { token });
        if (typeof s === "string") setScript(s);
      } catch {}
    })();
  }, [isDone, job.id, token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = assetTitle(job?._asset, job.id);

  const onDownload = async () => {
    try {
      const r = await api<{ url: string }>(`/jobs/${job.id}/output-url`, { token });
      if (!r?.url) throw new Error("no url");
      const a = document.createElement("a");
      a.href = r.url;
      a.download = `noteflix-${String(job.id).slice(0, 8)}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      alert("Download failed: " + (e?.message || "unknown"));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] surface-card rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-black aspect-video">
          {isDone && videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden">
              <div className="absolute inset-0 dotted-grid opacity-25" />
              <div className="relative text-center px-6">
                <div className="text-3xl font-semibold tracking-tight">{title}</div>
                <div className="mt-3 flex justify-center">
                  <StatusPill status={status} />
                </div>
                {!isDone && (
                  <p className="mt-4 text-sm text-white/90">
                    {status === "failed"
                      ? "This job failed — check the Logs tab."
                      : "Generating your video…"}
                  </p>
                )}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black/80 grid place-items-center border border-white/10 transition"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4 flex-wrap border-b border-white/5">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">{title}</h2>
            <div className="text-sm text-slate-400 mt-1">
              {params?.encodeProfile || "balanced"} ·{" "}
              {params?.dialogue || "solo"} · {fmtDate(data?.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={status} />
            {isDone && (
              <button
                onClick={onDownload}
                className="btn-primary px-3.5 py-2 rounded-lg text-sm font-semibold text-white border border-indigo-500/40 transition flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download MP4
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pt-3 border-b border-white/5 flex gap-1">
          {(["overview", "logs", "script"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-2 text-sm font-medium rounded-t-lg border-b-2 capitalize transition ${
                tab === t
                  ? "border-indigo-400 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 overflow-auto">
          {tab === "overview" && (
            <div className="grid max-w-2xl">
              <Row label="Encode profile" value={params?.encodeProfile || "balanced"} />
              <Row label="Style" value={params?.style || "kenburns"} />
              <Row label="Dialogue" value={params?.dialogue || "solo"} />
              <Row
                label="Duration target"
                value={params?.duration ? `${Math.round(params.duration)}s` : "—"}
              />
              <Row label="Started" value={fmtDate(data?.startedAt)} />
              <Row label="Finished" value={fmtDate(data?.finishedAt)} />
              {typeof data?.cpuSeconds === "number" && (
                <Row label="CPU time" value={`${data.cpuSeconds}s`} />
              )}
              <Row
                label="Job ID"
                value={<span className="font-mono text-xs text-slate-300">{job.id}</span>}
              />
            </div>
          )}

          {tab === "logs" && (
            <pre className="bg-[#06080F] text-emerald-300 p-4 rounded-xl overflow-auto max-h-[50vh] text-xs whitespace-pre-wrap font-mono border border-white/5">
              {logs || "No logs yet."}
            </pre>
          )}

          {tab === "script" && (
            <pre className="bg-[#06080F] p-4 rounded-xl whitespace-pre-wrap text-sm text-slate-300 max-h-[50vh] overflow-auto border border-white/5">
              {script ||
                (isDone ? "(Script not available)" : "Available when the job completes.")}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
