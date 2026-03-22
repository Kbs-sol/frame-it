// R2 presigned URL helper using S3-compatible API
// Uses AwsClient approach with HMAC signing for R2

export async function generatePresignedPutUrl(env, key, expiresIn = 900) {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  // If no R2 configured (e.g., local dev without tokens), mock it
  if (!accountId || accountId.includes('placeholder')) {
    return '/api/mock-r2-upload';
  }
  const bucket = 'frameit-photos';

  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const datestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateOnly = datestamp.substring(0, 8);
  const credentialScope = `${dateOnly}/${region}/${service}/aws4_request`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': datestamp,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });

  const canonicalUri = `/${bucket}/${key}`;
  const canonicalQueryString = queryParams.toString().split('&').sort().join('&');
  const host = `${accountId}.r2.cloudflarestorage.com`;

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datestamp,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\n');

  const signingKey = await getSignatureKey(secretAccessKey, dateOnly, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  queryParams.set('X-Amz-Signature', signature);

  return `https://${host}${canonicalUri}?${queryParams.toString()}`;
}

export async function generatePresignedGetUrl(env, key, expiresIn = 86400) {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = 'frameit-photos';

  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const datestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateOnly = datestamp.substring(0, 8);
  const credentialScope = `${dateOnly}/${region}/${service}/aws4_request`;

  const canonicalUri = `/${bucket}/${key}`;
  const host = `${accountId}.r2.cloudflarestorage.com`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': datestamp,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });

  const canonicalQueryString = queryParams.toString().split('&').sort().join('&');

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQueryString,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datestamp,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\n');

  const signingKey = await getSignatureKey(secretAccessKey, dateOnly, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  queryParams.set('X-Amz-Signature', signature);

  return `https://${host}${canonicalUri}?${queryParams.toString()}`;
}

// Crypto helpers using Web Crypto API (Cloudflare Workers compatible)
async function hmac(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(key, message) {
  const sig = await hmac(key, message);
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(message) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(key, dateStamp, region, service) {
  const kDate = await hmac('AWS4' + key, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return await hmac(kService, 'aws4_request');
}
