import MiniMapaGira from './MiniMapaGira';
import { useSesion } from '../lib/sesion';
import { coordsDeCiudad } from '../lib/ciudadesCoords';
import { IconMapPin, IconCalendar, IconCoin } from '../icons';

function fechaBonita(f) {
  if (!f) return '—';
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fm(valor) {
  return Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const cajaStat = {
  flex: 1, minWidth: 0, textAlign: 'center', padding: '7px 8px',
  background: 'linear-gradient(180deg, #fffdf8, #f6ecdb)',
  border: '1px solid #efe2c9', borderRadius: 10,
  boxShadow: '0 3px 8px rgba(61,18,32,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
};
const etiquetaStat = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 };
const valorStat = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' };

export default function TarjetaGira({ gira: g, onClick }) {
  const { puedeVer } = useSesion();
  const tieneFechas = g.fechaInicio || g.fechaFin;
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'block', textAlign: 'left', cursor: 'pointer',
        background: 'linear-gradient(180deg, #ffffff, #fffaf3)',
        border: '1px solid #efe2cc', borderRadius: 16, padding: '18px 18px 16px',
        boxShadow: '0 10px 24px rgba(61,18,32,0.10), 0 2px 4px rgba(61,18,32,0.06)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 19, color: 'var(--wine-deep)', marginBottom: 6, lineHeight: 1.2 }}>{g.nombre}</div>

      {tieneFechas && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          <IconCalendar width={14} height={14} strokeWidth={1.8} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          {fechaBonita(g.fechaInicio)} - {fechaBonita(g.fechaFin)}
        </div>
      )}

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #a32d4c, var(--royal))', borderRadius: 20, padding: '4px 11px', boxShadow: '0 2px 6px rgba(122,35,64,0.30)', marginBottom: 14 }}>
        <IconMapPin width={12} height={12} strokeWidth={2} />
        {g.eventos.length} ciudad{g.eventos.length !== 1 ? 'es' : ''}
      </span>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {puedeVer('checklist') && <div style={cajaStat}>
          <div style={etiquetaStat}>Checklist</div>
          {g.pctChecklist == null ? (
            <div style={valorStat}>-</div>
          ) : (
            <div style={{ ...valorStat, color: 'var(--accent-green)' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="6" fill="none" stroke="#5aa155" strokeWidth="2.2" />
              </svg>
              {g.pctChecklist}%
            </div>
          )}
        </div>}
        {puedeVer('gastos') && <div style={cajaStat}>
          <div style={etiquetaStat}><IconCoin width={11} height={11} strokeWidth={1.8} />Gasto</div>
          <div style={valorStat}>
            {g.totalGastoUSD != null ? `US$${fm(g.totalGastoUSD)}` : `$${fm(g.totalGasto)}`}
          </div>
        </div>}
      </div>

      {g.eventos.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sin eventos conectados todavía.</div>
      ) : g.eventos.some(e => coordsDeCiudad(e.nombre)) ? (
        <MiniMapaGira eventos={g.eventos} />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {g.eventos.map(e => <span key={e.id} className="tag tag-navy" style={{ fontSize: 9 }}>{e.nombre}</span>)}
        </div>
      )}
    </button>
  );
}
