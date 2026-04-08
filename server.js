const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const USER = process.env.AUTH_USER;
const PASS = process.env.AUTH_PASSWORD;

if (!USER || !PASS) {
  console.error('Missing AUTH_USER or AUTH_PASSWORD env vars — refusing to start.');
  process.exit(1);
}

app.use(basicAuth({
  users: { [USER]: PASS },
  challenge: true,
  realm: 'SHELAGH',
}));

app.use(express.static(path.join(__dirname)));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SHELAGH listening on ${PORT}`);
});
