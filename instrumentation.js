require('dotenv').config({ quiet: true });

const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-proto');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { logs } = require('@opentelemetry/api-logs');
const { detectResources, envDetector } = require('@opentelemetry/resources');

// Encabezado Authorization desde el .env
const raw = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
const idx = raw.indexOf('=');
const headers = {};
if (idx > 0) headers[raw.slice(0, idx).trim()] = decodeURIComponent(raw.slice(idx + 1).trim());

// Logs: proveedor registrado de forma explícita
const loggerProvider = new LoggerProvider({
  resource: detectResources({ detectors: [envDetector] }),
  processors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter({ headers }) })],
});
logs.setGlobalLoggerProvider(loggerProvider);

// Trazas y métricas
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ headers }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ headers }),
    exportIntervalMillis: 15000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } }),
  ],
});
sdk.start();

function cerrar() {
  Promise.allSettled([sdk.shutdown(), loggerProvider.shutdown()]).finally(() => process.exit(0));
}
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);