import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch, IconBell } from '../icons';
import { listEventos } from '../lib/eventos';
import { listTareas } from '../lib/tareas';
import { useSesion } from '../lib/sesion';
import CambiarPassword from './CambiarPassword';
import { contarNoLeidas } from '../lib/actividad';

// Barra persistente (buscador + notificaciones + avatar) que se repite igual
// en el encabezado de cada página, para que la app se sienta como un solo
// lugar y no como páginas sueltas con estilos distintos.
export default function Topbar({ hideSearch = false }) {
  const navigate = useNavigate();
  const { persona, salir, puedeVer } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cambiandoPass, setCambiandoPass] = useState(false);
  const refMenu = useRef(null);
  // Movimientos de otras personas que la admin no ha visto.
  const [sinVer, setSinVer] = useState(0);
  useEffect(() => {
    if (!persona.esAdmin) return;
    const contar = () => contarNoLeidas().then(setSinVer);
    contar();
    window.addEventListener('actividad-cambio', contar);
    return () => window.removeEventListener('actividad-cambio', contar);
  }, [persona.esAdmin]);
  const [eventos, setEventos] = useState([]);
  useEffect(() => { if (!hideSearch) listEventos().then(setEventos); }, [hideSearch]);
  const [urgentes, setUrgentes] = useState(0);
  useEffect(() => {
    listTareas().then(ts => setUrgentes(ts.filter(t => t.estado !== 'Completado' && t.prioridad === 'Alta').length));
  }, []);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickFuera(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
      if (refMenu.current && !refMenu.current.contains(e.target)) setMenuAbierto(false);
    }
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);

  const q = busqueda.trim().toLowerCase();
  const resultados = q
    ? eventos.filter(e => !e.oculto && (e.nombre.toLowerCase().includes(q) || (e.lugar || '').toLowerCase().includes(q))).slice(0, 6)
    : [];

  function irAEvento(id) {
    setBusqueda('');
    setAbierto(false);
    navigate(`/eventos?editar=${id}`);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {!hideSearch && (
        <div className="topbar-search" ref={ref}>
          <span className="topbar-search-icon"><IconSearch /></span>
          <input
            className="form-input"
            placeholder="Buscar evento o lugar..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
            style={{ paddingLeft: 34, width: 220 }}
          />
          {abierto && q && (
            <div className="topbar-search-results">
              {resultados.length === 0 ? (
                <div className="topbar-search-empty">Sin resultados</div>
              ) : resultados.map(e => (
                <button key={e.id} className="topbar-search-item" onClick={() => irAEvento(e.id)}>
                  <span className="dot" style={{ background: e.color }} />
                  <span className="nombre">{e.nombre}</span>
                  <span className="lugar">{e.lugar}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {persona.esAdmin && (
        <button className="topbar-actividad" title={sinVer ? `${sinVer} movimiento${sinVer === 1 ? '' : 's'} nuevo${sinVer === 1 ? '' : 's'}` : 'Actividad'} onClick={() => navigate('/actividad')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
          {sinVer > 0 && <span className="topbar-actividad-num">{sinVer > 99 ? '99+' : sinVer}</span>}
        </button>
      )}
      {puedeVer('checklist') && <button
        style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #ffffff, #f6ecdc)', border: '1px solid #e8dbc5', borderRadius: 10, color: 'var(--text-secondary)', boxShadow: '0 3px 7px rgba(120,90,50,0.16), inset 0 1px 0 #fff' }}
        title="Tareas urgentes" onClick={() => navigate('/checklist')}
      >
        <IconBell width={16} height={16} />
        {urgentes > 0 && <span className="topbar-bell-dot" />}
      </button>}
      <div className="topbar-cuenta" ref={refMenu}>
        <button className="avatar avatar-md topbar-avatar" title={`${persona.nombre} · opciones de cuenta`} onClick={() => setMenuAbierto(a => !a)}>
          {persona.iniciales}
        </button>
        {menuAbierto && (
          <div className="topbar-cuenta-menu">
            <div className="topbar-cuenta-quien">
              <div className="nombre">{persona.nombre}</div>
              <div className="correo">{persona.email}</div>
            </div>
            <button className="menu-item" onClick={() => { setMenuAbierto(false); setCambiandoPass(true); }}>Cambiar mi contraseña</button>
            {persona.esAdmin && <button className="menu-item" onClick={() => { setMenuAbierto(false); navigate('/usuarios'); }}>Usuarios y accesos</button>}
            <button className="menu-item salir" onClick={salir}>Cerrar sesión</button>
          </div>
        )}
      </div>
      {cambiandoPass && <CambiarPassword onCerrar={() => setCambiandoPass(false)} />}
    </div>
  );
}
