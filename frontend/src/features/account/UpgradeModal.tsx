"use client";
export default function UpgradeModal({
  open,
  onClose,
  used,
  limit,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  used?: number;
  limit?: number;
  reason?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md surface-card rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-6 overflow-hidden">
          <div className="absolute inset-0 dotted-grid opacity-25" />
          <div className="relative flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Upgrade to Pro
            </span>
          </div>
          <h2 className="relative mt-2 text-2xl font-bold tracking-tight">
            Generate unlimited videos
          </h2>
          {typeof limit === "number" && (
            <p className="relative mt-1.5 text-white/90 text-sm">
              You've used {used ?? 0} of {limit} free generations.
            </p>
          )}
        </div>

        <div className="p-6 grid gap-3 text-sm text-slate-300">
          {reason && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-3 py-2">
              {reason}
            </div>
          )}
          <p className="leading-relaxed">
            The free tier includes a small number of generations to keep the demo
            affordable. Pro is available on request — drop me a note and I'll
            flip your account.
          </p>
          <ul className="grid gap-1.5 text-sm">
            {[
              "Unlimited renders",
              "4K encode profiles",
              "Priority queue (when busy)",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-slate-200">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 grid place-items-center border border-indigo-400/30">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
          <a
            href="mailto:sandhukaran2821@gmail.com?subject=Noteflix%20Pro%20access"
            className="btn-primary mt-3 px-4 py-2.5 rounded-lg text-white font-semibold text-center border border-indigo-500/40 transition"
          >
            Email for Pro access
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
