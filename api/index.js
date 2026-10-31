const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'vercel-production',
});

const path = require('path');
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});
app.use('/libs', express.static(path.join(__dirname, '..', 'libs')));

Sentry.setupExpressErrorHandler(app);

module.exports = app;