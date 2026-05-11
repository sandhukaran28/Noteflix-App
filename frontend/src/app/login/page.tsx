"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

type Mode = "login" | "register" | "confirm" | "mfa";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh grid place-items-center p-6 text-sm text-slate-400">
          Loading…
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}

function AuthPageInner() {
  const { login, register, confirm, resendCode, completeMfa, ready, token } =
    useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [mfaPending, setMfaPending] = useState<
    import("@/hooks/useAuth").MfaPending | null
  >(null);

  const title = useMemo(() => {
    switch (mode) {
      case "register":
        return "Create your account";
      case "confirm":
        return "Confirm your email";
      case "mfa":
        return "Verify it's you";
      default:
        return "Welcome back";
    }
  }, [mode]);

  const subtitle = useMemo(() => {
    switch (mode) {
      case "register":
        return "Start turning PDFs into videos in minutes.";
      case "confirm":
        return "Enter the 6-digit code we just emailed you.";
      case "mfa":
        return "We've sent a one-time code to your email.";
      default:
        return "Sign in to your Noteflix workspace.";
    }
  }, [mode]);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "register" || modeParam === "confirm" || modeParam === "mfa") {
      setMode(modeParam as Mode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (ready && token) router.replace("/");
  }, [ready, token, router]);

  const clearAlerts = () => {
    setErr("");
    setMsg("");
  };

  const handleLogin = async () => {
    clearAlerts();
    setBusy(true);
    try {
      const res = await login(email, password);
      if (res && (res as any).mfaRequired) {
        setMfaPending(res as any);
        setMode("mfa");
        setMsg("Enter the 6-digit code we emailed you.");
        return;
      }
      router.push("/");
    } catch (e: any) {
      if (e?.code === "UserNotConfirmedException") {
        setMode("confirm");
        setMsg("Please confirm your email to continue.");
      } else {
        setErr(e?.message ?? "Failed to sign in");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    clearAlerts();
    setBusy(true);
    try {
      await register(email, password, email);
      setMsg("Account created. Check your email for the confirmation code.");
      setMode("confirm");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to sign up");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    clearAlerts();
    setBusy(true);
    try {
      await confirm(email, code);
      setMsg("Email confirmed. You can now sign in.");
      setMode("login");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to confirm code");
    } finally {
      setBusy(false);
    }
  };

  const handleMfa = async () => {
    if (!mfaPending) return;
    clearAlerts();
    setBusy(true);
    try {
      await completeMfa(mfaPending, code.trim());
      router.push("/");
    } catch (e: any) {
      setErr(e?.message ?? "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  };

  const handleResendMfa = async () => {
    clearAlerts();
    if (!email || !password) {
      setErr("Enter your email and password first.");
      return;
    }
    setBusy(true);
    try {
      const res = await login(email, password);
      if (res && (res as any).mfaRequired) {
        setMfaPending(res as any);
        setMsg("Code re-sent. Check your inbox.");
      } else {
        router.push("/");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Couldn't resend code");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") return handleLogin();
    if (mode === "register") return handleRegister();
    if (mode === "confirm") return handleConfirm();
    if (mode === "mfa") return handleMfa();
  };

  if (!ready || token) {
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  const ctaText = busy
    ? mode === "login"
      ? "Signing in…"
      : mode === "register"
      ? "Creating account…"
      : mode === "confirm"
      ? "Confirming…"
      : "Verifying…"
    : mode === "login"
    ? "Sign in"
    : mode === "register"
    ? "Create account"
    : mode === "confirm"
    ? "Confirm"
    : "Verify";

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <Analytics />

      {/* Left: Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 auth-hero overflow-hidden">
        <div className="absolute inset-0 dotted-grid opacity-40 pointer-events-none" />

        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white font-bold shadow-lg shadow-indigo-900/40">
            N
          </div>
          <div className="font-semibold tracking-tight text-white">Noteflix</div>
        </div>

        <div className="relative max-w-md">
          <span className="inline-block text-[11px] uppercase tracking-[0.18em] text-indigo-200/80 font-semibold mb-4">
            Studio · v1
          </span>
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
            Turn dense PDFs into <span className="gradient-text">cinematic videos</span> — automatically.
          </h2>
          <p className="mt-4 text-slate-300/90 leading-relaxed">
            Upload a paper, slide deck, or report. Noteflix scripts, narrates,
            and renders a polished video you can share in minutes.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-slate-200/90">
            {[
              "AI-generated scripts grounded in your source material",
              "Wikipedia enrichment for deeper context",
              "Pro-grade encoding profiles up to 4K",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 grid place-items-center border border-indigo-400/30">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-slate-400/80">
          © {new Date().getFullYear()} Noteflix · Built with AWS, Next.js & FFmpeg
        </div>
      </aside>

      {/* Right: Form */}
      <section className="flex flex-col">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white font-bold">
            N
          </div>
          <div className="font-semibold tracking-tight text-white">Noteflix</div>
        </div>

        <div className="flex-1 grid place-items-center px-6 py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
            <p className="text-sm text-slate-400 mt-2">{subtitle}</p>

            <form onSubmit={onSubmit} className="mt-8 grid gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              {(mode === "login" || mode === "register") && (
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
              )}

              {mode === "confirm" && (
                <Input
                  label="Confirmation code"
                  placeholder="6-digit code"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              )}

              {mode === "mfa" && (
                <Input
                  label="One-time code"
                  placeholder="6-digit code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              )}

              {err && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-3 py-2">
                  {err}
                </div>
              )}
              {msg && !err && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-sm px-3 py-2">
                  {msg}
                </div>
              )}

              <Button type="submit" disabled={busy} size="lg" className="w-full mt-1">
                {ctaText}
              </Button>
            </form>

            <div className="mt-6 grid gap-2 text-sm">
              {mode !== "login" && (
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition text-left"
                  onClick={() => {
                    clearAlerts();
                    setMode("login");
                  }}
                  disabled={busy}
                >
                  ← Back to sign in
                </button>
              )}

              {mode === "login" && (
                <p className="text-slate-400">
                  New to Noteflix?{" "}
                  <button
                    type="button"
                    className="text-indigo-300 hover:text-indigo-200 font-medium transition"
                    onClick={() => {
                      clearAlerts();
                      setMode("register");
                    }}
                    disabled={busy}
                  >
                    Create an account
                  </button>
                </p>
              )}

              {mode === "register" && (
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition text-left"
                  onClick={() => {
                    clearAlerts();
                    setMode("confirm");
                  }}
                  disabled={busy}
                >
                  Already registered? Enter confirmation code →
                </button>
              )}

              {mode === "confirm" && (
                <button
                  type="button"
                  className="text-indigo-300 hover:text-indigo-200 transition text-left"
                  onClick={() => resendCode(email)}
                  disabled={busy || !email}
                  title={!email ? "Enter your email above first" : ""}
                >
                  Resend confirmation code
                </button>
              )}

              {mode === "mfa" && (
                <button
                  type="button"
                  className="text-indigo-300 hover:text-indigo-200 transition text-left"
                  onClick={handleResendMfa}
                  disabled={busy || !email || !password}
                  title={
                    !email || !password
                      ? "Enter your email & password above first"
                      : ""
                  }
                >
                  Didn't get the code? Resend
                </button>
              )}
            </div>

            <p className="mt-10 text-[11px] text-slate-500 text-center">
              By continuing you agree to our terms and acknowledge our privacy policy.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
