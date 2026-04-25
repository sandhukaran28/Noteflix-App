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

  // auto-clear status after 6s so it doesn't linger after the job is done
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
      className={`relative rounded-3xl border-2 border-dashed transition p-10 sm:p-14 text-center ${
        drag ? "border-[#a28ff3] bg-white/80" : "border-white/70 bg-white/50"
      } backdrop-blur-md`}
    >
      <div className="mx-auto w-16 h-16 rounded-2xl bg-[#a28ff3] grid place-items-center text-white mb-4 shadow-md">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-gray-900">Drop a PDF to generate a video</h2>
      <p className="text-gray-500 mt-1">We'll extract slides, write a podcast-style script, narrate it as a duet, and render an MP4.</p>

      <div className="mt-5 flex flex-wrap justify-center gap-3 items-end">
        <Select
          label=""
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

      <div className="mt-6">
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
          className="px-5 py-2.5 rounded-xl bg-[#a28ff3] text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Choose PDF"}
        </button>
        <span className="ml-3 text-sm text-gray-500">or drag &amp; drop</span>
      </div>

      {(msg || err) && (
        <div className={`mt-5 text-sm ${err ? "text-red-600" : "text-gray-600"}`}>
          {err || msg}
        </div>
      )}
      {file && busy && (
        <div className="mt-2 text-xs text-gray-400">{file.name}</div>
      )}
    </div>
  );
}
