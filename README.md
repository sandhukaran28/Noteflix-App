# Noteflix

**Turn any PDF into a narrated, captioned podcast-style video — automatically.**

Upload a PDF → Noteflix extracts the slides, writes a duet podcast script with **AWS Bedrock (Claude Haiku 4.5)**, narrates it as alternating speakers with **Piper TTS**, burns synced captions onto the video, and renders an MP4 with Ken Burns slide animation. The whole pipeline runs as a single backend container.

---

## Live demo

**https://noteflix-app.vercel.app**

- Sign up with email (Cognito Hosted UI confirms via emailed code)
- Drop a small PDF (1–3 pages works best on a t3.micro backend)
- A 60-second narrated video gets generated and played back inline
- Free tier: 3 generations per account; Pro is a manual Cognito group flip — no Stripe involved

Backend lives at `https://13-211-169-74.nip.io` with an auto-provisioned Let's Encrypt cert via Caddy.

---

## What it does

1. **Sign in** — Cognito Hosted UI (email + password, optional MFA).
2. **Drag-drop a PDF** onto the hero zone.
3. **A job starts automatically** — extract slides, generate duet script via Bedrock, synthesize audio with Piper, encode with FFmpeg, burn captions in.
4. **Watch progress live** — the card flips from `pending` → `running` → `done` in the dashboard, with auto-refresh on tab focus.
5. **Click to play** the generated video inline, or download the MP4 via a presigned S3 URL.

Free tier: 3 lifetime generations. Pro: unlimited (granted manually via a Cognito group — no payment integration).

---

## Architecture

```
┌──────────────┐         HTTPS          ┌─────────────────────────────────┐
│   Browser    │  ────────────────────▶ │  Vercel  (Next.js 16, RSC)      │
│   (user)     │                        │  • Cognito Hosted UI redirect   │
└──────────────┘                        │  • Drag-drop upload, video grid │
                                        └────────────────┬────────────────┘
                                                         │  fetch (Bearer JWT)
                                                         ▼
                                        ┌─────────────────────────────────┐
                                        │  Caddy (auto-HTTPS, nip.io)     │
                                        │  reverse-proxy → :8080          │
                                        └────────────────┬────────────────┘
                                                         │  http (loopback)
                                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                EC2 t3.micro · single Docker container · 768 MB cap       │
│                                                                          │
│   Express API ──┬── auto-trigger ─▶ in-process job runner                │
│                 │                                                        │
│                 │     ┌── pdftoppm/pdftotext (Poppler) ── slides + text  │
│                 │     ├── Bedrock InvokeModel (Claude Haiku 4.5)         │
│                 │     ├── Piper TTS (.onnx) ── narration.wav (duet)      │
│                 │     ├── makeVttFromScript ── timed captions.vtt        │
│                 │     └── FFmpeg ── zoompan + subtitles burn-in ── mp4   │
└──────┬───────────────────┬───────────────────┬───────────────────┬───────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  ┌─────────┐         ┌─────────┐         ┌──────────┐        ┌─────────┐
  │   S3    │         │ Dynamo  │         │ Cognito  │        │ Bedrock │
  │ assets  │         │   DB    │         │ user     │        │ (Claude │
  │ outputs │         │ jobs/   │         │ pool +   │        │  Haiku  │
  │         │         │ assets  │         │ groups   │        │  4.5)   │
  └─────────┘         └─────────┘         └──────────┘        └─────────┘
```

**No separate worker, no SQS, no Redis.** The API process runs jobs inline as background promises. For a single-user portfolio demo, the operational simplicity is worth more than horizontal scalability.

---

## Tech stack

**Backend** — Node.js 20, Express 5, AWS SDK v3, single Docker container with FFmpeg + Poppler + Piper TTS + DejaVu fonts baked in.

**Frontend** — Next.js 16 (App Router, RSC), TypeScript, Tailwind CSS 4. Deployed on Vercel.

