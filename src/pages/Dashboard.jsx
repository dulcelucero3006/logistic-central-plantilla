import { useState, useEffect, useMemo, useId } from 'react';
import { initialProveedores } from '../data';
import { IconCalendar, IconMapPin, IconUsers, IconCheckCircle, IconCoin, IconBuilding, IconChevronLeft, IconChevronRight } from '../icons';
import { listEventos } from '../lib/eventos';
import { listGastos } from '../lib/gastos';
import { listTareas } from '../lib/tareas';
import Topbar from '../components/Topbar';
import { useSesion } from '../lib/sesion';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Curvita decorativa con relleno — no representa datos reales, solo le da vida a la tarjeta.
function SparkArea({ seed = 0 }) {
  const id = useId().replace(/:/g, '');
  const { linea, area } = useMemo(() => {
    const base = [10, 14, 11, 17, 13, 19, 15, 22];
    const pts = base.map((v, i) => [i * 11, 30 - ((v + seed * 4) % 20) - 4]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
    }
    return { linea: d, area: `${d} L 77 32 L 0 32 Z` };
  }, [seed]);
  return (
    <svg width="78" height="32" viewBox="0 0 77 32" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sa-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4566f" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#c4566f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sa-${id})`} />
      <path d={linea} fill="none" stroke="#c4566f" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StatCard({ icono, fondoIcono, titulo, valor, sub, insignia, seed }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="stat-icon" style={{ background: fondoIcono }}>{icono}</div>
        <span className="stat-title">{titulo}</span>
        {insignia != null && <span className="stat-badge">{insignia}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="stat-value">{valor}</div>
          <div className="stat-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
        </div>
        <SparkArea seed={seed} />
      </div>
    </div>
  );
}

function AnilloProgreso({ pct }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const valor = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" style={{ filter: 'drop-shadow(0 0 8px rgba(227,200,120,0.45))' }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(227,200,120,0.25)" strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e3c878" strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={c - (valor / 100) * c} strokeLinecap="round" transform="rotate(-90 48 48)" />
        <circle cx="48" cy="48" r="30" fill="rgba(60,12,30,0.55)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', lineHeight: 1.1 }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>{Number.isFinite(pct) ? `${Math.round(valor)}%` : '—'}</span>
        <span style={{ fontSize: 9, opacity: 0.85 }}>registrados</span>
      </div>
    </div>
  );
}

function IlustracionAlDia() {
  return (
    <svg width="120" height="96" viewBox="0 0 120 96" aria-hidden="true">
      <ellipse cx="60" cy="52" rx="48" ry="40" fill="#f3e6cf" />
      <rect x="30" y="40" width="60" height="36" rx="4" fill="white" stroke="var(--royal)" strokeWidth="2" />
      <rect x="36" y="46" width="48" height="24" rx="2" fill="#f8efe0" />
      <path d="M22 78 H98 L92 84 H28 Z" fill="var(--royal)" opacity="0.9" />
      <circle cx="86" cy="34" r="12" fill="var(--royal)" />
      <path d="M80.5 34 L84.5 38 L91.5 30.5" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 58 H66 M44 63 H60" stroke="#d9c4a3" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CalendarioMini({ eventos }) {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [año, setAño] = useState(hoy.getFullYear());
  const hoyISO = toISO(hoy);

  const diasConEvento = useMemo(() => {
    const set = new Set();
    eventos.forEach(e => {
      if (!e.fecha) return;
      const d = new Date(e.fecha + 'T12:00:00');
      const dFin = new Date((e.fechaFin || e.fecha) + 'T12:00:00');
      for (let guard = 0; d <= dFin && guard < 120; guard++) {
        set.add(toISO(d));
        d.setDate(d.getDate() + 1);
      }
    });
    return set;
  }, [eventos]);

  const offset = (new Date(año, mes, 1).getDay() + 6) % 7; // lunes = 0
  const diasEnMes = new Date(año, mes + 1, 0).getDate();

  function cambiarMes(delta) {
    let m = mes + delta, a = año;
    if (m < 0) { m = 11; a--; } else if (m > 11) { m = 0; a++; }
    setMes(m); setAño(a);
  }

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Calendario Mensual</span></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => cambiarMes(-1)}><IconChevronLeft /></button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{MESES[mes]} {año !== hoy.getFullYear() ? año : ''}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => cambiarMes(1)}><IconChevronRight /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 6, columnGap: 4 }}>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', paddingBottom: 2 }}>{d}</div>
        ))}
        {offset > 0 && <div style={{ gridColumn: `1 / ${offset + 1}`, background: '#ecdcc0', borderRadius: 8, margin: '1px 2px' }} />}
        {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((d, i) => {
          const fecha = `${año}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const esHoy = fecha === hoyISO;
          const tieneEvento = diasConEvento.has(fecha);
          return (
            <div key={fecha} style={{ display: 'flex', justifyContent: 'center', gridColumn: i === 0 ? offset + 1 : undefined }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: esHoy || tieneEvento ? 700 : 500,
                color: esHoy || tieneEvento ? 'white' : 'var(--text-primary)',
                background: esHoy ? 'linear-gradient(135deg, #c24b6c, #a32d4c)' : tieneEvento ? 'linear-gradient(135deg, #5a1730, #3c0c1e)' : 'transparent',
                boxShadow: esHoy || tieneEvento ? '0 2px 5px rgba(61,18,32,0.30)' : 'none',
              }}>
                {d}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { persona, puedeVer } = useSesion();
  // Solo se muestran los bloques de las secciones que el rol puede ver.
  const verEventos = puedeVer('eventos');
  const verTareas = puedeVer('checklist');
  const verGastos = puedeVer('gastos');
  const verProveedores = puedeVer('salones');
  const [eventos, setEventos] = useState([]);
  useEffect(() => { listEventos().then(setEventos); }, []);
  const [tareas, setTareas] = useState([]);
  useEffect(() => { listTareas().then(setTareas); }, []);
  const proveedores = JSON.parse(localStorage.getItem('lc_proveedores') || JSON.stringify(initialProveedores));
  const [gastos, setGastos] = useState([]);
  useEffect(() => { listGastos().then(setGastos); }, []);

  const eventosVisibles = eventos.filter(e => !e.oculto);
  const idsOcultos = new Set(eventos.filter(e => e.oculto).map(e => e.id));
  const tareasVisibles = tareas.filter(t => !idsOcultos.has(t.eventoId));

  const proximoEvento = eventosVisibles.filter(e => e.estado !== 'Cancelado' && e.estado !== 'Completado')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];

  const eventoReciente = [...eventosVisibles].sort((a, b) => b.id - a.id)[0];
  const gastoEventoReciente = eventoReciente ? gastos.filter(g => g.eventoId === eventoReciente.id).reduce((a, g) => a + g.monto, 0) : 0;

  const tareasUrgentes = tareasVisibles.filter(t => t.estado !== 'Completado' && t.prioridad === 'Alta').slice(0, 5);
  const tareasPendientes = tareasVisibles.filter(t => t.estado !== 'Completado').length;
  const urgentes = tareasVisibles.filter(t => t.prioridad === 'Alta' && t.estado !== 'Completado').length;

  const diasParaProximo = proximoEvento ? Math.max(0, Math.ceil((new Date(proximoEvento.fecha + 'T12:00:00') - new Date()) / 86400000)) : null;
  const pctRegistro = proximoEvento && proximoEvento.aforo ? (proximoEvento.registrados / proximoEvento.aforo) * 100 : null;

  const hoyTexto = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const iconoBlanco = { width: 17, height: 17, strokeWidth: 2 };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ fontSize: 26 }}>¡Hola, {persona.nombre.split(' ')[0]}!</div>
          <div className="page-subtitle">{hoyTexto}</div>
        </div>
        <Topbar />
      </div>

      <div className="page-body">
        <div className="stat-grid">
          {verEventos && <StatCard
            icono={<IconCalendar {...iconoBlanco} />} fondoIcono="linear-gradient(135deg, #cf7c5e, #b2553c)"
            titulo="Eventos Activos" valor={eventosVisibles.filter(e => e.estado !== 'Cancelado' && e.estado !== 'Completado').length}
            sub={`${eventosVisibles.length} en total`} seed={1}
          />}
          {verTareas && <StatCard
            icono={<IconCheckCircle {...iconoBlanco} />} fondoIcono="linear-gradient(135deg, #d0624f, #b23a3a)"
            titulo="Tareas Pendientes" valor={tareasPendientes}
            sub={`${urgentes} urgente${urgentes === 1 ? '' : 's'}`} seed={2}
          />}
          {verGastos && <StatCard
            icono={<IconCoin {...iconoBlanco} />} fondoIcono="linear-gradient(135deg, #b23a5a, #8a1f3f)"
            titulo="Último Gasto" valor={`$${gastoEventoReciente.toLocaleString()}`}
            sub={eventoReciente ? eventoReciente.nombre : 'sin eventos'} seed={3}
          />}
          {verProveedores && <StatCard
            icono={<IconUsers {...iconoBlanco} />} fondoIcono="linear-gradient(135deg, #6e1d36, #4a1022)"
            titulo="Proveedores" valor={proveedores.length} insignia={proveedores.length}
            sub="en directorio" seed={4}
          />}
        </div>

        {verEventos && proximoEvento && (
          <div style={{
            background: 'linear-gradient(120deg, #5a1730, var(--royal) 50%, #a32d4c)',
            borderRadius: 16, padding: '18px 24px', marginBottom: 18, color: 'white',
            boxShadow: '0 14px 32px rgba(122,35,64,0.30)', border: '1px solid rgba(227,200,120,0.35)',
            display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Próximo evento</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{proximoEvento.nombre}</span>
                {diasParaProximo !== null && (
                  <span style={{ background: 'linear-gradient(135deg, #e7cf8c, #c9a25a)', color: '#3c0c1e', borderRadius: 20, padding: '3px 11px', fontSize: 12, fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>
                    {diasParaProximo === 0 ? 'Es hoy' : `Faltan ${diasParaProximo} días`}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, opacity: 0.9 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconCalendar /> {new Date(proximoEvento.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {proximoEvento.lugar && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconMapPin /> {proximoEvento.lugar}</span>}
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconUsers /> {proximoEvento.registrados}/{proximoEvento.aforo} registrados</span>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, opacity: 0.8 }}>
                  <span>Registros</span>
                  <span>{Number.isFinite(pctRegistro) ? `${Math.round(pctRegistro)}%` : '—'}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 6, height: 7, overflow: 'hidden' }}>
                  <div style={{ width: `${Number.isFinite(pctRegistro) ? Math.min(100, pctRegistro) : 0}%`, height: '100%', background: 'linear-gradient(90deg, #e3c878, #c9a25a)', borderRadius: 6 }} />
                </div>
              </div>
            </div>
            <AnilloProgreso pct={pctRegistro} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
          {verEventos && <div className="card">
            <div className="card-header">
              <span className="card-title">Todos los eventos</span>
              <a href="/eventos" style={{ fontSize: 12, color: 'var(--royal)', fontWeight: 600 }}>ver todos →</a>
            </div>
            {eventosVisibles.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #f3e3c4, #e7d1a8)', color: '#7a4a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                  {e.lugar ? <IconBuilding width={16} height={16} /> : <IconMapPin width={16} height={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.fecha}{e.lugar ? ` · ${e.lugar}` : ''}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 10px', flexShrink: 0,
                  ...(e.estado === 'Completado' || e.estado === 'En Curso'
                    ? { background: '#dfecd9', color: '#3d6b36' }
                    : e.estado === 'Cancelado'
                      ? { background: '#f6dcde', color: '#8c2a34' }
                      : { background: '#f3e6cf', color: '#7a4a2a' }),
                }}>{e.estado}</span>
              </div>
            ))}
          </div>}

          {verTareas && <div className="card">
            <div className="card-header">
              <span className="card-title">Tareas urgentes</span>
              {tareasUrgentes.length > 0 && <a href="/checklist" style={{ fontSize: 12, color: 'var(--royal)', fontWeight: 600 }}>ver todas →</a>}
            </div>
            {tareasUrgentes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '18px 12px 24px' }}>
                <IlustracionAlDia />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 6 }}>¡Estás al día!</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No tienes tareas urgentes</div>
              </div>
            ) : (
              tareasUrgentes.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.estado === 'En Proceso' ? 'var(--royal-light)' : 'var(--border-light)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>límite: {t.fechaLimite} · {t.responsable.split(' ')[0]}</div>
                  </div>
                  <span className={`tag ${t.estado === 'En Proceso' ? 'tag-blue' : 'tag-gray'}`} style={{ fontSize: 10 }}>{t.estado}</span>
                </div>
              ))
            )}
          </div>}

          {verEventos && <CalendarioMini eventos={eventosVisibles} />}
        </div>
      </div>
    </div>
  );
}
