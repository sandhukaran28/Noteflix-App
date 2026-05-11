"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const FEATURES = [
  {
    title: "Upload anything",
    desc: "Drop in a PDF, paper, slide deck or report. We handle the rest end-to-end.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    title: "AI scripting & narration",
    desc: "Models generate a structured script and natural-sounding voiceover grounded in your content.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="23" />
      </svg>
    ),
  },
  {
    title: "Cinematic rendering",
    desc: "Ken Burns motion, smart cuts, and pro encode profiles up to 4K — rendered in the cloud.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    title: "Wikipedia enrichment",
    desc: "Pull in authoritative context automatically to deepen the narrative.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    title: "Background processing",
    desc: "Queue, monitor, and retry jobs from a clean dashboard with live logs.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: "Secure by default",
    desc: "Auth with Cognito, signed download URLs, and per-user quotas out of the box.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

const STEPS = [
  { n: "01", title: "Upload", desc: "Drag in a PDF or pick from your library." },
  { n: "02", title: "Configure", desc: "Choose encode profile and (optionally) an enrichment topic." },
  { n: "03", title: "Generate", desc: "We script, narrate, and render — you get a shareable MP4." },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white font-bold shadow-lg shadow-indigo-900/40">
            N
          </div>
          <div className="font-semibold tracking-tight text-white">Noteflix</div>
        </div>
        <nav className="hidden sm:flex items-center gap-7 text-sm text-slate-300">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push("/login")}>
            Sign in
          </Button>
          <Button onClick={() => router.push("/login?mode=register")}>
            Get started
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Now generating videos with AI
        </div>

        <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.05]">
          Turn PDFs into
          <br />
          <span className="gradient-text">cinematic videos.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-300/90 leading-relaxed">
          Noteflix scripts, narrates, and renders polished videos from your
          source material — so research, study notes, and reports become
          something you'd actually want to watch.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => router.push("/login?mode=register")}>
            Start for free
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/login")}>
            Sign in
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-500">No credit card · 3 free videos on the Free plan</p>

        {/* Hero showcase */}
        <div className="relative mt-16 mx-auto max-w-5xl">
          <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-fuchsia-500/20 rounded-3xl blur-2xl opacity-60" />
          <div className="relative rounded-2xl overflow-hidden border border-white/10 glass-card aspect-video">
            <div className="absolute inset-0 dotted-grid opacity-50" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="w-20 h-20 rounded-full bg-white/90 grid place-items-center shadow-2xl">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-indigo-600 ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur text-xs text-white border border-white/10">
                Demo · machine-learning-fundamentals.pdf
              </div>
              <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur text-xs text-white border border-white/10">
                01:47 / 03:12
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-[0.18em] text-indigo-300 font-semibold">Features</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-white tracking-tight">
            Everything you need to ship a video
          </h2>
          <p className="mt-4 text-slate-400 leading-relaxed">
            Built on a modern AWS-backed stack. Designed to feel fast, look polished,
            and stay out of your way.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group surface-card rounded-2xl p-6 transition-all duration-200 hover:border-indigo-500/30 hover:bg-white/[0.02] hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-400/20 grid place-items-center text-indigo-300 group-hover:bg-indigo-500/15 transition">
                {f.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-[0.18em] text-indigo-300 font-semibold">How it works</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-white tracking-tight">
            Three steps from PDF to MP4
          </h2>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="surface-card rounded-2xl p-6">
              <div className="text-3xl font-bold gradient-text">{s.n}</div>
              <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="surface-card rounded-3xl p-10 md:p-14 relative overflow-hidden">
          <div className="absolute -top-20 -right-10 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Start free. Go Pro when you're ready.
              </h2>
              <p className="mt-4 text-slate-300/90 leading-relaxed">
                Every new account ships with three free renders. Need more?
                Pro unlocks unlimited generations and the heaviest encode profiles.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => router.push("/login?mode=register")}>
                  Create your account
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push("/login")}>
                  I already have one
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl p-5 border border-white/10 bg-white/[0.02]">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Free</div>
                <div className="mt-2 text-3xl font-bold text-white">$0</div>
                <div className="text-xs text-slate-500">forever</div>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-300">
                  <li>3 video generations</li>
                  <li>Balanced encode profile</li>
                  <li>Wikipedia enrichment</li>
                </ul>
              </div>
              <div className="rounded-2xl p-5 border border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 relative">
                <div className="absolute -top-2 right-3 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                  Pro
                </div>
                <div className="text-xs uppercase tracking-wide text-indigo-300 font-semibold">Pro</div>
                <div className="mt-2 text-3xl font-bold text-white">On request</div>
                <div className="text-xs text-slate-400">just ask</div>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-200">
                  <li>Unlimited generations</li>
                  <li>4K encode profiles</li>
                  <li>Priority queue</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white font-bold text-sm">
              N
            </div>
            <span className="text-sm text-slate-400">© {new Date().getFullYear()} Noteflix</span>
          </div>
          <p className="text-xs text-slate-500">
            Built with AWS, Next.js & FFmpeg.
          </p>
        </div>
      </footer>
    </div>
  );
}