**Infra** — AWS EC2 t3.micro (free tier), S3, DynamoDB on-demand, Cognito user pool with `Pro` and `Admin` groups, Bedrock (Claude Haiku 4.5 via `au.` inference profile).

**Edge** — Caddy in a sidecar container handles TLS termination and reverse-proxies to the API. Cert auto-provisioned by Let's Encrypt using TLS-ALPN-01 against `<ip-with-dashes>.nip.io`.

**LLM** — Anthropic Claude Haiku 4.5 via AWS Bedrock cross-region inference profile (~$0.001 per video).

**TTS** — [Piper](https://github.com/rhasspy/piper) (free, local neural TTS). Two voices: Amy (medium) and Ryan (low) for duet "Alex / Sam" narration.

**Video** — FFmpeg with `zoompan` Ken Burns effect, `subtitles` filter for burned-in captions (white text + outline + drop shadow, bottom-centered), 720p balanced profile encoded with libx264 `-preset veryfast -crf 23`.

---

## Notable design choices

- **Auto-trigger on upload.** Uploading a PDF immediately kicks off a background job — no separate "Create Job" click. The endpoint returns `{ assetId, jobId }` and the dashboard polls for status with auto-refresh on tab focus.
- **Single-table DynamoDB.** `userId` partition key (Cognito `sub`) + namespaced `sk` (`ASSET#…`, `JOB#…`, `JOB#…#EVENT#…`) keeps all per-user data colocated and queries cheap.
- **Tiered usage without Stripe.** Quota is enforced server-side by counting non-failed jobs. "Pro" is just membership in a Cognito group, granted manually. UI also disables Pro-only encode profiles for free users; backend silently downgrades anyway as defense in depth.
- **Burned-in captions.** The VTT track is timed proportionally to actual narration length (sentence character count → seconds), then drawn into the pixels by FFmpeg's `subtitles` filter. Reels / TikTok-style readability without any client-side overlay.
- **Presigned S3 URLs for video playback and download.** The backend never proxies the bytes — both the inline `<video>` and the Download button hit `/jobs/:id/output-url`, get a 15-minute presigned URL, and stream directly from S3.
- **Defensive TTS.** Each Piper invocation has a 60-second timeout (kills the child on hang), 0-byte output is treated as failure, and any single segment can fall back to the primary voice. One bad sentence doesn't kill the job.
- **Async shell-outs.** All `pdftoppm` / `pdftotext` / `piper` / `ffprobe` / `ffmpeg` calls are async — the Express event loop stays responsive while heavy CPU work runs.
- **Free tier first.** EC2 free tier (12 mo) + DynamoDB always-free + Cognito always-free + Bedrock pay-per-token = roughly **$0/month for year one** of demo hosting.

---

## Repository layout

```
backend/
  src/
    server.js              # Express bootstrap + /me/quota
    routes/
      assets.js            # PDF upload (auto-triggers a job + returns jobId)
      jobs.js              # Job CRUD, output streaming, presigned URLs
      session.js           # Cognito ID-token cookie shim
    middleware/auth.js     # Cognito JWT verifier
    lib/
      llm.js               # Bedrock InvokeModel wrapper
      jobRunner.js         # Quota check + spawn processJob, Pro-gates encode profiles
      quota.js             # Free/Pro tier logic
      cache.js             # Redis-or-memory cache (in-memory in current deploy)
      config.js            # Env-only config
    worker/
      processor.js         # PDF → slides → script → TTS → ffmpeg+subtitles → S3
    utils/tts.js           # Piper segment synth (timeout, 0-byte detection, fallback)
    utils/wiki.js          # Optional Wikipedia fallback for thin PDFs
  Dockerfile               # Single image: Node + FFmpeg + Poppler + Piper + fonts

frontend/
  src/
    app/                   # Next.js App Router (login, callback, page)
    features/
      home/HeroUpload.tsx          # Drag-drop hero zone, Pro-gates heavy/insane
      jobs/JobsGrid.tsx            # Video-card grid w/ live status, tab-focus refresh
      jobs/VideoCard.tsx           # Per-job thumbnail card
      jobs/JobDetails.tsx          # Modal w/ inline <video>, captions, download button
      account/AccountView.tsx      # Plan + quota bar
      account/UpgradeModal.tsx     # "Email me for Pro" CTA on quota exceeded
      dashboard/Dashboard.tsx      # AppShell + view switcher
    components/layout/             # AppShell, Sidebar (nav + quota panel), TopBar
    components/ui/                 # Button, Card, Select, StatusPill
    hooks/useAuth.ts               # Cognito session
    hooks/useQuota.ts              # /me/quota polling

Caddyfile                  # TLS termination on a single nip.io hostname
docker-compose.yml         # api + caddy services
SETUP.md                   # Full AWS + deploy walkthrough
```

---

## Quick start

Full step-by-step for AWS resource creation, deploying to EC2, and Vercel hookup is in **[SETUP.md](SETUP.md)**.

Local dev TL;DR (assumes AWS resources already exist):

```bash
# 1. Backend env
cp backend/.env.example backend/.env
# fill in S3_BUCKET, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, AWS_REGION, AWS keys

# 2. Frontend env
cat > frontend/.env.local <<'EOF'
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_COGNITO_DOMAIN=https://your-prefix.auth.<region>.amazoncognito.com
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<region>_XXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=<region>
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_LOGOUT_REDIRECT_URI=http://localhost:3000
EOF

# 3. Run (BACKEND_DOMAIN can be omitted locally — Caddy will skip TLS)
docker compose up --build         # api on :8080
cd frontend && npm install && npm run dev   # next on :3000
```

---

## Configuration cheat sheet

| Env var | Purpose | Default |
|---|---|---|
| `S3_BUCKET` | Where assets and outputs live | required |
| `DDB_TABLE` | Single-table DynamoDB name | `noteflix` |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | Auth (public client, no secret) | required |
| `BEDROCK_MODEL_ID` | LLM for script generation | `au.anthropic.claude-haiku-4-5-20251001-v1:0` |
| `BEDROCK_ENABLED` | Disable Bedrock (uses fallback script) | `true` |
| `QUOTA_FREE_LIMIT` | Free tier lifetime job cap | `3` |
| `PRO_GROUP` | Cognito group name for unlimited tier | `Pro` |
| `WEB_ORIGIN` | Comma-separated allowed CORS origins | required |
| `BACKEND_DOMAIN` | Hostname Caddy serves on (e.g. nip.io) | required for compose |
| `PIPER_BIN` / `PIPER_VOICE_A` / `PIPER_VOICE_B` | TTS paths (set by Dockerfile) | bundled |

---

## Limitations (honest)

- **t3.micro is the binding constraint.** A 60-second video for a 1-page PDF takes ~30–60 seconds wall time on the `balanced` profile. Bigger PDFs are linearly slower.
- **`heavy` and `insane` profiles** are gated to Pro because 1080p+ encoding with 2-pass on 1 vCPU is impractically slow.
- **Solo voice mode is disabled** for now — duet uses both Amy + Ryan and concatenates cleanly. Solo had silence-rate artifacts that needed a different fix path.
- **Hard cap of 60 seconds on output duration** keeps the demo affordable and snappy; configurable via the duration param if you self-host.

---

## Cost (after free tier expires)

| Service | Always-free | Year 2+ |
|---|---|---|
| DynamoDB | 25 GB on-demand | $0 at portfolio scale |
| Cognito | 50k MAU | $0 at portfolio scale |
| EC2 t3.micro | 750h/mo for 12 mo | ~$7.50/mo |
| S3 | 5 GB for 12 mo | ~$0.10/mo |
| Bedrock Haiku 4.5 | none | ~$0.001 per video |
| Caddy + Let's Encrypt cert | $0 | $0 |
| **Total** | | **~$8/mo** |

---

## License

MIT — feel free to fork, deploy, and rebrand.
