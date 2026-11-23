import { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import { apiFetch, useSesion, ROLES } from '../lib/sesion';
import TablaPermisos from '../components/TablaPermisos';
import { MARCA } from '../marca';
import { IconTrash } from '../icons';

const ip = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconLlave = () => (<svg {...ip}><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 9.2-9.2M17 6l3 3M14 9l2 2" /></svg>);

function fechaCorta(iso) {
  if (!iso) return 'Nunca';
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function iniciales(u) {
  const base = u.nombre || u.email;
  return base.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

async function llamar(metodo, cuerpo) {
  const r = await apiFetch('/api/usuarios', { method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const d = await r.json().catch(() => null);
  if (!d) throw new Error('No se pudo conectar con el servidor de cuentas.');
  if (!r.ok) throw new Error(d.error || 'Algo falló.');
  return d;
}

const VACIO = { nombre: '', email: '', password: '', acceso: 'viewer' };

export default function Usuarios() {
  const { persona } = useSesion();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // null | {..VACIO}
  const [passPara, setPassPara] = useState(null); // usuario al que se le cambia la contraseña
  const [nuevaPass, setNuevaPass] = useState('');
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');

  async function cargar() {
    try {
      const d = await llamar('GET');
      setUsuarios(Array.isArray(d.usuarios) ? d.usuarios : []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  function avisar(t) { setAviso(t); setTimeout(() => setAviso(''), 5000); }

  async function crear(e) {
    e.preventDefault();
    setErrorForm('');
    setGuardando(true);
    try {
      await llamar('POST', form);
      avisar(`Cuenta creada. Pásale a ${form.nombre || form.email} su correo y la contraseña que le pusiste.`);
      setForm(null);
      cargar();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function guardarPass(e) {
    e.preventDefault();
    setErrorForm('');
    setGuardando(true);
    try {
      await llamar('PATCH', { id: passPara.id, password: nuevaPass });
      avisar(`Contraseña nueva asignada a ${passPara.nombre || passPara.email}.`);
      setPassPara(null);
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarRol(u, nuevo) {
    if (nuevo === u.acceso) return;
    try {
      await llamar('PATCH', { id: u.id, acceso: nuevo });
      avisar(`${u.nombre || u.email} ahora es ${ROLES[nuevo]}.`);
      cargar();
    } catch (err) { alert(err.message); }
  }

  async function quitar(u) {
    if (!confirm(`¿Quitar la cuenta de ${u.nombre || u.email}? Ya no podrá entrar a ${MARCA.nombre}.`)) return;
    try { await llamar('DELETE', { id: u.id }); avisar('Cuenta quitada.'); cargar(); } catch (err) { alert(err.message); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Usuarios</div>
          <div className="page-subtitle">Quién puede entrar a {MARCA.nombre}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => { setErrorForm(''); setForm({ ...VACIO }); }}>+ Agregar persona</button>
          <Topbar hideSearch />
        </div>
      </div>

      <div className="page-body">
        {aviso && <div className="usuarios-aviso">{aviso}</div>}
        <div className="card relieve" style={{ padding: 0, overflow: 'hidden' }}>
          {cargando ? (
            <div className="empty-state">Cargando…</div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Persona</th><th>Correo</th><th>Rol</th><th>Último acceso</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const soyYo = u.id === persona.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold))', color: 'var(--wine-deep)', fontWeight: 800 }}>{iniciales(u)}</span>
                          <span style={{ fontWeight: 600 }}>{u.nombre || '—'}{soyYo && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (tú)</span>}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td>
                        {u.acceso === 'admin' ? (
                          <span className="usuarios-permiso admin">Admin</span>
                        ) : (
                          <select className={`usuarios-rol ${u.acceso || 'sin'}`} value={u.acceso || ''} onChange={e => cambiarRol(u, e.target.value)} title="Cambiar rol">
                            {!u.acceso && <option value="" disabled>Sin acceso</option>}
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{fechaCorta(u.ultimoAcceso)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {!soyYo && (
                            <button className="btn btn-outline btn-sm" onClick={() => { setErrorForm(''); setNuevaPass(''); setPassPara(u); }}>
                              <IconLlave /> Nueva contraseña
                            </button>
                          )}
                          {!soyYo && (
                            <button className="btn btn-danger btn-sm" onClick={() => quitar(u)} title="Quitar cuenta"><IconTrash width={14} height={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
          Para cambiar tu propia contraseña usa tu foto de perfil, arriba a la derecha.
        </p>

        <TablaPermisos />
      </div>

      {form && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <form className="modal" style={{ maxWidth: 460 }} onSubmit={crear}>
            <div className="modal-header">
              <span className="modal-title">Agregar persona</span>
              <button type="button" className="close-btn" onClick={() => setForm(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" autoFocus value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Ana López" />
              </div>
              <div className="form-group">
                <label className="form-label">Correo</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña para empezar</label>
                <input className="form-input" type="text" autoComplete="off" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Se la pasas tú; luego la persona la puede cambiar.</div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Rol</label>
                <select className="form-input" value={form.acceso} onChange={e => setForm({ ...form, acceso: e.target.value })}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Lo que puede ver y editar cada rol lo defines abajo, en "Permisos por rol".</div>
              </div>
              {errorForm && <div className="login-error" role="alert">{errorForm}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Creando…' : 'Crear cuenta'}</button>
            </div>
          </form>
        </div>
      )}

      {passPara && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setPassPara(null)}>
          <form className="modal" style={{ maxWidth: 420 }} onSubmit={guardarPass}>
            <div className="modal-header">
              <span className="modal-title">Nueva contraseña</span>
              <button type="button" className="close-btn" onClick={() => setPassPara(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>Para {passPara.nombre || passPara.email}. La anterior deja de funcionar.</p>
              <input className="form-input" type="text" autoComplete="off" autoFocus value={nuevaPass} onChange={e => setNuevaPass(e.target.value)} placeholder="Mínimo 8 caracteres" />
              {errorForm && <div className="login-error" role="alert">{errorForm}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setPassPara(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
