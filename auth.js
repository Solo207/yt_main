function apiKeyAuth(req, res, next) {
  const configuredKey = process.env.API_KEY;

  // Fail closed: if no key is configured, refuse everything rather than
  // silently running open.
  if (!configuredKey) {
    console.error('API_KEY is not set — refusing all requests until configured.');
    return res.status(500).json({ error: 'Server misconfigured: API_KEY not set' });
  }

  const provided = req.header('x-api-key');
  if (!provided || provided !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = { apiKeyAuth };
