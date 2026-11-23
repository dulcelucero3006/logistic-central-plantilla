import { Link } from 'react-router-dom';
import { useSesion } from '../lib/sesion';
import { IconEdit, IconTrash, IconMapPin, IconCalendar, IconClock, IconBuilding, IconUser, IconChevronDown } from '../icons';

function fechaBonita(f) {
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

const COLORES_ESTADO = {
  'Completado': ['#d3f0df', '#a9dcc0', '#1f5c3a'],
  'En Curso': ['#d8efd2', '#b2d9a6', '#2f5a28'],
  'Confirmado': ['#f6dde4', '#e7b8c5', '#7a2340'],
  'En Planeación': ['#dcefe9', '#b3d8cc', '#2f6b5e'],
  'Borrador': ['#efe9e2', '#d9cfc3', '#5e5249'],
  'Cancelado': ['#f6dcde', '#e4b3b8', '#8c2a34'],
};

const capsula = {
  display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
  boxShadow: '0 2px 4px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.7)',
};

const cajaRelieve = {
  flex: 1, minWidth: 0, textAlign: 'center', padding: '6px 10px', borderRadius: 10,
  background: 'linear-gradient(180deg, #f7efe2, #ecdfc9)', border: '1px solid #e4d4b8',
  boxShadow: '0 2px 5px rgba(110,75,40,0.15), inset 0 1px 0 rgba(255,255,255,0.85)',
};

export default function TarjetaEvento({ evento: e, gira, equipo, gastosDelEvento, totalGastos, ancha, gastosAbiertos, onToggleGastos, onEditar, onEliminar, editable = true }) {
  const verGastos = useSesion().puedeVer('gastos');
  const regPct = e.aforo > 0 ? Math.round(e.registrados / e.aforo * 100) : 0;
  const [c1, c2, cTexto] = COLORES_ESTADO[e.estado] || COLORES_ESTADO['Borrador'];
  const filas = [
    [IconCalendar, 'Fecha', `${fechaBonita(e.fecha)}${e.fechaFin && e.fechaFin !== e.fecha ? ` → ${fechaBonita(e.fechaFin)}` : ''}`],
    e.hora && [IconClock, 'Hora', `${e.hora}${e.horaFin ? ` → ${e.horaFin}` : ''}`],
    e.lugar && [IconBuilding, 'Lugar', e.lugar],
    e.responsable && [IconUser, 'Responsable', e.responsable],
  ].filter(Boolean);
  const miembros = (e.miembros || []).map(id => equipo.find(m => m.id === id)).filter(Boolean);
  const estadoChip = <span style={{ ...capsula, background: `linear-gradient(180deg, ${c1}, ${c2})`, color: cTexto }}>{e.estado}</span>;
  const giraChip = gira && (
    <span style={{ ...capsula, background: 'linear-gradient(180deg, #f6e6bd, #dfc07a)', color: '#3c1a08' }}>
      {gira.nombre} · {gira.monedaPrincipal === 'USD' ? 'USA' : 'MX'}
    </span>
  );

  const info = (
    <div>
      <div style={{
        borderRadius: 12, padding: '4px 12px',
        background: 'linear-gradient(180deg, #ffffff, #fbf4e8)', border: '1px solid #ead9bb',
        boxShadow: '0 3px 8px rgba(110,75,40,0.14), inset 0 1px 0 #fff',
      }}>
        {filas.map(([Icono, etiqueta, valor], i) => (
          <div key={etiqueta} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid #f0e3cc' : 'none' }}>
            <span style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(160deg, #9b2c48, #5a1730)', color: 'white',
              boxShadow: '0 2px 4px rgba(90,23,48,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}>
              <Icono width={14} height={14} strokeWidth={2.2} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8a6a5a', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>{etiqueta}</span>
            <span style={{ flex: 1, textAlign: 'right', fontSize: 13.5, color: 'var(--wine-deep)', fontWeight: 700 }}>{valor}</span>
          </div>
        ))}
      </div>
      {e.descripcion && <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', margin: '8px 2px 0' }}>{e.descripcion}</p>}
    </div>
  );

  const equipoNodo = miembros.length > 0 && (
    <div>
      {ancha && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Equipo</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {miembros.map(m => (
          <Link key={m.id} to={`/equipo?id=${m.id}`} title={`Ver a ${m.nombre} en Equipo`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 12px 2px 2px', borderRadius: 22, textDecoration: 'none',
            background: 'linear-gradient(180deg, #f8eedc, #e8d6b5)', border: '1px solid #dcc59c', color: '#3c0c1e',
            fontSize: ancha ? 12 : 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3,
            boxShadow: '0 3px 6px rgba(110,75,40,0.22), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}>
            <span style={{
              width: ancha ? 30 : 24, height: ancha ? 30 : 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle at 35% 30%, #9b2c48, #5a1730 70%)', color: 'white', fontSize: ancha ? 12 : 10, fontWeight: 700,
              boxShadow: '0 2px 4px rgba(60,12,30,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}>{m.iniciales}</span>
            {m.nombre.split(' ')[0]}
          </Link>
        ))}
      </div>
    </div>
  );

  const cajas = (
    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
      <div style={cajaRelieve}>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Registros</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{e.registrados}/{e.aforo} · {regPct}%</div>
        <div style={{ height: 5, borderRadius: 4, marginTop: 4, background: '#d9c9ad', boxShadow: 'inset 0 1px 2px rgba(80,50,20,0.3)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, regPct)}%`, height: '100%', background: 'linear-gradient(90deg, #7a2340, #b0395a)' }} />
        </div>
      </div>
      {verGastos && <button onClick={onToggleGastos} title="Ver los gastos de este evento" style={{ ...cajaRelieve, cursor: 'pointer', font: 'inherit' }}>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Gasto</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
          ${totalGastos.toLocaleString()}
          <IconChevronDown width={14} height={14} strokeWidth={2.6} style={{ transform: gastosAbiertos ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>
      </button>}
    </div>
  );

  return (
    <div id={`evento-${e.id}`} className="relieve" style={{ borderRadius: 16, overflow: 'hidden', gridColumn: ancha ? '1 / -1' : undefined, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: 'linear-gradient(160deg, #5a1730 0%, #7a2340 55%, #9b2c48 100%)', color: 'white', padding: ancha ? '14px 18px' : '12px 14px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -8px 14px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: ancha ? 26 : 21, textTransform: 'uppercase', lineHeight: 1.15 }}>{e.nombre}</span>
            <IconMapPin width={ancha ? 20 : 17} height={ancha ? 20 : 17} strokeWidth={2.4} style={{ flexShrink: 0 }} />
            {ancha && estadoChip}
            {ancha && giraChip}
          </div>
          {editable && (
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.9)' }} title="Editar" onClick={onEditar}><IconEdit width={16} height={16} /></button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.9)' }} title="Eliminar" onClick={onEliminar}><IconTrash width={16} height={16} /></button>
            </div>
          )}
        </div>
        {!ancha && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
            {estadoChip}
            {giraChip}
            {e.oculto && <span style={{ ...capsula, background: '#e9e2da', color: '#5e5249' }}>Oculto</span>}
          </div>
        )}
      </div>

      <div style={{ padding: ancha ? '14px 18px 16px' : '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {ancha ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1.4fr)', gap: 24 }}>
            {info}
            {equipoNodo || <div />}
          </div>
        ) : (
          <>
            {info}
            {equipoNodo}
          </>
        )}
        {cajas}
        {verGastos && gastosAbiertos && (
          <div style={{ ...cajaRelieve, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px' }}>
            {gastosDelEvento.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sin gastos ligados a este evento todavía.</div>
            ) : (
              gastosDelEvento.map(g => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{g.concepto} <span style={{ color: 'var(--text-secondary)' }}>· {g.categoria === 'Otro' && g.otroDetalle ? g.otroDetalle : g.categoria}</span></span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>${g.monto.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
