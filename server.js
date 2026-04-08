const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const USER = process.env.AUTH_USER;
const PASS = process.env.AUTH_PASSWORD;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DATA_FILE = path.join(DATA_DIR, 'shelagh.json');

if (!USER || !PASS) {
  console.error('Missing AUTH_USER or AUTH_PASSWORD env vars — refusing to start.');
  process.exit(1);
}

// Ensure data dir exists (falls back to local ./data if /data isn't writable)
let effectiveDataFile = DATA_FILE;
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  const fallback = path.join(__dirname, 'data');
  fs.mkdirSync(fallback, { recursive: true });
  effectiveDataFile = path.join(fallback, 'shelagh.json');
  console.warn(`DATA_DIR ${DATA_DIR} not writable, using ${fallback}`);
}

app.use(basicAuth({
  users: { [USER]: PASS },
  challenge: true,
  realm: 'SHELAGH',
}));

app.use(express.json({ limit: '10mb' }));

// API: load book
app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(effectiveDataFile)) {
      return res.json(null);
    }
    const raw = fs.readFileSync(effectiveDataFile, 'utf8');
    res.type('application/json').send(raw);
  } catch (e) {
    console.error('GET /api/data failed:', e);
    res.status(500).json({ error: 'read_failed' });
  }
});

// API: save book (atomic write)
app.put('/api/data', (req, res) => {
  try {
    const tmp = effectiveDataFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(req.body));
    fs.renameSync(tmp, effectiveDataFile);
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/data failed:', e);
    res.status(500).json({ error: 'write_failed' });
  }
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SHELAGH listening on ${PORT} (data: ${effectiveDataFile})`);
});
