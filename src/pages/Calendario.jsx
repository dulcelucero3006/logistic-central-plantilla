import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listEventos, createEvento, deleteEvento, vincularAGoogle } from '../lib/eventos';
import { listTareas } from '../lib/tareas';
import { listAgenda, createAgenda, updateAgenda, deleteAgenda, deleteAgendaLocal } from '../lib/agenda';
import { listNotasGiras, createNotaGira, updateNotaGira, deleteNotaGira } from '../lib/notasGiras';
import { listLogistica, createLogistica, updateLogistica, deleteLogistica, TIPOS_LOGISTICA } from '../lib/logistica';
import { IconEdit, IconTrash, IconChevronLeft, IconChevronRight, IconBed, IconPlane, IconCar, IconList } from '../icons';
import Topbar from '../components/Topbar';
import { apiFetch, useEditable } from '../lib/sesion';

// Plan logístico: cada tipo con su icono y color (los mismos tonos que en Gastos:
// hospedaje ciruela, vuelos oro, transporte café).
const LOGISTICA = {
  Hotel: { icono: IconBed, color: '#7a4a8e', fondo: 'linear-gradient(180deg, #efe4f3, #dccbe4)', texto: '#4a2858' },
  Vuelo: { icono: IconPlane, color: '#b8913a', fondo: 'linear-gradient(180deg, #f8edd0, #ead39a)', texto: '#4a3410' },
  Traslado: { icono: IconCar, color: '#a8601f', fondo: 'linear-gradient(180deg, #f6e4d2, #e8c8a6)', texto: '#4a2a0c' },
  Otro: { icono: IconList, color: '#8a6a5a', fondo: 'linear-gradient(180deg, #f3ece4, #e2d6c8)', texto: '#4a3a30' },
};
const LOGISTICA_VACIA = { tipo: 'Vuelo', fecha: '', fechaFin: '', hora: '', horaFin: '', nota: '' };

