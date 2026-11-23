import { useState, useEffect } from 'react';
import { IconEdit, IconTrash, IconBuilding } from '../icons';
import { listSalones, createSalones, updateSalon, deleteSalon } from '../lib/salones';
import Topbar from '../components/Topbar';
import { useEditable } from '../lib/sesion';

const regiones = ['MEX', 'USA/CAN', 'LATAM'];

const FORM_VACIO = { region: regiones[0], ciudad: '' };
const FILA_VACIA = { hotel: '', contacto: '', telefonos: [''], correo: '', salon: '', costo: '', personas: '', capacidadMaxima: '', notas: '' };

export default function Salones() {
  const editable = useEditable('salones');
  const [salones, setSalones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroRegion, setFiltroRegion] = useState('Todas');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [form, setForm] = useState(FORM_VACIO);
  const [filas, setFilas] = useState([FILA_VACIA]);

  useEffect(() => {
    listSalones().then(setSalones).finally(() => setCargando(false));
  }, []);

  function abrirNuevo() {
    setEditando(null);
    setErrorForm('');
    setForm(FORM_VACIO);
    setFilas([{ ...FILA_VACIA }]);
    setShowModal(true);
  }

  function abrirNuevoEnCiudad(ciudad, region) {
    setEditando(null);
    setErrorForm('');
    setForm({ region: region || regiones[0], ciudad });
    setFilas([{ ...FILA_VACIA }]);
    setShowModal(true);
  }

  function abrirEditar(s) {
    setEditando(s.id);
    setErrorForm('');
    setForm({ region: s.region, ciudad: s.ciudad });
    setFilas([{ ...s, telefonos: s.telefonos?.length ? s.telefonos : [''] }]);
    setShowModal(true);
  }

  async function save() {
    if (!form.ciudad) {
      setErrorForm('Falta la ciudad — es obligatoria.');
      return;
    }
    const filasValidas = filas.filter(f => f.salon || f.hotel);
    if (filasValidas.length === 0) {
      setErrorForm('Falta el nombre del salón o del hotel en al menos un renglón.');
      return;
    }
    setErrorForm('');
    setGuardando(true);
    try {
      if (editando) {
        const f = filasValidas[0];
        const limpio = { ...form, ...f, telefonos: f.telefonos.filter(t => t.trim() !== ''), id: editando };
        const actualizado = await updateSalon(limpio);
        setSalones(salones.map(s => s.id === editando ? actualizado : s));
      } else {
        const nuevos = filasValidas.map((f, i) => ({ ...form, ...f, telefonos: f.telefonos.filter(t => t.trim() !== ''), id: Date.now() + i }));
        const creados = await createSalones(nuevos);
        setSalones([...salones, ...creados]);
      }
      setShowModal(false);
    } catch (err) {
      setErrorForm(`No se pudo guardar: ${err.message || 'error de conexión con la base de datos.'}`);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este salón?')) return;
    try {
      await deleteSalon(id);
      setSalones(salones.filter(s => s.id !== id));
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  function actualizarFila(idx, campo, valor) {
    setFilas(fs => fs.map((f, i) => i === idx ? { ...f, [campo]: valor } : f));
  }

  function actualizarTelefono(filaIdx, telIdx, valor) {
    setFilas(fs => fs.map((f, i) => i !== filaIdx ? f : { ...f, telefonos: f.telefonos.map((t, ti) => ti === telIdx ? valor : t) }));
  }

  function agregarTelefono(filaIdx) {
    setFilas(fs => fs.map((f, i) => i !== filaIdx ? f : { ...f, telefonos: [...f.telefonos, ''] }));
  }

  function quitarTelefono(filaIdx, telIdx) {
    setFilas(fs => fs.map((f, i) => i !== filaIdx ? f : { ...f, telefonos: f.telefonos.filter((_, ti) => ti !== telIdx) }));
  }

  function agregarFila() { setFilas(fs => [...fs, { ...FILA_VACIA, telefonos: [''] }]); }

  function quitarFila(idx) { setFilas(fs => fs.filter((_, i) => i !== idx)); }

  const regionesEnUso = ['Todas', ...new Set(salones.map(s => s.region).filter(Boolean))];
  const lista = salones.filter(s => filtroRegion === 'Todas' || s.region === filtroRegion);

  const porCiudad = {};
  lista.forEach(s => {
    const key = s.ciudad || 'Sin ciudad';
    (porCiudad[key] = porCiudad[key] || []).push(s);
  });
  const ciudadesOrdenadas = Object.keys(porCiudad).sort((a, b) => a.localeCompare(b, 'es'));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Salones</div>
          <div className="page-subtitle">{salones.length} salones registrados</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {editable && <button className="btn btn-primary" onClick={abrirNuevo}>+ Agregar salón</button>}
          <Topbar hideSearch />
        </div>
      </div>

      <div className="page-body">
        {regionesEnUso.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {regionesEnUso.map(r => (
              <button key={r} className={`btn btn-sm ${filtroRegion === r ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFiltroRegion(r)}>{r}</button>
            ))}
          </div>
        )}

        {cargando ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando salones...</div>
        ) : lista.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IconBuilding width={32} height={32} strokeWidth={1.2} /></div>
            <div style={{ fontSize: 14 }}>Sin salones registrados.</div>
            {editable && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={abrirNuevo}>Agregar primer salón</button>}
          </div>
        ) : (
          <>
            {ciudadesOrdenadas.map(ciudad => (
              <div key={ciudad} className="card" style={{ marginBottom: 18, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 18, color: 'var(--royal)' }}>{ciudad}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>
                      {porCiudad[ciudad].length} salón{porCiudad[ciudad].length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  {editable && (
                    <button
                      className="btn btn-ghost btn-sm"
                      title={`Agregar salón en ${ciudad}`}
                      onClick={() => abrirNuevoEnCiudad(ciudad, porCiudad[ciudad][0]?.region)}
                    >
                      +
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 320px))', gap: 12, marginTop: 14 }}>
                {porCiudad[ciudad].map((s, i) => {
                  const infoRows = [
                    s.contacto && ['Contacto', s.contacto],
                    s.correo && ['Correo', s.correo],
                    s.telefonos?.length > 0 && [s.telefonos.length > 1 ? 'Teléfonos' : 'Teléfono', s.telefonos.join(' · ')],
                  ].filter(Boolean);

                  return (
                    <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{s.salon || s.hotel}</span>
                            <span className="tag tag-navy" style={{ fontSize: 9 }}>{s.region}</span>
                          </div>
                          {s.salon && s.hotel && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{s.hotel}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          {editable && <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(s)}><IconEdit /></button>}
                          {editable && <button className="btn btn-ghost btn-sm" onClick={() => eliminar(s.id)}><IconTrash /></button>}
                        </div>
                      </div>

                      {infoRows.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8, marginBottom: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                          {infoRows.map(([label, valor]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
                              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                              <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{valor}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ flex: 1, background: 'var(--bg-card2)', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Costo</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--royal)' }}>{s.costo ? `$${Number(s.costo).toLocaleString()}` : '—'}</div>
                        </div>
                        <div style={{ flex: 1, background: 'var(--bg-card2)', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Personas</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--royal)' }}>{s.personas || '—'}</div>
                        </div>
                        <div style={{ flex: 1, background: 'var(--bg-card2)', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Cap. máxima</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--royal)' }}>{s.capacidadMaxima || '—'}</div>
                        </div>
                      </div>

                      {s.notas && (
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{s.notas}</div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {editable && showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editando ? 'Editar salón' : 'Agregar salón'}</span>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Región</label>
                  <select className="form-input" value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}>
                    {regiones.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ciudad</label>
                  <input className="form-input" value={form.ciudad} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))} placeholder="Ej: Guadalajara" />
                </div>
              </div>

              {filas.map((f, idx) => (
                <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 14 }}>
                  {!editando && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hotel / salón {idx + 1}</span>
                      {filas.length > 1 && (
                        <button className="btn btn-outline btn-sm" onClick={() => quitarFila(idx)}>Quitar</button>
                      )}
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Hotel</label>
                      <input className="form-input" value={f.hotel} onChange={e => actualizarFila(idx, 'hotel', e.target.value)} placeholder="Nombre del hotel" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nombre del salón</label>
                      <input className="form-input" value={f.salon} onChange={e => actualizarFila(idx, 'salon', e.target.value)} placeholder="Ej: Salón Jacarandas" />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Contacto</label>
                      <input className="form-input" value={f.contacto} onChange={e => actualizarFila(idx, 'contacto', e.target.value)} placeholder="Nombre de quien atendió" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Correo</label>
                      <input className="form-input" type="email" value={f.correo} onChange={e => actualizarFila(idx, 'correo', e.target.value)} placeholder="correo@hotel.com" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono(s)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {f.telefonos.map((t, telIdx) => (
                        <div key={telIdx} style={{ display: 'flex', gap: 8 }}>
                          <input className="form-input" value={t} onChange={e => actualizarTelefono(idx, telIdx, e.target.value)} placeholder="55 0000-0000" />
                          {f.telefonos.length > 1 && (
                            <button className="btn btn-outline btn-sm" onClick={() => quitarTelefono(idx, telIdx)}>×</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-light btn-sm" style={{ marginTop: 8 }} onClick={() => agregarTelefono(idx)}>+ Agregar otro número</button>
                  </div>

                  <div className="form-row-3">
                    <div className="form-group">
                      <label className="form-label">Costo ($)</label>
                      <input className="form-input" type="number" value={f.costo} onChange={e => actualizarFila(idx, 'costo', e.target.value)} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cantidad de personas</label>
                      <input className="form-input" type="number" value={f.personas} onChange={e => actualizarFila(idx, 'personas', e.target.value)} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Capacidad máxima</label>
                      <input className="form-input" type="number" value={f.capacidadMaxima} onChange={e => actualizarFila(idx, 'capacidadMaxima', e.target.value)} placeholder="0" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notas</label>
                    <textarea className="form-input" rows={2} value={f.notas} onChange={e => actualizarFila(idx, 'notas', e.target.value)} placeholder="Ej: 2 turnos, solo teléfono, descuento aplicado..." />
                  </div>
                </div>
              ))}

              {!editando && (
                <button className="btn btn-light btn-sm" style={{ marginTop: 14 }} onClick={agregarFila}>+ Agregar otro hotel / salón</button>
              )}

              {errorForm && (
                <div style={{ background: '#f6dcde', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginTop: 14 }}>
                  {errorForm}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={guardando}>
                {guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : `Agregar${filas.length > 1 ? ` (${filas.length})` : ''}`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
