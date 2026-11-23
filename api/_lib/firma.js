import crypto from 'node:crypto';

// Firma corta para el "state" de Google: así el regreso (callback) solo acepta
// conexiones que se iniciaron desde la app con sesión válida.
export function firmarState(t) {
  return crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY).update(String(t)).digest('hex').slice(0, 32);
}
