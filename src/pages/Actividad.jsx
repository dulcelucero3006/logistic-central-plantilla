import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { IconoAccion } from '../components/IconoAccion';
import {
  listActividad, marcarTodoLeido, escucharActividad, VERBO, queEs, nombreSeccion,
  nombreCampo, valorBonito, RUTA_SECCION,
} from '../lib/actividad';

const LIMITE = 100;

function claveDia(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function tituloDia(iso) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  if (claveDia(iso) === claveDia(hoy.toISOString())) return 'Hoy';
  if (claveDia(iso) === claveDia(ayer.toISOString())) return 'Ayer';
  const t = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function hora(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}

function Renglon({ a, nuevo }) {
  const [abierto, setAbierto] = useState(false);
  const cambios = a.cambios ? Object.entries(a.cambios) : [];
  const ruta = RUTA_SECCION[a.seccion];
  return (
    <div className={`actividad-renglon${nuevo ? ' nuevo' : ''}`}>
      <IconoAccion accion={a.accion} tamaño={34} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="actividad-frase">
          <strong>{a.usuarioNombre}</strong> {VERBO[a.accion]} {queEs(a.tabla)}
          {a.descripcion && <> <span className="actividad-que">{a.descripcion}</span></>}
        </div>
        <div className="actividad-meta">
          <span>{hora(a.creadoEn)}</span>
          <span>·</span>
          {ruta ? <Link to={ruta}>{nombreSeccion(a.tabla)}</Link> : <span>{nombreSeccion(a.tabla)}</span>}
          {a.rol && a.rol !== 'sistema' && <><span>·</span><span>{a.rol === 'admin' ? 'Tú' : a.rol === 'editor' ? 'Editor' : 'Viewer'}</span></>}
          {nuevo && <span className="actividad-pildora-nuevo">Nuevo</span>}
          {cambios.length > 0 && (
            <button className="actividad-ver-cambios" onClick={() => setAbierto(v => !v)}>
              {abierto ? 'Ocultar cambios' : `Ver ${cambios.length === 1 ? 'el cambio' : `los ${cambios.length} cambios`}`}
            </button>
          )}
        </div>
        {abierto && (
          <div className="actividad-cambios">
            {cambios.map(([campo, c]) => (
              <div key={campo} className="actividad-cambio">
                <span className="campo">{nombreCampo(campo)}</span>
                {c.oculto ? (
                  <span className="valor">se cambió (dato privado)</span>
                ) : (
                  <span className="valor">
                    <span className="antes">{valorBonito(c.antes)}</span>
                    <span className="flecha">→</span>
                    <span className="despues">{valorBonito(c.despues)}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Actividad() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [hayMas, setHayMas] = useState(false);
  const [persona, setPersona] = useState('Todas');
  const [seccion, setSeccion] = useState('Todas');
  const [incluirMios, setIncluirMios] = useState(false);
  // Lo que estaba sin leer al abrir la página se queda marcado como "Nuevo" mientras la ves.
  const [nuevos, setNuevos] = useState(() => new Set());

  useEffect(() => {
    listActividad({ limite: LIMITE }).then(lista => {
      setItems(lista);
      setHayMas(lista.length === LIMITE);
      setNuevos(new Set(lista.filter(a => !a.leido).map(a => a.id)));
      setCargando(false);
      if (lista.some(a => !a.leido)) marcarTodoLeido();
    }).catch(() => setCargando(false));
  }, []);

  // Lo que llegue mientras la página está abierta aparece arriba al momento.
  useEffect(() => escucharActividad(a => {
    setItems(prev => prev.some(x => x.id === a.id) ? prev : [a, ...prev]);
    if (!a.leido) {
      setNuevos(prev => new Set(prev).add(a.id));
      marcarTodoLeido();
    }
  }), []);

  async function cargarMas() {
    const ultimo = items[items.length - 1];
    if (!ultimo) return;
    const mas = await listActividad({ antesDe: ultimo.creadoEn, limite: LIMITE });
    setItems(prev => [...prev, ...mas]);
    setHayMas(mas.length === LIMITE);
  }

  const personas = useMemo(
    () => [...new Set(items.filter(a => a.rol !== 'admin').map(a => a.usuarioNombre))].sort((a, b) => a.localeCompare(b, 'es')),
    [items],
  );
  const secciones = useMemo(
    () => [...new Set(items.map(a => nombreSeccion(a.tabla)))].sort((a, b) => a.localeCompare(b, 'es')),
    [items],
  );

  const visibles = items.filter(a =>
    (incluirMios || a.rol !== 'admin') &&
    (persona === 'Todas' || a.usuarioNombre === persona) &&
    (seccion === 'Todas' || nombreSeccion(a.tabla) === seccion));

  const grupos = [];
  visibles.forEach(a => {
    const k = claveDia(a.creadoEn);
    const g = grupos[grupos.length - 1];
    if (g && g.clave === k) g.items.push(a);
    else grupos.push({ clave: k, titulo: tituloDia(a.creadoEn), items: [a] });
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Actividad</div>
          <div className="page-subtitle">Todo lo que agregan, editan o borran las personas con acceso</div>
        </div>
        <Topbar hideSearch />
      </div>

      <div className="page-body">
        <div className="actividad-filtros">
          <label>
            <span>Persona</span>
            <select className="form-input" value={persona} onChange={e => setPersona(e.target.value)}>
              <option>Todas</option>
              {personas.map(p => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label>
            <span>Sección</span>
            <select className="form-input" value={seccion} onChange={e => setSeccion(e.target.value)}>
              <option>Todas</option>
              {secciones.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="actividad-check">
            <input type="checkbox" checked={incluirMios} onChange={e => setIncluirMios(e.target.checked)} />
            <span>Incluir mis propios cambios</span>
          </label>
        </div>

        {cargando ? (
          <div className="empty-state">Cargando…</div>
        ) : visibles.length === 0 ? (
          <div className="card relieve empty-state">
            Todavía no hay movimientos{persona !== 'Todas' || seccion !== 'Todas' ? ' con estos filtros' : ''}. Aquí vas a ver cada cosa que agreguen, editen o borren.
          </div>
        ) : (
          <>
            {grupos.map(g => (
              <div key={g.clave} className="actividad-dia">
                <div className="actividad-dia-titulo">{g.titulo}</div>
                <div className="card relieve" style={{ padding: 6 }}>
                  {g.items.map(a => <Renglon key={a.id} a={a} nuevo={nuevos.has(a.id)} />)}
                </div>
              </div>
            ))}
            {hayMas && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button className="btn btn-outline" onClick={cargarMas}>Ver movimientos anteriores</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
