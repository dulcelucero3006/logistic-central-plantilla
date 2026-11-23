import { useState, useEffect } from 'react';
import { estadosTarea } from '../data';
import { IconEdit, IconTrash, IconCalendar, IconUser, IconAlertTriangle, IconCheckCircle } from '../icons';
import { listEventos } from '../lib/eventos';
import { listTareas, createTareas, updateTarea, deleteTarea } from '../lib/tareas';
import Topbar from '../components/Topbar';
import { useEditable } from '../lib/sesion';
import { listGiras } from '../lib/giras';

const tagColor = { 'Pendiente': 'tag-gray', 'En Proceso': 'tag-blue', 'Completado': 'tag-green', 'Bloqueado': 'tag-red' };

export default function Checklist() {
  const editable = useEditable('checklist');
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [eventos, setEventos] = useState([]);
  useEffect(() => { listEventos().then(setEventos); }, []);
  const [giras, setGiras] = useState([]);
  useEffect(() => { listGiras().then(setGiras); }, []);
  useEffect(() => { listTareas().then(setTareas).finally(() => setCargando(false)); }, []);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [seleccionKey, setSeleccionKey] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const filaVacia = { titulo: '', fechaLimite: '', descripcion: '' };
  const [form, setForm] = useState({ eventoId: eventos[0]?.id || null, filas: [{ ...filaVacia }] });
  const [insertContext, setInsertContext] = useState(null);
  const [gruposEditando, setGruposEditando] = useState(new Set());
  const [verCompletados, setVerCompletados] = useState(false);
  const [girasExpandidas, setGirasExpandidas] = useState(new Set());

  function toggleGira(nombreGira) {
    setGirasExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(nombreGira)) next.delete(nombreGira); else next.add(nombreGira);
      return next;
    });
  }

  function agruparPorGira(grupos) {
    const porGiraId = {};
    const sinGira = [];
    grupos.forEach(g => {
      const giraId = g.evento?.giraId || null;
      if (giraId) (porGiraId[giraId] = porGiraId[giraId] || []).push(g);
      else sinGira.push(g);
    });
    const girasOrdenadas = Object.keys(porGiraId).map(Number)
      .sort((a, b) => (giras.find(x => x.id === a)?.nombre || '').localeCompare(giras.find(x => x.id === b)?.nombre || '', 'es'));
    return { porGiraId, girasOrdenadas, sinGira };
  }

  const [showDuplicar, setShowDuplicar] = useState(false);
  const [eventoOrigen, setEventoOrigen] = useState('');
  const [eventoDestino, setEventoDestino] = useState('');
  const [errorDuplicar, setErrorDuplicar] = useState('');
  const [duplicando, setDuplicando] = useState(false);

  function abrirNuevo() {
    setEditando(null);
    setErrorForm('');
    setInsertContext(null);
    setForm({ eventoId: eventos[0]?.id || null, filas: [{ ...filaVacia }] });
    setShowModal(true);
  }

  function abrirEditar(t) {
    setEditando(t.id);
    setErrorForm('');
    setInsertContext(null);
    setForm({ eventoId: t.eventoId, filas: [{ titulo: t.titulo, fechaLimite: t.fechaLimite || '', descripcion: t.descripcion || '' }] });
    setShowModal(true);
  }

  function abrirNuevoEnPosicion(eventoId, grupoTareas, posicion) {
    setEditando(null);
    setErrorForm('');
    setInsertContext({ eventoId, grupoTareas, posicion });
    setForm({ eventoId, filas: [{ ...filaVacia }] });
    setShowModal(true);
  }

  function toggleEdicionGrupo(key) {
    setGruposEditando(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function moverTarea(grupoTareas, idx, direccion) {
    const otroIdx = direccion === 'up' ? idx - 1 : idx + 1;
    if (otroIdx < 0 || otroIdx >= grupoTareas.length) return;
    const reordenadas = [...grupoTareas];
    [reordenadas[idx], reordenadas[otroIdx]] = [reordenadas[otroIdx], reordenadas[idx]];
    const conOrden = reordenadas.map((t, i) => ({ ...t, orden: i * 10 }));
    try {
      const actualizadas = await Promise.all(conOrden.map(t => updateTarea(t)));
      setTareas(prev => prev.map(x => actualizadas.find(u => u.id === x.id) || x));
    } catch (err) {
      alert(`No se pudo reordenar: ${err.message || 'error de conexión.'}`);
    }
  }

  function actualizarFila(idx, campo, valor) {
    setForm(p => ({ ...p, filas: p.filas.map((f, i) => i === idx ? { ...f, [campo]: valor } : f) }));
  }

  function agregarFila() { setForm(p => ({ ...p, filas: [...p.filas, { ...filaVacia }] })); }

  function quitarFila(idx) { setForm(p => ({ ...p, filas: p.filas.filter((_, i) => i !== idx) })); }

  async function save() {
    if (editando) {
      const fila = form.filas[0];
      if (!fila.titulo) { setErrorForm('Falta el nombre de la tarea.'); return; }
    } else if (!form.filas.some(f => f.titulo.trim())) {
      setErrorForm('Agrega al menos una tarea con nombre.');
      return;
    }
    setErrorForm('');
    setGuardando(true);
    try {
      if (editando) {
        const fila = form.filas[0];
        const t = tareas.find(x => x.id === editando);
        const actualizada = await updateTarea({ ...t, titulo: fila.titulo, fechaLimite: fila.fechaLimite, descripcion: fila.descripcion, eventoId: form.eventoId });
        setTareas(tareas.map(x => x.id === editando ? actualizada : x));
      } else {
        const nuevasBase = form.filas.filter(f => f.titulo.trim()).map(f => ({
          titulo: f.titulo,
          descripcion: f.descripcion,
          estado: 'Pendiente',
          prioridad: 'Media',
          fechaLimite: f.fechaLimite,
          responsable: '',
          eventoId: form.eventoId,
        }));

        if (insertContext) {
          const { grupoTareas, posicion } = insertContext;
          const antes = grupoTareas.slice(0, posicion).map(t => ({ ...t, esNueva: false }));
          const despues = grupoTareas.slice(posicion).map(t => ({ ...t, esNueva: false }));
          const nuevasConId = nuevasBase.map((n, i) => ({ ...n, id: Date.now() + i, esNueva: true }));
          const combinada = [...antes, ...nuevasConId, ...despues].map((t, i) => ({ ...t, orden: i * 10 }));
          const paraCrear = combinada.filter(t => t.esNueva).map(({ esNueva, ...rest }) => rest);
          const paraActualizar = combinada.filter(t => !t.esNueva).map(({ esNueva, ...rest }) => rest);
          const [actualizadas, creadas] = await Promise.all([
            Promise.all(paraActualizar.map(t => updateTarea(t))),
            createTareas(paraCrear),
          ]);
          setTareas(prev => {
            const idsGrupo = new Set(grupoTareas.map(g => g.id));
            const sinGrupoViejo = prev.filter(x => !idsGrupo.has(x.id));
            return [...sinGrupoViejo, ...actualizadas, ...creadas];
          });
        } else {
          const creadas = await createTareas(nuevasBase.map((n, i) => ({ ...n, id: Date.now() + i })));
          setTareas([...tareas, ...creadas]);
        }
      }
      setShowModal(false);
      setInsertContext(null);
    } catch (err) {
      setErrorForm(`No se pudo guardar: ${err.message || 'error de conexión con la base de datos.'}`);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await deleteTarea(id);
      setTareas(tareas.filter(t => t.id !== id));
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  async function eliminarChecklistCompleto(grupoTareas, nombreEvento) {
    if (!confirm(`¿Borrar TODAS las tareas del checklist de "${nombreEvento}"? (${grupoTareas.length} tarea${grupoTareas.length !== 1 ? 's' : ''}) Esto no se puede deshacer.`)) return;
    try {
      await Promise.all(grupoTareas.map(t => deleteTarea(t.id)));
      const idsBorrados = new Set(grupoTareas.map(t => t.id));
      setTareas(prev => prev.filter(t => !idsBorrados.has(t.id)));
    } catch (err) {
      alert(`No se pudo borrar el checklist: ${err.message || 'error de conexión.'}`);
    }
  }

  async function avanzarEstado(t) {
    try {
      const estados = estadosTarea.filter(e => e !== 'Completado' && e !== 'Bloqueado');
      const idx = estados.indexOf(t.estado);
      const next = idx >= 0 && idx < estados.length - 1 ? estados[idx + 1] : 'Completado';
      const actualizada = await updateTarea({ ...t, estado: next });
      setTareas(tareas.map(x => x.id === t.id ? actualizada : x));
    } catch (err) {
      alert(`No se pudo actualizar: ${err.message || 'error de conexión.'}`);
    }
  }

  async function toggleCompletado(t) {
    try {
      const next = t.estado === 'Completado' ? 'Pendiente' : 'Completado';
      const actualizada = await updateTarea({ ...t, estado: next });
      setTareas(tareas.map(x => x.id === t.id ? actualizada : x));
    } catch (err) {
      alert(`No se pudo actualizar: ${err.message || 'error de conexión.'}`);
    }
  }

  async function duplicarChecklist() {
    if (!eventoOrigen || !eventoDestino || eventoOrigen === eventoDestino) return;
    setErrorDuplicar('');
    setDuplicando(true);
    try {
      const origenId = Number(eventoOrigen);
      const destinoId = Number(eventoDestino);
      const tareasOrigen = tareas.filter(t => t.eventoId === origenId).sort((a, b) => {
        if (a.orden != null && b.orden != null) return a.orden - b.orden;
        if (a.orden != null) return -1;
        if (b.orden != null) return 1;
        return new Date(a.fechaLimite || '9999-12-31') - new Date(b.fechaLimite || '9999-12-31');
      });
      const tareasDestino = tareas.filter(t => t.eventoId === destinoId);
      const yaExisten = new Set(tareasDestino.map(t => t.titulo));
      const maxOrdenDestino = tareasDestino.reduce((m, t) => t.orden != null ? Math.max(m, t.orden) : m, -10);
      const nuevas = tareasOrigen.filter(t => !yaExisten.has(t.titulo)).map((t, i) => ({
        titulo: t.titulo,
        descripcion: t.descripcion,
        estado: 'Pendiente',
        prioridad: t.prioridad,
        fechaLimite: '',
        responsable: t.responsable,
        eventoId: destinoId,
        orden: maxOrdenDestino + (i + 1) * 10,
      }));
      const creadas = nuevas.length > 0 ? await createTareas(nuevas.map((n, i) => ({ ...n, id: Date.now() + i }))) : [];
      setTareas([...tareas, ...creadas]);
      setShowDuplicar(false);
      setEventoOrigen('');
      setEventoDestino('');
    } catch (err) {
      setErrorDuplicar(`No se pudo duplicar: ${err.message || 'error de conexión con la base de datos.'}`);
    } finally {
      setDuplicando(false);
    }
  }

  const eventosVisibles = eventos.filter(e => !e.oculto);
  const idsOcultos = new Set(eventos.filter(e => e.oculto).map(e => e.id));

  let lista = tareas.filter(t => !idsOcultos.has(t.eventoId));
  lista = [...lista].sort((a, b) => {
    if (a.orden != null && b.orden != null) return a.orden - b.orden;
    if (a.orden != null) return -1;
    if (b.orden != null) return 1;
    return new Date(a.fechaLimite || '9999-12-31') - new Date(b.fechaLimite || '9999-12-31');
  });

  const porEvento = {};
  lista.forEach(t => {
    const key = t.eventoId || 'sin-evento';
    (porEvento[key] = porEvento[key] || []).push(t);
  });
  const grupos = [...eventosVisibles.map(e => e.id), 'sin-evento']
    .filter(key => porEvento[key])
    .map(key => ({ evento: key === 'sin-evento' ? null : eventosVisibles.find(e => e.id === key), tareas: porEvento[key] }));

  const gruposActivos = grupos.filter(g => g.tareas.some(t => t.estado !== 'Completado'));
  const gruposCompletados = grupos.filter(g => g.tareas.length > 0 && g.tareas.every(t => t.estado === 'Completado'));

  const todosGrupos = [...gruposActivos, ...(verCompletados ? gruposCompletados : [])];
  const keyDe = g => (g.evento ? g.evento.id : 'sin-evento');
  const grupoSeleccionado = todosGrupos.find(g => keyDe(g) === seleccionKey) || todosGrupos[0] || null;
  const keySeleccion = grupoSeleccionado ? keyDe(grupoSeleccionado) : null;

  const tareasVisiblesTotal = tareas.filter(t => !idsOcultos.has(t.eventoId));
  const completadas = tareasVisiblesTotal.filter(t => t.estado === 'Completado').length;
  const total = tareasVisiblesTotal.length;
  const pct = total > 0 ? Math.round(completadas / total * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Checklist</div>
          <div className="page-subtitle">{completadas}/{total} tareas completadas · {pct}%</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {gruposCompletados.length > 0 && (
            <button className="btn btn-outline" onClick={() => setVerCompletados(v => !v)}>
              {verCompletados ? 'Ocultar completados' : `Ver completados (${gruposCompletados.length})`}
            </button>
          )}
          {editable && <button className="btn btn-outline" onClick={() => setShowDuplicar(true)}>Duplicar checklist</button>}
          {editable && <button className="btn btn-primary" onClick={abrirNuevo}>+ Checklist</button>}
          <Topbar hideSearch />
        </div>
      </div>

      <div className="page-body">
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando checklist...</div>
        ) : grupos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IconCheckCircle width={32} height={32} strokeWidth={1.2} /></div>
            <div style={{ fontSize: 14 }}>Todavía no tienes ningún checklist armado. Dale a "+ Checklist" para crear el primero.</div>
          </div>
        ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Lista de checklists a la izquierda, agrupados por gira */}
          <div style={{ width: 250, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(() => {
              const giraSelActual = grupoSeleccionado?.evento?.giraId || null;

              function renderBoton(g, { completado } = {}) {
                const key = keyDe(g);
                const total = g.tareas.length;
                const completadasG = g.tareas.filter(t => t.estado === 'Completado').length;
                const pctG = total > 0 ? Math.round(completadasG / total * 100) : 0;
                const activo = key === keySeleccion;
                return (
                  <button key={key} onClick={() => setSeleccionKey(key)} style={{
                    textAlign: 'left', width: '100%', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    opacity: completado ? 0.7 : 1,
                    border: activo ? '1.5px solid var(--royal-light)' : '1px solid var(--border)',
                    background: activo ? 'var(--royal-soft)' : 'var(--bg-card)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {g.evento ? g.evento.nombre : 'Sin evento'}
                      </span>
                      {completado && <span className="tag tag-green" style={{ fontSize: 8, flexShrink: 0 }}>Completo</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pctG}%`, height: '100%', background: 'var(--royal)' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace', flexShrink: 0 }}>{completadasG}/{total}</span>
                    </div>
                  </button>
                );
              }

              function renderCarpetas(grupos, { completado } = {}) {
                const { porGiraId, girasOrdenadas, sinGira } = agruparPorGira(grupos);
                return (
                  <>
                    {girasOrdenadas.map(giraId => {
                      const gira = giras.find(x => x.id === giraId);
                      const gruposDeGira = porGiraId[giraId];
                      const totalG = gruposDeGira.reduce((a, g) => a + g.tareas.length, 0);
                      const compG = gruposDeGira.reduce((a, g) => a + g.tareas.filter(t => t.estado === 'Completado').length, 0);
                      const pctGira = totalG > 0 ? Math.round(compG / totalG * 100) : 0;
                      const expandida = girasExpandidas.has(giraId) || giraId === giraSelActual;
                      return (
                        <div key={giraId}>
                          <button onClick={() => toggleGira(giraId)} style={{
                            width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                            border: '1px solid var(--border)', background: 'var(--bg-card2)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
                          }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--royal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gira?.nombre || 'Gira'}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace', flexShrink: 0 }}>
                              {gruposDeGira.length} · {pctGira}% {expandida ? '▲' : '▼'}
                            </span>
                          </button>
                          {expandida && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, marginLeft: 12 }}>
                              {gruposDeGira.map(g => renderBoton(g, { completado }))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {sinGira.map(g => renderBoton(g, { completado }))}
                  </>
                );
              }

              return (
                <>
                  {renderCarpetas(gruposActivos)}

                  {gruposCompletados.length > 0 && (
                    <>
                      <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={() => setVerCompletados(v => !v)}>
                        {verCompletados ? 'Ocultar completados' : `Ver completados (${gruposCompletados.length})`}
                      </button>
                      {verCompletados && renderCarpetas(gruposCompletados, { completado: true })}
                    </>
                  )}
                </>
              );
            })()}
          </div>

          {/* Panel de detalle: el checklist elegido, con espacio de sobra */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!grupoSeleccionado ? (
              <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IconCheckCircle width={32} height={32} strokeWidth={1.2} /></div>
                <div style={{ fontSize: 14 }}>¡Todos los checklists están completos! Dale a "Ver completados" para revisarlos.</div>
              </div>
            ) : (() => {
              const { evento, tareas: tareasGrupo } = grupoSeleccionado;
              const key = keySeleccion;
              const enEdicion = editable && gruposEditando.has(key);
              const total = tareasGrupo.length;
              const completadasG = tareasGrupo.filter(t => t.estado === 'Completado').length;
              const pctG = total > 0 ? Math.round(completadasG / total * 100) : 0;
              return (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px', background: 'var(--bg-card2)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{evento ? evento.nombre : 'Sin evento'}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10, fontFamily: 'Fira Code, monospace' }}>{completadasG}/{total} tareas · {pctG}%</span>
                      </div>
                      {editable && <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className={`btn btn-sm ${enEdicion ? 'btn-primary' : 'btn-ghost'}`}
                          title={enEdicion ? 'Terminar de editar la lista' : 'Editar la lista'}
                          onClick={() => toggleEdicionGrupo(key)}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Borrar todo el checklist"
                          onClick={() => eliminarChecklistCompleto(tareasGrupo, evento ? evento.nombre : 'Sin evento')}
                        >
                          <IconTrash />
                        </button>
                      </div>}
                    </div>
                    <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pctG}%`, height: '100%', background: pctG === 100 ? 'var(--accent-green)' : 'var(--royal)' }} />
                    </div>
                  </div>

                  {enEdicion && (
                    <div style={{ padding: '8px 22px', borderBottom: '1px solid var(--border)' }}>
                      <button className="btn btn-light btn-sm" style={{ width: '100%', fontSize: 11 }} onClick={() => abrirNuevoEnPosicion(evento ? evento.id : null, tareasGrupo, 0)}>+ Insertar tarea aquí arriba</button>
                    </div>
                  )}

                  {tareasGrupo.map((t, i) => {
                    const isVencida = t.fechaLimite && new Date(t.fechaLimite) < new Date() && t.estado !== 'Completado';
                    return (
                      <div key={t.id}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 22px', borderBottom: !enEdicion && i < tareasGrupo.length - 1 ? '1px solid var(--border)' : 'none', opacity: t.estado === 'Completado' ? 0.7 : 1 }}>
                          {enEdicion && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                              <button className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => moverTarea(tareasGrupo, i, 'up')}>▲</button>
                              <button className="btn btn-ghost btn-sm" disabled={i === tareasGrupo.length - 1} onClick={() => moverTarea(tareasGrupo, i, 'down')}>▼</button>
                            </div>
                          )}
                          {editable ? (
                            <button onClick={() => toggleCompletado(t)} style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${t.estado === 'Completado' ? 'var(--accent-green)' : 'var(--border)'}`, background: t.estado === 'Completado' ? 'var(--accent-green)' : 'white', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, marginTop: 2 }}>
                              {t.estado === 'Completado' ? '✓' : ''}
                            </button>
                          ) : (
                            // Solo lectura: se ve el estado pero no se puede marcar.
                            <span style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${t.estado === 'Completado' ? 'var(--accent-green)' : 'var(--border)'}`, background: t.estado === 'Completado' ? 'var(--accent-green)' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, marginTop: 2 }}>
                              {t.estado === 'Completado' ? '✓' : ''}
                            </span>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', textDecoration: t.estado === 'Completado' ? 'line-through' : 'none' }}>{t.titulo}</span>
                              <span className={`tag ${tagColor[t.estado]}`} style={{ fontSize: 10 }}>{t.estado}</span>
                            </div>
                            {t.descripcion && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 7 }}>{t.descripcion}</div>}
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                              {t.fechaLimite && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: isVencida ? 'var(--accent-red)' : 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>
                                  {isVencida ? <IconAlertTriangle /> : <IconCalendar />} límite: {t.fechaLimite}
                                </span>
                              )}
                              {t.responsable && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}><IconUser /> {t.responsable}</span>}
                            </div>
                          </div>
                          {editable && <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {t.estado !== 'Completado' && (
                              <button className="btn btn-ghost btn-sm" title="Avanzar estado" onClick={() => avanzarEstado(t)}>▶</button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(t)}><IconEdit /></button>
                            <button className="btn btn-ghost btn-sm" onClick={() => eliminar(t.id)}><IconTrash /></button>
                          </div>}
                        </div>

                        {enEdicion && (
                          <div style={{ padding: '6px 22px', borderBottom: '1px solid var(--border)' }}>
                            <button className="btn btn-light btn-sm" style={{ width: '100%', fontSize: 11 }} onClick={() => abrirNuevoEnPosicion(evento ? evento.id : null, tareasGrupo, i + 1)}>+ Insertar tarea aquí abajo</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
        )}
      </div>

      {/* Modal duplicar checklist */}
      {editable && showDuplicar && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowDuplicar(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Duplicar checklist</span>
              <button className="close-btn" onClick={() => setShowDuplicar(false)}>×</button>
            </div>
            <div className="modal-body">
              {eventos.length < 2 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Necesitas al menos dos eventos registrados para poder copiar un checklist de uno a otro.</div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Copiar el checklist de</label>
                    <select className="form-input" value={eventoOrigen} onChange={e => setEventoOrigen(e.target.value)}>
                      <option value="">Elige el evento que ya tiene el checklist armado</option>
                      {eventos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hacia</label>
                    <select className="form-input" value={eventoDestino} onChange={e => setEventoDestino(e.target.value)}>
                      <option value="">Elige el evento nuevo</option>
                      {eventos.filter(e => String(e.id) !== eventoOrigen).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Se copian las tareas tal cual (título, descripción, prioridad, responsable), todas en estado "Pendiente" y sin fecha límite — las que el evento destino ya tenga con el mismo título no se duplican.
                  </div>
                </>
              )}
              {errorDuplicar && (
                <div style={{ background: '#f6dcde', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginTop: 10 }}>
                  {errorDuplicar}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDuplicar(false)} disabled={duplicando}>Cancelar</button>
              <button className="btn btn-primary" onClick={duplicarChecklist} disabled={!eventoOrigen || !eventoDestino || duplicando}>
                {duplicando ? 'Duplicando...' : 'Duplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editable && showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{insertContext ? 'Insertar tarea' : 'Checklist'}</span>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Evento relacionado</label>
                {insertContext ? (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '6px 0' }}>
                    {eventosVisibles.find(e => e.id === form.eventoId)?.nombre || 'Sin evento'} — se va a insertar justo en la posición que elegiste
                  </div>
                ) : (
                  <select className="form-input" value={form.eventoId || ''} onChange={e => setForm(p => ({ ...p, eventoId: Number(e.target.value) }))}>
                    <option value="">Sin evento</option>
                    {eventosVisibles.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                )}
              </div>
              {form.filas.map((fila, idx) => (
                <div key={idx} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: idx < form.filas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="form-group" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 2 }}>
                      <label className="form-label">Tarea</label>
                      <input className="form-input" value={fila.titulo} onChange={e => actualizarFila(idx, 'titulo', e.target.value)} placeholder="Ej: Confirmar catering" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Fecha límite</label>
                      <input className="form-input" type="date" value={fila.fechaLimite} onChange={e => actualizarFila(idx, 'fechaLimite', e.target.value)} />
                    </div>
                    {!editando && form.filas.length > 1 && (
                      <button className="btn btn-outline btn-sm" onClick={() => quitarFila(idx)}><IconTrash /></button>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Notas</label>
                    <textarea className="form-input" value={fila.descripcion} onChange={e => actualizarFila(idx, 'descripcion', e.target.value)} placeholder="Detalles de la tarea..." />
                  </div>
                </div>
              ))}

              {!editando && (
                <button className="btn btn-light btn-sm" onClick={agregarFila}>+ Agregar otra tarea</button>
              )}
              {errorForm && (
                <div style={{ background: '#f6dcde', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginTop: 10 }}>
                  {errorForm}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
