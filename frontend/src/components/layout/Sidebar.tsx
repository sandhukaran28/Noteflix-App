"use client";
import React from "react";
import type { View } from "./AppShell";
import type { Quota } from "@/hooks/useQuota";

const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M10 9l5 3-5 3V9z" />
      </svg>
    ),
  },
  {
    id: "account",
    label: "Account",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <aside className="w-64 shrink-0 border-r border-white/40 bg-white/60 backdrop-blur-md flex flex-col">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#a28ff3] grid place-items-center text-white font-bold">N</div>
          <div>
            <div className="font-semibold leading-none">Noteflix</div>
            <div className="text-xs text-gray-500 mt-0.5">Studio</div>
          </div>
        </div>
      </div>

      <nav className="px-3 flex-1">
        {navItems.map((it) => {
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition ${
                active
                  ? "bg-[#a28ff3] text-white shadow-sm"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              <span className={active ? "text-white" : "text-gray-500"}>{it.icon}</span>
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <QuotaPanel quota={quota} onUpgrade={onUpgrade} />

      <div className="p-3 border-t border-white/60">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="mx-3 mb-3 p-3 rounded-xl bg-white/50 border border-white/60">
        <div className="text-xs text-gray-500">Loading plan…</div>
      </div>
    );
  }

  if (quota.isPro) {
    return (
      <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-br from-[#a28ff3] to-[#7c64ff] text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Pro</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" /></svg>
        </div>
        <div className="text-sm mt-1 font-medium">Unlimited generations</div>
        <div className="text-xs opacity-80 mt-0.5">{quota.used} videos created</div>
      </div>
    );
  }

  const limit = quota.limit ?? 0;
  const used = quota.used;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const exhausted = limit > 0 && used >= limit;

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl bg-white/70 border border-white/60">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Free plan</span>
        <span className="text-xs text-gray-500">{used} / {limit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full transition-all ${exhausted ? "bg-red-400" : "bg-[#a28ff3]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        onClick={onUpgrade}
        className="mt-3 w-full text-xs font-medium px-3 py-1.5 rounded-lg bg-[#a28ff3] text-white hover:opacity-90"
      >
        Upgrade to Pro
      </button>
    </div>
  );
}
