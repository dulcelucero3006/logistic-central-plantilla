import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logoMark from '../assets/brand/logo.svg';
import { MARCA } from '../marca';
import { useSesion, SECCIONES } from '../lib/sesion';

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const IconDashboard = () => (
  <svg {...iconProps}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconCalendario = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconEventos = () => (
  <svg {...iconProps}>
    <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
    <line x1="12" y1="7" x2="12" y2="17" strokeDasharray="2 3" />
  </svg>
);

const IconPresupuesto = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v10" />
    <path d="M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.3 2 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5" />
  </svg>
);

const IconEquipo = () => (
  <svg {...iconProps}>
    <circle cx="9" cy="8" r="3" />
    <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
    <circle cx="17.5" cy="9" r="2.3" />
    <path d="M22 21v-1a5 5 0 0 0-3.8-4.85" />
  </svg>
);

const IconChecklist = () => (
  <svg {...iconProps}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IconAerolineas = () => (
  <svg {...iconProps}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </svg>
);

const IconSalones = () => (
  <svg {...iconProps}>
    <path d="M3 10l9-6 9 6" />
    <path d="M3 21h18" />
    <path d="M5 21V10M19 21V10M9.5 21V10M14.5 21V10" />
  </svg>
);

const IconGiras = () => (
  <svg {...iconProps}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </svg>
);

const IconUsuarios = () => (
  <svg {...iconProps}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const IconActividad = () => (
  <svg {...iconProps}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </svg>
);

const IconChevron = ({ flipped }) => (
  <svg {...iconProps} width={12} height={12} style={{ transform: flipped ? 'rotate(180deg)' : 'none' }}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

const nav = [
  { path: '/', label: 'Dashboard', Icon: IconDashboard },
  { path: '/calendario', label: 'Calendario', Icon: IconCalendario },
  { path: '/giras', label: 'Giras', Icon: IconGiras },
  { path: '/eventos', label: 'Eventos', Icon: IconEventos },
  { path: '/presupuesto', label: 'Gastos', Icon: IconPresupuesto },
  { path: '/equipo', label: 'Equipo', Icon: IconEquipo },
  { path: '/checklist', label: 'Checklist', Icon: IconChecklist },
  { path: '/aerolineas', label: 'Aerolíneas', Icon: IconAerolineas },
  { path: '/salones', label: 'Salones', Icon: IconSalones },
];

export default function Sidebar() {
  const { persona, puedeVer } = useSesion();
  const seccionDeRuta = ruta => SECCIONES.find(x => x.ruta === ruta)?.clave;
  const visibles = nav.filter(item => puedeVer(seccionDeRuta(item.path)));
  const items = persona.esAdmin
    ? [...visibles, { path: '/actividad', label: 'Actividad', Icon: IconActividad }, { path: '/usuarios', label: 'Usuarios', Icon: IconUsuarios }]
    : visibles;
  const [colapsado, setColapsado] = useState(() => localStorage.getItem('lc_sidebar_colapsado') === '1');

  function toggleColapsado() {
    setColapsado(c => {
      const next = !c;
      localStorage.setItem('lc_sidebar_colapsado', next ? '1' : '0');
      return next;
    });
  }

  return (
    <aside className={`sidebar${colapsado ? ' collapsed' : ''}`}>
      <div className="sidebar-logo">
        {colapsado ? (
          <span className="sidebar-logo-badge"><img src={logoMark} alt={MARCA.nombre} className="sidebar-logo-mark" /></span>
        ) : (
          <div className="sidebar-logo-title"><span className="line1">{MARCA.linea1}</span><span className="line2">{MARCA.linea2}</span></div>
        )}
        <div className="sidebar-logo-side">
          {!colapsado && <span className="sidebar-logo-badge"><img src={logoMark} alt={MARCA.nombre} className="sidebar-logo-mark" /></span>}
          <button className="sidebar-toggle" onClick={toggleColapsado} title={colapsado ? 'Expandir menú' : 'Contraer menú'}>
            <IconChevron flipped={colapsado} />
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        {items.map(item => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'} title={item.label}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
            <span className="icon"><item.Icon /></span><span className="label">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{persona.iniciales}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{persona.nombre}</div>
            <div className="sidebar-user-role">{persona.puesto}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
