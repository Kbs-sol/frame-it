// D1 event logging — fire-and-forget, never blocks response
export function logEvent(db, eventType, sessionId) {
  // Fire and forget — no await
  try {
    db.prepare('INSERT INTO events (event_type, session_id) VALUES (?, ?)')
      .bind(eventType, sessionId || null)
      .run()
      .catch(() => {}); // Silently fail — analytics never blocks business logic
  } catch (e) {
    // Ignore all errors
  }
}
