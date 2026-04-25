"use client";
import { useState } from "react";
import AppShell, { type View } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useQuota } from "@/hooks/useQuota";
import HeroUpload from "@/features/home/HeroUpload";
import JobsGrid from "@/features/jobs/JobsGrid";
import AccountView from "@/features/account/AccountView";
import UpgradeModal from "@/features/account/UpgradeModal";

export default function Dashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const { user } = useAuth();
  const { quota } = useQuota(token);
  const [view, setView] = useState<View>("home");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [upgradeMeta, setUpgradeMeta] = useState<{ used?: number; limit?: number }>({});

  const openUpgrade = () => {
    setUpgradeReason(undefined);
    setUpgradeMeta(quota ? { used: quota.used, limit: quota.limit ?? 0 } : {});
    setUpgradeOpen(true);
  };

  const onQuotaExceeded = (info: { used: number; limit: number; message: string }) => {
    setUpgradeReason(info.message);
    setUpgradeMeta({ used: info.used, limit: info.limit });
    setUpgradeOpen(true);
  };

  const titles: Record<View, { title: string; subtitle: string }> = {
    home: { title: "Home", subtitle: "Drop a PDF and we'll generate a narrated video" },
    library: { title: "Library", subtitle: "All your generated videos" },
    account: { title: "Account", subtitle: "Plan, usage, and profile" },
  };

  const username = user?.username || "you";

  return (
    <>
      <AppShell
        view={view}
        setView={setView}
        username={username}
        quota={quota}
        onLogout={onLogout}
        onUpgrade={openUpgrade}
        pageTitle={titles[view].title}
        pageSubtitle={titles[view].subtitle}
      >
        {view === "home" && (
          <div className="grid gap-8 max-w-6xl">
            <HeroUpload token={token} onQuotaExceeded={onQuotaExceeded} />
            <section>
              <div className="flex items-end justify-between mb-3">
                <h2 className="text-lg font-semibold">Recent generations</h2>
                <button
                  onClick={() => setView("library")}
                  className="text-sm text-[#7c64ff] hover:underline"
                >
                  View all →
                </button>
              </div>
              <JobsGrid token={token} limit={6} />
            </section>
          </div>
        )}

        {view === "library" && (
          <div className="max-w-6xl">
            <JobsGrid token={token} />
          </div>
        )}

        {view === "account" && (
          <AccountView username={username} quota={quota} onUpgrade={openUpgrade} />
        )}
      </AppShell>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        used={upgradeMeta.used}
        limit={upgradeMeta.limit}
        reason={upgradeReason}
      />
    </>
  );
}
