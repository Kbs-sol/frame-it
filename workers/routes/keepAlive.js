import { supabaseSelect } from '../utils/supabase.js';

export async function handleKeepAlive(request, env) {
  try {
    await supabaseSelect(env, 'store_settings', 'id=eq.1&select=id&limit=1');
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
