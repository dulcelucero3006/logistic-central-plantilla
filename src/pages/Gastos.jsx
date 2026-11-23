import { useState, useEffect } from 'react';
import { IconEdit, IconTrash, IconCoin, IconPaperclip, IconFile, IconDownload, IconSearch, IconMapPin, IconCard, IconTransfer, IconChevronDown, IconList } from '../icons';
import { listEventos } from '../lib/eventos';
import { listGastos, createGasto, updateGasto, deleteGasto } from '../lib/gastos';
import { listGiras } from '../lib/giras';
import Topbar from '../components/Topbar';
import { useEditable } from '../lib/sesion';
import { GraficaArcosBarras, BarraProporcion, PuntoColor, IconoCategoria, PildoraCategoria, colorCategoria, COLOR_OTROS } from '../components/GraficasGasto';

const ESTILO_METODO = {
  Tarjeta: { icono: IconCard, background: 'linear-gradient(180deg, #a3304f, #6e1a36)', color: 'white', border: '1px solid #5e1630' },
  Transferencia: { icono: IconTransfer, background: 'linear-gradient(180deg, #f8ecd4, #e6d1aa)', color: '#4a2a0c', border: '1px solid #d9c29a' },
  Efectivo: { icono: IconCoin, background: 'linear-gradient(180deg, #e3eedb, #c4d9b5)', color: '#2f5a28', border: '1px solid #b3cca2' },
};

function PildoraMetodo({ metodo }) {
  const estilo = ESTILO_METODO[metodo];
  if (!estilo) return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
  const { icono: Icono, ...colores } = estilo;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      padding: '4px 12px', borderRadius: 20, ...colores,
      boxShadow: '0 2px 5px rgba(70,30,15,0.22), inset 0 1px 0 rgba(255,255,255,0.35)',
    }}>
      <Icono width={13} height={13} strokeWidth={2.2} /> {metodo}
    </span>
  );
}

const categorias = ['Hospedaje', 'Permisos', 'Producción', 'Salón', 'Sorteo', 'Transporte', 'Viáticos', 'Vuelos', 'Vuelos SS', 'Otro'];
const metodosPago = ['Tarjeta', 'Efectivo', 'Transferencia'];

function montoMXN(g) {
  return g.moneda === 'USD' ? g.monto * (Number(g.tipoCambio) || 0) : g.monto;
}

// Para ver un total en dólares: si el gasto ya se capturó en dólares se usa tal cual (sin
// volver a convertir con otro tipo de cambio), y solo lo capturado en pesos se convierte.
function montoUSD(g, tipoCambioRef) {
  if (g.moneda === 'USD') return g.monto;
  return tipoCambioRef > 0 ? g.monto / tipoCambioRef : 0;
}

function fm(valor) {
  return Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function obtenerTipoCambioUSD(forzar = false) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (!forzar) {
    try {
      const cache = JSON.parse(localStorage.getItem('lc_tipo_cambio_usd') || 'null');
      if (cache && cache.fecha === hoy) return cache.valor;
    } catch {
      // caché corrupto, seguimos y lo pedimos de nuevo
    }
  }
  const res = await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=MXN');
  if (!res.ok) throw new Error('No se pudo consultar el tipo de cambio.');
  const data = await res.json();
  const valor = data.rates?.MXN;
  if (!valor) throw new Error('Respuesta inesperada del servicio de tipo de cambio.');
  localStorage.setItem('lc_tipo_cambio_usd', JSON.stringify({ fecha: hoy, valor }));
  return valor;
}

