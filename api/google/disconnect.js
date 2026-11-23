import { exigirSesion } from '../_lib/sesion.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getTokensRow } from '../_lib/google.js';

export default async function handler(req, res) {
  if (!(await exigirSesion(req, res, { editarAlguna: ['calendario'] }))) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  try {
    const row = await getTokensRow();
    if (row?.refresh_token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.refresh_token)}`, { method: 'POST' });
      } catch {
        // si falla la revocación no bloqueamos la desconexión local
      }
    }
    await supabaseAdmin.from('integraciones_google').delete().eq('id', 1);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'No se pudo desconectar.' });
  }
}
