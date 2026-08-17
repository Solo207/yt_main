const fs = require('fs/promises');
const os = require('os');
const path = require('path');

/**
 * Creates a unique temp directory for a single request. cleanup() removes
 * it and everything inside it — safe to call more than once, only the
 * first call actually does anything.
 */
async function createWorkspace() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-svc-'));
  let cleaned = false;

  return {
    dir,
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      await fs.rm(dir, { recursive: true, force: true }).catch((err) => {
        console.error(`Failed to clean up ${dir}:`, err.message);
      });
    },
  };
}

module.exports = { createWorkspace };
