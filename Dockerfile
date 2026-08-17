FROM node:20-alpine

# ffmpeg via apk matches this image's musl libc exactly — no glibc/musl
# mismatch like you'd get pulling a generic "static" Linux binary.
RUN apk add --no-cache ffmpeg python3 py3-pip

# yt-dlp needs python3 to run. Alpine's system pip refuses global installs
# (PEP 668), so it's installed into an isolated venv and symlinked onto PATH.
RUN python3 -m venv /opt/yt-dlp-venv \
    && /opt/yt-dlp-venv/bin/pip install --no-cache-dir --upgrade pip yt-dlp \
    && ln -s /opt/yt-dlp-venv/bin/yt-dlp /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node src ./src

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
