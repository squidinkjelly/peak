// Simple single-password gate. Set APP_PASSWORD env var to enable.
// If APP_PASSWORD is unset, the gate is disabled (useful for local dev).
const PASSWORD = process.env.APP_PASSWORD;

module.exports = function auth(req, res, next) {
  if (!PASSWORD) return next(); // gate disabled

  // Allow static assets without auth
  if (req.path.startsWith('/uploads/') || req.path.startsWith('/assets/') || req.path === '/favicon.ico') {
    return next();
  }

  // Check session cookie
  const cookie = req.headers.cookie || '';
  if (cookie.split(';').some(c => c.trim() === `peak_auth=${PASSWORD}`)) {
    return next();
  }

  // Login form POST
  if (req.method === 'POST' && req.path === '/__login') {
    const body = req.body || {};
    if (body.password === PASSWORD) {
      res.setHeader('Set-Cookie', `peak_auth=${PASSWORD}; HttpOnly; SameSite=Strict; Path=/`);
      return res.redirect('/');
    }
    return res.status(401).send(loginPage('Incorrect password.'));
  }

  // Serve login page for all GET requests
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.status(200).send(loginPage());
  }

  // Block API calls without auth
  return res.status(401).json({ error: 'Unauthorized' });
};

function loginPage(error = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Peak · Sign In</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Helvetica, Arial, sans-serif; background: #111; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .card { background: #fff; color: #111; padding: 40px; width: 100%; max-width: 360px; }
  h1 { font-family: Georgia, serif; font-size: 40px; letter-spacing: 4px; margin-bottom: 32px; text-transform: uppercase; font-weight: 400; }
  label { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; color: #707072; display: block; margin-bottom: 6px; }
  input { width: 100%; border: 1px solid #cacacb; padding: 12px 16px; font-size: 16px; color: #111; outline: none; margin-bottom: 20px; border-radius: 0; }
  input:focus { border-color: #111; }
  button { width: 100%; background: #111; color: #fff; border: none; padding: 0 32px; height: 48px; font-size: 16px; font-weight: 500; border-radius: 9999px; cursor: pointer; }
  .error { font-size: 13px; color: #d30005; margin-bottom: 16px; }
</style>
</head>
<body>
<div class="card">
  <h1>PEAK</h1>
  ${error ? `<p class="error">${error}</p>` : ''}
  <form method="POST" action="/__login">
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autofocus autocomplete="current-password" required />
    <button type="submit">Sign In</button>
  </form>
</div>
</body>
</html>`;
}
