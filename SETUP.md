# Noteflix — Setup & Deploy Guide

End-to-end steps for deploying Noteflix on personal AWS, with the frontend on Vercel.
The architecture is one backend (EC2) + one frontend (Vercel). No separate worker, no SQS.

---

## 0. First, set a billing alarm. ($100 in credits can vanish faster than you think.)

1. **Console → Billing → Budgets → Create budget**
2. Pick "Customize (advanced)", monthly cost budget, **$5**.
3. Email yourself when forecast crosses 100%.
4. Save. Now you'll get warned long before you blow the credits.

---

## 1. Create AWS resources (Console)

### 1a. S3 bucket
- **Console → S3 → Create bucket**
- Name: `your-noteflix-<something-unique>` (must be globally unique)
- Region: pick one close to you (the rest of the resources go in the same region)
- Block all public access: **leave on**
- Create.
- (Optional) Set a CORS policy if you ever serve directly from the bucket. Not needed for now — backend presigns.

### 1b. DynamoDB table
- **Console → DynamoDB → Create table**
- Table name: `noteflix`
- Partition key: `userId` (String)
- Sort key: `sk` (String)
- Capacity: **On-demand** (free-tier 25 GB always-free)
- Create.

### 1c. Cognito user pool
- **Console → Cognito → User pools → Create user pool**
- Sign-in: Email
- Password: keep defaults
- MFA: Optional or off (for portfolio simplicity)
- Self-service sign-up: enabled
- Required attributes: `email`
- App client: **Public client** (no secret)
- Hosted UI:
  - Domain: pick a prefix like `noteflix-yourname`
  - Allowed callback URLs: `https://your-frontend.vercel.app/auth/callback,http://localhost:3000/auth/callback`
  - Allowed sign-out URLs: `https://your-frontend.vercel.app,http://localhost:3000`
  - OAuth grant types: Authorization code, Implicit
  - OAuth scopes: openid, email, profile
- Create. Note **User Pool ID** and **App Client ID** — you'll need them.

### 1d. Bedrock model access
- AWS retired the explicit "Model access" page. Serverless foundation models are auto-enabled when first invoked. For Anthropic models, you may need to fill out a one-time use-case form before first invocation — Console → Bedrock → Model catalog → pick a Claude model → "Request access" if prompted.
- Default model is **Claude Haiku 4.5** via the regional inference profile. The exact ID per region:
  - Sydney (`ap-southeast-2`): `au.anthropic.claude-haiku-4-5-20251001-v1:0`
  - US East / global: `us.anthropic.claude-haiku-4-5-20251001-v1:0` or `global.anthropic.claude-haiku-4-5-20251001-v1:0`
- To list what's active in your region: `aws bedrock list-inference-profiles --region <region> --query "inferenceProfileSummaries[?contains(inferenceProfileId,\`haiku\`)]"`

### 1e. IAM role for EC2
- **Console → IAM → Roles → Create role**
- Trusted entity: AWS service → EC2
- Permissions: attach **inline policy** with this JSON (replace `your-noteflix-bucket` and `noteflix` with your real names):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-noteflix-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::your-noteflix-bucket"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/noteflix"
    },
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-*",
        "arn:aws:bedrock:*:*:inference-profile/*anthropic.claude-haiku-*"
      ]
    }
  ]
}
```

- Name: `NoteflixEC2Role`. Save.

---

## 2. Launch EC2 (free-tier)

- **Console → EC2 → Launch instance**
- Name: `noteflix-api`
- AMI: **Amazon Linux 2023** (or **Ubuntu 22.04 LTS**)
- Instance type: **t3.micro** (free tier 750h/month for 12 months)
- Key pair: create one and download the .pem
- Network:
  - VPC: default
  - Subnet: any default
  - Auto-assign public IP: **Enable**
  - Security group: create new, allow:
    - SSH (22) from My IP
    - HTTP (80) from Anywhere
    - Custom TCP **8080** from Anywhere (the API port)
- Storage: 20 GB gp3
- **Advanced details → IAM instance profile**: select `NoteflixEC2Role`
- Launch.
- Note the **public IP** or **public DNS**.

> ⚠️ **Don't add a NAT Gateway** — it's $32/month idle. The default public-subnet setup is free.

### Connect & install Docker

```bash
ssh -i your-key.pem ec2-user@<public-ip>     # Amazon Linux
# or: ssh -i your-key.pem ubuntu@<public-ip>  # Ubuntu

