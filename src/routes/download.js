const express = require('express');
const fs = require('fs');
const path = require('path');
const { runProcess } = require('../lib/runProcess');
const { createWorkspace } = require('../lib/workspace');
const limiter = require('../lib/limiter');

const router = express.Router();

router.post('/download', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing "url" in request body' });
  }

  const workspace = await createWorkspace();

  // Whatever happens — success, error, or the client disconnecting mid
  // response — the workspace gets deleted the moment the response ends.
  res.on('finish', () => workspace.cleanup());
  res.on('close', () => workspace.cleanup());

  try {
const args = [
  '-x', '--audio-format', 'mp3',
  '--js-runtimes', 'node',
  '--remote-components', 'ejs:github',
];
    
    if (process.env.YTDLP_PROXY) {
      args.push('--proxy', process.env.YTDLP_PROXY);
    }
    if (process.env.COOKIES_PATH) {
      args.push('--cookies', process.env.COOKIES_PATH);
    }

    args.push('--print', 'after_move:filepath');
    args.push('-o', path.join(workspace.dir, '%(title)s.%(ext)s'));
    args.push(url);

    const timeoutMs = parseInt(process.env.DOWNLOAD_TIMEOUT_MS || '300000', 10);
    const { stdout } = await limiter(() => runProcess('yt-dlp', args, { timeoutMs }));

    const filePath = stdout.trim().split('\n').pop();
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('yt-dlp did not report an output file');
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Error streaming file:', err.message);
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Download failed:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to download or extract audio' });
    } else {
      res.end();
    }
  }
});

module.exports = router;
