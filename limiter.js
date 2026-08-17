const pLimit = require('p-limit');

// Caps how many yt-dlp/ffmpeg processes run at once. Requests beyond this
// wait in a queue instead of all launching simultaneously and overloading
// the VPS's CPU. Tune CONCURRENCY based on core count.
const concurrency = parseInt(process.env.CONCURRENCY || '3', 10);

module.exports = pLimit(concurrency);
