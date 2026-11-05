// Instrumentación: debe cargarse antes que express y socket.io
if (require.main === module) require('./instrumentation');

var validation = require('./libs/unalib');
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

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
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
        const resultado = validation.validateMessage(msg);
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
}

module.exports = { http: http, io: io };