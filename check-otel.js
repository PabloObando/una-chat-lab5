require('dotenv').config({ quiet: true });

const ep = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
const raw = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
const i = raw.indexOf('=');
const nombre = raw.slice(0, i);
const valor = decodeURIComponent(raw.slice(i + 1));

console.log('Endpoint:', ep);
console.log('Endpoint empieza con https:// y termina en /otlp:',
  ep.startsWith('https://') && ep.endsWith('/otlp'));
console.log('Endpoint contiene "<" o ">":', /[<>]/.test(ep));
console.log('Nombre del header:', nombre);
console.log('Valor empieza con "Basic ":', valor.startsWith('Basic '));

const b64 = valor.replace(/^Basic\s+/, '');
const dec = Buffer.from(b64, 'base64').toString('utf8');
const j = dec.indexOf(':');
const id = dec.slice(0, j);
const tok = dec.slice(j + 1);
console.log('Largo del base64:', b64.length, '| divisible por 4:', b64.length % 4 === 0);
console.log('Instance ID solo dígitos:', /^\d+$/.test(id), '| largo:', id.length);
console.log('Token empieza con glc_:', tok.startsWith('glc_'), '| largo:', tok.length);

fetch(ep.replace(/\/$/, '') + '/v1/traces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-protobuf', Authorization: valor },
  body: new Uint8Array(0),
})
  .then(async (r) => console.log('Respuesta de Grafana: HTTP', r.status, (await r.text()).slice(0, 200)))
  .catch((e) => console.log('Error de red:', e.message));