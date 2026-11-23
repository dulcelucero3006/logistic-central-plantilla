import { exigirSesion } from '../_lib/sesion.js';
import { googleCalendarFetch } from '../_lib/google.js';

export default async function handler(req, res) {
  if (!(await exigirSesion(req, res, { editarAlguna: ['calendario', 'eventos'] }))) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  const { googleEventId } = req.body || {};
  if (!googleEventId) {
    res.status(400).json({ error: 'Falta googleEventId' });
    return;
  }
  try {
    await googleCalendarFetch(`/calendars/primary/events/${googleEventId}`, { method: 'DELETE' });
    res.status(200).json({ ok: true });
  } catch (err) {
    if (err.code === 'NOT_CONNECTED' || /404|410/.test(err.message || '')) {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }
    res.status(500).json({ error: err.message || 'No se pudo borrar el evento en Google.' });
  }
}
