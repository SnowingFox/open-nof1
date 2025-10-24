#!/usr/bin/env node
// Minimal JWT (HS256) generator without external deps
// Reads secret from env CRON_SECRET_KEY and prints a token to stdout

const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const secret = process.env.CRON_SECRET_KEY || '';
if (!secret) {
  console.error('CRON_SECRET_KEY is not set');
  process.exit(1);
}

const header = { alg: 'HS256', typ: 'JWT' };
const payload = {
  sub: 'cron-token',
  iat: Math.floor(Date.now() / 1000),
};

const headerB64 = base64url(JSON.stringify(header));
const payloadB64 = base64url(JSON.stringify(payload));
const data = `${headerB64}.${payloadB64}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(data)
  .digest('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

process.stdout.write(`${data}.${signature}`);
