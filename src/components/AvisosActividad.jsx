import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { escucharActividad, VERBO, queEs, nombreSeccion } from '../lib/actividad';
import { IconoAccion } from './IconoAccion';

// Avisos que aparecen abajo a la derecha (solo para la admin) en cuanto otra
// persona agrega, edita o borra algo. Viven en toda la app, no en una página.
export default function AvisosActividad() {
  const navigate = useNavigate();
  const [avisos, setAvisos] = useState([]);

  useEffect(() => escucharActividad(a => {
    window.dispatchEvent(new Event('actividad-cambio'));
    if (a.leido) return; // cambios hechos por la propia admin
    setAvisos(prev => [a, ...prev].slice(0, 3));
    setTimeout(() => setAvisos(prev => prev.filter(x => x.id !== a.id)), 8000);
  }), []);

  if (avisos.length === 0) return null;
  return (
    <div className="avisos-actividad" role="status" aria-live="polite">
      {avisos.map(a => (
        <button key={a.id} className="aviso-actividad" onClick={() => { setAvisos([]); navigate('/actividad'); }}>
          <IconoAccion accion={a.accion} />
          <span style={{ minWidth: 0 }}>
            <span className="aviso-actividad-frase"><strong>{a.usuarioNombre}</strong> {VERBO[a.accion]} {queEs(a.tabla)}</span>
            {a.descripcion && <span className="aviso-actividad-desc">{a.descripcion}</span>}
            <span className="aviso-actividad-seccion">{nombreSeccion(a.tabla)} · ahora</span>
          </span>
        </button>
      ))}
    </div>
  );
}
