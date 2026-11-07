require('./instrumentation');
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
console.log('Proveedor de logs:', logs.getLoggerProvider().constructor.name);
logs.getLogger('prueba').emit({
  severityNumber: SeverityNumber.INFO,
  severityText: 'INFO',
  body: 'Prueba de logs desde test-logs.js',
});
setTimeout(() => process.exit(0), 10000);