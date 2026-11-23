import { useState, useEffect } from 'react';
import { listEventos, updateEvento } from '../lib/eventos';
import { listTareas } from '../lib/tareas';
import { listGastos } from '../lib/gastos';
import { listGiras, createGira, updateGira, deleteGira } from '../lib/giras';
import Topbar from '../components/Topbar';
import TarjetaGira from '../components/TarjetaGira';
import { useEditable, useSesion } from '../lib/sesion';
import { IconMapPin, IconCheckCircle, IconCoin, IconAlertTriangle, IconEdit, IconTrash } from '../icons';

const categorias = ['Hospedaje', 'Permisos', 'Producción', 'Salón', 'Sorteo', 'Transporte', 'Viáticos', 'Vuelos', 'Vuelos SS', 'Otro'];
const tagEstado = { 'Confirmado': 'tag-blue', 'En Planeación': 'tag-cyan', 'Borrador': 'tag-gray', 'En Curso': 'tag-green', 'Completado': 'tag-navy', 'Cancelado': 'tag-red' };

function montoMXN(g) {
  return g.moneda === 'USD' ? g.monto * (Number(g.tipoCambio) || 0) : g.monto;
}

// Para el total en dólares de una gira en USD: si el gasto ya se capturó en dólares se
// usa tal cual (sin volver a convertir), y solo los gastos capturados en pesos se pasan
// a dólares con el tipo de cambio de referencia de la gira.
function montoUSD(g, tipoCambioRef) {
  if (g.moneda === 'USD') return g.monto;
  return tipoCambioRef > 0 ? g.monto / tipoCambioRef : 0;
}

