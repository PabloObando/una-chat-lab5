// Variables del .env (solo en local; en Render vienen del Environment)
require('dotenv').config({ quiet: true });

// Observabilidad (Lab 7): solo si hay un endpoint OTLP configurado y se ejecuta con npm start
if (require.main === module && process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  require('./instrumentation');
}

var validation = require('./libs/unalib');
var auth = require('./server/auth');
var vault = require('./server/vault');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

const { trace, metrics, SpanStatusCode } = require('@opentelemetry/api');
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
const tracer = trace.getTracer('una-chat');
const meter = metrics.getMeter('una-chat');
const otelLogger = logs.getLogger('una-chat');
const mensajesTotal = meter.createCounter('unachat_mensajes_total', { description: 'Mensajes procesados' });
const duracionMs = meter.createHistogram('unachat_mensaje_duracion_ms', { unit: 'ms' });

function registrar(sev, texto, attrs) {
  console.log('[' + sev.text + '] ' + texto);
  otelLogger.emit({
    severityNumber: sev.num,
    severityText: sev.text,
    body: texto,
    attributes: attrs || {},
  });
}
const INFO = { num: SeverityNumber.INFO, text: 'INFO' };
const WARN = { num: SeverityNumber.WARN, text: 'WARN' };
const ERROR = { num: SeverityNumber.ERROR, text: 'ERROR' };

app.disable('x-powered-by');

// ---------- Inicio de sesión con Auth0 (el Client Secret se lee desde Vault) ----------
function startAuth() {
  if (!auth.authSettings()) {
    registrar(WARN, 'Auth0 no está configurado (faltan AUTH0_DOMAIN o AUTH0_CLIENT_ID): el chat queda sin inicio de sesión.');
    return Promise.resolve();
  }
  return vault.loadAuth0ClientSecret()
    .then(function (secret) { return auth.initAuth0(secret); })
    .then(function () { registrar(INFO, 'Auth0 listo: el Client Secret se cargó desde Supabase Vault.'); })
    .catch(function (err) {
      // Los mensajes de vault.js y auth.js ya vienen sin datos sensibles
      registrar(ERROR, 'No se pudo iniciar Auth0: ' + (err && err.message ? err.message : 'error desconocido'));
    });
}

app.get('/auth/config', function (req, res) {
  var settings = auth.authSettings();
  res.set('Cache-Control', 'no-store');
  if (!settings || !auth.isReady()) {
    res.json({ enabled: false });
    return;
  }
  res.json({ enabled: true, domain: settings.domain, clientId: settings.clientId });
});
app.get('/auth/login', auth.beginLogin);
app.get('/auth/callback', auth.finishLogin);
app.get('/auth/logout', auth.logout);
app.get('/sala', function (req, res) {
  res.set('Cache-Control', 'no-store');
  auth.readSession(req, res);
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// Los sockets requieren sesión cuando Auth0 está configurado
io.use(function (socket, next) {
  if (!auth.authSettings()) return next();
  if (!auth.isReady()) return next(new Error('El inicio de sesión no está listo.'));
  auth.authorizeSocket(socket, next);
});

io.on('connection', function (socket) {
  registrar(INFO, 'Cliente conectado');
  socket.on('Evento-Mensaje-Server', function (msg) {
    tracer.startActiveSpan('procesar-mensaje', function (span) {
      const inicio = Date.now();
      try {
        if (typeof msg === 'string' && msg.includes('fallo-lab7')) {
          throw new Error('Fallo controlado de prueba - Lab 7');
        }
        // El nombre del remitente sale de la sesión de Auth0, no del cliente
        var crudo = msg;
        if (socket.data && socket.data.user && socket.data.user.name) {
          crudo = auth.stampSender(msg, socket.data.user.name);
        }
        const resultado = validation.validateMessage(crudo);
        const valido = JSON.parse(resultado).valido;
        span.setAttribute('mensaje.valido', valido);
        mensajesTotal.add(1, { resultado: valido ? 'ok' : 'rechazado' });
        registrar(valido ? INFO : WARN,
          valido ? 'Mensaje procesado correctamente' : 'Mensaje rechazado por validación',
          { 'mensaje.valido': valido });
        io.emit('Evento-Mensaje-Server', resultado);
      } catch (err) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        mensajesTotal.add(1, { resultado: 'error' });
        registrar(ERROR, 'Error al procesar mensaje: ' + err.message);
      } finally {
        duracionMs.record(Date.now() - inicio);
        span.end();
      }
    });
  });
});

if (require.main === module) {
  http.listen(port, function () {
    console.log('listening on *:' + port);
  });
  startAuth();
}

module.exports = { http: http, io: io };