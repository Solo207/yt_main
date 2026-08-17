require('dotenv').config();

const express = require('express');
const { apiKeyAuth } = require('./middleware/auth');
const downloadRoute = require('./routes/download');
const convertOggRoute = require('./routes/convertOgg');

const app = express();
app.use(express.json());

// Unauthenticated so EasyPanel's health checks don't need the API key.
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(apiKeyAuth);
app.use(downloadRoute);
app.use(convertOggRoute);

// Catches anything unhandled (including multer errors like file-too-large)
// so the process never crashes on a bad request.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Audio service listening on port ${port}`);
  if (!process.env.API_KEY) {
    console.warn('WARNING: API_KEY is not set — every request will be rejected until it is configured.');
  }
  if (!process.env.YTDLP_PROXY) {
    console.warn('NOTE: YTDLP_PROXY is not set — yt-dlp will connect directly, without a proxy.');
  }
});
