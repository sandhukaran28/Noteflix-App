"use client";
import React from "react";

type Variant = "primary" | "ghost" | "danger" | "outline" | "secondary";
type Size = "sm" | "md" | "lg";

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  title,
}: React.PropsWithChildren<{
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  className?: string;
  title?: string;
}>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 border focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F1A] disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes: Record<Size, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };

  const styles: Record<Variant, string> = {
    primary:
      "btn-primary text-white border-indigo-500/40 hover:-translate-y-px active:translate-y-0",
    secondary:
      "bg-white/[0.06] text-white border-white/10 hover:bg-white/[0.10] hover:border-white/20",
    ghost:
      "bg-transparent text-slate-300 border-transparent hover:bg-white/[0.06] hover:text-white",
    danger:
      "bg-red-600 text-white border-red-500/60 hover:bg-red-500 shadow-[0_8px_24px_-8px_rgba(239,68,68,0.55)]",
    outline:
      "bg-transparent text-slate-200 border-white/15 hover:bg-white/[0.06] hover:border-white/25",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
