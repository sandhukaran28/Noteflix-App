"use client";

export default function TopBar({
  title,
  subtitle,
  username,
}: {
  title: string;
  subtitle?: string;
  username: string;
}) {
  const initials = (username || "?").slice(0, 2).toUpperCase();
  return (
    <header className="px-8 py-5 border-b border-white/5 bg-[#0B0F1A]/70 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-white truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <div className="text-sm text-white font-medium leading-tight">
            {username}
          </div>
          <div className="text-[11px] text-slate-500 leading-tight">Signed in</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center text-sm font-bold shadow-lg shadow-indigo-900/40 ring-1 ring-white/10">
          {initials}
        </div>
      </div>
    </header>
  );
}
