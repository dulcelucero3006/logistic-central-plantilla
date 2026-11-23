import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Calendario from './pages/Calendario';
import Eventos from './pages/Eventos';
import Gastos from './pages/Gastos';
import Equipo from './pages/Equipo';
import Checklist from './pages/Checklist';
import Aerolineas from './pages/Aerolineas';
import Salones from './pages/Salones';
import Giras from './pages/Giras';
import Usuarios from './pages/Usuarios';
import Actividad from './pages/Actividad';
import AvisosActividad from './components/AvisosActividad';
import Login, { MarcoEntrada } from './pages/Login';
import { useSesion, SECCIONES } from './lib/sesion';
import { MARCA } from './marca';

function SinAcceso() {
  const { persona, salir } = useSesion();
  return (
    <MarcoEntrada>
      <h1 className="login-titulo">Cuenta sin acceso</h1>
      <p className="login-sub">
        Entraste como <strong>{persona.email}</strong>, pero esta cuenta todavía no tiene permiso para usar {MARCA.nombre}.
        Pide a quien administra la app que te dé acceso.
      </p>
      <button className="btn btn-outline login-boton" onClick={salir}>Salir</button>
    </MarcoEntrada>
  );
}

const PAGINAS = {
  dashboard: <Dashboard />,
  calendario: <Calendario />,
  giras: <Giras />,
  eventos: <Eventos />,
  gastos: <Gastos />,
  equipo: <Equipo />,
  checklist: <Checklist />,
  aerolineas: <Aerolineas />,
  salones: <Salones />,
};

function SinSecciones() {
  return (
    <div className="page-body">
      <div className="empty-state">Tu rol todavía no tiene secciones asignadas. Pide a la admin que te dé acceso.</div>
    </div>
  );
}

export default function App() {
  const { cargando, persona, puedeVer } = useSesion();
  // Primera sección permitida: a dónde mandar si alguien entra a una que no le toca.
  const inicio = SECCIONES.find(x => puedeVer(x.clave))?.ruta || null;

  if (cargando) return <div className="login-pantalla" />;
  if (!persona) return <Login />;
  if (!persona.acceso) return <SinAcceso />;

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            {SECCIONES.filter(x => puedeVer(x.clave)).map(x => (
              <Route key={x.clave} path={x.ruta} element={PAGINAS[x.clave]} />
            ))}
            {persona.esAdmin && <Route path="/usuarios" element={<Usuarios />} />}
            {persona.esAdmin && <Route path="/actividad" element={<Actividad />} />}
            <Route path="*" element={inicio ? <Navigate to={inicio} replace /> : <SinSecciones />} />
          </Routes>
        </main>
      </div>
      {persona.esAdmin && <AvisosActividad />}
    </BrowserRouter>
  );
}
