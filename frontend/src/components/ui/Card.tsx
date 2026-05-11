"use client";
import React from "react";

export const Card = ({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) => (
  <div
    className={`surface-card rounded-2xl shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)] ${className}`}
  >
    {children}
  </div>
);

export const CardHeader = ({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) => (
  <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
      )}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

export const CardBody = ({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) => (
  <div className={`p-6 ${className}`}>{children}</div>
);
