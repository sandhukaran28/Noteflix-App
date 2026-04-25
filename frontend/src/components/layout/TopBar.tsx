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
    <header className="px-8 py-5 border-b border-white/40 bg-white/40 backdrop-blur-md flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-sm text-gray-600">{username}</div>
        <div className="w-9 h-9 rounded-full bg-[#a28ff3] text-white grid place-items-center text-sm font-semibold">
          {initials}
        </div>
      </div>
    </header>
  );
}