function textoLogistica(l) {
  const horas = l.hora ? (l.horaFin ? `${l.hora}–${l.horaFin}` : l.hora) : '';
  return [horas, l.tipo, l.nota].filter(Boolean).join(' · ');
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DIAS_SEMANA_LARGO = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const COLORES_AGENDA = ['#dc2626', '#ea580c', '#f59e0b', '#22c55e', '#0891b2', '#3b82f6', '#7c3aed', '#db2777'];
const PAD = 6;

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fechaCorta(fecha) {
  const [, m, d] = fecha.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`;
}

function fechaBonitaCompleta(fecha) {
  if (!fecha) return '';
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_SEMANA_LARGO[dt.getDay()]}, ${d} de ${MESES[m - 1].toLowerCase()} de ${y}`;
}

function formatHora12(hora) {
  if (!hora) return { linea1: '', linea2: 'Todo el día' };
  const [hh, mm] = hora.split(':').map(Number);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return { linea1: `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, linea2: ampm };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function diffDias(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

export default function Calendario() {
  const navigate = useNavigate();
  // Solo-lectura: agenda/logística/notas/Google usan 'calendario'; los eventos, 'eventos'.
  const editable = useEditable('calendario');
  const editableEventos = useEditable('eventos');
  const hoy = new Date();
  const hoyISO = toISO(hoy);
  const [mes, setMes] = useState(() => {
    const guardado = localStorage.getItem('lc_calendario_mes');
    return guardado !== null ? Number(guardado) : hoy.getMonth();
  });
  const [año, setAño] = useState(() => {
    const guardado = localStorage.getItem('lc_calendario_año');
    return guardado !== null ? Number(guardado) : hoy.getFullYear();
  });
  useEffect(() => {
    localStorage.setItem('lc_calendario_mes', String(mes));
    localStorage.setItem('lc_calendario_año', String(año));
  }, [mes, año]);
  const [seleccionado, setSeleccionado] = useState(null);

  const [todosEventos, setTodosEventos] = useState([]);
  useEffect(() => { listEventos().then(setTodosEventos); }, []);
  const eventos = todosEventos.filter(e => !e.oculto);
  const idsOcultos = new Set(todosEventos.filter(e => e.oculto).map(e => e.id));
  const [todasTareas, setTodasTareas] = useState([]);
  useEffect(() => { listTareas().then(setTodasTareas); }, []);
  const tareas = todasTareas.filter(t => !idsOcultos.has(t.eventoId));

  const [agenda, setAgenda] = useState([]);
  useEffect(() => { listAgenda().then(setAgenda); }, []);

  const [notasGiras, setNotasGiras] = useState([]);
  useEffect(() => { listNotasGiras().then(setNotasGiras); }, []);
  const [logistica, setLogistica] = useState([]);
  useEffect(() => { listLogistica().then(setLogistica).catch(() => {}); }, []);
  const [formLog, setFormLog] = useState(null);
  const [editandoLog, setEditandoLog] = useState(null);
  const [guardandoLog, setGuardandoLog] = useState(false);
  const [errorLog, setErrorLog] = useState('');

  function abrirNuevaLogistica(fecha) {
    setEditandoLog(null);
    setErrorLog('');
    setFormLog({ ...LOGISTICA_VACIA, fecha, fechaFin: fecha });
  }

  function abrirEditarLogistica(l) {
    setEditandoLog(l.id);
    setErrorLog('');
    setFormLog({ ...l, fechaFin: l.fechaFin || l.fecha });
  }

  async function guardarLogistica() {
    if (!formLog.fecha) { setErrorLog('Falta la fecha.'); return; }
    if (formLog.tipo === 'Hotel' && formLog.fechaFin && formLog.fechaFin < formLog.fecha) {
      setErrorLog('La salida del hotel no puede ser antes de la entrada.');
      return;
    }
    setGuardandoLog(true);
    try {
      if (editandoLog) {
        const actualizado = await updateLogistica({ ...formLog, id: editandoLog });
        setLogistica(prev => prev.map(l => l.id === editandoLog ? actualizado : l));
      } else {
        const creado = await createLogistica(formLog);
        setLogistica(prev => [...prev, creado]);
      }
      setFormLog(null);
    } catch (err) {
      setErrorLog(`No se pudo guardar: ${err.message || 'error de conexión.'}`);
    } finally {
      setGuardandoLog(false);
    }
  }

  async function eliminarLogistica(id) {
    if (!confirm('¿Eliminar esto del plan logístico?')) return;
    try {
      await deleteLogistica(id);
      setLogistica(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  const [mostrarNuevaNota, setMostrarNuevaNota] = useState(false);
  const [nuevaNotaTexto, setNuevaNotaTexto] = useState('');
  const [editandoNotaId, setEditandoNotaId] = useState(null);
  const [textoEditNota, setTextoEditNota] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  async function agregarNota() {
    if (!nuevaNotaTexto.trim() || !seleccionado) return;
    setGuardandoNota(true);
    try {
      const creada = await createNotaGira(seleccionado, nuevaNotaTexto.trim());
      setNotasGiras([creada, ...notasGiras]);
      setNuevaNotaTexto('');
      setMostrarNuevaNota(false);
    } catch (err) {
      alert(`No se pudo guardar la nota: ${err.message || 'error de conexión.'}`);
    } finally {
      setGuardandoNota(false);
    }
  }

  function abrirEditarNota(n) {
    setEditandoNotaId(n.id);
    setTextoEditNota(n.texto);
  }

  async function guardarEdicionNota() {
    if (!textoEditNota.trim()) return;
    setGuardandoNota(true);
    try {
      const actualizada = await updateNotaGira(editandoNotaId, textoEditNota.trim());
      setNotasGiras(notasGiras.map(n => n.id === editandoNotaId ? actualizada : n));
      setEditandoNotaId(null);
    } catch (err) {
      alert(`No se pudo guardar: ${err.message || 'error de conexión.'}`);
    } finally {
      setGuardandoNota(false);
    }
  }

  async function eliminarNota(id) {
    if (!confirm('¿Eliminar esta nota?')) return;
    try {
      await deleteNotaGira(id);
      setNotasGiras(notasGiras.filter(n => n.id !== id));
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  const [googleStatus, setGoogleStatus] = useState({ connected: false, email: null });
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [mensajeGoogle, setMensajeGoogle] = useState('');

  async function cargarEstadoGoogle() {
    try {
      const r = await apiFetch('/api/google/status');
      const data = await r.json();
      setGoogleStatus(data);
      return data;
    } catch {
      return { connected: false, email: null };
    }
  }

  async function sincronizarGoogle(silencioso = false) {
    setCargandoGoogle(true);
    try {
      const r = await apiFetch('/api/google/sync', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al sincronizar.');
      setMensajeGoogle(`Google Calendar sincronizado: ${data.creadosEnGoogle} nuevo(s) en Google, ${data.creadosEnApp} nuevo(s) en la app.`);
      listEventos().then(setTodosEventos);
      listAgenda().then(setAgenda);
      setTimeout(() => setMensajeGoogle(''), 6000);
    } catch (err) {
      if (!silencioso) alert(`No se pudo sincronizar con Google Calendar: ${err.message}`);
    } finally {
      setCargandoGoogle(false);
    }
  }

  async function desconectarGoogle() {
    if (!confirm('¿Desconectar Google Calendar? Los eventos que ya se sincronizaron no se borran, pero dejarán de actualizarse entre la app y Google.')) return;
    await apiFetch('/api/google/disconnect', { method: 'POST' });
    setGoogleStatus({ connected: false, email: null });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const estado = params.get('google');
    if (estado) window.history.replaceState({}, '', window.location.pathname);
    cargarEstadoGoogle().then(data => {
      if (!editable) return;
      if (estado === 'conectado') {
        sincronizarGoogle();
      } else if (estado === 'error') {
        setMensajeGoogle('No se pudo conectar con Google Calendar — intenta de nuevo.');
        setTimeout(() => setMensajeGoogle(''), 6000);
      } else if (data.connected) {
        sincronizarGoogle(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [form, setForm] = useState({ titulo: '', todoElDia: false, fecha: '', hora: '', fechaFin: '', horaFin: '', notas: '', color: COLORES_AGENDA[5], tipo: 'Recordatorio' });

  const inicioGrid = new Date(año, mes, 1);
  inicioGrid.setDate(inicioGrid.getDate() - inicioGrid.getDay());
  const celdas = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicioGrid);
    d.setDate(inicioGrid.getDate() + i);
    celdas.push({ fecha: toISO(d), dia: d.getDate(), delMes: d.getMonth() === mes });
  }

  function getEventosDia(fechaStr) {
    return eventos.filter(e => e.fecha === fechaStr || e.fechaFin === fechaStr ||
      (e.fechaFin && e.fecha <= fechaStr && e.fechaFin >= fechaStr));
  }

  function getTareasDia(fechaStr) {
    return tareas.filter(t => t.fechaLimite === fechaStr && t.estado !== 'Completado');
  }

  function getAgendaDia(fechaStr) {
    return agenda.filter(a => a.fecha === fechaStr || a.fechaFin === fechaStr ||
      (a.fechaFin && a.fecha <= fechaStr && a.fechaFin >= fechaStr));
  }

  function getLogisticaDia(fechaStr) {
    return logistica
      .filter(l => l.fecha === fechaStr || (l.fechaFin && l.fecha <= fechaStr && l.fechaFin >= fechaStr))
      .sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));
  }

  function getNotasDia(fechaStr) {
    return notasGiras.filter(n => n.fecha === fechaStr);
  }

  function seleccionarDia(fechaStr) {
    setSeleccionado(s => s === fechaStr ? null : fechaStr);
    setMostrarNuevaNota(false);
    setEditandoNotaId(null);
  }

  function cerrarPanelDia() {
    setSeleccionado(null);
    setMostrarNuevaNota(false);
    setEditandoNotaId(null);
  }

  function mesAnterior() {
    setSeleccionado(null);
    if (mes === 0) { setMes(11); setAño(a => a - 1); } else setMes(m => m - 1);
  }

  function mesSiguiente() {
    setSeleccionado(null);
    if (mes === 11) { setMes(0); setAño(a => a + 1); } else setMes(m => m + 1);
  }

  function irAHoy() {
    setMes(hoy.getMonth());
    setAño(hoy.getFullYear());
    setSeleccionado(null);
  }

  function abrirNuevo(fechaPrefill) {
    setEditando(null);
    setErrorForm('');
    const fecha = fechaPrefill || seleccionado || '';
    setForm({ titulo: '', todoElDia: false, fecha, hora: '', fechaFin: fecha, horaFin: '', notas: '', color: COLORES_AGENDA[5], tipo: 'Recordatorio' });
    setShowModal(true);
  }

  function abrirEditar(a) {
    setEditando(a.id);
    setErrorForm('');
    setForm({ titulo: a.titulo, todoElDia: a.todoElDia, fecha: a.fecha, hora: a.hora, fechaFin: a.fechaFin || a.fecha, horaFin: a.horaFin, notas: a.notas, color: a.color || COLORES_AGENDA[5], tipo: a.tipo || 'Recordatorio' });
    setShowModal(true);
  }

  async function crearComoEvento(datos, idAgendaAQuitar) {
    const creado = await createEvento({
      id: Date.now(),
      nombre: datos.titulo,
      fecha: datos.fecha,
      fechaFin: datos.fechaFin || datos.fecha,
      hora: datos.todoElDia ? '' : datos.hora,
      horaFin: datos.todoElDia ? '' : datos.horaFin,
      lugar: '',
      aforo: 0,
      registrados: 0,
      estado: 'Borrador',
      descripcion: datos.notas || '',
      responsable: '',
      color: datos.color || '#1d4ed8',
      miembros: [],
      oculto: false,
      giraId: null,
    });
    if (datos.googleEventId) await vincularAGoogle(creado.id, datos.googleEventId);
    if (idAgendaAQuitar) await deleteAgendaLocal(idAgendaAQuitar);
    listEventos().then(setTodosEventos);
  }

  async function save() {
    if (!form.titulo || !form.fecha) {
      setErrorForm('Falta el título o la fecha de inicio — son obligatorios.');
      return;
    }
    setErrorForm('');
    setGuardando(true);
    try {
      const limpio = { ...form, hora: form.todoElDia ? '' : form.hora, horaFin: form.todoElDia ? '' : form.horaFin };
      if (limpio.tipo === 'Evento') {
        await crearComoEvento(limpio, editando || null);
        if (editando) setAgenda(agenda.filter(a => a.id !== editando));
      } else if (editando) {
        const actualizado = await updateAgenda({ ...limpio, id: editando });
        setAgenda(agenda.map(a => a.id === editando ? actualizado : a));
      } else {
        const creado = await createAgenda({ ...limpio, id: Date.now() });
        setAgenda([...agenda, creado]);
      }
      setShowModal(false);
    } catch (err) {
      setErrorForm(`No se pudo guardar: ${err.message || 'error de conexión con la base de datos.'}`);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este pendiente de la agenda?')) return;
    try {
      await deleteAgenda(id);
      setAgenda(agenda.filter(a => a.id !== id));
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  async function eliminarEvento(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      await deleteEvento(id);
      setTodosEventos(todosEventos.filter(e => e.id !== id));
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  const eventosDelDia = seleccionado ? getEventosDia(seleccionado) : [];
  const tareasDelDia = seleccionado ? getTareasDia(seleccionado) : [];
  const agendaDelDia = seleccionado ? getAgendaDia(seleccionado) : [];
  const notasDelDia = seleccionado ? getNotasDia(seleccionado) : [];
  const logisticaDelDia = seleccionado ? getLogisticaDia(seleccionado) : [];

  // El evento principal va fijo arriba; el resto de la agenda abajo, por hora.
  const itemsEventos = eventosDelDia.map(e => ({
    key: `ev-${e.id}`, hora: e.hora, titulo: e.nombre, tag: 'Evento', tagClass: 'tag-blue', color: e.color,
    onEdit: editableEventos ? () => navigate(`/eventos?editar=${e.id}`) : null,
    onDelete: editableEventos ? () => eliminarEvento(e.id) : null,
  }));
  const itemsDelDia = [
    ...agendaDelDia.map(a => ({
      key: `ag-${a.id}`, hora: a.todoElDia ? '' : a.hora, titulo: a.titulo,
      tag: a.tipo === 'Tarea' ? 'Tarea' : 'Recordatorio', tagClass: a.tipo === 'Tarea' ? 'tag-orange' : 'tag-navy',
      color: a.color || COLORES_AGENDA[5],
      onEdit: editable ? () => abrirEditar(a) : null, onDelete: editable ? () => eliminar(a.id) : null,
    })),
    ...tareasDelDia.map(t => ({
      key: `tk-${t.id}`, hora: '', titulo: t.titulo, tag: 'Pendiente', tagClass: 'tag-orange', color: '#d97706',
      onEdit: null, onDelete: null,
    })),
  ].sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));

  const pintarLinea = items => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((it, idx) => {
        const { linea1, linea2 } = formatHora12(it.hora);
        return (
          <div key={it.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 46, flexShrink: 0 }}>
              <div style={{ textAlign: 'center', fontSize: 11, lineHeight: 1.3 }}>
                {linea1 && <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{linea1}</div>}
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{linea2}</div>
              </div>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--royal)', marginTop: 6, flexShrink: 0 }} />
              {idx < items.length - 1 && <div style={{ flex: 1, width: 2, background: 'var(--border)', marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-card2)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: it.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{it.titulo}</div>
                <span className={`tag ${it.tagClass}`} style={{ marginTop: 4 }}>{it.tag}</span>
              </div>
              {(it.onEdit || it.onDelete) && (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  {it.onEdit && <button className="btn btn-ghost btn-sm" onClick={it.onEdit}><IconEdit /></button>}
                  {it.onDelete && <button className="btn btn-ghost btn-sm" onClick={it.onDelete}><IconTrash /></button>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
  const tituloSeccion = { fontSize: 11, fontWeight: 700, color: '#8a6a5a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Calendario</div>
          <div className="page-subtitle">vista mensual de eventos, fechas límite y agenda</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={mesAnterior}><IconChevronLeft /></button>
          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 15, minWidth: 160, textAlign: 'center', color: 'var(--royal)', textTransform: 'capitalize' }}>
            {MESES[mes]} {año}
          </span>
          <button className="btn btn-outline btn-sm" onClick={mesSiguiente}><IconChevronRight /></button>
          <button className="btn btn-light btn-sm" onClick={irAHoy}>Hoy</button>
          {googleStatus.connected ? (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px' }} title={googleStatus.email || ''}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-green)' }} />
                Google Calendar
              </span>
              {editable && (
                <button className="btn btn-outline btn-sm" onClick={() => sincronizarGoogle()} disabled={cargandoGoogle}>
                  {cargandoGoogle ? '...' : '↻ Sincronizar'}
                </button>
              )}
              {editable && <button className="btn btn-ghost btn-sm" onClick={desconectarGoogle}>Desconectar</button>}
            </>
          ) : editable && (
            <button className="btn btn-outline btn-sm" onClick={async () => {
              const r = await apiFetch('/api/google/auth');
              const d = await r.json().catch(() => ({}));
              if (d.url) window.location.href = d.url; else alert(d.error || 'No se pudo iniciar la conexión con Google.');
            }}>Conectar Google Calendar</button>
          )}
          {editable && <button className="btn btn-primary btn-sm" onClick={() => abrirNuevo()}>+ Nuevo</button>}
          <Topbar hideSearch />
        </div>
      </div>
      {mensajeGoogle && (
        <div style={{ padding: '8px 28px', background: 'var(--royal-soft)', color: 'var(--royal)', fontSize: 12, fontWeight: 600 }}>
          {mensajeGoogle}
        </div>
      )}

      <div className="page-body">
        <div className="cal-charola">
          {/* Encabezado días */}
          <div className="cal-gap" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#7d6458', padding: '2px 0 9px', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid del mes: cada día es su propia tarjeta con relieve (separadas por un gap real),
              y cada semana es una fila con una capa de fondo (celdas/clicks) y una capa de contenido
              encima donde las barras de eventos multi-día ocupan varias columnas de un solo tirón
              (el gap de la cuadrícula se respeta solo porque CSS grid lo incluye al abarcar columnas). */}
          <div className="cal-gap" style={{ display: 'flex', flexDirection: 'column' }}>
            {Array.from({ length: 6 }, (_, wIdx) => celdas.slice(wIdx * 7, wIdx * 7 + 7)).map((semana, wIdx) => {
              const inicioSemana = semana[0].fecha;
              const finSemana = semana[6].fecha;
              const agendaMultiDia = agenda.filter(a => a.fechaFin && a.fechaFin !== a.fecha);
              const hotelesMultiDia = logistica.filter(l => l.tipo === 'Hotel' && l.fechaFin && l.fechaFin !== l.fecha);
              // prioridad: los eventos se acomodan primero (van arriba), luego agenda y al final hoteles.
              const bloquesSemana = [
                ...eventos
                  .filter(e => e.fecha <= finSemana && (e.fechaFin || e.fecha) >= inicioSemana)
                  .map(e => ({ id: `ev-${e.id}`, label: e.nombre, color: e.color, fecha: e.fecha, fechaFin: e.fechaFin || e.fecha, prioridad: 0 })),
                ...agendaMultiDia
                  .filter(a => a.fecha <= finSemana && a.fechaFin >= inicioSemana)
                  .map(a => ({ id: `ag-${a.id}`, label: a.titulo, color: a.color || COLORES_AGENDA[5], fecha: a.fecha, fechaFin: a.fechaFin, prioridad: 1 })),
                ...hotelesMultiDia
                  .filter(l => l.fecha <= finSemana && l.fechaFin >= inicioSemana)
                  .map(l => ({ id: `lg-${l.id}`, label: l.nota ? `Hotel · ${l.nota}` : 'Hotel', fecha: l.fecha, fechaFin: l.fechaFin, prioridad: 2, hotel: true })),
              ]
                .map(b => ({
                  ...b,
                  col1: clamp(diffDias(inicioSemana, b.fecha), 0, 6),
                  col2: clamp(diffDias(inicioSemana, b.fechaFin), 0, 6),
                }))
                .sort((a, b) => a.prioridad - b.prioridad || (b.col2 - b.col1) - (a.col2 - a.col1) || a.col1 - b.col1);

              // "Empacar" cada bloque en la primera fila donde quepa (no choque con otro ya puesto).
              // Los bloques que abarcan más días se acomodan primero (van arriba), y los de un solo
              // día se acomodan alrededor sin empujar al de varios días hacia abajo.
              const ocupadas = [];
              const bloquesConFila = bloquesSemana.map(b => {
                const cabe = fila => { for (let c = b.col1; c <= b.col2; c++) if (fila[c]) return false; return true; };
                let fila = ocupadas.findIndex(cabe);
                if (fila === -1) { fila = ocupadas.length; ocupadas.push(Array(7).fill(false)); }
                for (let c = b.col1; c <= b.col2; c++) ocupadas[fila][c] = true;
                return { ...b, fila };
              });
              // Se muestra todo (sin límite): la fila de la semana crece lo que haga falta.
              const barrasVisibles = bloquesConFila;

              const diasInfo = semana.map((celda, i) => {
                const chips = [
                  ...getLogisticaDia(celda.fecha).filter(l => !(l.tipo === 'Hotel' && l.fechaFin && l.fechaFin !== l.fecha)).map(l => ({ tipo: 'logistica', item: l })),
                  ...getTareasDia(celda.fecha).map(t => ({ tipo: 'tarea', item: t })),
                  ...getAgendaDia(celda.fecha).filter(a => !(a.fechaFin && a.fechaFin !== a.fecha)).map(a => ({ tipo: 'agenda', item: a })),
                  ...getNotasDia(celda.fecha).map(n => ({ tipo: 'nota', item: n })),
                ];
                const barrasEnColumna = barrasVisibles.filter(b => b.col1 <= i && b.col2 >= i);
                const chipsVisibles = chips;
                // Cada día arranca sus chips justo debajo de sus propias barras (no de la fila
                // máxima de toda la semana), para que un día sin barra no se vea desfasado hacia
                // abajo respecto a un día vecino que sí tiene una.
                const filaLibre = barrasEnColumna.length > 0 ? Math.max(...barrasEnColumna.map(b => b.fila)) + 1 : 0;
                return { celda, chipsVisibles, filaLibre };
              });

              return (
                <div key={wIdx} style={{ position: 'relative', minHeight: 96 }}>
                  {/* Fondo: celdas clicables por día, cada una su propia tarjeta con relieve */}
                  <div className="cal-gap" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', position: 'absolute', inset: 0 }}>
                    {semana.map((celda, i) => (
                      <div
                        key={celda.fecha}
                        className={[
                          'cal-day-cell',
                          !celda.delMes ? 'cal-cell-out' : '',
                          celda.fecha === hoyISO ? 'cal-cell-today' : '',
                          celda.fecha === seleccionado ? 'cal-cell-selected' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => seleccionarDia(celda.fecha)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </div>

                  {/* Contenido: números, barras de eventos y chips — no captura clics, pasan al fondo */}
                  <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', columnGap: 7, gridAutoRows: 'min-content', rowGap: 3, padding: `${PAD}px 0`, pointerEvents: 'none' }}>
                    {semana.map((celda, i) => (
                      <div key={celda.fecha} style={{ gridColumn: i + 1, gridRow: 1, padding: `0 ${PAD}px`, paddingLeft: celda.fecha === hoyISO ? PAD + 4 : PAD + 10, minWidth: 0, overflow: 'hidden', height: 22, display: 'flex', alignItems: 'center' }}>
                        {celda.fecha === hoyISO ? (
                          <span className="cal-num-hoy" style={{ fontSize: 12, fontWeight: 800 }}>{celda.dia}</span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 600, color: celda.delMes ? 'var(--text-primary)' : '#a99a8d' }}>{celda.dia}</span>
                        )}
                      </div>
                    ))}

                    {barrasVisibles.map(b => b.hotel ? (
                      <div key={b.id} title={b.label} className="cal-bar" style={{
                        gridColumn: `${b.col1 + 1} / ${b.col2 + 2}`, gridRow: b.fila + 2,
                        marginLeft: PAD, marginRight: PAD, minWidth: 0,
                        background: LOGISTICA.Hotel.fondo, color: LOGISTICA.Hotel.texto, border: '1px solid #cdb6d8',
                        fontSize: 10, fontWeight: 700, padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', whiteSpace: 'nowrap',
                      }}>
                        <IconBed width={12} height={12} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
                      </div>
                    ) : (
                      <div key={b.id} title={b.label} className="cal-bar" style={{
                        gridColumn: `${b.col1 + 1} / ${b.col2 + 2}`, gridRow: b.fila + 2,
                        marginLeft: PAD, marginRight: PAD,
                        background: b.color, color: 'white', fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 0.2,
                        padding: '3px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {b.label}
                      </div>
                    ))}

                    {diasInfo.map(({ chipsVisibles, filaLibre }, i) => chipsVisibles.map((c, cIdx) => (
                      <div key={`${c.tipo}-${c.item.id}`} style={{ gridColumn: i + 1, gridRow: filaLibre + 2 + cIdx, padding: `0 ${PAD}px`, minWidth: 0, overflow: 'hidden' }}>
                        {c.tipo === 'logistica' ? (() => {
                          const est = LOGISTICA[c.item.tipo] || LOGISTICA.Otro;
                          const Icono = est.icono;
                          return (
                            <div title={textoLogistica(c.item)} className="cal-chip-pill" style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 10, background: est.fondo, color: est.texto, borderRadius: 9, padding: '3px 7px 3px 5px', fontWeight: 700, overflow: 'hidden' }}>
                              <Icono width={11} height={11} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                              <span style={{ minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.25 }}>{[c.item.hora, c.item.nota || c.item.tipo].filter(Boolean).join(' · ')}</span>
                            </div>
                          );
                        })() : c.tipo === 'tarea' ? (
                          <div title={c.item.titulo} className="cal-chip-pill" style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 10, background: '#fef9c3', color: '#a16207', borderRadius: 9, padding: '3px 7px 3px 4px', fontWeight: 600, overflow: 'hidden' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} />
                            <span style={{ minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.25 }}>{c.item.titulo}</span>
                          </div>
                        ) : c.tipo === 'nota' ? (
                          <div title={c.item.texto} className="cal-chip-pill" style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 10, background: 'var(--gold-soft)', color: 'var(--wine-deep)', borderRadius: 9, padding: '3px 7px 3px 4px', fontWeight: 600, overflow: 'hidden' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                            <span style={{ minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.25 }}>{c.item.texto}</span>
                          </div>
                        ) : (
                          <div title={c.item.titulo} className="cal-chip-pill" style={{
                            display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 10, borderRadius: 9, padding: '3px 7px 3px 4px', fontWeight: 600, overflow: 'hidden',
                            ...(c.item.notas === 'Día festivo oficial'
                              ? { background: 'linear-gradient(180deg, #cf7c66, #b9604b)', color: 'white' }
                              : c.item.tipo === 'Tarea'
                                ? { background: '#fef9c3', color: '#a16207' }
                                : { background: 'linear-gradient(180deg, #faf1e1, #efdfc1)', color: '#4a1426' }),
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.item.notas === 'Día festivo oficial' ? '#fbe3da' : c.item.tipo === 'Tarea' ? '#d97706' : (c.item.color || COLORES_AGENDA[5]), flexShrink: 0 }} />
                            <span style={{ minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.25 }}>{c.item.titulo}</span>
                          </div>
                        )}
                      </div>
                    )))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {seleccionado && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && cerrarPanelDia()}>
          <div className="modal" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--royal), var(--wine-deep))', color: 'white', padding: '22px 26px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                {editable && <button
                  onClick={() => abrirNuevaLogistica(seleccionado)}
                  style={{ height: 28, padding: '0 12px', borderRadius: 14, background: 'linear-gradient(180deg, #ecd58e, #c9a25a)', border: 'none', color: '#3c0c1e', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6)' }}
                >+ Logística</button>}
                {editable && <button
                  onClick={() => abrirNuevo(seleccionado)}
                  style={{ height: 28, padding: '0 12px', borderRadius: 14, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center' }}
                >+ Agregar</button>}
                <button
                  onClick={cerrarPanelDia}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >×</button>
              </div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 20, textTransform: 'capitalize', paddingRight: 200 }}>
                {fechaBonitaCompleta(seleccionado)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                {itemsEventos.length + itemsDelDia.length} {itemsEventos.length + itemsDelDia.length === 1 ? 'evento programado' : 'eventos programados'}
                {logisticaDelDia.length > 0 && ` · ${logisticaDelDia.length} en plan logístico`}
              </div>
            </div>

            <div style={{ padding: '20px 26px', maxHeight: '58vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {itemsEventos.length > 0 && pintarLinea(itemsEventos)}

              <div>
                <div style={{ ...tituloSeccion, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Plan logístico
                  {editable && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--royal)' }} onClick={() => abrirNuevaLogistica(seleccionado)}>+ Agregar</button>}
                </div>
                {logisticaDelDia.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '10px 12px', borderRadius: 10, border: '1px dashed #dccaa9', background: '#fbf6ee' }}>
                    {editable ? 'Aún no hay plan para este día. Agrega hoteles, vuelos o traslados con "+ Logística".' : 'Aún no hay plan para este día.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {logisticaDelDia.map(l => {
                      const est = LOGISTICA[l.tipo] || LOGISTICA.Otro;
                      const Icono = est.icono;
                      const rango = l.tipo === 'Hotel' && l.fechaFin && l.fechaFin !== l.fecha
                        ? `Entrada ${fechaCorta(l.fecha)} · Salida ${fechaCorta(l.fechaFin)}`
                        : null;
                      return (
                        <div key={l.id} className="relieve-renglon" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12 }}>
                          <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: est.fondo, color: est.texto, boxShadow: '0 2px 4px rgba(80,40,20,0.2), inset 0 1px 0 rgba(255,255,255,0.7)' }}>
                            <Icono width={16} height={16} strokeWidth={2.2} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {l.tipo}{l.hora && <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}> · {l.hora}{l.horaFin ? ` → ${l.horaFin}` : ''}</span>}
                            </div>
                            {l.nota && <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{l.nota}</div>}
                            {rango && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{rango}</div>}
                          </div>
                          {editable && <button className="btn btn-ghost btn-sm" onClick={() => abrirEditarLogistica(l)}><IconEdit /></button>}
                          {editable && <button className="btn btn-ghost btn-sm" onClick={() => eliminarLogistica(l.id)}><IconTrash /></button>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {itemsDelDia.length > 0 && (
                <div>
                  <div style={tituloSeccion}>Agenda</div>
                  {pintarLinea(itemsDelDia)}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 26px 22px', borderTop: '1px solid var(--border)' }}>
              {notasDelDia.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {notasDelDia.map(n => (
                    <div key={n.id}>
                      {editable && editandoNotaId === n.id ? (
                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--gold-soft)' }}>
                          <textarea className="form-input" rows={2} autoFocus value={textoEditNota} onChange={e => setTextoEditNota(e.target.value)} />
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditandoNotaId(null)}>Cancelar</button>
                            <button className="btn btn-primary btn-sm" onClick={guardarEdicionNota} disabled={guardandoNota}>Guardar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--gold)', fontSize: 14, lineHeight: '18px', flexShrink: 0 }}>•</span>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--wine-deep)', whiteSpace: 'pre-wrap', lineHeight: '18px' }}>{n.texto}</div>
                          {editable && (
                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => abrirEditarNota(n)}><IconEdit /></button>
                              <button className="btn btn-ghost btn-sm" onClick={() => eliminarNota(n.id)}><IconTrash /></button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!editable ? null : mostrarNuevaNota ? (
                <div style={{ marginTop: 14 }}>
                  <textarea
                    className="form-input" rows={2} autoFocus
                    value={nuevaNotaTexto}
                    onChange={e => setNuevaNotaTexto(e.target.value)}
                    placeholder="Ej: confirmar transporte de equipo con 2 semanas de anticipación..."
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setMostrarNuevaNota(false); setNuevaNotaTexto(''); }}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={agregarNota} disabled={guardandoNota}>Guardar</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-outline" style={{ width: '100%', marginTop: 14 }} onClick={() => setMostrarNuevaNota(true)}>
                  + Agregar nota
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editable && formLog && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setFormLog(null)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">{editandoLog ? 'Editar plan logístico' : 'Agregar al plan logístico'}</span>
              <button className="close-btn" onClick={() => setFormLog(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">¿Qué es?</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {TIPOS_LOGISTICA.map(t => {
                    const est = LOGISTICA[t];
                    const Icono = est.icono;
                    const activo = formLog.tipo === t;
                    return (
                      <button key={t} type="button" onClick={() => setFormLog(p => ({ ...p, tipo: t }))} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, color: est.texto, background: est.fondo,
                        border: activo ? `2px solid ${est.color}` : '2px solid transparent',
                        boxShadow: activo ? '0 4px 10px rgba(80,40,20,0.25)' : '0 1px 3px rgba(80,40,20,0.12)',
                        opacity: activo ? 1 : 0.75,
                      }}>
                        <Icono width={20} height={20} strokeWidth={2} />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formLog.tipo === 'Hotel' ? (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Entrada (check-in)</label>
                    <input className="form-input" type="date" value={formLog.fecha} onChange={e => setFormLog(p => ({ ...p, fecha: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Salida (check-out)</label>
                    <input className="form-input" type="date" value={formLog.fechaFin} onChange={e => setFormLog(p => ({ ...p, fechaFin: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input className="form-input" type="date" value={formLog.fecha} onChange={e => setFormLog(p => ({ ...p, fecha: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{formLog.tipo === 'Vuelo' ? 'Sale' : 'Hora'}</label>
                    <input className="form-input" type="time" value={formLog.hora} onChange={e => setFormLog(p => ({ ...p, hora: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{formLog.tipo === 'Vuelo' ? 'Llega' : 'Hasta (opcional)'}</label>
                    <input className="form-input" type="time" value={formLog.horaFin} onChange={e => setFormLog(p => ({ ...p, horaFin: e.target.value }))} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Nota</label>
                <textarea className="form-input" rows={2} value={formLog.nota} onChange={e => setFormLog(p => ({ ...p, nota: e.target.value }))}
                  placeholder={formLog.tipo === 'Hotel' ? 'Ej: equipo completo, Hotel Hyatt' : formLog.tipo === 'Vuelo' ? 'Ej: GDL → MTY, equipo de montaje' : formLog.tipo === 'Traslado' ? 'Ej: aeropuerto → hotel en camioneta' : '¿Qué hay que tener en cuenta?'} />
              </div>

              {errorLog && (
                <div style={{ background: '#f6dcde', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginTop: 6 }}>{errorLog}</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setFormLog(null)} disabled={guardandoLog}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarLogistica} disabled={guardandoLog}>
                {guardandoLog ? 'Guardando...' : (editandoLog ? 'Guardar cambios' : 'Agregar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editable && showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editando ? 'Editar pendiente' : 'Nuevo pendiente de agenda'}</span>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Título</label>
                <input className="form-input" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Título del pendiente" />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de pendiente</label>
                <select className="form-input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="Recordatorio">Recordatorio</option>
                  <option value="Tarea">Tarea</option>
                  {editableEventos && <option value="Evento">Evento</option>}
                </select>
                {form.tipo === 'Evento' && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Se va a crear directo en la sección de Eventos (en Borrador, para completarle el lugar después).
                  </div>
                )}
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="todoElDia" checked={!!form.todoElDia} onChange={e => setForm(p => ({ ...p, todoElDia: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="todoElDia" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Todo el día</label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Inicio</label>
                  <input className="form-input" type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
                </div>
                {!form.todoElDia && (
                  <div className="form-group">
                    <label className="form-label">Hora</label>
                    <input className="form-input" type="time" value={form.hora} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fin</label>
                  <input className="form-input" type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))} />
                </div>
                {!form.todoElDia && (
                  <div className="form-group">
                    <label className="form-label">Hora</label>
                    <input className="form-input" type="time" value={form.horaFin} onChange={e => setForm(p => ({ ...p, horaFin: e.target.value }))} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-input" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Descripción (opcional)" />
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {COLORES_AGENDA.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: form.color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                        boxShadow: form.color === c ? '0 0 0 2px white inset' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {errorForm && (
                <div style={{ background: '#f6dcde', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginTop: 10 }}>
                  {errorForm}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={guardando}>
                {guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Agregar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
