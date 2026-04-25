FROM node:20-bookworm

ENV TMPDIR=/app/tmp
RUN mkdir -p /app/tmp /data

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    python3 python3-pip python3-venv \
    ffmpeg poppler-utils \
    fonts-dejavu-core fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"
RUN pip install --no-cache-dir "piper-tts==1.3.0"

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

RUN mkdir -p /app/models && cd /app/models && \
    curl -LfsS -o en_US-amy-medium.onnx \
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx" && \
    curl -LfsS -o en_US-amy-medium.onnx.json \
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json" && \
    curl -LfsS -o en_US-ryan-high.onnx \
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx" && \
    curl -LfsS -o en_US-ryan-high.onnx.json \
      "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json"

ENV NODE_ENV=production \
    DATA_ROOT=/data \
    PORT=8080 \
    PIPER_BIN=/opt/venv/bin/piper \
    PIPER_VOICE_A=/app/models/en_US-amy-medium.onnx \
    PIPER_VOICE_B=/app/models/en_US-ryan-high.onnx

EXPOSE 8080

CMD ["node", "src/server.js"]
