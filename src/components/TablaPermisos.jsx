import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SECCIONES } from '../lib/sesion';

const ROLES_EDITABLES = [
  { clave: 'editor', nombre: 'Editor' },
  { clave: 'viewer', nombre: 'Viewer' },
];
// Secciones que solo muestran información (no hay nada que editar ahí).
const SOLO_VER = ['dashboard'];
// Secciones que solo la admin puede editar, sin importar el rol.
const SOLO_ADMIN_EDITA = ['equipo'];

function Interruptor({ activo, onClick, etiqueta, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} title={etiqueta}
      className={`permiso-switch${activo ? ' on' : ''}`} onClick={onClick} disabled={disabled}>
      <span />
    </button>
  );
}

// Matriz sección x rol con "Ver" y "Editar". Se guarda al momento.
export default function TablaPermisos() {
  const [permisos, setPermisos] = useState(null); // { 'editor:gastos': {ver, editar} }
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState('');

  useEffect(() => {
    supabase.from('permisos_rol').select('*').then(({ data, error: err }) => {
      if (err) { setError('No se pudieron cargar los permisos.'); return; }
      const mapa = {};
      (data || []).forEach(p => { mapa[`${p.rol}:${p.seccion}`] = { ver: p.ver, editar: p.editar }; });
      setPermisos(mapa);
    });
  }, []);

  async function cambiar(rol, seccion, campo) {
    const clave = `${rol}:${seccion}`;
    const actual = permisos[clave] || { ver: false, editar: false };
    let nuevo;
    if (campo === 'ver') nuevo = actual.ver ? { ver: false, editar: false } : { ...actual, ver: true };
    else nuevo = actual.editar ? { ...actual, editar: false } : { ver: true, editar: true };
    const antes = permisos;
    setPermisos({ ...permisos, [clave]: nuevo });
    setGuardando(clave);
    const { error: err } = await supabase.from('permisos_rol').upsert({ rol, seccion, ...nuevo });
    setGuardando('');
    if (err) { setPermisos(antes); alert('No se pudo guardar el cambio. Intenta de nuevo.'); }
  }

  return (
    <div className="card relieve" style={{ marginTop: 22, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 4px' }}>
        <div className="card-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: 17 }}>Permisos por rol</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Qué puede ver y qué puede editar cada rol. Los cambios se guardan solos y aplican a todas las personas con ese rol.
          Tú, como admin, siempre ves y editas todo. Los datos personales del equipo (ficha, pasaporte, visa, documentos, contacto) son solo para ti, aunque un rol pueda ver Equipo.
        </div>
      </div>
      {error ? <div className="empty-state">{error}</div> : !permisos ? <div className="empty-state">Cargando…</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table permisos-tabla">
            <thead>
              <tr>
                <th rowSpan={2}>Sección</th>
                {ROLES_EDITABLES.map(r => <th key={r.clave} colSpan={2} className="permisos-rol">{r.nombre}</th>)}
              </tr>
              <tr>
                {ROLES_EDITABLES.map(r => [
                  <th key={`${r.clave}-v`} className="permisos-col">Ver</th>,
                  <th key={`${r.clave}-e`} className="permisos-col">Editar</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {SECCIONES.map(s => (
                <tr key={s.clave}>
                  <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                  {ROLES_EDITABLES.map(r => {
                    const p = permisos[`${r.clave}:${s.clave}`] || { ver: false, editar: false };
                    const ocupado = guardando === `${r.clave}:${s.clave}`;
                    return [
                      <td key={`${r.clave}-v`} className="permisos-col">
                        <Interruptor activo={p.ver} disabled={ocupado} onClick={() => cambiar(r.clave, s.clave, 'ver')}
                          etiqueta={`${r.nombre} ${p.ver ? 'puede' : 'no puede'} ver ${s.nombre}`} />
                      </td>,
                      <td key={`${r.clave}-e`} className="permisos-col">
                        {SOLO_VER.includes(s.clave) ? <span style={{ color: 'var(--text-muted)' }}>—</span> : SOLO_ADMIN_EDITA.includes(s.clave) ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }} title="Editar a las personas implica ver sus datos personales">Solo admin</span>
                        ) : (
                          <Interruptor activo={p.editar} disabled={ocupado} onClick={() => cambiar(r.clave, s.clave, 'editar')}
                            etiqueta={`${r.nombre} ${p.editar ? 'puede' : 'no puede'} editar ${s.nombre}`} />
                        )}
                      </td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
