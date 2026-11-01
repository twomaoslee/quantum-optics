'use strict';
// The gateway supplies an HTTP envelope; the SDK supplies the RPC object directly.
// Caller identity is deliberately not decoded here; index.js reads trusted context.
function decodeRequest(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('INPUT');
  if (!Object.hasOwn(event, 'httpMethod')) return event;
  if (event.httpMethod !== 'POST') throw new Error('INPUT');
  let body = event.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > 16384) throw new Error('INPUT');
    if (event.isBase64Encoded) body = Buffer.from(body, 'base64').toString('utf8');
    body = JSON.parse(body);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('INPUT');
  return body;
}
module.exports = {decodeRequest};
