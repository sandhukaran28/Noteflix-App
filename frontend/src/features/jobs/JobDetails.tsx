"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
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
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="col-span-2 text-gray-900">{value ?? "—"}</div>
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = assetTitle(job?._asset, job.id);
  const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  const downloadHref = `${BASE}/jobs/${job.id}/output`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-in" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
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
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#a28ff3] to-[#7c64ff] text-white">
              <div className="text-center">
                <div className="text-4xl font-semibold">{title}</div>
                <div className="mt-3"><StatusPill status={status} /></div>
                {!isDone && (
                  <p className="mt-4 text-sm text-white/80">
                    {status === "failed" ? "This job failed — check the Logs tab." : "Generating your video…"}
                  </p>
                )}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white hover:bg-black/70 grid place-items-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pt-5 pb-2 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <div className="text-sm text-gray-500 mt-0.5">
              {params?.encodeProfile || "balanced"} · {params?.dialogue || "solo"} · {fmtDate(data?.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={status} />
            {isDone && (
              <a
                href={downloadHref}
                download={`noteflix-${String(job.id).slice(0, 8)}.mp4`}
                className="px-3 py-2 rounded-xl text-sm font-medium bg-[#a28ff3] text-white hover:opacity-90"
              >
                Download MP4
              </a>
            )}
          </div>
        </div>

        <div className="px-6 pt-3 border-b border-gray-100 flex gap-1">
          {(["overview", "logs", "script"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 capitalize ${
                tab === t ? "border-[#a28ff3] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 overflow-auto">
          {tab === "overview" && (
            <div className="grid gap-1 max-w-2xl">
              <Row label="Encode profile" value={params?.encodeProfile || "balanced"} />
              <Row label="Style" value={params?.style || "kenburns"} />
              <Row label="Dialogue" value={params?.dialogue || "solo"} />
              <Row label="Duration target" value={params?.duration ? `${Math.round(params.duration)}s` : "—"} />
              <Row label="Started" value={fmtDate(data?.startedAt)} />
              <Row label="Finished" value={fmtDate(data?.finishedAt)} />
              {typeof data?.cpuSeconds === "number" && (
                <Row label="CPU time" value={`${data.cpuSeconds}s`} />
              )}
              <Row label="Job ID" value={<span className="font-mono text-xs">{job.id}</span>} />
            </div>
          )}

          {tab === "logs" && (
            <pre className="bg-gray-900 text-green-300 p-4 rounded-xl overflow-auto max-h-[50vh] text-xs whitespace-pre-wrap font-mono">
              {logs || "No logs yet."}
            </pre>
          )}

          {tab === "script" && (
            <div className="prose prose-sm max-w-none">
              <pre className="bg-gray-50 p-4 rounded-xl whitespace-pre-wrap text-sm text-gray-800 max-h-[50vh] overflow-auto">
                {script || (isDone ? "(Script not available)" : "Available when the job completes.")}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
