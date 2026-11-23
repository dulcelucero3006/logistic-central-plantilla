import { useState } from 'react';
import { initialProveedores, categoriasProveedor } from '../data';

function Estrellas({ n }) {
  return <span style={{ fontSize: 13, color: '#d97706' }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState(() => JSON.parse(localStorage.getItem('lc_proveedores') || JSON.stringify(initialProveedores)));
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('Todos');
  const [form, setForm] = useState({ nombre: '', categoria: categoriasProveedor[0], contacto: '', telefono: '', email: '', calificacion: 5, notas: '', activo: true });

  function guardar(lista) { setProveedores(lista); localStorage.setItem('lc_proveedores', JSON.stringify(lista)); }

  function abrirNuevo() {
    setEditando(null);
    setForm({ nombre: '', categoria: categoriasProveedor[0], contacto: '', telefono: '', email: '', calificacion: 5, notas: '', activo: true });
    setShowModal(true);
  }

  function abrirEditar(p) { setEditando(p.id); setForm({ ...p }); setShowModal(true); }

  function save() {
    if (!form.nombre || !form.contacto) return;
    if (editando) { guardar(proveedores.map(p => p.id === editando ? { ...form, id: editando } : p)); }
    else { guardar([...proveedores, { ...form, id: Date.now() }]); }
    setShowModal(false);
  }

  function eliminar(id) { if (confirm('¿Eliminar este proveedor?')) guardar(proveedores.filter(p => p.id !== id)); }

  const lista = filtro === 'Todos' ? proveedores : proveedores.filter(p => p.categoria === filtro);
  const categorias = ['Todos', ...categoriasProveedor.filter(c => proveedores.some(p => p.categoria === c))];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Directorio</div>
          <div className="page-subtitle">{proveedores.length} proveedores registrados</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo Proveedor</button>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {categorias.map(c => (
            <button key={c} className={`btn btn-sm ${filtro === c ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFiltro(c)}>{c}</button>
          ))}
        </div>

        <div className="grid-3">
          {lista.map(p => (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{p.nombre}</div>
                  <span className="tag tag-blue" style={{ fontSize: 10 }}>{p.categoria}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}>✏️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => eliminar(p.id)}>🗑️</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>👤 {p.contacto}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📞 {p.telefono}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>✉️ {p.email}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: p.notas ? 8 : 0 }}>
                <Estrellas n={p.calificacion} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>{p.calificacion}/5</span>
              </div>

              {p.notas && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                  "{p.notas}"
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</span>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre del proveedor</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: SoundPro AV" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-input" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                    {categoriasProveedor.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Calificación (1-5)</label>
                  <select className="form-input" value={form.calificacion} onChange={e => setForm(p => ({ ...p, calificacion: Number(e.target.value) }))}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{'★'.repeat(n)} ({n}/5)</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contacto principal</label>
                <input className="form-input" value={form.contacto} onChange={e => setForm(p => ({ ...p, contacto: e.target.value }))} placeholder="Nombre completo" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="55 0000-0000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="contacto@empresa.mx" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-input" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Observaciones sobre este proveedor..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>{editando ? 'Guardar cambios' : 'Agregar proveedor'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
