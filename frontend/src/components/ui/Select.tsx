"use client";
import React from "react";

export function Select({
  label,
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && (
        <span className="text-slate-200 font-medium text-[13px]">{label}</span>
      )}
      <div className="relative">
        <select
          {...props}
          className={`appearance-none w-full px-3.5 py-2.5 pr-10 rounded-lg border border-white/10 bg-white/[0.04] text-white transition-colors duration-150 focus:outline-none focus:border-indigo-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/25 ${className}`}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </label>
  );
}
