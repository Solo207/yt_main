const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { runProcess } = require('../lib/runProcess');
const { createWorkspace } = require('../lib/workspace');
const limiter = require('../lib/limiter');

const router = express.Router();

// Creates the per-request workspace before multer writes the upload, so
// the uploaded file and the ffmpeg output land in the same directory and
// get cleaned up together.
async function attachWorkspace(req, res, next) {
  try {
    const workspace = await createWorkspace();
    req.workspace = workspace;
    res.on('finish', () => workspace.cleanup());
    res.on('close', () => workspace.cleanup());
    next();
  } catch (err) {
    next(err);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, req.workspace.dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `input${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || String(50 * 1024 * 1024), 10) },
});

router.post('/convert-ogg', attachWorkspace, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing "audio" file in form-data' });
  }

  const inputPath = req.file.path;
  const outputPath = path.join(req.workspace.dir, 'output.ogg');

  try {
    const args = ['-i', inputPath, '-c:a', 'libopus', '-ac', '1', '-b:a', '16k', outputPath, '-y'];

    const timeoutMs = parseInt(process.env.CONVERT_TIMEOUT_MS || '120000', 10);
    await limiter(() => runProcess('ffmpeg', args, { timeoutMs }));

    if (!fs.existsSync(outputPath)) {
      throw new Error('ffmpeg did not produce an output file');
    }

    res.setHeader('Content-Type', 'audio/ogg');
    res.setHeader('Content-Disposition', 'attachment; filename="audio.ogg"');
    fs.createReadStream(outputPath).pipe(res);
  } catch (err) {
    console.error('Conversion failed:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to convert audio' });
    } else {
      res.end();
    }
  }
});

module.exports = router;
