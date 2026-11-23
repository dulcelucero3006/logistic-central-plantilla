import { supabaseAdmin } from './supabaseAdmin.js';

// Revisa que quien llama tenga sesión iniciada en la app y que su
// cuenta esté autorizada (app_metadata.acceso = 'admin' | 'editor' | 'viewer'; ese dato
// solo lo puede poner el servidor, nadie lo puede cambiar desde el navegador).
// Si no cumple, responde el error y regresa null.
export async function exigirSesion(req, res, { soloAdmin = false, editarAlguna = null } = {}) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : (req.query?.token || null);
  if (!token) {
    res.status(401).json({ error: 'Necesitas iniciar sesión.' });
    return null;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const usuario = data?.user;
  const acceso = usuario?.app_metadata?.acceso;
  if (error || !usuario || !acceso) {
    res.status(401).json({ error: 'Tu sesión no es válida o tu cuenta no tiene acceso.' });
    return null;
  }
  if (soloAdmin && acceso !== 'admin') {
    res.status(403).json({ error: 'Solo una cuenta admin puede hacer esto.' });
    return null;
  }
  // Para acciones que cambian datos: el rol debe poder editar al menos una de
  // esas secciones (según la tabla permisos_rol). La admin siempre puede.
  if (editarAlguna && acceso !== 'admin') {
    const { data: permisos } = await supabaseAdmin
      .from('permisos_rol').select('seccion').eq('rol', acceso).eq('editar', true).in('seccion', editarAlguna);
    if (!permisos?.length) {
      res.status(403).json({ error: 'Tu rol no tiene permiso para hacer cambios aquí.' });
      return null;
    }
  }
  return usuario;
}
