"use client";
import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import type { Quota } from "@/hooks/useQuota";

export type View = "home" | "library" | "account";

export default function AppShell({
  view,
  setView,
  username,
  quota,
  onLogout,
  onUpgrade,
  children,
  pageTitle,
  pageSubtitle,
}: React.PropsWithChildren<{
  view: View;
  setView: (v: View) => void;
  username: string;
  quota: Quota | null;
  onLogout: () => void;
  onUpgrade: () => void;
  pageTitle: string;
  pageSubtitle?: string;
}>) {
  return (
    <div className="min-h-screen flex">
      <Sidebar
        view={view}
        setView={setView}
        quota={quota}
        onUpgrade={onUpgrade}
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={pageTitle} subtitle={pageSubtitle} username={username} />
        <main className="flex-1 px-8 py-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
