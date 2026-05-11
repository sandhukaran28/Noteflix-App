"use client";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Select } from "@/components/ui/Select";
import type { Quota } from "@/hooks/useQuota";

export default function HeroUpload({
  token,
  quota,
  onQuotaExceeded,
}: {
  token: string;
  quota: Quota | null;
  onQuotaExceeded: (info: { used: number; limit: number; message: string }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [encodeProfile, setEncodeProfile] = useState("balanced");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPro = !!quota?.isPro;

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 6000);
    return () => clearTimeout(t);
  }, [msg]);

  const startUpload = async (f: File) => {
    setBusy(true);
    setMsg("");
    setErr("");
    const fd = new FormData();
    fd.append("file", f);
    fd.append("encodeProfile", encodeProfile);
    fd.append("dialogue", "duet");
    try {
      const res: any = await api("/assets", { method: "POST", token, form: true, body: fd });
      if (res?.quotaError) {
        onQuotaExceeded({
          used: res.quotaError.used,
          limit: res.quotaError.limit,
          message: res.quotaError.message,
        });
        setMsg("Uploaded, but quota reached — couldn't start the job.");
      } else if (res?.jobId) {
        setMsg("Upload complete — watch the card below for progress.");
      } else {
        setMsg("Uploaded.");
      }
      setFile(null);
      window.dispatchEvent(new CustomEvent("assets:refresh"));
      window.dispatchEvent(new CustomEvent("jobs:refresh"));
      window.dispatchEvent(new CustomEvent("quota:refresh"));
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 429) {
        onQuotaExceeded({
          used: e.data?.used ?? 0,
          limit: e.data?.limit ?? 0,
          message: e.message,
        });
      } else {
        setErr(e?.message || "Upload failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const onSelectFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    void startUpload(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.type === "application/pdf") onSelectFile(f);
        else setErr("Please drop a PDF file.");
      }}
      className={`relative rounded-3xl border-2 border-dashed transition-all duration-200 p-10 sm:p-14 text-center overflow-hidden ${
        drag
          ? "border-indigo-400/60 bg-indigo-500/[0.06]"
          : "border-white/10 bg-white/[0.02] hover:border-white/15"
      }`}
    >
      <div className="absolute inset-0 dotted-grid opacity-30 pointer-events-none" />

      <div className="relative">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white mb-5 shadow-lg shadow-indigo-900/40">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Drop a PDF to generate a video
        </h2>
        <p className="text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
          We extract slides, write a podcast-style script, narrate it as a duet,
          and render a polished MP4 — all in one go.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 items-end">
          <div className="min-w-[260px]">
            <Select
              label="Encode profile"
              value={encodeProfile}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEncodeProfile(e.target.value)}
            >
              <option value="balanced">Balanced (720p) — fastest</option>
              <option value="heavy" disabled={!isPro}>
                Heavy (1440p, 2-pass){isPro ? "" : " — Pro only"}
              </option>
              <option value="insane" disabled={!isPro}>
                Insane (4K, 2-pass){isPro ? "" : " — Pro only"}
              </option>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onSelectFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="btn-primary px-5 py-2.5 rounded-lg text-white font-semibold text-sm border border-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {busy ? "Uploading…" : "Choose PDF"}
          </button>
          <span className="text-sm text-slate-500">or drag &amp; drop</span>
        </div>

        {(msg || err) && (
          <div
            className={`mt-5 inline-block text-sm px-3 py-1.5 rounded-lg border ${
              err
                ? "text-red-200 bg-red-500/10 border-red-500/30"
                : "text-emerald-200 bg-emerald-500/10 border-emerald-500/30"
            }`}
          >
            {err || msg}
          </div>
        )}
        {file && busy && (
          <div className="mt-2 text-xs text-slate-500">{file.name}</div>
        )}
      </div>
    </div>
  );
}
