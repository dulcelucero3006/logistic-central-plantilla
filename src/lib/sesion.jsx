import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';

const SesionContext = createContext(null);

// Secciones de la app a las que se les asignan permisos por rol.
export const SECCIONES = [
  { clave: 'dashboard', nombre: 'Dashboard', ruta: '/' },
  { clave: 'calendario', nombre: 'Calendario', ruta: '/calendario' },
  { clave: 'giras', nombre: 'Giras', ruta: '/giras' },
  { clave: 'eventos', nombre: 'Eventos', ruta: '/eventos' },
  { clave: 'gastos', nombre: 'Gastos', ruta: '/presupuesto' },
  { clave: 'equipo', nombre: 'Equipo', ruta: '/equipo' },
  { clave: 'checklist', nombre: 'Checklist', ruta: '/checklist' },
  { clave: 'aerolineas', nombre: 'Aerolíneas', ruta: '/aerolineas' },
  { clave: 'salones', nombre: 'Salones', ruta: '/salones' },
];

export const ROLES = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

// Datos de la persona que tiene la sesión abierta, listos para la interfaz.
function aPersona(user) {
  if (!user) return null;
  const nombre = user.user_metadata?.nombre || user.email.split('@')[0];
  const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
  const acceso = ROLES[user.app_metadata?.acceso] ? user.app_metadata.acceso : null;
  return {
    id: user.id,
    email: user.email,
    nombre,
    iniciales,
    acceso,
    esAdmin: acceso === 'admin',
    puesto: user.user_metadata?.puesto || ROLES[acceso] || '',
  };
}

export function SesionProvider({ children }) {
  const [cargando, setCargando] = useState(true);
  const [user, setUser] = useState(null);
  const [permisos, setPermisos] = useState({});
  const idActual = useRef(null);

  const cargarPermisos = useCallback(async (u) => {
    const acceso = u?.app_metadata?.acceso;
    if (!acceso || acceso === 'admin') { setPermisos({}); return; }
    const { data } = await supabase.from('permisos_rol').select('seccion, ver, editar').eq('rol', acceso);
    const mapa = {};
    (data || []).forEach(p => { mapa[p.seccion] = { ver: p.ver || p.editar, editar: p.editar }; });
    setPermisos(mapa);
  }, []);

  useEffect(() => {
    let vivo = true;
    async function iniciar() {
      const { data } = await supabase.auth.getSession();
      let u = data.session?.user || null;
      // Trae la cuenta al día (por si la admin le cambió el rol).
      if (u) {
        const fresco = await supabase.auth.getUser();
        if (fresco.data?.user) u = fresco.data.user;
      }
      if (!vivo) return;
      idActual.current = u?.id || null;
      setUser(u);
      await cargarPermisos(u);
      if (vivo) setCargando(false);
    }
    iniciar();
    const { data: sub } = supabase.auth.onAuthStateChange((evento, session) => {
      const u = session?.user || null;
      const cambioDePersona = (u?.id || null) !== idActual.current;
      idActual.current = u?.id || null;
      if (!cambioDePersona) { setUser(u); return; }
      // Otra persona entró o salió: espera sus permisos antes de mostrar la app.
      // (Sin await aquí: llamar a Supabase dentro de este aviso puede trabarlo.)
      setCargando(true);
      setTimeout(async () => {
        await cargarPermisos(u);
        setUser(u);
        setCargando(false);
      }, 0);
    });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, [cargarPermisos]);

  const persona = aPersona(user);
  const puedeVer = clave => !!persona && (persona.esAdmin || !!permisos[clave]?.ver);
  const puedeEditar = clave => !!persona && (persona.esAdmin || !!permisos[clave]?.editar);

  const valor = {
    cargando,
    persona,
    puedeVer,
    puedeEditar,
    recargarPermisos: () => cargarPermisos(user),
    entrar: (email, password) => supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }),
    salir: () => supabase.auth.signOut(),
    cambiarPassword: password => supabase.auth.updateUser({ password }),
  };
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  return useContext(SesionContext);
}

// ¿Puede editar la sección? Atajo para las páginas.
export function useEditable(clave) {
  return useContext(SesionContext).puedeEditar(clave);
}

// fetch a las funciones del servidor (/api/...) mandando la sesión, que el
// servidor exige para todo.
export async function apiFetch(url, opts = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(url, {
    ...opts,
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
