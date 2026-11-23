import { firmarState } from '../_lib/firma.js';
import { exigirSesion } from '../_lib/sesion.js';

export default async function handler(req, res) {
  if (!(await exigirSesion(req, res, { editarAlguna: ['calendario'] }))) return;
  const t = Date.now();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    state: `${t}.${firmarState(t)}`,
  });
  res.status(200).json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
}
