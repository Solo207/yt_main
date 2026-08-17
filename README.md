# Audio service

Stateless HTTP microservice with two endpoints:

- `POST /download` — takes a link, runs yt-dlp + ffmpeg, returns the extracted audio (mp3)
- `POST /convert-ogg` — takes an uploaded audio file, runs ffmpeg, returns it as `.ogg` (mono, Opus, 16kbps — matches WhatsApp voice note requirements)

Nothing is ever written to persistent storage. Each request gets its own
temp directory (`fs.mkdtemp`), and that directory is deleted the instant
the response finishes — whether it succeeded, failed, or the client
disconnected early.

## Deploy to GitHub + EasyPanel

```bash
cd audio-service
git init
git add .
git commit -m "Audio microservice: download + convert-ogg"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

In EasyPanel:

1. **Create Service → App**
2. **Source**: GitHub, select this repo, branch `main`
3. **Build**: Dockerfile, path `/Dockerfile`
4. **Environment**: set the variables below
5. If using `COOKIES_PATH`, add a **Storage** volume mounted at `/app/data` and place `cookies.txt` there (via EasyPanel's file browser/terminal) before or after first deploy
6. **Deploy**

## Environment variables

See `.env.example` for the full list with comments. The important ones:

| Variable | Required | Purpose |
|---|---|---|
| `API_KEY` | Yes | n8n must send this as the `x-api-key` header. Requests without a matching key get `401`. If unset, the service refuses *all* requests (fails closed) rather than running open. |
| `YTDLP_PROXY` | No | Passed to yt-dlp's `--proxy`. Omit to connect directly. |
| `COOKIES_PATH` | No | Path to a mounted `cookies.txt`. Omit to skip cookies entirely. |
| `CONCURRENCY` | No (default 3) | Max simultaneous yt-dlp/ffmpeg processes. Tune to your VPS's core count. |
| `DOWNLOAD_TIMEOUT_MS` / `CONVERT_TIMEOUT_MS` | No | Kill a stuck process after this long. |
| `MAX_UPLOAD_BYTES` | No (default 50MB) | Cap on `/convert-ogg` upload size. |

## Wiring it up in n8n

**Download step** — HTTP Request node:
- Method: `POST`
- URL: `https://<your-service>.easypanel.host/download`
- Headers: `x-api-key: <your API_KEY>`
- Body (JSON): `{ "url": "{{ $json.link }}" }`
- Response Format: **File** (so n8n gets the binary, not text)

**Convert step** — HTTP Request node:
- Method: `POST`
- URL: `https://<your-service>.easypanel.host/convert-ogg`
- Headers: `x-api-key: <your API_KEY>`
- Body: **Form-Data / Multipart**, field name `audio`, value = the binary from the previous node
- Response Format: **File**

## Testing manually

```bash
curl -X POST https://<your-service>.easypanel.host/download \
  -H "x-api-key: <your API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"url":"<some link>"}' \
  -o test.mp3

curl -X POST https://<your-service>.easypanel.host/convert-ogg \
  -H "x-api-key: <your API_KEY>" \
  -F "audio=@test.mp3" \
  -o test.ogg
```

Health check (no API key needed): `GET /health` → `{"status":"ok"}`

## Local development

```bash
npm install
cp .env.example .env   # fill in API_KEY at minimum
npm start
```

Note: `ffmpeg` and `yt-dlp` need to be installed on your local machine
for this to work outside Docker — the Dockerfile handles that for you
in deployment.
