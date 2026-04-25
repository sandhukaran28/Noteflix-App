"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Quota = {
  used: number;
  limit: number | null;
  remaining: number | null;
  isPro: boolean;
  plan: "Free" | "Pro";
};

export function useQuota(token: string) {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = await api<Quota>("/me/quota", { token });
      setQuota(q);
    } catch {
      // ignore — quota is best-effort UI hint
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onRefresh = () => refresh();
    window.addEventListener("jobs:refresh", onRefresh);
    window.addEventListener("quota:refresh", onRefresh);
    return () => {
      window.removeEventListener("jobs:refresh", onRefresh);
      window.removeEventListener("quota:refresh", onRefresh);
    };
  }, [refresh]);

  return { quota, loading, refresh };
}
