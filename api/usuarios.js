import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { exigirSesion } from './_lib/sesion.js';

// Administración de cuentas (solo la admin):
//   GET    -> lista de cuentas
//   POST   -> { nombre, email, password, acceso: 'editor'|'viewer' } crea una cuenta
//   PATCH  -> { id, password?, nombre?, acceso? } cambia contraseña / datos
//   DELETE -> { id } quita la cuenta
function aVista(u) {
  return {
    id: u.id,
    email: u.email,
    nombre: u.user_metadata?.nombre || '',
    acceso: u.app_metadata?.acceso || null,
    creado: u.created_at,
    ultimoAcceso: u.last_sign_in_at || null,
  };
}

function validarPassword(p) {
  return typeof p === 'string' && p.length >= 8;
}

export default async function handler(req, res) {
  const yo = await exigirSesion(req, res, { soloAdmin: true });
  if (!yo) return;
  const body = req.body || {};

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      if (error) throw error;
      const lista = data.users.map(aVista).sort((a, b) => (a.nombre || a.email).localeCompare(b.nombre || b.email));
      res.status(200).json({ usuarios: lista });
      return;
    }

    if (req.method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const nombre = String(body.nombre || '').trim();
      // Solo existe una admin (la dueña de la app); las demás cuentas son editor o viewer.
      const acceso = body.acceso === 'editor' ? 'editor' : 'viewer';
      if (!email || !email.includes('@')) return res.status(400).json({ error: 'Escribe un correo válido.' });
      if (!validarPassword(body.password)) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
        user_metadata: { nombre },
        app_metadata: { acceso },
      });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) return res.status(400).json({ error: 'Ya existe una cuenta con ese correo.' });
        throw error;
      }
      res.status(200).json({ usuario: aVista(data.user) });
      return;
    }

    if (req.method === 'PATCH') {
      if (!body.id) return res.status(400).json({ error: 'Falta la cuenta.' });
      const cambios = {};
      if (body.password !== undefined) {
        if (!validarPassword(body.password)) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
        cambios.password = body.password;
      }
      if (body.nombre !== undefined) cambios.user_metadata = { nombre: String(body.nombre).trim() };
      if (body.acceso !== undefined) {
        if (body.id === yo.id) return res.status(400).json({ error: 'No puedes cambiar tu propio nivel de acceso.' });
        if (!['editor', 'viewer'].includes(body.acceso)) return res.status(400).json({ error: 'El rol debe ser Editor o Viewer.' });
        cambios.app_metadata = { acceso: body.acceso };
      }
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(body.id, cambios);
      if (error) throw error;
      res.status(200).json({ usuario: aVista(data.user) });
      return;
    }

    if (req.method === 'DELETE') {
      if (!body.id) return res.status(400).json({ error: 'Falta la cuenta.' });
      if (body.id === yo.id) return res.status(400).json({ error: 'No puedes quitar tu propia cuenta.' });
      const { error } = await supabaseAdmin.auth.admin.deleteUser(body.id);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Algo falló con las cuentas.' });
  }
}
