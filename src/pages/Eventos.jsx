import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { estadosEvento } from '../data';
import { IconChevronDown } from '../icons';
import TarjetaEvento from '../components/TarjetaEvento';
import { listEventos, createEvento, updateEvento, deleteEvento } from '../lib/eventos';
import { listEquipo, listEquipoPublico } from '../lib/equipo';
import { listGastos } from '../lib/gastos';
import { listGiras } from '../lib/giras';
import Topbar from '../components/Topbar';
import { useEditable, useSesion } from '../lib/sesion';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function claveMes(fecha) {
  return fecha ? fecha.slice(0, 7) : 'sin-fecha';
}

function nombreMes(clave) {
  if (clave === 'sin-fecha') return 'Sin fecha';
  const [y, m] = clave.split('-');
  return `${MESES[Number(m) - 1]} ${y}`;
}

export default function Eventos() {
  const editable = useEditable('eventos');
  const esAdmin = useSesion().persona.esAdmin;
  const [searchParams, setSearchParams] = useSearchParams();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [gastos, setGastos] = useState([]);
  useEffect(() => { listGastos().then(setGastos); }, []);
  const [equipo, setEquipo] = useState([]);
  useEffect(() => { (esAdmin ? listEquipo() : listEquipoPublico()).then(setEquipo); }, [esAdmin]);
  const [giras, setGiras] = useState([]);
  useEffect(() => { listGiras().then(setGiras); }, []);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [expandidos, setExpandidos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [form, setForm] = useState({ nombre: '', fecha: '', fechaFin: '', hora: '', horaFin: '', lugar: '', aforo: 1000, registrados: 0, estado: 'Borrador', descripcion: '', responsable: '', color: '#1d4ed8', miembros: [], oculto: false, giraId: '' });
  const [verOcultos, setVerOcultos] = useState(false);
  const [mesesCerrados, setMesesCerrados] = useState(() => new Set());

  function toggleMes(clave) {
    setMesesCerrados(prev => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave); else next.add(clave);
      return next;
    });
  }

  useEffect(() => {
    listEventos().then(setEventos).finally(() => setCargando(false));
  }, []);

  function abrirNuevo() {
    setEditando(null);
    setErrorForm('');
    setForm({ nombre: '', fecha: '', fechaFin: '', hora: '', horaFin: '', lugar: '', aforo: 1000, registrados: 0, estado: 'Borrador', descripcion: '', responsable: '', color: '#1d4ed8', miembros: [], oculto: false, giraId: '' });
    setShowModal(true);
  }

  function abrirEditar(e) { setEditando(e.id); setErrorForm(''); setForm({ ...e, miembros: e.miembros || [] }); setShowModal(true); }

  // Si llegamos desde el Calendario con ?editar=<id>, abrimos ese evento directo.
  useEffect(() => {
    const idEditar = searchParams.get('editar');
    if (!idEditar || eventos.length === 0) return;
    const encontrado = eventos.find(e => String(e.id) === idEditar);
    if (encontrado) {
      if (editable) abrirEditar(encontrado);
      else {
        // Solo lectura: en vez de abrir el formulario, lleva a la tarjeta del evento.
        if (encontrado.oculto) setVerOcultos(true);
        setMesesCerrados(prev => { const n = new Set(prev); n.delete(claveMes(encontrado.fecha)); return n; });
        setTimeout(() => document.getElementById(`evento-${encontrado.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      }
    }
    setSearchParams(params => { params.delete('editar'); return params; }, { replace: true });
  }, [searchParams, eventos, editable]);

  function toggleMiembro(id) {
    setForm(p => ({ ...p, miembros: p.miembros.includes(id) ? p.miembros.filter(m => m !== id) : [...p.miembros, id] }));
  }

  async function save() {
    if (!form.nombre || !form.fecha) {
      setErrorForm('Falta el nombre del evento o la fecha de inicio — esos dos son obligatorios.');
      return;
    }
    setErrorForm('');
    setGuardando(true);
    try {
      if (editando) {
        const actualizado = await updateEvento({ ...form, id: editando });
        setEventos(eventos.map(e => e.id === editando ? actualizado : e));
      } else {
        const creado = await createEvento({ ...form, id: Date.now() });
        setEventos([...eventos, creado]);
      }
      setShowModal(false);
    } catch (err) {
      setErrorForm(`No se pudo guardar: ${err.message || 'error de conexión con la base de datos.'}`);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      await deleteEvento(id);
      setEventos(eventos.filter(e => e.id !== id));
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  function toggleExpandido(id) { setExpandidos(p => ({ ...p, [id]: !p[id] })); }

  const ocultosCount = eventos.filter(e => e.oculto).length;
  const eventosMostrados = verOcultos ? eventos : eventos.filter(e => !e.oculto);

  const porMes = {};
  eventosMostrados.forEach(e => {
    const clave = claveMes(e.fecha);
    (porMes[clave] = porMes[clave] || []).push(e);
  });
  Object.values(porMes).forEach(lista => lista.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')));
  const mesesOrdenados = Object.keys(porMes).sort();

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Eventos</div>
          <div className="page-subtitle">{eventos.filter(e => !e.oculto).length} eventos registrados</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {ocultosCount > 0 && (
            <button className="btn btn-outline" onClick={() => setVerOcultos(v => !v)}>
              {verOcultos ? 'Ocultar plantillas' : `Ver ocultos (${ocultosCount})`}
            </button>
          )}
          {editable && <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo Evento</button>}
          <Topbar hideSearch />
        </div>
      </div>

      <div className="page-body">
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando eventos...</div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {mesesOrdenados.map(clave => {
            const eventosDelMes = porMes[clave];
            const expandido = !mesesCerrados.has(clave);
            return (
              <div key={clave} className="relieve" style={{ borderRadius: 18, overflow: 'hidden' }}>
                <button
                  onClick={() => toggleMes(clave)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(180deg, #f3e3c0, #e3cb98)', borderLeft: '5px solid #7a2340',
                    borderBottom: expandido ? '1px solid #d9bf8c' : 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 20, color: '#3c1a12', textTransform: 'capitalize' }}>{nombreMes(clave)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3c1a12' }}>
                    {eventosDelMes.length} evento{eventosDelMes.length !== 1 ? 's' : ''}
                    <IconChevronDown width={16} height={16} strokeWidth={2.4} style={{ transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </span>
                </button>

                {expandido && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16, padding: 18 }}>
                  {eventosDelMes.map(e => {
            const gastosDelEvento = gastos.filter(g => g.eventoId === e.id);
            return (
              <TarjetaEvento
                key={e.id}
                evento={e}
                gira={e.giraId ? giras.find(g => g.id === e.giraId) : null}
                equipo={equipo}
                gastosDelEvento={gastosDelEvento}
                totalGastos={gastosDelEvento.reduce((a, g) => a + g.monto, 0)}
                ancha={eventosDelMes.length === 1}
                gastosAbiertos={!!expandidos[e.id]}
                onToggleGastos={() => toggleExpandido(e.id)}
                onEditar={() => abrirEditar(e)}
                onEliminar={() => eliminar(e.id)}
                editable={editable}
              />
            );
                  })}
                </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {editable && showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editando ? 'Editar Evento' : 'Nuevo Evento'}</span>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre del evento</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Conferencia Anual 2026" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha inicio</label>
                  <input className="form-input" type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha fin</label>
                  <input className="form-input" type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hora inicio</label>
                  <input className="form-input" type="time" value={form.hora} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora fin</label>
                  <input className="form-input" type="time" value={form.horaFin} onChange={e => setForm(p => ({ ...p, horaFin: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Lugar / Venue</label>
                <input className="form-input" value={form.lugar} onChange={e => setForm(p => ({ ...p, lugar: e.target.value }))} placeholder="Nombre y ciudad del venue" />
              </div>
              <div className="form-group">
                <label className="form-label">Gira (opcional)</label>
                <select className="form-input" value={form.giraId || ''} onChange={e => setForm(p => ({ ...p, giraId: e.target.value ? Number(e.target.value) : '' }))}>
                  <option value="">Sin gira</option>
                  {giras.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {giras.length === 0 ? 'Todavía no tienes ninguna gira creada — créala primero en la sección Giras.' : 'Las giras se crean desde la sección Giras.'}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Aforo máximo</label>
                  <input className="form-input" type="number" value={form.aforo} onChange={e => setForm(p => ({ ...p, aforo: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Registrados</label>
                  <input className="form-input" type="number" value={form.registrados} onChange={e => setForm(p => ({ ...p, registrados: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                    {estadosEvento.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Responsable</label>
                  <input className="form-input" value={form.responsable} onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Color identificador</label>
                  <input className="form-input" type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Equipo asignado</label>
                {equipo.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aún no tienes personas registradas en Equipo.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {equipo.map(m => {
                      const activo = form.miembros.includes(m.id);
                      return (
                        <button key={m.id} type="button" onClick={() => toggleMiembro(m.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 5px',
                            borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            border: activo ? `1.5px solid ${m.color}` : '1.5px solid var(--border)',
                            background: activo ? 'var(--royal-soft)' : 'transparent',
                            color: activo ? 'var(--royal)' : 'var(--text-secondary)',
                          }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: m.color, color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.iniciales}</span>
                          {m.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-input" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del evento..." />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="ocultoEvento" checked={!!form.oculto} onChange={e => setForm(p => ({ ...p, oculto: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="ocultoEvento" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Ocultar este evento (plantilla / referencia, no estorba en las vistas)</label>
              </div>
              {errorForm && (
                <div style={{ background: '#f6dcde', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  {errorForm}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={guardando}>
                {guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Crear evento')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
