const { spawn } = require('child_process');

/**
 * Runs a command as a child process and resolves with its stdout/stderr.
 * Rejects on a non-zero exit code, a spawn error, or a timeout (in which
 * case the process is killed).
 */
function runProcess(command, args, { timeoutMs = 5 * 60 * 1000, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`${command} timed out after ${timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        // Keep only the tail of stderr — enough to debug, not enough to
        // dump megabytes of yt-dlp/ffmpeg output into logs.
        reject(new Error(`${command} exited with code ${code}: ${stderr.slice(-2000)}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

module.exports = { runProcess };
