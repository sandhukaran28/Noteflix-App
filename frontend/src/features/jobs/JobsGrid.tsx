"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import VideoCard from "./VideoCard";
import JobDetails from "./JobDetails";

function assetLabel(a: any) {
  if (!a) return "—";
  try {
    const m = typeof a.meta === "string" ? JSON.parse(a.meta) : a.meta;
    if (m?.originalName) return String(m.originalName).replace(/\.[^.]+$/, "");
  } catch {}
  return a.id?.slice(0, 8) || "—";
}

export default function JobsGrid({
  token,
  limit,
  emptyHint,
}: {
  token: string;
  limit?: number;
  emptyHint?: React.ReactNode;
}) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [assetsById, setAssetsById] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [jobsRes, assetsRes]: any = await Promise.all([
        api(`/jobs?limit=${limit ?? 50}&sort=createdAt:desc`, { token }),
        api(`/assets?limit=200`, { token }),
      ]);
      const items = jobsRes?.items || [];
      setJobs(items);
      const map: Record<string, any> = {};
      for (const a of assetsRes?.items || []) map[a.id] = a;
      setAssetsById(map);
    } catch {
      // best-effort
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    const onRef = () => load();
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("jobs:refresh", onRef);
    window.addEventListener("focus", onRef);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("jobs:refresh", onRef);
      window.removeEventListener("focus", onRef);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const visibleJobs = useMemo(
    () => (limit ? jobs.slice(0, limit) : jobs),
    [jobs, limit]
  );

  if (!loading && !jobs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-400/20 grid place-items-center text-indigo-300 mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <div className="text-sm text-slate-300 font-medium">No videos yet</div>
        <div className="text-sm text-slate-500 mt-1">
          {emptyHint || "Upload a PDF to generate your first video."}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleJobs.map((j) => (
          <VideoCard
            key={j.id}
            job={j}
            assetLabel={assetLabel(assetsById[j.assetId])}
            onOpen={() => setSelected({ ...j, _asset: assetsById[j.assetId] })}
          />
        ))}
      </div>
      {selected && (
        <JobDetails
          token={token}
          job={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