sudo dnf install -y docker git    # Amazon Linux 2023
# or on Ubuntu: sudo apt update && sudo apt install -y docker.io git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
exit && ssh back in   # to pick up docker group
```

Install docker compose plugin:

```bash
sudo dnf install -y docker-compose-plugin || \
  (DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker} && \
   mkdir -p $DOCKER_CONFIG/cli-plugins && \
   curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
     -o $DOCKER_CONFIG/cli-plugins/docker-compose && \
   chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose)
```

---

## 3. Deploy backend on EC2

```bash
git clone https://github.com/<you>/Noteflix.git
cd Noteflix
cp backend/.env.example backend/.env
nano backend/.env       # fill in S3_BUCKET, COGNITO_*, AWS_REGION, etc.
docker compose up -d --build
docker compose logs -f api
```

Test:

```bash
curl http://<public-ip>:8080/healthz
# → {"ok":true}
```

The first build pulls Piper TTS voices (~150 MB) so the initial `up` takes 5–10 minutes.

> **Note on RAM:** t3.micro has 1 GB. The "balanced" encode profile works. "heavy" / "insane" will likely OOM — bump to t3.small ($15/mo from credits) if you need them.

### Optional: HTTPS via Caddy

To avoid mixed-content errors when Vercel (HTTPS) calls the EC2 backend (HTTP):

```bash
# point a subdomain (e.g. api.your-domain.com) at the EC2 public IP via DNS
docker run -d --name caddy --restart=always \
  -p 80:80 -p 443:443 \
  -v caddy_data:/data \
  caddy:2 caddy reverse-proxy --from api.your-domain.com --to localhost:8080
```

If you don't have a domain, skip this and call the backend over HTTP from the Vercel frontend in dev. For prod, get a free domain (Cloudflare, Namecheap student) and run Caddy.

---

## 4. Deploy frontend to Vercel

1. Push the repo to GitHub.
2. **vercel.com → New Project → Import** the repo.
3. Root directory: `frontend`
4. Framework: Next.js (auto-detected)
5. Environment Variables (Settings → Environment Variables):

```
NEXT_PUBLIC_API_BASE_URL=http://<ec2-public-ip>:8080/api/v1
NEXT_PUBLIC_COGNITO_DOMAIN=https://noteflix-yourname.auth.<region>.amazoncognito.com
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<your pool id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<your client id>
NEXT_PUBLIC_AWS_REGION=<your region>
NEXT_PUBLIC_REDIRECT_URI=https://<your-vercel-url>/auth/callback
NEXT_PUBLIC_LOGOUT_REDIRECT_URI=https://<your-vercel-url>
NEXT_PUBLIC_COGNITO_ADMIN_GROUP=Admin
```

6. Deploy.
7. Once live, copy the Vercel URL back into your **Cognito app client → Allowed callback / sign-out URLs** if you used a placeholder earlier.

---

## 5. First run / sanity check

1. Visit `https://<your-vercel-url>` → should redirect to Cognito Hosted UI.
2. Sign up, confirm via email link.
3. After login, upload a small PDF (1–2 pages).
4. **A job kicks off automatically** — watch JobsTable on the right.
5. When status flips to `done`, click **Output** to download the MP4.

If the job goes to `failed`, hit `/api/v1/jobs/<id>/logs` to see ffmpeg/Bedrock errors.

---

## 6. Local dev

```bash
cd backend
cp .env.example .env
# set DEV_USER_ID=local-dev to skip Cognito locally if you want
docker compose up --build
# in another terminal:
cd ../frontend && npm install && npm run dev
```

---

## 7. What changed from the QUT version

- Dropped: SQS, separate worker container, Ollama, Redis, nginx proxy, SSM/Secrets Manager config loader, `n11845619` and QUT email PK
- DynamoDB partition key: `qut-username` → `userId` (Cognito sub)
- Script generation: stubbed Ollama call → real **Bedrock Claude 3 Haiku**
- Upload endpoint **auto-triggers a job** — no separate "Create Job" step needed
- Frontend Dockerfile bug fixed (was running `worker.js` instead of the Next server)
- Single backend container with FFmpeg + Piper baked in

---

## 8. Costs to watch (after credits)

| Service | Free-tier (always) | After credits |
|---|---|---|
| DynamoDB | 25 GB | $0 portfolio scale |
| Cognito | 50k MAU | $0 portfolio scale |
| S3 | 5 GB (12 mo) | ~$0.10/mo |
| EC2 t3.micro | 750h/mo (12 mo) | ~$7.50/mo |
| Bedrock Haiku | none | ~$0.001 per video |
| Data transfer out | 100 GB free (12 mo) | $0.09/GB |

Year-1 = **$0**. Year-2+ ≈ **~$8/mo** if you keep it on.