export default function Presupuesto() {
  const editable = useEditable('gastos');
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [eventos, setEventos] = useState([]);
  useEffect(() => { listEventos().then(setEventos); }, []);
  const eventosVisibles = eventos.filter(e => !e.oculto);
  const [giras, setGiras] = useState([]);
  useEffect(() => { listGiras().then(setGiras); }, []);
  useEffect(() => { listGastos().then(setGastos).finally(() => setCargando(false)); }, []);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [menuFiltroAbierto, setMenuFiltroAbierto] = useState(false);
  const [ciudadPorGira, setCiudadPorGira] = useState({});
  const [verComprobantes, setVerComprobantes] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [form, setForm] = useState({ concepto: '', categoria: 'Transporte', monto: 0, moneda: 'MXN', tipoCambio: '', proveedor: '', notas: '', otroDetalle: '', eventoId: '', metodoPago: '' });
  const [cargandoTC, setCargandoTC] = useState(false);
  const [errorTC, setErrorTC] = useState('');
  const [vistaMonedaGira, setVistaMonedaGira] = useState({});
  const [vistaMonedaEvento, setVistaMonedaEvento] = useState({});
  const [ciudadesAbiertas, setCiudadesAbiertas] = useState({});
  const [ocultarSugerenciaConversion, setOcultarSugerenciaConversion] = useState(false);
  const [mostrarMenuExportar, setMostrarMenuExportar] = useState(false);
  const [vistaMenuExportar, setVistaMenuExportar] = useState('inicio');

  const [tipoCambioHoy, setTipoCambioHoy] = useState(null);
  const [cargandoTCHoy, setCargandoTCHoy] = useState(false);
  const [errorTCHoy, setErrorTCHoy] = useState('');

  async function cargarTipoCambioHoy(forzar = false) {
    setCargandoTCHoy(true);
    setErrorTCHoy('');
    try {
      const valor = await obtenerTipoCambioUSD(forzar);
      setTipoCambioHoy(valor);
    } catch {
      setErrorTCHoy('No se pudo consultar el tipo de cambio.');
    } finally {
      setCargandoTCHoy(false);
    }
  }

  useEffect(() => { cargarTipoCambioHoy(); }, []);

  async function voltearVista(mapa, setMapa, id, monedaActual, tipoCambioActual) {
    const nuevaMoneda = monedaActual === 'USD' ? 'MXN' : 'USD';
    if (nuevaMoneda === 'USD' && !(Number(tipoCambioActual) > 0)) {
      try {
        const valor = await obtenerTipoCambioUSD();
        setMapa(prev => ({ ...prev, [id]: { moneda: nuevaMoneda, tipoCambio: valor } }));
      } catch {
        alert('No se pudo obtener el tipo de cambio automático — intenta de nuevo en un momento.');
      }
      return;
    }
    setMapa(prev => ({ ...prev, [id]: { moneda: nuevaMoneda, tipoCambio: tipoCambioActual } }));
  }

  async function autoTipoCambio() {
    setCargandoTC(true);
    setErrorTC('');
    try {
      const valor = await obtenerTipoCambioUSD();
      setForm(p => ({ ...p, tipoCambio: valor }));
    } catch (err) {
      setErrorTC('No se pudo obtener el tipo de cambio automático — ingrésalo a mano.');
    } finally {
      setCargandoTC(false);
    }
  }

  function elegirMoneda(moneda) {
    setForm(p => ({ ...p, moneda }));
    setOcultarSugerenciaConversion(false);
    if (moneda === 'USD' && !form.tipoCambio) autoTipoCambio();
  }

  async function convertirMonedaForm() {
    setErrorTC('');
    if (form.moneda === 'MXN') {
      let tipoCambio = giraFormEsUSD ? Number(giraFormSeleccionada.tipoCambioReferencia) : Number(form.tipoCambio);
      if (!(tipoCambio > 0)) {
        setCargandoTC(true);
        try {
          tipoCambio = await obtenerTipoCambioUSD();
        } catch {
          setErrorTC('No se pudo obtener el tipo de cambio automático — ingrésalo a mano.');
          setCargandoTC(false);
          return;
        }
        setCargandoTC(false);
      }
      const nuevoMonto = Math.round((Number(form.monto) / tipoCambio) * 100) / 100;
      setForm(p => ({ ...p, moneda: 'USD', monto: nuevoMonto, tipoCambio }));
    } else {
      let tipoCambio = Number(form.tipoCambio);
      if (!(tipoCambio > 0)) {
        setCargandoTC(true);
        try {
          tipoCambio = await obtenerTipoCambioUSD();
        } catch {
          setErrorTC('No se pudo obtener el tipo de cambio automático — ingrésalo a mano.');
          setCargandoTC(false);
          return;
        }
        setCargandoTC(false);
      }
      const nuevoMonto = Math.round(Number(form.monto) * tipoCambio * 100) / 100;
      setForm(p => ({ ...p, moneda: 'MXN', monto: nuevoMonto, tipoCambio: '' }));
    }
  }

  function abrirNuevo(eventoId = '') {
    setEditando(null);
    setErrorForm('');
    setErrorTC('');
    setOcultarSugerenciaConversion(false);
    setForm({ concepto: '', categoria: 'Transporte', monto: 0, moneda: 'MXN', tipoCambio: '', proveedor: '', notas: '', otroDetalle: '', eventoId, metodoPago: '' });
    setShowModal(true);
  }

  function abrirEditar(g) { setEditando(g.id); setErrorForm(''); setErrorTC(''); setOcultarSugerenciaConversion(false); setForm({ ...g }); setShowModal(true); }

  async function save() {
    if (!form.concepto) {
      setErrorForm('Falta el concepto del gasto — es obligatorio.');
      return;
    }
    if (form.moneda === 'USD' && !(Number(form.tipoCambio) > 0)) {
      setErrorForm('Falta un tipo de cambio válido (mayor a cero) para convertir el monto en dólares a pesos.');
      return;
    }
    setErrorForm('');
    setGuardando(true);
    try {
      if (editando) {
        const g = gastos.find(x => x.id === editando);
        const actualizado = await updateGasto({ ...g, ...form, id: editando });
        setGastos(gastos.map(x => x.id === editando ? actualizado : x));
      } else {
        const creado = await createGasto({ ...form, id: Date.now(), comprobantes: [] });
        setGastos([...gastos, creado]);
      }
      setShowModal(false);
    } catch (err) {
      setErrorForm(`No se pudo guardar: ${err.message || 'error de conexión con la base de datos.'}`);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await deleteGasto(id);
      setGastos(gastos.filter(g => g.id !== id));
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message || 'error de conexión.'}`);
    }
  }

  function subirComprobante(gastoId, archivo) {
    const reader = new FileReader();
    reader.onload = async ev => {
      const doc = { id: Date.now(), nombre: archivo.name, tipo: archivo.type, tamaño: (archivo.size / 1024).toFixed(1) + ' KB', datos: ev.target.result, fecha: new Date().toISOString().split('T')[0] };
      const gasto = gastos.find(g => g.id === gastoId);
      const actualizado = await updateGasto({ ...gasto, comprobantes: [...(gasto.comprobantes || []), doc] });
      setGastos(gastos.map(g => g.id === gastoId ? actualizado : g));
      if (verComprobantes && verComprobantes.id === gastoId) setVerComprobantes(actualizado);
    };
    reader.readAsDataURL(archivo);
  }

  async function eliminarComprobante(gastoId, compId) {
    const gasto = gastos.find(g => g.id === gastoId);
    const actualizado = await updateGasto({ ...gasto, comprobantes: gasto.comprobantes.filter(c => c.id !== compId) });
    setGastos(gastos.map(g => g.id === gastoId ? actualizado : g));
    if (verComprobantes && verComprobantes.id === gastoId) setVerComprobantes(actualizado);
  }

  const totalGastado = gastos.reduce((a, g) => a + montoMXN(g), 0);
  const promedio = gastos.length > 0 ? Math.round(totalGastado / gastos.length) : 0;
  const gastosUSD = gastos.filter(g => g.moneda === 'USD');
  const totalGastadoUSD = gastosUSD.reduce((a, g) => a + g.monto, 0);

  const eventoFormSeleccionado = form.eventoId ? eventosVisibles.find(e => e.id === form.eventoId) : null;
  const giraFormSeleccionada = eventoFormSeleccionado?.giraId ? giras.find(g => g.id === eventoFormSeleccionado.giraId) : null;
  const giraFormEsUSD = giraFormSeleccionada?.monedaPrincipal === 'USD' && Number(giraFormSeleccionada?.tipoCambioReferencia) > 0;

  const porCategoria = categorias.map(cat => {
    const items = gastos.filter(g => g.categoria === cat);
    return { cat, total: items.reduce((a, g) => a + montoMXN(g), 0), count: items.length, usd: items.filter(g => g.moneda === 'USD').reduce((a, g) => a + g.monto, 0) };
  }).filter(c => c.count > 0);

  const girasDisponibles = giras.filter(g => eventosVisibles.some(e => e.giraId === g.id));

  let lista = gastos;
  if (filtroEvento === 'sin-evento') {
    lista = gastos.filter(g => !g.eventoId);
  } else if (filtroEvento.startsWith('gira:')) {
    const giraId = Number(filtroEvento.slice(5));
    const idsGira = new Set(eventosVisibles.filter(e => e.giraId === giraId).map(e => e.id));
    lista = gastos.filter(g => idsGira.has(g.eventoId));
  } else if (filtroEvento !== 'todos') {
    lista = gastos.filter(g => g.eventoId === Number(filtroEvento));
  }

  const porEvento = {};
  lista.forEach(g => {
    const key = g.eventoId || 'sin-evento';
    (porEvento[key] = porEvento[key] || []).push(g);
  });
  const gruposEvento = [...eventosVisibles.map(e => e.id), 'sin-evento']
    .filter(key => porEvento[key])
    .map(key => ({ evento: key === 'sin-evento' ? null : eventosVisibles.find(e => e.id === key), gastos: porEvento[key] }));

  const girasResumen = girasDisponibles.map(gira => {
    const eventosGira = eventosVisibles.filter(e => e.giraId === gira.id);
    const idsGira = new Set(eventosGira.map(e => e.id));
    const gastosGira = gastos.filter(g => idsGira.has(g.eventoId));
    const totalUSDNativo = gastosGira.filter(g => g.moneda === 'USD').reduce((a, g) => a + g.monto, 0);
    const total = gastosGira.reduce((a, g) => a + montoMXN(g), 0);
    const esUSD = gira.monedaPrincipal === 'USD' && Number(gira.tipoCambioReferencia) > 0;
    const primeraFechaEvento = eventosGira.map(e => e.fecha).filter(Boolean).sort()[0] || '';
    return {
      id: gira.id, nombreGira: gira.nombre, eventosGira, gastosGira, total, totalUSDNativo, count: gastosGira.length,
      esUSD, tipoCambioReferencia: Number(gira.tipoCambioReferencia) || null,
      fechaOrden: gira.fechaInicio || primeraFechaEvento || '9999-12-31',
    };
  }).sort((a, b) => a.fechaOrden.localeCompare(b.fechaOrden) || a.nombreGira.localeCompare(b.nombreGira));

  const opcionesFiltro = [
    { valor: 'todos', label: 'Todos los eventos', grupo: null },
    { valor: 'sin-evento', label: 'Sin evento', grupo: null },
    ...girasDisponibles.map(g => ({ valor: `gira:${g.id}`, label: g.nombre, grupo: 'Giras' })),
    ...eventosVisibles.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(e => ({ valor: String(e.id), label: e.nombre, grupo: 'Ciudades' })),
  ];
  const opcionesFiltroVisibles = opcionesFiltro.filter(o => o.label.toLowerCase().includes(busquedaEvento.trim().toLowerCase()));
  const etiquetaFiltroActual = opcionesFiltro.find(o => o.valor === filtroEvento)?.label || 'Todos los eventos';

  function elegirFiltro(valor) {
    setFiltroEvento(valor);
    setMenuFiltroAbierto(false);
    setBusquedaEvento('');
  }

  function descargarCSV(filas, nombreArchivo) {
    const csv = '\uFEFF' + filas
      .map(fila => fila.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function slug(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function cerrarMenuExportar() {
    setMostrarMenuExportar(false);
    setVistaMenuExportar('inicio');
  }

  // Orden de columnas que usa el Excel de la compañera (Sorteo, Venue=Salón, Hospedaje, Transporte, Viáticos primero).
  const ordenColumnasReporte = ['Sorteo', 'Salón', 'Hospedaje', 'Transporte', 'Viáticos'];
  function ordenarParaReporte(cats) {
    return cats.slice().sort((a, b) => {
      const ia = ordenColumnasReporte.indexOf(a);
      const ib = ordenColumnasReporte.indexOf(b);
      const ra = ia === -1 ? ordenColumnasReporte.length + categorias.indexOf(a) : ia;
      const rb = ib === -1 ? ordenColumnasReporte.length + categorias.indexOf(b) : ib;
      return ra - rb;
    });
  }

  function exportarGira(gr) {
    const monto = g => gr.esUSD ? montoUSD(g, gr.tipoCambioReferencia) : montoMXN(g);
    const etiqueta = gr.esUSD ? 'USD' : 'MXN';
    const filas = [];
    filas.push([`Gira: ${gr.nombreGira}`]);
    filas.push([]);
    filas.push([`Totales por categoría (toda la gira, en ${etiqueta})`]);
    filas.push(['Categoría', `Total (${etiqueta})`]);
    ordenarParaReporte(categorias).forEach(cat => {
      const total = gr.gastosGira.filter(g => g.categoria === cat).reduce((a, g) => a + monto(g), 0);
      if (total > 0) filas.push([cat, total.toFixed(2)]);
    });
    const totalGira = gr.gastosGira.reduce((a, g) => a + monto(g), 0);
    filas.push(['Total gira', totalGira.toFixed(2)]);
    filas.push([]);
    filas.push(['Desglose por ciudad']);
    const categoriasConDatos = ordenarParaReporte(categorias).filter(cat =>
      gr.gastosGira.filter(g => g.categoria === cat).reduce((a, g) => a + monto(g), 0) > 0
    );
    filas.push(['Ciudad', ...categoriasConDatos, `Total (${etiqueta})`]);
    gr.eventosGira.forEach(ev => {
      const gastosCiudad = gr.gastosGira.filter(g => g.eventoId === ev.id);
      const totales = categoriasConDatos.map(cat =>
        gastosCiudad.filter(g => g.categoria === cat).reduce((a, g) => a + monto(g), 0)
      );
      const total = gastosCiudad.reduce((a, g) => a + monto(g), 0);
      filas.push([ev.nombre, ...totales.map(t => t.toFixed(2)), total.toFixed(2)]);
    });
    descargarCSV(filas, `reporte-${slug(gr.nombreGira)}-${new Date().toISOString().slice(0, 10)}.csv`);
    cerrarMenuExportar();
  }

  function exportarCiudad(evento) {
    const gastosCiudad = gastos.filter(g => g.eventoId === evento.id);
    const giraDeEvento = evento.giraId ? giras.find(g => g.id === evento.giraId) : null;
    const esUSD = giraDeEvento?.monedaPrincipal === 'USD' && Number(giraDeEvento?.tipoCambioReferencia) > 0;
    const etiqueta = esUSD ? 'USD' : 'MXN';
    const monto = esUSD
      ? g => montoUSD(g, Number(giraDeEvento.tipoCambioReferencia))
      : g => montoMXN(g);
    const totalCiudad = gastosCiudad.reduce((a, g) => a + monto(g), 0);
    const categoriasConDatos = ordenarParaReporte(categorias).filter(cat =>
      gastosCiudad.filter(g => g.categoria === cat).reduce((a, g) => a + monto(g), 0) > 0
    );
    const totalesPorCategoria = categoriasConDatos.map(cat =>
      gastosCiudad.filter(g => g.categoria === cat).reduce((a, g) => a + monto(g), 0)
    );
    const filas = [];
    filas.push([`Ciudad: ${evento.nombre}`]);
    filas.push([]);
    filas.push(['Ciudad', ...categoriasConDatos, `Total (${etiqueta})`]);
    filas.push([evento.nombre, ...totalesPorCategoria.map(t => t.toFixed(2)), totalCiudad.toFixed(2)]);
    filas.push([]);
    filas.push(['Detalle de gastos']);
    filas.push(['Categoría', 'Concepto', 'Proveedor', 'Monto', 'Moneda', 'Método de pago', 'Notas']);
    gastosCiudad.forEach(g => {
      filas.push([
        g.categoria === 'Otro' && g.otroDetalle ? g.otroDetalle : g.categoria,
        g.concepto,
        g.proveedor || '',
        Number(g.monto || 0).toFixed(2),
        g.moneda,
        g.metodoPago || '',
        g.notas || '',
      ]);
    });
    descargarCSV(filas, `reporte-${slug(evento.nombre)}-${new Date().toISOString().slice(0, 10)}.csv`);
    cerrarMenuExportar();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Gastos</div>
          <div className="page-subtitle">registro y suma de gastos</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="relieve-renglon" style={{ borderRadius: 12, padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tipo de cambio de hoy</div>
            {errorTCHoy ? (
              <div style={{ fontSize: 11, color: 'var(--accent-red)' }}>{errorTCHoy}</div>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--royal)' }}>
                {cargandoTCHoy ? '...' : tipoCambioHoy != null ? `$${fm(tipoCambioHoy)} = US$1` : '—'}
              </div>
            )}
          </div>
          <button className="btn btn-outline btn-sm" title="Actualizar tipo de cambio" onClick={() => cargarTipoCambioHoy(true)} disabled={cargandoTCHoy}>
            ↻
          </button>
          {girasResumen.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button className="btn btn-outline" onClick={() => setMostrarMenuExportar(v => !v)} title="Descargar un reporte en CSV con el total por categoría">
                <IconDownload /> Exportar reporte
              </button>
              {mostrarMenuExportar && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={cerrarMenuExportar} />
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 220, maxHeight: 320, overflowY: 'auto', zIndex: 11 }}>
                    {vistaMenuExportar === 'inicio' && (
                      <>
                        <button className="menu-item" onClick={() => setVistaMenuExportar('giras')}>Reporte por gira</button>
                        <button className="menu-item" style={{ borderTop: '1px solid var(--border)' }} onClick={() => setVistaMenuExportar('ciudades')}>Reporte por ciudad</button>
                      </>
                    )}
                    {vistaMenuExportar === 'giras' && (
                      <>
                        <button className="menu-item" style={{ color: 'var(--text-muted)', fontWeight: 600 }} onClick={() => setVistaMenuExportar('inicio')}>‹ Elige una gira</button>
                        {girasResumen.map(gr => (
                          <button key={gr.id} className="menu-item" style={{ borderTop: '1px solid var(--border)' }} onClick={() => exportarGira(gr)}>
                            {gr.nombreGira}
                          </button>
                        ))}
                      </>
                    )}
                    {vistaMenuExportar === 'ciudades' && (
                      <>
                        <button className="menu-item" style={{ color: 'var(--text-muted)', fontWeight: 600 }} onClick={() => setVistaMenuExportar('inicio')}>‹ Elige una ciudad</button>
                        {eventosVisibles.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(ev => (
                          <button key={ev.id} className="menu-item" style={{ borderTop: '1px solid var(--border)' }} onClick={() => exportarCiudad(ev)}>
                            {ev.nombre}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {editable && <button className="btn btn-primary" onClick={abrirNuevo}>+ Gasto</button>}
          <Topbar hideSearch />
        </div>
      </div>

      <div className="page-body">
        {porCategoria.length > 0 && (() => {
          const ordenadas = [...porCategoria].sort((a, b) => b.total - a.total);
          const totalCategorias = ordenadas.reduce((a, c) => a + c.total, 0);
          const conColor = ordenadas.filter(c => colorCategoria(c.cat) !== COLOR_OTROS);
          const totalOtros = ordenadas.filter(c => colorCategoria(c.cat) === COLOR_OTROS).reduce((a, c) => a + c.total, 0);
          const pistas = [
            ...conColor.map(c => ({ cat: c.cat, valor: c.total })),
            ...(totalOtros > 0 ? [{ cat: 'Otros', valor: totalOtros }] : []),
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 22 }}>
              <div className="relieve" style={{ borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ marginBottom: 8 }}>
                  <span className="card-title">Gasto por categoría</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '4px 4px 0' }}>
                  <GraficaArcosBarras datos={pistas} total={totalCategorias} />
                </div>
              </div>

              <div className="relieve" style={{ borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                {ordenadas.map(c => (
                  <div key={c.cat} className="relieve-renglon" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 16px 5px 6px', borderRadius: 22 }}>
                    <IconoCategoria cat={c.cat} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{c.cat}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      ${fm(c.total)}{c.usd > 0 && <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}> (US${fm(c.usd)})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {girasResumen.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Concentrado por gira
            </div>
            <div className="grid-3">
              {girasResumen.map(gr => {
                const ciudadSelId = ciudadPorGira[gr.id] || null;
                const eventoSel = ciudadSelId ? gr.eventosGira.find(e => e.id === ciudadSelId) : null;
                const gastosMostrar = eventoSel ? gr.gastosGira.filter(g => g.eventoId === eventoSel.id) : gr.gastosGira;
                const totalMostrar = gastosMostrar.reduce((a, g) => a + montoMXN(g), 0);
                const totalMostrarUSDNativo = gastosMostrar.filter(g => g.moneda === 'USD').reduce((a, g) => a + g.monto, 0);

                const vista = vistaMonedaGira[gr.id];
                const monedaVista = vista?.moneda ?? (gr.esUSD ? 'USD' : 'MXN');
                const tipoCambioVista = vista?.tipoCambio ?? gr.tipoCambioReferencia ?? null;
                const verEnUSD = monedaVista === 'USD' && Number(tipoCambioVista) > 0;
                const totalMostrarUSDRef = verEnUSD ? gastosMostrar.reduce((a, g) => a + montoUSD(g, tipoCambioVista), 0) : null;
                const porCategoriaMostrar = categorias.map(cat => {
                  const items = gastosMostrar.filter(g => g.categoria === cat);
                  const total = items.reduce((a, g) => a + montoMXN(g), 0);
                  return {
                    cat, total,
                    usd: items.filter(g => g.moneda === 'USD').reduce((a, g) => a + g.monto, 0),
                    usdRef: verEnUSD ? items.reduce((a, g) => a + montoUSD(g, tipoCambioVista), 0) : null,
                  };
                }).filter(c => c.total > 0);

                function toggleCiudad(eventoId) {
                  setCiudadPorGira(prev => ({ ...prev, [gr.id]: prev[gr.id] === eventoId ? null : eventoId }));
                }

                const categoriasOrdenadas = [...porCategoriaMostrar].sort((a, b) => b.total - a.total);
                const cambiarMoneda = destinoUSD => {
                  if (destinoUSD !== verEnUSD) voltearVista(vistaMonedaGira, setVistaMonedaGira, gr.id, monedaVista, tipoCambioVista);
                };
                const encabezado = gr.esUSD
                  ? 'linear-gradient(160deg, #dcbd6a 0%, #b8913a 45%, #94702a 100%)'
                  : 'linear-gradient(160deg, #6e1f3c 0%, #4f1227 50%, #3c0c1e 100%)';
                const cajaTotal = gr.esUSD
                  ? { background: 'linear-gradient(135deg, #f7e8c2, #e6cb8a 60%, #d3b06a)', color: '#3c0c1e', border: '1px solid rgba(255,255,255,0.6)' }
                  : { background: 'linear-gradient(135deg, #4a1022, #7a2340 55%, #a8344f)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' };

                return (
                <div key={gr.id} className="relieve" style={{ borderRadius: 18, overflow: 'hidden' }}>
                  <div style={{ background: encabezado, padding: '14px 16px 34px', color: 'white', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 18px rgba(0,0,0,0.12)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 17 }}>{gr.nombreGira}</div>
                      <div title="Cambiar la moneda en la que se ve el total" style={{ display: 'flex', background: 'rgba(0,0,0,0.22)', borderRadius: 20, padding: 2, flexShrink: 0, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.15)' }}>
                        {['MXN', 'USD'].map(m => {
                          const activo = (m === 'USD') === verEnUSD;
                          return (
                            <button key={m} onClick={() => cambiarMoneda(m === 'USD')} style={{
                              border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                              background: activo ? 'linear-gradient(180deg, #ffffff, #f1e5d1)' : 'transparent', color: activo ? 'var(--wine-deep)' : 'rgba(255,255,255,0.8)',
                              boxShadow: activo ? '0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 #fff' : 'none',
                            }}>{m}</button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {gr.eventosGira.map(e => (
                        <button
                          key={e.id}
                          onClick={() => toggleCiudad(e.id)}
                          title={ciudadSelId === e.id ? 'Ver toda la gira' : `Ver solo ${e.nombre}`}
                          style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: 0.3, border: '1px solid rgba(255,255,255,0.7)', cursor: 'pointer', borderRadius: 20, padding: '2px 8px',
                            background: ciudadSelId === e.id ? 'linear-gradient(180deg, #ffffff, #f4e9d5)' : 'linear-gradient(180deg, #f6ede0, #e4d4bc)', color: 'var(--wine-deep)',
                            boxShadow: '0 2px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)',
                            opacity: ciudadSelId && ciudadSelId !== e.id ? 0.45 : 1,
                          }}
                        >
                          {e.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ margin: '-24px 14px 0', position: 'relative', display: 'flex', alignItems: 'center', ...cajaTotal, borderRadius: 13, padding: '9px 14px', boxShadow: '0 8px 16px rgba(61,18,32,0.30), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.12)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, opacity: 0.8 }}>{eventoSel ? 'Gasto en ' + eventoSel.nombre : 'Total gastado'}</div>
                      <div style={{ fontSize: 19, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {verEnUSD ? `US$${fm(totalMostrarUSDRef)}` : `$${fm(totalMostrar)}`}
                      </div>
                      {!verEnUSD && totalMostrarUSDNativo > 0 && (
                        <div style={{ fontSize: 10, opacity: 0.8 }}>incluye US${fm(totalMostrarUSDNativo)} capturados en dólares</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', paddingLeft: 12, borderLeft: `1px solid ${gr.esUSD ? 'rgba(60,12,30,0.2)' : 'rgba(255,255,255,0.2)'}` }}>
                      <div style={{ fontSize: 10, opacity: 0.8 }}>Ciudades</div>
                      <div style={{ fontSize: 19, fontWeight: 800 }}>{gr.eventosGira.length}</div>
                    </div>
                  </div>

                  <div style={{ padding: '14px 16px 14px' }}>
                    <BarraProporcion datos={categoriasOrdenadas.map(c => ({ cat: c.cat, valor: c.total }))} />
                    {categoriasOrdenadas.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>Sin gastos capturados todavía.</div>
                    ) : (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {categoriasOrdenadas.map(c => (
                          <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                            <PuntoColor cat={c.cat} tamaño={8} />
                            <span style={{ flex: 1, color: 'var(--text-primary)' }}>{c.cat}</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                              {c.usdRef != null ? `US$${fm(c.usdRef)}` : `$${fm(c.total)}`}
                              {c.usdRef == null && c.usd > 0 && <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}> (US${fm(c.usd)})</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {eventosVisibles.length > 0 && (
          <div style={{ marginBottom: 16, position: 'relative', display: 'inline-block' }}>
            <button className="btn btn-outline" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setMenuFiltroAbierto(v => !v)}>
              <IconSearch /> {etiquetaFiltroActual}
            </button>
            {menuFiltroAbierto && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => { setMenuFiltroAbierto(false); setBusquedaEvento(''); }} />
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: 260, maxHeight: 340, overflowY: 'auto', zIndex: 11 }}>
                  <div style={{ padding: 8, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                    <input
                      autoFocus
                      className="form-input"
                      style={{ fontSize: 13 }}
                      placeholder="Buscar ciudad o gira..."
                      value={busquedaEvento}
                      onChange={e => setBusquedaEvento(e.target.value)}
                    />
                  </div>
                  {opcionesFiltroVisibles.length === 0 && (
                    <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>Sin resultados</div>
                  )}
                  {(() => {
                    let grupoAnterior;
                    return opcionesFiltroVisibles.map(o => {
                      const mostrarEncabezado = o.grupo && o.grupo !== grupoAnterior;
                      grupoAnterior = o.grupo;
                      return (
                        <div key={o.valor}>
                          {mostrarEncabezado && (
                            <div style={{ padding: '6px 14px 2px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', fontWeight: 700 }}>{o.grupo}</div>
                          )}
                          <button
                            className="menu-item"
                            style={{ fontWeight: filtroEvento === o.valor ? 700 : 400, color: filtroEvento === o.valor ? 'var(--royal)' : 'var(--text-primary)' }}
                            onClick={() => elegirFiltro(o.valor)}
                          >
                            {o.label}
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* Gastos agrupados por evento */}
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando gastos...</div>
        ) : gastos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IconCoin width={32} height={32} strokeWidth={1.2} /></div>
            <div style={{ fontSize: 14 }}>Sin gastos registrados.</div>
            {editable && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={abrirNuevo}>Agregar primer gasto</button>}
          </div>
        ) : lista.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 14 }}>No hay gastos con este filtro.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {gruposEvento.map(({ evento, gastos: gastosGrupo }, idx) => {
              const key = evento ? evento.id : 'sin-evento';
              const totalGrupo = gastosGrupo.reduce((a, g) => a + montoMXN(g), 0);
              const totalGrupoUSDNativo = gastosGrupo.filter(g => g.moneda === 'USD').reduce((a, g) => a + g.monto, 0);
              const giraDelEvento = evento?.giraId ? giras.find(g => g.id === evento.giraId) : null;
              const giraEsUSD = giraDelEvento?.monedaPrincipal === 'USD' && Number(giraDelEvento?.tipoCambioReferencia) > 0;

              const vistaEv = vistaMonedaEvento[key];
              const monedaVistaEv = vistaEv?.moneda ?? (giraEsUSD ? 'USD' : 'MXN');
              const tipoCambioVistaEv = vistaEv?.tipoCambio ?? (giraDelEvento ? Number(giraDelEvento.tipoCambioReferencia) : null);
              const verEnUSDEv = monedaVistaEv === 'USD' && Number(tipoCambioVistaEv) > 0;
              const totalGrupoUSDRef = verEnUSDEv ? gastosGrupo.reduce((a, g) => a + montoUSD(g, tipoCambioVistaEv), 0) : null;
              const abierta = ciudadesAbiertas[key] ?? idx === 0;
              const alternar = () => setCiudadesAbiertas(p => ({ ...p, [key]: !abierta }));
              const chipBlanco = {
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                padding: '4px 11px', borderRadius: 20, border: '1px solid #e8dbc5', cursor: 'default',
                background: 'linear-gradient(180deg, #ffffff, #f4e9d6)',
                boxShadow: '0 2px 5px rgba(110,75,40,0.16), inset 0 1px 0 #fff',
              };
              const th = { textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, background: '#f7eedf', borderBottom: '1px solid #eadcc3', whiteSpace: 'nowrap' };
              const td = { padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', borderBottom: '1px solid #f0e5d3', verticalAlign: 'middle' };
              return (
                <div key={key} className="relieve" style={{ borderRadius: 18, overflow: 'hidden', borderLeft: '5px solid #7a2340' }}>
                  <div
                    onClick={alternar}
                    style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', cursor: 'pointer', background: 'linear-gradient(180deg, #fffaf1, #f2e4cb)', borderBottom: abierta ? '1px solid #e6d6b9' : 'none', boxShadow: 'inset 0 1px 0 #fff' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                      <IconMapPin width={20} height={20} strokeWidth={2.2} style={{ color: 'var(--wine-deep)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 22, color: 'var(--wine-deep)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{evento ? evento.nombre : 'Sin evento'}</span>
                      {giraDelEvento && (
                        <span style={{ ...chipBlanco, background: 'linear-gradient(180deg, #f6e6bd, #e2c684)', border: '1px solid #d9bb72', color: '#4a2a0c' }}>{giraDelEvento.nombre}</span>
                      )}
                      <span style={chipBlanco}><IconList width={13} height={13} /> {gastosGrupo.length} movimiento{gastosGrupo.length !== 1 ? 's' : ''}</span>
                      {evento && (
                        <button
                          style={{ ...chipBlanco, cursor: 'pointer' }}
                          title="Cambiar la moneda en la que se ve el total"
                          onClick={e => { e.stopPropagation(); voltearVista(vistaMonedaEvento, setVistaMonedaEvento, key, monedaVistaEv, tipoCambioVistaEv); }}
                        >
                          Ver en {verEnUSDEv ? 'MXN' : 'USD'}
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
                          {verEnUSDEv ? `US$${fm(totalGrupoUSDRef)}` : `$${fm(totalGrupo)}`}
                        </div>
                        {!verEnUSDEv && totalGrupoUSDNativo > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>incluye US${fm(totalGrupoUSDNativo)} en dólares</div>
                        )}
                      </div>
                      {editable && evento && (
                        <button className="btn btn-primary btn-sm" title={`Agregar gasto a ${evento.nombre}`} onClick={e => { e.stopPropagation(); abrirNuevo(evento.id); }}>
                          + Agregar
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: 6 }}
                        title={abierta ? 'Ocultar movimientos' : 'Ver movimientos'}
                        onClick={e => { e.stopPropagation(); alternar(); }}
                      >
                        <IconChevronDown width={16} height={16} style={{ transform: abierta ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                      </button>
                    </div>
                  </div>

                  {abierta && (
                    <div style={{ overflowX: 'auto', background: '#fffdf9' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={th}>Categoría</th>
                            <th style={th}>Concepto</th>
                            <th style={th}>Proveedor</th>
                            <th style={th}>Monto</th>
                            <th style={th}>Método de pago</th>
                            <th style={th}>Comprobante</th>
                            {editable && <th style={th}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {gastosGrupo.map((g, i) => {
                            const nComp = g.comprobantes?.length || 0;
                            return (
                              <tr key={g.id} style={{ background: i % 2 ? '#fbf5eb' : '#fffdf9' }}>
                                <td style={td}><PildoraCategoria cat={g.categoria} texto={g.categoria === 'Otro' && g.otroDetalle ? g.otroDetalle : g.categoria} /></td>
                                <td style={td}>
                                  <div>{g.concepto}</div>
                                  {g.notas && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{g.notas}</div>}
                                </td>
                                <td style={td}>{g.proveedor || '—'}</td>
                                <td style={{ ...td, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                  {g.moneda === 'USD' ? `US$${fm(g.monto)}` : `$${fm(g.monto)}`}
                                  {g.moneda === 'USD' && (
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400 }}>≈ ${fm(montoMXN(g))} MXN</div>
                                  )}
                                </td>
                                <td style={td}><PildoraMetodo metodo={g.metodoPago} /></td>
                                <td style={td}>
                                  <button onClick={() => setVerComprobantes(g)} title={editable ? 'Ver o subir comprobantes' : 'Ver comprobantes'} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 20, padding: '4px 11px',
                                    ...(nComp > 0
                                      ? { background: 'linear-gradient(180deg, #ecd98f, #cfb150)', border: '1px solid #c2a443', color: '#3c2a06' }
                                      : { background: 'linear-gradient(180deg, #f3efe9, #e2dbd1)', border: '1px solid #d8d0c4', color: '#6b6058' }),
                                    boxShadow: '0 2px 4px rgba(80,55,30,0.18), inset 0 1px 0 rgba(255,255,255,0.8)',
                                  }}>
                                    <IconPaperclip width={13} height={13} /> {nComp}
                                  </button>
                                </td>
                                {editable && <td style={{ ...td, textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: 6 }}>
                                    <button title="Editar" onClick={() => abrirEditar(g)} style={{
                                      width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 8, color: 'white',
                                      background: 'linear-gradient(180deg, #9b2c48, #6e1a36)', border: '1px solid #5e1630',
                                      boxShadow: '0 2px 5px rgba(122,35,64,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                                    }}><IconEdit width={14} height={14} /></button>
                                    <button title="Eliminar" onClick={() => eliminar(g.id)} style={{
                                      width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 8, color: '#7a2340',
                                      background: 'linear-gradient(180deg, #faf1e2, #eadbc0)', border: '1px solid #ddc9a6',
                                      boxShadow: '0 2px 5px rgba(110,75,40,0.2), inset 0 1px 0 #fff',
                                    }}><IconTrash width={14} height={14} /></button>
                                  </div>
                                </td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de comprobantes */}
      {verComprobantes && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setVerComprobantes(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Comprobantes — {verComprobantes.concepto}</span>
              <button className="close-btn" onClick={() => setVerComprobantes(null)}>×</button>
            </div>
            <div className="modal-body">
              {(verComprobantes.comprobantes || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Sin comprobantes.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(verComprobantes.comprobantes || []).map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--royal-soft)', border: '1px solid var(--border)' }}>
                      {d.tipo?.includes('image') ? (
                        <img src={d.datos} alt={d.nombre} onClick={() => setPreviewImg(d)} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', cursor: 'pointer', flexShrink: 0 }} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><IconFile /></span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.tamaño} · {d.fecha}</div>
                      </div>
                      <a href={d.datos} download={d.nombre} className="btn btn-ghost btn-sm"><IconDownload /></a>
                      {editable && <button className="btn btn-ghost btn-sm" onClick={() => eliminarComprobante(verComprobantes.id, d.id)}><IconTrash /></button>}
                    </div>
                  ))}
                </div>
              )}
              {editable && <div style={{ marginTop: 14 }}>
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { if (e.target.files[0]) subirComprobante(verComprobantes.id, e.target.files[0]); e.target.value = ''; }} />
                  <div className="btn btn-primary" style={{ textAlign: 'center', width: '100%' }}>+ Subir comprobante</div>
                </label>
              </div>}
            </div>
          </div>
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
              <a href={previewImg.datos} download={previewImg.nombre} className="btn btn-outline">Descargar</a>
              <button className="btn btn-primary" onClick={() => setPreviewImg(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {editable && showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editando ? 'Editar gasto' : 'Nuevo gasto'}</span>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Concepto</label>
                <input className="form-input" value={form.concepto} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))} placeholder="Ej: Renta de pantallas LED" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-input" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                    {categorias.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Proveedor</label>
                  <input className="form-input" value={form.proveedor} onChange={e => setForm(p => ({ ...p, proveedor: e.target.value }))} placeholder="Nombre del proveedor" />
                </div>
              </div>
              {form.categoria === 'Otro' && (
                <div className="form-group">
                  <label className="form-label">Especifica qué otra</label>
                  <input className="form-input" value={form.otroDetalle} onChange={e => setForm(p => ({ ...p, otroDetalle: e.target.value }))} placeholder="Ej: Regalos para invitados" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Evento relacionado</label>
                <select className="form-input" value={form.eventoId || ''} onChange={e => setForm(p => ({ ...p, eventoId: e.target.value ? Number(e.target.value) : '' }))}>
                  <option value="">Sin evento</option>
                  {eventosVisibles.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Monto</label>
                  <input className="form-input" type="number" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Moneda</label>
                  <select className="form-input" value={form.moneda} onChange={e => elegirMoneda(e.target.value)}>
                    <option value="MXN">Pesos (MXN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
              </div>
              {form.moneda === 'MXN' && giraFormEsUSD && form.monto > 0 && !ocultarSugerenciaConversion && (
                <div style={{ background: 'var(--royal-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--royal)', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span>
                    "{eventoFormSeleccionado.nombre}" pertenece a <strong>{giraFormSeleccionada.nombre}</strong> (gira en dólares) — este gasto equivale a{' '}
                    <strong>US${fm(form.monto / Number(giraFormSeleccionada.tipoCambioReferencia))}</strong>{' '}
                    (tipo de cambio de esa gira: ${fm(giraFormSeleccionada.tipoCambioReferencia)}).
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setOcultarSugerenciaConversion(true)}>
                      Mantener en $ MXN
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={convertirMonedaForm} disabled={cargandoTC}>
                      {cargandoTC ? '...' : 'Convertir a US$'}
                    </button>
                  </div>
                </div>
              )}
              {form.moneda === 'USD' && (
                <div className="form-group">
                  <label className="form-label">Tipo de cambio (pesos por dólar)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" type="number" step="0.01" min="0" value={form.tipoCambio} onChange={e => setForm(p => ({ ...p, tipoCambio: e.target.value }))} placeholder="Ej: 18.50" style={{ flex: 1 }} />
                    <button type="button" className="btn btn-outline btn-sm" onClick={autoTipoCambio} disabled={cargandoTC}>
                      {cargandoTC ? '...' : '↻ Hoy'}
                    </button>
                  </div>
                  {errorTC && <div style={{ fontSize: 11, color: 'var(--accent-red)', marginTop: 4 }}>{errorTC}</div>}
                  {form.monto > 0 && form.tipoCambio > 0 && !ocultarSugerenciaConversion && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Equivale a ${fm(form.monto * form.tipoCambio)} MXN
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOcultarSugerenciaConversion(true)}>
                          Mantener en US$
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={convertirMonedaForm} disabled={cargandoTC}>
                          {cargandoTC ? '...' : 'Convertir a $ MXN'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Método de pago</label>
                <select className="form-input" value={form.metodoPago} onChange={e => setForm(p => ({ ...p, metodoPago: e.target.value }))}>
                  <option value="">Sin especificar</option>
                  {metodosPago.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-input" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Observaciones..." />
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
                {guardando ? 'Guardando...' : (editando ? 'Guardar' : 'Agregar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
