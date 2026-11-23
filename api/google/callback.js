import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { firmarState } from '../_lib/firma.js';

export default async function handler(req, res) {
  const { code, error, state } = req.query;
  const [t, firma] = String(state || '').split('.');
  const vigente = Number(t) > Date.now() - 15 * 60_000;
  if (!error && (!firma || firma !== firmarState(t) || !vigente)) {
    res.writeHead(302, { Location: '/calendario?google=error' });
    return res.end();
  }
  if (error) {
    res.writeHead(302, { Location: '/calendario?google=error' });
    return res.end();
  }
  if (!code) {
    res.status(400).send('Falta el código de autorización de Google.');
    return;
  }
  try {
    const params = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const tokens = await r.json();
    if (!r.ok) throw new Error(tokens.error_description || tokens.error || 'Error al obtener tokens de Google.');

    let email = null;
    try {
      const u = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const info = await u.json();
      email = info.email || null;
    } catch {
      // no es crítico si falla, solo es informativo
    }

    const { data: existente } = await supabaseAdmin
      .from('integraciones_google')
      .select('refresh_token, connected_since')
      .eq('id', 1)
      .maybeSingle();

    await supabaseAdmin.from('integraciones_google').upsert({
      id: 1,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || existente?.refresh_token || null,
      expiry_date: Date.now() + tokens.expires_in * 1000,
      connected_email: email,
      // Se fija solo la primera vez: marca desde cuándo se deben importar eventos
      // nuevos creados directo en Google, para no volver a traer todo el historial
      // si algún día se desconecta y se vuelve a conectar.
      connected_since: existente?.connected_since || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.writeHead(302, { Location: '/calendario?google=conectado' });
    res.end();
  } catch (err) {
    res.writeHead(302, { Location: '/calendario?google=error' });
    res.end();
  }
}
