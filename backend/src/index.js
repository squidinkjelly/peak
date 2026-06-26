const express = require('express');
const cors = require('cors');
const path = require('path');
const { UPLOADS_DIR } = require('./db/schema');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: false })); // needed for login form POST

// Auth gate — sits before everything except /uploads
app.use(auth);

app.use(cors());

app.use('/api/meals',     require('./routes/meals'));
app.use('/api/meal-logs', require('./routes/logs'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/plans',     require('./routes/plans'));
app.use('/api/seed',      require('./routes/seed'));
app.use('/uploads',       express.static(UPLOADS_DIR));

const fs = require('fs');
const CANDIDATE_PATHS = [
  '/app/frontend/dist',
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../../../frontend/dist'),
];
const frontendBuild = CANDIDATE_PATHS.find(p => fs.existsSync(p));
console.log('Frontend build path:', frontendBuild ?? 'NOT FOUND', '| __dirname:', __dirname);
if (frontendBuild) {
  app.use('/assets', express.static(path.join(frontendBuild, 'assets'), {
    maxAge: '1y', immutable: true,
  }));
  app.use(express.static(frontendBuild, { maxAge: 0, etag: false }));
  app.get('/{*path}', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Peak server running on http://localhost:${PORT}`));
