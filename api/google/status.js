import { exigirSesion } from '../_lib/sesion.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (!(await exigirSesion(req, res))) return;
  const { data } = await supabaseAdmin
    .from('integraciones_google')
    .select('connected_email, updated_at, refresh_token')
    .eq('id', 1)
    .maybeSingle();
  res.status(200).json({
    connected: !!data?.refresh_token,
    email: data?.connected_email || null,
    updatedAt: data?.updated_at || null,
  });
}
