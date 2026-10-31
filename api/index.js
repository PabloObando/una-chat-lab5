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

// RUTA TEMPORAL para provocar un error controlado (borrar después)
app.get('/debug-sentry', async (req, res) => {
  try {
    throw new Error('Error controlado de prueba - Lab 7');
  } catch (e) {
    Sentry.captureException(e);
    await Sentry.flush(2000);
    res.status(500).send('Error de prueba enviado a Sentry');
  }
});

Sentry.setupExpressErrorHandler(app);

module.exports = app;