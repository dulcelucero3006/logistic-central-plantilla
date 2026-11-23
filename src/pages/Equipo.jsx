import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconEdit, IconTrash, IconMail, IconPassport, IconPlane, IconFile, IconDownload, IconCopy, IconStar, IconSearch, IconUser, IconCalendar, IconPhone, IconGlobe } from '../icons';
import { listEquipo, listEquipoPublico, createMiembro, updateMiembro, deleteMiembro } from '../lib/equipo';
import { listEventos } from '../lib/eventos';
import Topbar from '../components/Topbar';
import { useSesion } from '../lib/sesion';

const departamentos = ['Administración', 'BGI', 'Logística', 'Marketing', 'Producción', 'Sinertegia', 'Soporte', 'SS', 'TEAM JS', 'TEAM MDL', 'Ventas', 'Otro'];
const colores = ['#1d4ed8', '#0891b2', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777'];
const nacionalidades = ['Mexicana', 'Estadounidense', 'Canadiense', 'Colombiana', 'Argentina', 'Española', 'Otra'];

const FORM_VACIO = {
  nombre: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
  rol: '', email: '', telefono: '', departamento: 'Logística', color: '#1d4ed8', iniciales: '', docs: [],
  pasaporteHabilitado: true, pasaporteNumero: '', pasaporteExpedicion: '', pasaporteVencimiento: '',
  tieneVisa: false, visaNumero: '', visaExpedicion: '', visaVencimiento: '',
  fechaNacimiento: '', nacionalidad: '', favorito: false,
};

function splitNombre(nombreCompleto) {
  const partes = (nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { nombres: '', apellidoPaterno: '', apellidoMaterno: '' };
  if (partes.length === 1) return { nombres: partes[0], apellidoPaterno: '', apellidoMaterno: '' };
  if (partes.length === 2) return { nombres: partes[0], apellidoPaterno: partes[1], apellidoMaterno: '' };
  return { nombres: partes.slice(0, -2).join(' '), apellidoPaterno: partes[partes.length - 2], apellidoMaterno: partes[partes.length - 1] };
}

function joinNombre({ nombres, apellidoPaterno, apellidoMaterno }) {
  return [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ');
}

function nombreCorto(nombreCompleto) {
  const { nombres, apellidoPaterno } = splitNombre(nombreCompleto);
  return [nombres, apellidoPaterno].filter(Boolean).join(' ') || nombreCompleto;
}

function fechaBonita(f) {
  if (!f) return '—';
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function estadoVencimiento(fecha) {
  if (!fecha) return null;
  const dias = Math.round((new Date(fecha + 'T12:00:00') - new Date()) / 86400000);
  if (dias < 0) return { texto: 'Vencido', color: 'var(--accent-red)' };
  if (dias <= 90) return { texto: 'Por vencer', color: '#d97706' };
  return { texto: 'Vigente', color: 'var(--accent-green)' };
}

function textoCompleto(m) {
  return [
    `Nombre: ${m.nombre}`,
    m.rol && `Puesto: ${m.rol}`,
    m.departamento && `Departamento: ${m.departamento}`,
    m.fechaNacimiento && `Fecha de nacimiento: ${fechaBonita(m.fechaNacimiento)}`,
    m.nacionalidad && `Nacionalidad: ${m.nacionalidad}`,
    m.pasaporteNumero && `Pasaporte: ${m.pasaporteNumero} (vence ${fechaBonita(m.pasaporteVencimiento)})`,
    m.tieneVisa && `Visa (USA): ${m.visaNumero || 'sí'} (vence ${fechaBonita(m.visaVencimiento)})`,
    m.email && `Correo: ${m.email}`,
    m.telefono && `Teléfono: ${m.telefono}`,
  ].filter(Boolean).join('\n');
}

const COLUMNAS_TABLA = 'minmax(0, 2fr) minmax(0, 1.3fr) minmax(0, 1.2fr) 36px';
// Sin la columna de Documentos (datos personales) para quien no es admin.
const COLUMNAS_PUBLICAS = 'minmax(0, 2fr) minmax(0, 2fr) 36px';

// Un rol capturado solo como guion se trata como vacío.
function rolDe(m) {
  return m.rol && !/^[\s\-—–]*$/.test(m.rol) ? m.rol : '';
}

// Mayúscula al inicio de cada palabra; las siglas sin vocales (ej. "DL") se quedan en mayúsculas.
function tituloNombre(texto) {
  return (texto || '').split(/(\s+)/).map(p =>
    /[aeiouáéíóúü]/i.test(p) ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p.toUpperCase()
  ).join('');
}

// "Pasaporte · Visa" con un puntito: rojo si algo venció, ámbar si está por vencer, verde si todo vigente.
function resumenDocs(m) {
  const docs = [m.pasaporteNumero && 'Pasaporte', m.tieneVisa && 'Visa'].filter(Boolean);
  if (docs.length === 0) return null;
  const estados = [m.pasaporteNumero && estadoVencimiento(m.pasaporteVencimiento), m.tieneVisa && estadoVencimiento(m.visaVencimiento)]
    .filter(Boolean).map(e => e.texto);
  const estado = estados.includes('Vencido') ? 'Vencido' : estados.includes('Por vencer') ? 'Por vencer' : 'Vigente';
  const color = estado === 'Vencido' ? '#c0392b' : estado === 'Por vencer' ? '#d97706' : '#3f9a52';
  return { texto: docs.join(' · '), estado, color };
}

function Avatar({ m, tamaño = 42, aro = false }) {
  return (
    <span style={{
      width: tamaño, height: tamaño, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 35% 30%, ${m.color}26, ${m.color}40)`, color: m.color,
      fontWeight: 700, fontSize: tamaño * 0.36,
      border: aro ? '3px solid #fff' : `1px solid ${m.color}33`,
      boxShadow: aro ? `0 0 0 4px #9b2c48, 0 0 0 7px #e3c878, 0 10px 22px rgba(90,23,48,0.35)` : 'inset 0 1px 0 rgba(255,255,255,0.6)',
    }}>
      {m.iniciales}
    </span>
  );
}

function BotonCopiar({ onClick, titulo }) {
  return (
    <button title={titulo || 'Copiar'} onClick={onClick} style={{
      width: 30, height: 30, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      borderRadius: 8, color: '#4a2a1a', background: 'linear-gradient(180deg, #ffffff, #f2e6d2)', border: '1px solid #e2d2b6',
      boxShadow: '0 2px 4px rgba(110,75,40,0.18), inset 0 1px 0 #fff',
    }}>
      <IconCopy width={14} height={14} />
    </button>
  );
}

const tituloPanel = { fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 2px 8px' };
const cajaBlanca = {
  borderRadius: 12, padding: '4px 12px', background: 'linear-gradient(180deg, #ffffff, #fbf5ea)', border: '1px solid #ecdcc0',
  boxShadow: '0 3px 8px rgba(110,75,40,0.13), inset 0 1px 0 #fff',
};

function FilaDato({ icono: Icono, etiqueta, valor, copiar, separador }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: separador ? '1px solid #f0e4cf' : 'none' }}>
      {Icono && <Icono width={18} height={18} strokeWidth={1.8} style={{ color: '#4a2a1a', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        {etiqueta && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{etiqueta}</div>}
        <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, overflowWrap: 'anywhere' }}>{valor || '—'}</div>
      </div>
      {valor && valor !== '—' && <BotonCopiar onClick={() => copiar(valor, etiqueta)} />}
    </div>
  );
}

function PanelPerfil({ m, tab, setTab, historial, onFavorito, onEditar, onEliminar, onCerrar, copiar, onPreview, onSubirDoc, onEliminarDoc, editable = true }) {
  const estPas = estadoVencimiento(m.pasaporteVencimiento);
  const estVisa = m.tieneVisa ? estadoVencimiento(m.visaVencimiento) : null;
  const pildoraEstado = est => est && (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: est.texto === 'Vigente' ? '#2f6b3a' : est.texto === 'Vencido' ? '#8c2a34' : '#8a5a10', background: est.texto === 'Vigente' ? '#dcefd9' : est.texto === 'Vencido' ? '#f6dcde' : '#f8e8c8' }}>
      ● {est.texto}
    </span>
  );
  const acciones = [
    ['Copiar nombre', () => copiar(m.nombre, 'Nombre'), false],
    ['Copiar pasaporte', () => copiar(m.pasaporteNumero, 'Pasaporte'), !m.pasaporteNumero],
    ['Copiar visa', () => copiar(m.visaNumero, 'Visa'), !m.tieneVisa || !m.visaNumero],
  ];
  return (
    <div className="relieve" style={{ borderRadius: 20, padding: 18, position: 'sticky', top: 90 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-6px -6px 0 0' }}>
        <button className="close-btn" title="Cerrar tarjeta" onClick={onCerrar}>×</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Avatar m={m} tamaño={84} aro />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{m.nombre}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{[rolDe(m), m.departamento].filter(Boolean).join(' / ')}</div>
          {editable && (
            <div style={{ display: 'flex', gap: 2, marginTop: 6, marginLeft: -6 }}>
              <button className="btn btn-ghost btn-sm" title="Editar" onClick={onEditar}><IconEdit /></button>
              <button className="btn btn-ghost btn-sm" title="Eliminar" onClick={onEliminar}><IconTrash /></button>
            </div>
          )}
        </div>
        {editable ? (
          <button title={m.favorito ? 'Quitar de favoritos' : 'Marcar favorito'} onClick={onFavorito} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: m.favorito ? '#c9962e' : '#cbbba5', padding: 0 }}>
            <IconStar width={24} height={24} style={m.favorito ? { fill: 'currentColor', filter: 'drop-shadow(0 1px 1px rgba(120,80,20,0.4))' } : {}} />
          </button>
        ) : m.favorito && (
          <span title="Favorito" style={{ alignSelf: 'flex-start', color: '#c9962e', display: 'flex' }}>
            <IconStar width={24} height={24} style={{ fill: 'currentColor', filter: 'drop-shadow(0 1px 1px rgba(120,80,20,0.4))' }} />
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['info', 'Información'], ['docs', 'Documentos'], ['historial', 'Historial']].map(([k, l]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, justifyContent: 'center', borderRadius: 10, padding: '7px 8px' }} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{ borderRadius: 14, padding: 12, background: 'linear-gradient(180deg, #f3e7d2, #ecdec4)', boxShadow: 'inset 0 2px 5px rgba(110,75,40,0.12)' }}>
        {tab === 'info' && (
          <>
            <div style={{ ...tituloPanel, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Datos personales
              <BotonCopiar titulo="Copiar todo" onClick={() => copiar(textoCompleto(m), 'Todo')} />
            </div>
            <div style={cajaBlanca}>
              <FilaDato etiqueta="Nombre completo" valor={m.nombre} copiar={copiar} />
              <FilaDato icono={IconCalendar} etiqueta="Fecha de nacimiento" valor={m.fechaNacimiento ? fechaBonita(m.fechaNacimiento) : ''} copiar={copiar} separador />
              <FilaDato icono={IconGlobe} etiqueta="Nacionalidad" valor={m.nacionalidad} copiar={copiar} separador />
            </div>

            <div style={{ ...tituloPanel, marginTop: 14 }}>Documentación</div>
            <div style={{ ...cajaBlanca, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Pasaporte</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {m.pasaporteNumero ? `${m.pasaporteNumero} · Vence ${fechaBonita(m.pasaporteVencimiento)}` : '—'}
                  </div>
                </div>
                {m.pasaporteNumero && pildoraEstado(estPas)}
                {m.pasaporteNumero && <BotonCopiar onClick={() => copiar(m.pasaporteNumero, 'Pasaporte')} />}
              </div>
            </div>
            <div style={cajaBlanca}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Visa (USA)</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {m.tieneVisa ? `${m.visaNumero || 'Sin número'} · Vence ${fechaBonita(m.visaVencimiento)}` : 'Sin visa'}
                  </div>
                </div>
                {m.tieneVisa && pildoraEstado(estVisa)}
                {m.tieneVisa && m.visaNumero && <BotonCopiar onClick={() => copiar(m.visaNumero, 'Visa')} />}
              </div>
            </div>

            <div style={{ ...tituloPanel, marginTop: 14 }}>Contacto</div>
            <div style={cajaBlanca}>
              <FilaDato icono={IconMail} valor={m.email} etiqueta="" copiar={(v) => copiar(v, 'Correo')} />
              <FilaDato icono={IconPhone} valor={m.telefono} etiqueta="" copiar={(v) => copiar(v, 'Teléfono')} separador />
            </div>

            <div style={{ ...tituloPanel, marginTop: 14 }}>Acciones rápidas</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {acciones.map(([texto, fn, deshabilitado]) => (
                <button key={texto} className="btn btn-outline btn-sm" disabled={deshabilitado} onClick={fn}
                  style={{ whiteSpace: 'normal', lineHeight: 1.2, justifyContent: 'center', textAlign: 'center', padding: '7px 4px', fontSize: 11.5, opacity: deshabilitado ? 0.5 : 1 }}>
                  {texto}
                </button>
              ))}
              <button className="btn btn-primary btn-sm" onClick={() => copiar(textoCompleto(m), 'Todo')}
                style={{ whiteSpace: 'normal', lineHeight: 1.2, justifyContent: 'center', textAlign: 'center', padding: '7px 4px', fontSize: 11.5 }}>
                Copiar todo
              </button>
            </div>
          </>
        )}

        {tab === 'docs' && (
          <>
            <div style={{ ...tituloPanel, display: 'flex', justifyContent: 'space-between' }}>
              Documentos de viaje
              <span style={{ textTransform: 'none', fontWeight: 600, color: 'var(--royal)' }}>{(m.docs || []).length} archivo{(m.docs || []).length !== 1 ? 's' : ''}</span>
            </div>
            {(m.docs || []).length === 0 ? (
              <div style={{ ...cajaBlanca, textAlign: 'center', padding: 18, color: 'var(--text-secondary)', fontSize: 13 }}>Sin documentos.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(m.docs || []).map(d => (
                  <div key={d.id} style={{ ...cajaBlanca, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
                    {d.tipo?.includes('image') ? (
                      <img src={d.datos} alt={d.nombre} onClick={() => onPreview(d)} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', cursor: 'pointer', flexShrink: 0 }} />
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}><IconFile width={20} height={20} /></span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.tamaño} · {d.fecha}</div>
                    </div>
                    <a href={d.datos} download={d.nombre} className="btn btn-ghost btn-sm"><IconDownload /></a>
                    {editable && <button className="btn btn-ghost btn-sm" onClick={() => onEliminarDoc(d.id)}><IconTrash /></button>}
                  </div>
                ))}
              </div>
            )}
            {editable && (
              <label style={{ cursor: 'pointer', display: 'block', marginTop: 10 }}>
                <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { if (e.target.files[0]) onSubirDoc(e.target.files[0]); e.target.value = ''; }} />
                <div className="btn btn-primary" style={{ justifyContent: 'center', width: '100%' }}>+ Subir documento</div>
              </label>
            )}
          </>
        )}

        {tab === 'historial' && (
          <>
            <div style={tituloPanel}>Historial de viajes</div>
            {historial.length === 0 ? (
              <div style={{ ...cajaBlanca, textAlign: 'center', padding: 18, color: 'var(--text-secondary)', fontSize: 13 }}>Sin eventos asignados todavía.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...historial].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(e => (
                  <div key={e.id} style={{ ...cajaBlanca, padding: '8px 12px', borderLeft: `4px solid ${e.color}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{e.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{fechaBonita(e.fecha)}{e.lugar ? ` · ${e.lugar}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Equipo() {
  // Datos personales (ficha, documentos, pasaporte/visa) y cualquier edición de
  // Equipo son SOLO para la admin, aunque el rol tenga permiso de ver Equipo.
  const esAdmin = useSesion().persona.esAdmin;
  const editable = esAdmin;
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [eventos, setEventos] = useState([]);
  useEffect(() => { listEventos().then(setEventos); }, []);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroDepto, setFiltroDepto] = useState('Todos');
  const [soloVisa, setSoloVisa] = useState(false);
  const [soloPasaporte, setSoloPasaporte] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [perfilAbierto, setPerfilAbierto] = useState(null);
  const [tabPerfil, setTabPerfil] = useState('info');
  const [previewImg, setPreviewImg] = useState(null);
  const [resaltado, setResaltado] = useState(null);
  const [editandoNombreId, setEditandoNombreId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [copiadoMsg, setCopiadoMsg] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [form, setForm] = useState(FORM_VACIO);
  const cardRefs = useRef({});
  const clickNombreTimer = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    (esAdmin ? listEquipo() : listEquipoPublico()).then(setEquipo).finally(() => setCargando(false));
  }, [esAdmin]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id || cargando) return;
    const idNum = Number(id);
    setFiltroDepto('Todos');
    setResaltado(idNum);
    if (esAdmin) setPerfilAbierto(idNum);
    const el = cardRefs.current[idNum];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setResaltado(null), 2500);
    setSearchParams({}, { replace: true });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, cargando]);

  function copiar(texto, etiqueta) {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setCopiadoMsg(etiqueta ? `${etiqueta} copiado` : 'Copiado');
    setTimeout(() => setCopiadoMsg(''), 1500);
  }

  function abrirNuevo() {
    setEditando(null);
    setErrorForm('');
    setForm(FORM_VACIO);
    setShowModal(true);
  }

  function abrirEditar(m) {
    setEditando(m.id);
    setErrorForm('');
    setForm({ ...m, ...splitNombre(m.nombre), pasaporteHabilitado: !!(m.pasaporteNumero || m.pasaporteVencimiento) });
    setShowModal(true);
  }

  function actualizarNombreParte(campo, valor) {
    setForm(p => {
      const next = { ...p, [campo]: valor };
      next.nombre = joinNombre(next);
      return next;
    });
  }

  function toggleDocumento(campo, encendido, camposALimpiar) {
    setForm(p => ({ ...p, [campo]: encendido, ...(encendido ? {} : camposALimpiar.reduce((acc, c) => ({ ...acc, [c]: '' }), {})) }));
  }

  // Clic en la misma persona: se esconde la tarjeta; en otra: se cambia a esa persona.
  function abrirPerfil(m) {
    if (!esAdmin) return;
    if (perfilAbierto === m.id) { setPerfilAbierto(null); return; }
    setPerfilAbierto(m.id);
    setTabPerfil('info');
  }

  async function toggleFavorito(m) {
    try {
      const actualizado = await updateMiembro({ ...m, favorito: !m.favorito });
      setEquipo(equipo.map(x => x.id === m.id ? actualizado : x));
    } catch (err) {
      alert(`No se pudo actualizar: ${err.message || 'error de conexión.'}`);
    }
  }

  function abrirEdicionNombre(m) {
    setEditandoNombreId(m.id);
    setNombreEditado(m.nombre);
  }

  async function guardarNombreInline(m) {
    const nuevoNombre = nombreEditado.trim();
    setEditandoNombreId(null);
    if (!nuevoNombre || nuevoNombre === m.nombre) return;
    try {
      const actualizado = await updateMiembro({ ...m, nombre: nuevoNombre });
      setEquipo(equipo.map(x => x.id === m.id ? actualizado : x));
    } catch (err) {
      alert(`No se pudo actualizar: ${err.message || 'error de conexión.'}`);
    }
  }

  async function save() {
    if (!form.nombre || !form.rol) {
      setErrorForm('Falta el nombre o el rol — esos dos son obligatorios.');
      return;
    }
    if (!form.departamento.trim()) {
      setErrorForm('Escribe el nombre del departamento.');
      return;
    }
    setErrorForm('');
    setGuardando(true);
    try {
      const ini = form.iniciales || form.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      if (editando) {
        const actualizado = await updateMiembro({ ...form, id: editando, iniciales: ini });
        setEquipo(equipo.map(m => m.id === editando ? actualizado : m));
      } else {
        const creado = await createMiembro({ ...form, id: Date.now(), iniciales: ini, docs: [] });
        setEquipo([...equipo, creado]);
      }
      setShowModal(false);
    } catch (err) {
      setErrorForm(`No se pudo guardar: ${err.message || 'error de conexión con la base de datos.'}`);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este miembro del equipo?')) return;
    try {
      await deleteMiembro(id);
      setEquipo(equipo.filter(m => m.id !== id));
      if (perfilAbierto === id) setPerfilAbierto(null);
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  function subirDoc(miembroId, archivo) {
    const reader = new FileReader();
    reader.onload = async ev => {
      const doc = { id: Date.now(), nombre: archivo.name, tipo: archivo.type, tamaño: (archivo.size / 1024).toFixed(1) + ' KB', datos: ev.target.result, fecha: new Date().toISOString().split('T')[0] };
      const miembro = equipo.find(m => m.id === miembroId);
      const actualizado = await updateMiembro({ ...miembro, docs: [...(miembro.docs || []), doc] });
      setEquipo(equipo.map(m => m.id === miembroId ? actualizado : m));
    };
    reader.readAsDataURL(archivo);
  }

  async function eliminarDoc(miembroId, docId) {
    const miembro = equipo.find(m => m.id === miembroId);
    const actualizado = await updateMiembro({ ...miembro, docs: miembro.docs.filter(d => d.id !== docId) });
    setEquipo(equipo.map(m => m.id === miembroId ? actualizado : m));
  }

  let lista = equipo;
  if (filtroDepto !== 'Todos') lista = lista.filter(m => m.departamento === filtroDepto);
  if (soloVisa) lista = lista.filter(m => m.tieneVisa);
  if (soloPasaporte) lista = lista.filter(m => m.pasaporteNumero);
  if (busqueda.trim()) {
    const q = busqueda.trim().toLowerCase();
    lista = lista.filter(m => m.nombre.toLowerCase().includes(q) || (m.departamento || '').toLowerCase().includes(q) || (m.rol || '').toLowerCase().includes(q));
  }
  lista = [...lista].sort((a, b) => (b.favorito ? 1 : 0) - (a.favorito ? 1 : 0) || a.nombre.localeCompare(b.nombre, 'es'));

  const depsEnUso = [...new Set(equipo.map(m => m.departamento).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const depsFiltro = ['Todos', ...depsEnUso];

  const miembroPerfil = esAdmin ? (equipo.find(m => m.id === perfilAbierto) || null) : null;
  const columnas = esAdmin ? COLUMNAS_TABLA : COLUMNAS_PUBLICAS;
  const historialEventos = miembroPerfil ? eventos.filter(e => (e.miembros || []).includes(miembroPerfil.id) && !e.oculto) : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Equipo</div>
          <div className="page-subtitle">{equipo.length} personas en el directorio</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}><IconSearch /></span>
            <input
              className="form-input"
              style={{ paddingLeft: 30, width: 220, fontSize: 13 }}
              placeholder="Buscar por nombre, rol..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          {editable && <button className="btn btn-primary" onClick={abrirNuevo}>+ Agregar miembro</button>}
          <Topbar hideSearch />
        </div>
      </div>

      <div className="page-body">
        <div className={miembroPerfil ? 'equipo-layout' : undefined}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {depsFiltro.map(d => (
                <button key={d} className={`btn btn-sm ${filtroDepto === d ? 'btn-primary' : 'btn-outline'}`} style={{ borderRadius: 20 }} onClick={() => setFiltroDepto(d)}>{d}</button>
              ))}
              {esAdmin && <button className={`btn btn-sm ${soloVisa ? 'btn-primary' : 'btn-outline'}`} style={{ borderRadius: 20 }} onClick={() => setSoloVisa(v => !v)}><IconPlane /> Con visa</button>}
              {esAdmin && <button className={`btn btn-sm ${soloPasaporte ? 'btn-primary' : 'btn-outline'}`} style={{ borderRadius: 20 }} onClick={() => setSoloPasaporte(v => !v)}><IconPassport /> Pasaporte</button>}
            </div>

            {cargando ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando equipo...</div>
            ) : lista.length === 0 ? (
              <div className="relieve" style={{ borderRadius: 16, textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 14 }}>Nadie coincide con este filtro.</div>
            ) : (
            <div className="relieve" style={{ borderRadius: 18, padding: '6px 10px 10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: columnas, gap: 12, padding: '12px 14px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <span>Miembro</span><span>Área / Rol</span>{esAdmin && <span>Documentos</span>}
                <span style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}><IconStar width={16} height={16} /></span>
              </div>
              {lista.map(m => {
                const editandoEste = editandoNombreId === m.id;
                const seleccionado = miembroPerfil?.id === m.id;
                const docs = resumenDocs(m);
                return (
                  <div
                    key={m.id}
                    ref={el => (cardRefs.current[m.id] = el)}
                    role={esAdmin ? 'button' : undefined}
                    tabIndex={esAdmin ? 0 : undefined}
                    onClick={() => !editandoEste && abrirPerfil(m)}
                    onKeyDown={e => { if (!editandoEste && e.key === 'Enter') abrirPerfil(m); }}
                    style={{
                      display: 'grid', gridTemplateColumns: columnas, gap: 12, alignItems: 'center', cursor: esAdmin ? 'pointer' : 'default',
                      padding: '10px 14px', borderRadius: 12, marginBottom: 2,
                      borderBottom: seleccionado ? '1px solid transparent' : '1px solid #efe4d2',
                      ...(seleccionado ? {
                        background: 'linear-gradient(90deg, #f6e7c6, #fbf3e3 60%, #fffaf2)', border: '1px solid #d9b56a',
                        boxShadow: '0 6px 14px rgba(150,110,40,0.20), inset 0 1px 0 #fff',
                      } : {}),
                      outline: resaltado === m.id ? `3px solid ${m.color}` : 'none', transition: 'outline 0.3s, background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <Avatar m={m} tamaño={42} />
                      {editandoEste ? (
                        <input
                          autoFocus
                          className="form-input"
                          style={{ fontSize: 14, fontWeight: 600, padding: '4px 8px', height: 'auto' }}
                          value={nombreEditado}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setNombreEditado(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') guardarNombreInline(m); if (e.key === 'Escape') setEditandoNombreId(null); }}
                          onBlur={() => guardarNombreInline(m)}
                        />
                      ) : (
                        <span
                          title={editable ? `${m.nombre} (doble clic para renombrar)` : undefined}
                          onClick={e => {
                            e.stopPropagation();
                            clearTimeout(clickNombreTimer.current);
                            clickNombreTimer.current = setTimeout(() => abrirPerfil(m), 280);
                          }}
                          onDoubleClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!editable) return;
                            clearTimeout(clickNombreTimer.current);
                            abrirEdicionNombre(m);
                          }}
                          style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', minWidth: 0, overflowWrap: 'anywhere' }}
                        >
                          {tituloNombre(nombreCorto(m.nombre))}
                        </span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', lineHeight: 1.3, maxWidth: '100%', fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 20,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        ...(seleccionado
                          ? { background: 'linear-gradient(180deg, #a3304f, #7a1d3b)', color: 'white', boxShadow: '0 2px 5px rgba(122,35,64,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' }
                          : { background: 'linear-gradient(180deg, #f6ecdb, #eadcc2)', color: '#4a2a1a', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 2px rgba(110,75,40,0.15)' }),
                      }} title={[m.departamento, rolDe(m)].filter(Boolean).join(' · ')}>
                        {seleccionado && rolDe(m) ? `${m.departamento} · ${rolDe(m)}` : (m.departamento || rolDe(m))}
                      </span>
                    </div>
                    {esAdmin && <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      {docs ? (
                        <>
                          <span title={docs.estado} style={{ width: 8, height: 8, borderRadius: '50%', background: docs.color, flexShrink: 0, boxShadow: `0 0 0 3px ${docs.color}22` }} />
                          {docs.texto}
                        </>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </div>}
                    {editable ? (
                      <span
                        role="button"
                        title={m.favorito ? 'Quitar de favoritos' : 'Marcar favorito'}
                        onClick={e => { e.stopPropagation(); toggleFavorito(m); }}
                        style={{ display: 'flex', justifyContent: 'center', color: m.favorito ? '#c9962e' : '#cbbba5' }}
                      >
                        <IconStar width={20} height={20} style={m.favorito ? { fill: 'currentColor', filter: 'drop-shadow(0 1px 1px rgba(120,80,20,0.4))' } : {}} />
                      </span>
                    ) : (
                      <span title={m.favorito ? 'Favorito' : undefined} style={{ display: 'flex', justifyContent: 'center', color: '#c9962e' }}>
                        {m.favorito && <IconStar width={20} height={20} style={{ fill: 'currentColor', filter: 'drop-shadow(0 1px 1px rgba(120,80,20,0.4))' }} />}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {miembroPerfil && (
            <PanelPerfil
              m={miembroPerfil}
              tab={tabPerfil}
              setTab={setTabPerfil}
              historial={historialEventos}
              onFavorito={() => toggleFavorito(miembroPerfil)}
              onEditar={() => abrirEditar(miembroPerfil)}
              onEliminar={() => eliminar(miembroPerfil.id)}
              onCerrar={() => setPerfilAbierto(null)}
              copiar={copiar}
              onPreview={setPreviewImg}
              onSubirDoc={archivo => subirDoc(miembroPerfil.id, archivo)}
              onEliminarDoc={docId => eliminarDoc(miembroPerfil.id, docId)}
              editable={editable}
            />
          )}
        </div>
      </div>

      {/* Toast de copiado */}
      {copiadoMsg && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--royal)', color: 'white', padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600, zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {copiadoMsg}
        </div>
      )}

      {/* Vista previa de imagen en grande */}
      {previewImg && (
        <div className="modal-backdrop" onClick={() => setPreviewImg(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">{previewImg.nombre}</span>
              <button className="close-btn" onClick={() => setPreviewImg(null)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center' }}>
              <img src={previewImg.datos} alt={previewImg.nombre} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />
            </div>
            <div className="modal-footer">
              <a href={previewImg.datos} download={previewImg.nombre} className="btn btn-outline"><IconDownload /> Descargar</a>
              <button className="btn btn-primary" onClick={() => setPreviewImg(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CRUD */}
      {editable && showModal && (
        <div className="drawer-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="drawer">
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <IconUser width={24} height={24} />
                  </div>
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--royal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, border: '2px solid var(--bg-card)' }}>
                    {editando ? <IconEdit width={11} height={11} /> : '+'}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 19, color: 'var(--text-primary)' }}>{editando ? 'Editar miembro' : 'Agregar miembro'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 260 }}>
                    {editando ? 'Actualiza la información de este integrante.' : 'Completa la información del nuevo integrante de tu equipo.'}
                  </div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--royal)', marginBottom: 12 }}><IconUser /> 1. Datos personales</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre(s)</label>
                  <input className="form-input" value={form.nombres} onChange={e => actualizarNombreParte('nombres', e.target.value)} placeholder="Ej. Ana López" />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido paterno</label>
                  <input className="form-input" value={form.apellidoPaterno} onChange={e => actualizarNombreParte('apellidoPaterno', e.target.value)} placeholder="Ej. Elías" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Apellido materno</label>
                  <input className="form-input" value={form.apellidoMaterno} onChange={e => actualizarNombreParte('apellidoMaterno', e.target.value)} placeholder="Ej. Álvarez" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de nacimiento</label>
                  <input className="form-input" type="date" value={form.fechaNacimiento} onChange={e => setForm(p => ({ ...p, fechaNacimiento: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Rol / Puesto</label>
                  <input className="form-input" value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))} placeholder="Ej: Coordinador de Logística" />
                </div>
                <div className="form-group">
                  <label className="form-label">Departamento</label>
                  <select
                    className="form-input"
                    value={departamentos.includes(form.departamento) ? form.departamento : 'Otro'}
                    onChange={e => setForm(p => ({ ...p, departamento: e.target.value === 'Otro' ? '' : e.target.value }))}
                  >
                    {departamentos.map(d => <option key={d}>{d}</option>)}
                  </select>
                  {!departamentos.includes(form.departamento) && (
                    <input
                      autoFocus
                      className="form-input"
                      style={{ marginTop: 8 }}
                      value={form.departamento}
                      onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))}
                      placeholder="Escribe el departamento"
                    />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nacionalidad</label>
                <select className="form-input" value={form.nacionalidad} onChange={e => setForm(p => ({ ...p, nacionalidad: e.target.value }))}>
                  <option value="">Selecciona</option>
                  {nacionalidades.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Iniciales (2 letras)</label>
                  <input className="form-input" value={form.iniciales} maxLength={2} onChange={e => setForm(p => ({ ...p, iniciales: e.target.value.toUpperCase() }))} placeholder="Ej: DL" />
                </div>
                <div className="form-group">
                  <label className="form-label">Color de perfil</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                    {colores.map(c => (
                      <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
              </div>

              <hr className="divider" />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--royal)', marginBottom: 12 }}><IconPassport /> 2. Documentación</div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.pasaporteHabilitado ? 12 : 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}><IconPassport /> Pasaporte</span>
                  <label className="switch">
                    <input type="checkbox" checked={!!form.pasaporteHabilitado} onChange={e => toggleDocumento('pasaporteHabilitado', e.target.checked, ['pasaporteNumero', 'pasaporteExpedicion', 'pasaporteVencimiento'])} />
                    <span className="slider" />
                  </label>
                </div>
                {form.pasaporteHabilitado && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Número de pasaporte</label>
                      <input className="form-input" value={form.pasaporteNumero || ''} onChange={e => setForm(p => ({ ...p, pasaporteNumero: e.target.value }))} placeholder="Ej. G12345678" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vencimiento</label>
                      <input className="form-input" type="date" value={form.pasaporteVencimiento || ''} onChange={e => setForm(p => ({ ...p, pasaporteVencimiento: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.tieneVisa ? 12 : 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}><IconPassport /> Visa (USA)</span>
                  <label className="switch">
                    <input type="checkbox" checked={!!form.tieneVisa} onChange={e => toggleDocumento('tieneVisa', e.target.checked, ['visaNumero', 'visaExpedicion', 'visaVencimiento'])} />
                    <span className="slider" />
                  </label>
                </div>
                {form.tieneVisa && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Número de visa</label>
                      <input className="form-input" value={form.visaNumero || ''} onChange={e => setForm(p => ({ ...p, visaNumero: e.target.value }))} placeholder="Ej. 654321987" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vencimiento</label>
                      <input className="form-input" type="date" value={form.visaVencimiento || ''} onChange={e => setForm(p => ({ ...p, visaVencimiento: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              <hr className="divider" />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--royal)', marginBottom: 12 }}><IconMail /> 3. Contacto</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Correo electrónico</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@empresa.mx" />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="Ej. +52 33 1234 5678" />
                </div>
              </div>

              {errorForm && (
                <div style={{ background: '#f6dcde', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginTop: 10 }}>
                  {errorForm}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ borderRadius: 0 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={guardando}>
                {guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Guardar miembro')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
