import { useState, useEffect } from 'react';
import { IconEdit, IconTrash, IconEye, IconEyeOff, IconPlane } from '../icons';
import { listAerolineas, createAerolinea, updateAerolinea, deleteAerolinea } from '../lib/aerolineas';
import Topbar from '../components/Topbar';
import { useEditable } from '../lib/sesion';

const FORM_VACIO = { nombre: '', cuenta: '', correo: '', contrasena: '', maletaDoc1: '', maletaDoc2: '', maletaMano: '', notas: '' };

export default function Aerolineas() {
  const editable = useEditable('aerolineas');
  const [aerolineas, setAerolineas] = useState([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => { listAerolineas().then(setAerolineas).finally(() => setCargando(false)); }, []);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [verContrasena, setVerContrasena] = useState({});
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    setShowModal(true);
  }

  function abrirEditar(a) { setEditando(a.id); setForm({ ...a }); setShowModal(true); }

  async function save() {
    if (!form.nombre) return;
    setGuardando(true);
    try {
      if (editando) {
        const actualizada = await updateAerolinea({ ...form, id: editando });
        setAerolineas(aerolineas.map(a => a.id === editando ? actualizada : a));
      } else {
        const creada = await createAerolinea({ ...form, id: Date.now() });
        setAerolineas([...aerolineas, creada]);
      }
      setShowModal(false);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta aerolínea?')) return;
    await deleteAerolinea(id);
    setAerolineas(aerolineas.filter(a => a.id !== id));
  }

  function toggleVer(id) { setVerContrasena(p => ({ ...p, [id]: !p[id] })); }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Aerolíneas</div>
          <div className="page-subtitle">{aerolineas.length} cuentas registradas</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {editable && <button className="btn btn-primary" onClick={abrirNuevo}>+ Agregar aerolínea</button>}
          <Topbar hideSearch />
        </div>
      </div>

      <div className="page-body">
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando aerolíneas...</div>
        ) : aerolineas.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IconPlane width={32} height={32} strokeWidth={1.2} /></div>
            <div style={{ fontSize: 14 }}>Sin aerolíneas registradas.</div>
            {editable && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={abrirNuevo}>Agregar primera aerolínea</button>}
          </div>
        ) : (
          <div className="grid-3">
            {aerolineas.map(a => (
              <div key={a.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{a.nombre}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {editable && <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(a)}><IconEdit /></button>}
                    {editable && <button className="btn btn-ghost btn-sm" onClick={() => eliminar(a.id)}><IconTrash /></button>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>N° de cuenta</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'Fira Code, monospace' }}>{a.cuenta || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Correo</span>
                    <span style={{ color: 'var(--text-primary)' }}>{a.correo || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Contraseña</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'Fira Code, monospace' }}>{a.contrasena ? (verContrasena[a.id] ? a.contrasena : '••••••••') : '—'}</span>
                      {a.contrasena && (
                        <button className="btn btn-ghost btn-sm" style={{ padding: '1px 5px' }} onClick={() => toggleVer(a.id)}>{verContrasena[a.id] ? <IconEyeOff /> : <IconEye />}</button>
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: a.notas ? 10 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Maletas</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 80, background: 'var(--bg-card2)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>1ra doc.</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--royal)' }}>{a.maletaDoc1 ? `$${Number(a.maletaDoc1).toLocaleString()}` : '—'}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 80, background: 'var(--bg-card2)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>2da doc.</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--royal)' }}>{a.maletaDoc2 ? `$${Number(a.maletaDoc2).toLocaleString()}` : '—'}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 80, background: 'var(--bg-card2)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>De mano</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--royal)' }}>{a.maletaMano ? `$${Number(a.maletaMano).toLocaleString()}` : '—'}</div>
                    </div>
                  </div>
                </div>

                {a.notas && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 10 }}>
                    "{a.notas}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editable && showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editando ? 'Editar aerolínea' : 'Agregar aerolínea'}</span>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Aerolínea</label>
                  <input className="form-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Volaris" />
                </div>
                <div className="form-group">
                  <label className="form-label">Número de cuenta</label>
                  <input className="form-input" value={form.cuenta} onChange={e => setForm(p => ({ ...p, cuenta: e.target.value }))} placeholder="Ej: VEM2001205B8-1" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Correo</label>
                  <input className="form-input" type="email" value={form.correo} onChange={e => setForm(p => ({ ...p, correo: e.target.value }))} placeholder="correo@empresa.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input className="form-input" value={form.contrasena} onChange={e => setForm(p => ({ ...p, contrasena: e.target.value }))} placeholder="Contraseña de la cuenta" />
                </div>
              </div>

              <hr className="divider" />

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Costo de maletas</div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">1ra maleta documentada ($)</label>
                  <input className="form-input" type="number" value={form.maletaDoc1} onChange={e => setForm(p => ({ ...p, maletaDoc1: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">2da maleta documentada ($)</label>
                  <input className="form-input" type="number" value={form.maletaDoc2} onChange={e => setForm(p => ({ ...p, maletaDoc2: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Maleta de mano ($)</label>
                  <input className="form-input" type="number" value={form.maletaMano} onChange={e => setForm(p => ({ ...p, maletaMano: e.target.value }))} placeholder="0" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-input" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Observaciones sobre esta aerolínea..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={guardando}>{guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