function fechaBonita(f) {
  if (!f) return '—';
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fm(valor) {
  return Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function obtenerTipoCambioUSD() {
  const hoy = new Date().toISOString().slice(0, 10);
  try {
    const cache = JSON.parse(localStorage.getItem('lc_tipo_cambio_usd') || 'null');
    if (cache && cache.fecha === hoy) return cache.valor;
  } catch {
    // caché corrupto, seguimos y lo pedimos de nuevo
  }
  const res = await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=MXN');
  if (!res.ok) throw new Error('No se pudo consultar el tipo de cambio.');
  const data = await res.json();
  const valor = data.rates?.MXN;
  if (!valor) throw new Error('Respuesta inesperada del servicio de tipo de cambio.');
  localStorage.setItem('lc_tipo_cambio_usd', JSON.stringify({ fecha: hoy, valor }));
  return valor;
}

const FORM_VACIO = { nombre: '', fechaInicio: '', fechaFin: '', notas: '', monedaPrincipal: 'MXN', tipoCambioReferencia: '' };

export default function Giras() {
  const editable = useEditable('giras');
  // Conectar/desconectar eventos cambia la tabla de eventos: pide ambos permisos.
  const editaEventos = useEditable('eventos');
  const { puedeVer } = useSesion();
  const verChecklist = puedeVer('checklist');
  const verGastos = puedeVer('gastos');
  const editaConexiones = editable && editaEventos;
  const [eventos, setEventos] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [giras, setGiras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [giraAbierta, setGiraAbierta] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editandoGira, setEditandoGira] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [cargandoTC, setCargandoTC] = useState(false);
  const [errorTC, setErrorTC] = useState('');

  async function autoTipoCambio() {
    setCargandoTC(true);
    setErrorTC('');
    try {
      const valor = await obtenerTipoCambioUSD();
      setForm(p => ({ ...p, tipoCambioReferencia: valor }));
    } catch (err) {
      setErrorTC('No se pudo obtener el tipo de cambio automático — ingrésalo a mano.');
    } finally {
      setCargandoTC(false);
    }
  }

  useEffect(() => {
    Promise.all([listEventos(), listTareas(), listGastos(), listGiras()])
      .then(([ev, ta, ga, gi]) => { setEventos(ev); setTareas(ta); setGastos(ga); setGiras(gi); })
      .finally(() => setCargando(false));
  }, []);

  const eventosVisibles = eventos.filter(e => !e.oculto);

  function abrirNuevaGira() {
    setEditandoGira(null);
    setErrorForm('');
    setErrorTC('');
    setForm(FORM_VACIO);
    setShowModal(true);
  }

  function abrirEditarGira(gira) {
    setEditandoGira(gira.id);
    setErrorForm('');
    setErrorTC('');
    setForm({
      nombre: gira.nombre, fechaInicio: gira.fechaInicio, fechaFin: gira.fechaFin, notas: gira.notas,
      monedaPrincipal: gira.monedaPrincipal || 'MXN', tipoCambioReferencia: gira.tipoCambioReferencia,
    });
    setShowModal(true);
  }

  async function guardarGira() {
    if (!form.nombre) {
      setErrorForm('Falta el nombre de la gira.');
      return;
    }
    if (form.monedaPrincipal === 'USD' && !(Number(form.tipoCambioReferencia) > 0)) {
      setErrorForm('Falta un tipo de cambio de referencia válido (mayor a cero) para convertir esta gira a dólares.');
      return;
    }
    setErrorForm('');
    setGuardando(true);
    try {
      if (editandoGira) {
        const actualizada = await updateGira({ ...form, id: editandoGira });
        setGiras(giras.map(g => g.id === editandoGira ? actualizada : g));
      } else {
        const creada = await createGira({ ...form, id: Date.now() });
        setGiras([...giras, creada]);
      }
      setShowModal(false);
    } catch (err) {
      setErrorForm(`No se pudo guardar: ${err.message || 'error de conexión con la base de datos.'}`);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarGira(id) {
    if (!confirm('¿Eliminar esta gira? Los eventos que tenía asignados se quedan sin gira, pero no se borran.')) return;
    try {
      await deleteGira(id);
      setGiras(giras.filter(g => g.id !== id));
      setEventos(prev => prev.map(e => e.giraId === id ? { ...e, giraId: null } : e));
      if (giraAbierta === id) setGiraAbierta(null);
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  async function toggleEventoEnGira(evento, giraId) {
    try {
      const nuevoGiraId = evento.giraId === giraId ? null : giraId;
      const actualizado = await updateEvento({ ...evento, giraId: nuevoGiraId });
      setEventos(prev => prev.map(e => e.id === evento.id ? actualizado : e));
    } catch (err) {
      alert(`No se pudo actualizar: ${err.message || 'error de conexión.'}`);
    }
  }

  const girasConDatos = giras.map(gira => {
    const eventosGira = eventosVisibles.filter(e => e.giraId === gira.id).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const idsGira = new Set(eventosGira.map(e => e.id));
    const tareasGira = tareas.filter(t => idsGira.has(t.eventoId));
    const completadas = tareasGira.filter(t => t.estado === 'Completado').length;
    const totalTareas = tareasGira.length;
    const pctChecklist = totalTareas > 0 ? Math.round(completadas / totalTareas * 100) : null;
    const pendientes = tareasGira.filter(t => t.estado !== 'Completado')
      .sort((a, b) => new Date(a.fechaLimite || '9999-12-31') - new Date(b.fechaLimite || '9999-12-31'));
    const gastosGira = gastos.filter(g => idsGira.has(g.eventoId));
    const totalGasto = gastosGira.reduce((a, g) => a + montoMXN(g), 0);
    const esUSD = gira.monedaPrincipal === 'USD' && Number(gira.tipoCambioReferencia) > 0;
    const totalGastoUSD = esUSD ? gastosGira.reduce((a, g) => a + montoUSD(g, Number(gira.tipoCambioReferencia)), 0) : null;
    const porCategoriaGira = categorias.map(cat => {
      const items = gastosGira.filter(g => g.categoria === cat);
      const total = items.reduce((a, g) => a + montoMXN(g), 0);
      const usd = esUSD ? items.reduce((a, g) => a + montoUSD(g, Number(gira.tipoCambioReferencia)), 0) : null;
      return { cat, total, usd };
    }).filter(c => c.total > 0);
    return { ...gira, eventos: eventosGira, tareasGira, completadas, totalTareas, pctChecklist, pendientes, gastosGira, totalGasto, totalGastoUSD, porCategoriaGira };
  });

  const giraSeleccionada = girasConDatos.find(g => g.id === giraAbierta) || null;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Giras</div>
          <div className="page-subtitle">crea la gira con sus fechas y conéctala con sus eventos, checklist y gastos</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {editable && <button className="btn btn-primary" onClick={abrirNuevaGira}>+ Nueva gira</button>}
          <Topbar hideSearch />
        </div>
      </div>

      <div className="page-body">
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando giras...</div>
        ) : girasConDatos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 14 }}>Todavía no tienes ninguna gira creada.</div>
            {editable && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={abrirNuevaGira}>Crear la primera gira</button>}
          </div>
        ) : (
          <div className="grid-3">
            {girasConDatos.map(g => (
              <TarjetaGira key={g.id} gira={g} onClick={() => setGiraAbierta(g.id)} />
            ))}
          </div>
        )}
      </div>

      {giraSeleccionada && (
        <div className="drawer-backdrop" onClick={e => e.target === e.currentTarget && setGiraAbierta(null)}>
          <div className="drawer" style={{ maxWidth: 480 }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 19, color: 'var(--text-primary)' }}>{giraSeleccionada.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {fechaBonita(giraSeleccionada.fechaInicio)} → {fechaBonita(giraSeleccionada.fechaFin)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                {editable && <button className="btn btn-ghost btn-sm" title="Editar gira" onClick={() => abrirEditarGira(giraSeleccionada)}><IconEdit /></button>}
                {editable && <button className="btn btn-ghost btn-sm" title="Eliminar gira" onClick={() => eliminarGira(giraSeleccionada.id)}><IconTrash /></button>}
                <button className="close-btn" onClick={() => setGiraAbierta(null)}>×</button>
              </div>
            </div>

            <div style={{ padding: 22 }}>
              {giraSeleccionada.notas && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20, fontStyle: 'italic' }}>{giraSeleccionada.notas}</div>
              )}

              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  <IconMapPin /> Eventos conectados ({giraSeleccionada.eventos.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {giraSeleccionada.eventos.map(e => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: 'var(--royal-soft)' }}>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nombre}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace', flexShrink: 0 }}>{fechaBonita(e.fecha)}</span>
                      {editaConexiones && <button className="btn btn-ghost btn-sm" title="Desconectar de esta gira" onClick={() => toggleEventoEnGira(e, giraSeleccionada.id)}><IconTrash /></button>}
                    </div>
                  ))}
                  {giraSeleccionada.eventos.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Todavía no tienes ningún evento conectado a esta gira.</div>
                  )}
                </div>
                {editaConexiones && <select
                  className="form-input"
                  style={{ fontSize: 12 }}
                  value=""
                  onChange={e => {
                    const evento = eventosVisibles.find(x => String(x.id) === e.target.value);
                    if (evento) toggleEventoEnGira(evento, giraSeleccionada.id);
                  }}
                >
                  <option value="">+ Conectar un evento...</option>
                  {[...eventosVisibles]
                    .filter(e => e.giraId !== giraSeleccionada.id)
                    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
                    .map(e => {
                      const otraGira = e.giraId ? giras.find(g => g.id === e.giraId) : null;
                      return (
                        <option key={e.id} value={e.id}>
                          {e.nombre} — {fechaBonita(e.fecha)}{otraGira ? ` (en ${otraGira.nombre})` : ''}
                        </option>
                      );
                    })}
                </select>}
                {editaConexiones && eventosVisibles.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Todavía no tienes eventos creados en Eventos.</div>
                )}
              </div>

              {verChecklist && <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  <IconCheckCircle /> Checklist
                </div>
                {giraSeleccionada.totalTareas === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin tareas registradas en esta gira.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {giraSeleccionada.completadas}/{giraSeleccionada.totalTareas} tareas completadas · {giraSeleccionada.pctChecklist}%
                    </div>
                    <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ width: `${giraSeleccionada.pctChecklist}%`, height: '100%', background: giraSeleccionada.pctChecklist === 100 ? 'var(--accent-green)' : 'var(--royal)' }} />
                    </div>
                    {giraSeleccionada.pendientes.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {giraSeleccionada.pendientes.slice(0, 8).map(t => {
                          const evento = giraSeleccionada.eventos.find(e => e.id === t.eventoId);
                          const isVencida = t.fechaLimite && new Date(t.fechaLimite) < new Date();
                          return (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                              <span style={{ color: 'var(--text-primary)' }}>{t.titulo} <span style={{ color: 'var(--text-muted)' }}>({evento?.nombre})</span></span>
                              {t.fechaLimite && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: isVencida ? 'var(--accent-red)' : 'var(--text-muted)', fontFamily: 'Fira Code, monospace', flexShrink: 0 }}>
                                  {isVencida && <IconAlertTriangle />} {t.fechaLimite}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {giraSeleccionada.pendientes.length > 8 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{giraSeleccionada.pendientes.length - 8} tareas pendientes más</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>}

              {verGastos && <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  <IconCoin /> Gastos
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--royal)', fontFamily: 'Playfair Display, serif', marginBottom: 2 }}>
                  {giraSeleccionada.totalGastoUSD != null ? `US$${fm(giraSeleccionada.totalGastoUSD)}` : `$${fm(giraSeleccionada.totalGasto)}`}
                </div>
                {giraSeleccionada.totalGastoUSD != null && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>≈ ${fm(giraSeleccionada.totalGasto)} MXN</div>
                )}
                {giraSeleccionada.totalGastoUSD == null && <div style={{ marginBottom: 10 }} />}
                {giraSeleccionada.porCategoriaGira.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {giraSeleccionada.porCategoriaGira.map(c => (
                      <div key={c.cat} style={{ fontSize: 10, background: 'var(--royal-soft)', color: 'var(--royal)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                        {c.usd != null ? `${c.cat}: US$${fm(c.usd)}` : `${c.cat}: $${fm(c.total)}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>}
            </div>
          </div>
        </div>
      )}

      {editable && showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editandoGira ? 'Editar gira' : 'Nueva gira'}</span>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre de la gira</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Gira Septiembre MX" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha inicio</label>
                  <input className="form-input" type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha fin</label>
                  <input className="form-input" type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Moneda principal de esta gira</label>
                <select className="form-input" value={form.monedaPrincipal} onChange={e => {
                  const moneda = e.target.value;
                  setForm(p => ({ ...p, monedaPrincipal: moneda }));
                  if (moneda === 'USD' && !form.tipoCambioReferencia) autoTipoCambio();
                }}>
                  <option value="MXN">Pesos (MXN) — gira en México</option>
                  <option value="USD">Dólares (USD) — gira en USA</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Si la marcas en dólares, el total de la gira (incluyendo lo que captures en pesos) se va a mostrar convertido a dólares.
                </div>
              </div>
              {form.monedaPrincipal === 'USD' && (
                <div className="form-group">
                  <label className="form-label">Tipo de cambio de referencia (pesos por dólar)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" type="number" step="0.01" min="0" value={form.tipoCambioReferencia} onChange={e => setForm(p => ({ ...p, tipoCambioReferencia: e.target.value }))} placeholder="Ej: 18.50" style={{ flex: 1 }} />
                    <button type="button" className="btn btn-outline btn-sm" onClick={autoTipoCambio} disabled={cargandoTC}>
                      {cargandoTC ? '...' : '↻ Hoy'}
                    </button>
                  </div>
                  {errorTC && <div style={{ fontSize: 11, color: 'var(--accent-red)', marginTop: 4 }}>{errorTC}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Se usa para convertir a dólares los gastos que captures en pesos dentro de esta gira. Puedes ajustarlo cuando quieras.
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Notas (opcional)</label>
                <textarea className="form-input" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Detalles de la gira..." />
              </div>
              {!editandoGira && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Después de crearla, ábrela para conectarle los eventos que ya tengas armados.</div>
              )}
              {errorForm && (
                <div style={{ background: '#f6dcde', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginTop: 10 }}>
                  {errorForm}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarGira} disabled={guardando}>
                {guardando ? 'Guardando...' : (editandoGira ? 'Guardar cambios' : 'Crear gira')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
