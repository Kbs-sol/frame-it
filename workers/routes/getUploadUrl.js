import { generatePresignedPutUrl } from '../utils/storage.js';
import { logEvent } from '../utils/d1.js';

export async function handleGetUploadUrl(request, env) {
  // Rate limit: max 10 calls per IP per hour using D1
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM events WHERE event_type = ? AND session_id = ? AND created_at > ?'
    ).bind('upload_attempt', ip, hourAgo).first();

    if (countResult && countResult.cnt >= 10) {
      return Response.json({ error: 'Upload rate limit exceeded. Try again later.' }, { status: 429 });
    }
  } catch (e) {
    // D1 failure should not block uploads
  }

  const key = `photos/pending/${crypto.randomUUID()}.jpg`;

  try {
    const uploadUrl = await generatePresignedPutUrl(env, key, 900);
    logEvent(env.DB, 'upload_attempt', ip);
    return Response.json({ uploadUrl, r2Key: key });
  } catch (e) {
    return Response.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
