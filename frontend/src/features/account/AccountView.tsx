"use client";
import type { Quota } from "@/hooks/useQuota";
import { Button } from "@/components/ui/Button";

export default function AccountView({
  username,
  quota,
  onUpgrade,
}: {
  username: string;
  quota: Quota | null;
  onUpgrade: () => void;
}) {
  const initials = (username || "?").slice(0, 2).toUpperCase();
  const limit = quota?.limit ?? 0;
  const used = quota?.used ?? 0;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit || 1)) * 100));

  return (
    <div className="max-w-3xl grid gap-5">
      {/* Profile */}
      <div className="surface-card rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center text-lg font-bold shadow-lg shadow-indigo-900/40 ring-1 ring-white/10">
            {initials}
          </div>
          <div>
            <div className="font-semibold text-lg text-white tracking-tight">{username}</div>
            <div className="text-sm text-slate-400">Signed in via Amazon Cognito</div>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="surface-card rounded-2xl p-6 relative overflow-hidden">
        {quota?.isPro && (
          <>
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-violet-500/15 rounded-full blur-3xl" />
          </>
        )}
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Current plan
            </div>
            <div className="text-2xl font-bold text-white mt-1 tracking-tight">
              {quota?.plan || "—"}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {quota?.isPro
                ? "Unlimited generations · highest encode profiles"
                : "3 free generations · balanced profile"}
            </div>
          </div>
          {quota?.isPro ? (
            <span className="px-3 py-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-indigo-900/40 inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" />
              </svg>
              Pro
            </span>
          ) : (
            <Button onClick={onUpgrade}>Upgrade</Button>
          )}
        </div>

        {quota && !quota.isPro && (
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Generations used</span>
              <span className="font-semibold text-white">
                {used} / {limit}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Failed jobs don't count against your quota.
            </div>
          </div>
        )}

        {quota?.isPro && (
          <div className="relative mt-5 text-sm text-slate-300">
            You've created <b className="text-white">{used}</b> videos — no limit on Pro.
            Thanks for trying it out.
          </div>
        )}
      </div>
    </div>
  );
}
