// Supabase helper for Workers
function supabaseFetch(env, path, options = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    }
  });
}

export async function supabaseSelect(env, table, query = '') {
  const res = await supabaseFetch(env, `${table}?${query}`);
  if (!res.ok) throw new Error(`Supabase select error: ${res.status}`);
  return res.json();
}

export async function supabaseInsert(env, table, data) {
  const res = await supabaseFetch(env, table, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase insert error: ${res.status} ${err}`);
  }
  return res.json();
}

export async function supabaseUpdate(env, table, query, data) {
  const res = await supabaseFetch(env, `${table}?${query}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase update error: ${res.status} ${err}`);
  }
  return res.json();
}

export async function supabaseUpsert(env, table, data) {
  const res = await supabaseFetch(env, table, {
    method: 'POST',
    body: JSON.stringify(data),
    prefer: 'return=representation,resolution=merge-duplicates'
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upsert error: ${res.status} ${err}`);
  }
  return res.json();
}
