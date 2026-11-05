require('dotenv').config();

const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-proto');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');

// Leer el encabezado Authorization del .env (separar solo en el primer "=")
const raw = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
const idx = raw.indexOf('=');
const headers = {};
if (idx > 0) {
  headers[raw.slice(0, idx).trim()] = decodeURIComponent(raw.slice(idx + 1).trim());
}
// Diagnóstico sin mostrar el secreto
const auth = headers['Authorization'] || '';
console.log('[OTEL] Authorization presente:', auth.startsWith('Basic ') && auth.length > 30);

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ headers }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ headers }),
    exportIntervalMillis: 15000,
  }),
  logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter({ headers }) })],
  instrumentations: [
    getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } }),
  ],
});

sdk.start();

function cerrar() {
  sdk.shutdown().catch(() => {}).finally(() => process.exit(0));
}
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);