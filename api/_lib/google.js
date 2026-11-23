import { supabaseAdmin } from './supabaseAdmin.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function getTokensRow() {
  const { data, error } = await supabaseAdmin
    .from('integraciones_google')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getValidAccessToken() {
  const row = await getTokensRow();
  if (!row || !row.refresh_token) {
    const err = new Error('Google Calendar no está conectado.');
    err.code = 'NOT_CONNECTED';
    throw err;
  }
  const margen = 60_000;
  if (row.access_token && row.expiry_date && row.expiry_date > Date.now() + margen) {
    return row.access_token;
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: row.refresh_token,
    grant_type: 'refresh_token',
  });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const tokens = await r.json();
  if (!r.ok) throw new Error(tokens.error_description || tokens.error || 'No se pudo refrescar el token de Google.');
  const expiry_date = Date.now() + tokens.expires_in * 1000;
  await supabaseAdmin
    .from('integraciones_google')
    .update({ access_token: tokens.access_token, expiry_date, updated_at: new Date().toISOString() })
    .eq('id', 1);
  return tokens.access_token;
}

export async function googleCalendarFetch(path, opts = {}) {
  const token = await getValidAccessToken();
  const r = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Google Calendar API ${r.status}: ${body}`);
  }
  if (r.status === 204) return null;
  return r.json();
}
