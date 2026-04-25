"use client";
import type { Quota } from "@/hooks/useQuota";

export default function AccountView({
  username,
  quota,
  onUpgrade,
}: {
  username: string;
  quota: Quota | null;
  onUpgrade: () => void;
}) {
  return (
    <div className="max-w-2xl grid gap-5">
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#a28ff3] text-white grid place-items-center text-xl font-semibold">
            {(username || "?").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-lg">{username}</div>
            <div className="text-sm text-gray-500">Signed in via Cognito</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Plan</div>
            <div className="text-xl font-semibold mt-1">{quota?.plan || "—"}</div>
          </div>
          {quota?.isPro ? (
            <span className="px-3 py-1.5 rounded-full bg-gradient-to-br from-[#a28ff3] to-[#7c64ff] text-white text-xs font-semibold">
              Pro
            </span>
          ) : (
            <button
              onClick={onUpgrade}
              className="px-4 py-2 rounded-xl bg-[#a28ff3] text-white text-sm font-medium hover:opacity-90"
            >
              Upgrade
            </button>
          )}
        </div>
        {quota && !quota.isPro && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Generations used</span>
              <span className="font-medium">{quota.used} / {quota.limit}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-[#a28ff3]"
                style={{ width: `${Math.min(100, (quota.used / Math.max(1, quota.limit ?? 1)) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Failed jobs don't count against your quota.
            </div>
          </div>
        )}
        {quota?.isPro && (
          <div className="mt-4 text-sm text-gray-600">
            You've created <b>{quota.used}</b> videos with no limit. Thanks for trying Pro.
          </div>
        )}
      </div>
    </div>
  );
}
