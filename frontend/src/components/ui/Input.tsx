"use client";
import React from "react";

export function Input({
  label,
  hint,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && (
        <span className="text-slate-200 font-medium text-[13px]">{label}</span>
      )}
      <input
        {...props}
        className={`px-3.5 py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-slate-500 transition-colors duration-150 focus:outline-none focus:border-indigo-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/25 ${className}`}
      />
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
