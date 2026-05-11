"use client";
import React from "react";
import type { View } from "./AppShell";
import type { Quota } from "@/hooks/useQuota";

const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M10 9l5 3-5 3V9z" />
      </svg>
    ),
  },
  {
    id: "account",
    label: "Account",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

export default function Sidebar({
  view,
  setView,
  quota,
  onUpgrade,
  onLogout,
}: {
  view: View;
  setView: (v: View) => void;
  quota: Quota | null;
  onUpgrade: () => void;
  onLogout: () => void;
}) {
  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-[#0B0F1A]/80 backdrop-blur-md flex flex-col">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white font-bold shadow-lg shadow-indigo-900/40">
            N
          </div>
          <div>
            <div className="font-semibold tracking-tight text-white">Noteflix</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-0.5">Studio</div>
          </div>
        </div>
      </div>

      <nav className="px-3 flex-1">
        <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          Workspace
        </div>
        {navItems.map((it) => {
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-white border border-indigo-400/20"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white border border-transparent"
              }`}
            >
              <span className={active ? "text-indigo-300" : "text-slate-500"}>{it.icon}</span>
              <span>{it.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </button>
          );
        })}
      </nav>

      <QuotaPanel quota={quota} onUpgrade={onUpgrade} />

      <div className="p-3 border-t border-white/5">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/[0.04] hover:text-white transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

function QuotaPanel({ quota, onUpgrade }: { quota: Quota | null; onUpgrade: () => void }) {
  if (!quota) {
    return (
      <div className="mx-3 mb-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
        <div className="text-xs text-slate-500">Loading plan…</div>
      </div>
    );
  }

  if (quota.isPro) {
    return (
      <div className="mx-3 mb-3 p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/40 relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid opacity-30" />
        <div className="relative flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Pro</span>
        </div>
        <div className="relative text-sm mt-1.5 font-semibold">Unlimited generations</div>
        <div className="relative text-xs opacity-90 mt-0.5">{quota.used} videos created</div>
      </div>
    );
  }

  const limit = quota.limit ?? 0;
  const used = quota.used;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const exhausted = limit > 0 && used >= limit;

  return (
    <div className="mx-3 mb-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Free plan</span>
        <span className="text-xs text-slate-300 font-medium">{used} / {limit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            exhausted ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        onClick={onUpgrade}
        className="mt-3 w-full text-xs font-semibold px-3 py-1.5 rounded-lg btn-primary text-white border border-indigo-500/40 transition"
      >
        Upgrade to Pro
      </button>
    </div>
  );
}
