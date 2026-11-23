import { useId } from 'react';
import { IconHome, IconGear, IconCar, IconBuilding, IconPlane, IconCoin, IconFile, IconStar } from '../icons';

// Color fijo por categoría (no por ranking): así un rubro siempre se ve del mismo color en
// la gráfica, en las barras de cada gira y en las listas. Paleta validada para distinguirse
// bien entre sí (también con daltonismo); las categorías menos usadas comparten un neutro.
const COLORES = {
  'Salón': '#922c4d',
  'Vuelos': '#cfa94e',
  'Producción': '#c0563f',
  'Hospedaje': '#7a4a8e',
  'Viáticos': '#e08a55',
  'Transporte': '#a8601f',
};
export const COLOR_OTROS = '#b9aa95';

const ICONOS = {
  'Salón': IconBuilding, 'Vuelos': IconPlane, 'Vuelos SS': IconPlane, 'Producción': IconGear,
  'Hospedaje': IconHome, 'Viáticos': IconCoin, 'Transporte': IconCar, 'Sorteo': IconStar, 'Permisos': IconFile,
};

export function colorCategoria(cat) {
  return COLORES[cat] || COLOR_OTROS;
}

// Mezcla un color hex con otro (t = 0 deja el original, t = 1 da el segundo).
function mezclar(hex, hacia, t) {
  const a = hex.match(/\w\w/g).map(h => parseInt(h, 16));
  const b = hacia.match(/\w\w/g).map(h => parseInt(h, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const oscuro = (c, t = 0.28) => mezclar(c, '#2a0612', t);
const claro = (c, t = 0.3) => mezclar(c, '#ffffff', t);

function fm(v) {
  return Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Gráfica de arcos que se vuelven barras: cada rubro es una pista que arranca como un cuarto
// de círculo (concéntricos, el mayor afuera, solo identifica el rubro) y sigue como barra
// horizontal. La longitud de la BARRA es la que es proporcional al monto (el mayor llega al tope).
export function GraficaArcosBarras({ datos, total }) {
  const uid = useId().replace(/:/g, '');
  const W = 520;
  const GROSOR = 14;
  const PASO = 19;
  const R_MIN = 58;
  const R_MAX = R_MIN + (datos.length - 1) * PASO;
  const cx = R_MAX + GROSOR / 2 + 4;
  const cy = R_MAX + GROSOR / 2 + 4;
  const H = cy + 8;
  const finBarraMax = 392;
  const largoBarraMax = finBarraMax - cx;
  const maximo = Math.max(...datos.map(d => d.valor));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Gasto por categoría">
      <defs>
        <filter id={`sb-${uid}`} filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor="#4a2410" floodOpacity="0.25" />
        </filter>
        {datos.map((d, i) => {
          const c = colorCategoria(d.cat);
          return (
            <g key={i}>
              <linearGradient id={`b-${uid}-${i}`} gradientUnits="userSpaceOnUse" x1={cx} y1="0" x2={finBarraMax} y2="0">
                <stop offset="0%" stopColor={oscuro(c)} />
                <stop offset="100%" stopColor={claro(c, 0.15)} />
              </linearGradient>
              <linearGradient id={`a-${uid}-${i}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={oscuro(c, 0.38)} />
                <stop offset="100%" stopColor={oscuro(c, 0.12)} />
              </linearGradient>
            </g>
          );
        })}
      </defs>
      <line x1={cx} y1={cy - R_MAX - GROSOR / 2 - 2} x2={cx} y2={cy} stroke="#fffdf8" strokeWidth="3" />
      {datos.map((d, i) => {
        const r = R_MAX - i * PASO;
        const y = cy - r;
        const finBarra = cx + Math.max((d.valor / maximo) * largoBarraMax, 8);
        const pct = total > 0 ? (d.valor / total) * 100 : 0;
        return (
          <g key={d.cat}>
            <title>{`${d.cat}: $${fm(d.valor)} (${pct.toFixed(1)}%)`}</title>
            <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx - 1.5} ${y}`} fill="none" stroke={`url(#a-${uid}-${i})`} strokeWidth={GROSOR} filter={`url(#sb-${uid})`} />
            <line x1={cx + 1.5} y1={y} x2={finBarraMax} y2={y} stroke="#ebdfc9" strokeWidth={GROSOR} strokeLinecap="round" />
            <line x1={cx + 1.5} y1={y} x2={finBarra} y2={y} stroke={`url(#b-${uid}-${i})`} strokeWidth={GROSOR} strokeLinecap="round" filter={`url(#sb-${uid})`} />
            <line x1={cx + 3} y1={y - GROSOR / 2 + 2.5} x2={Math.max(finBarra - 4, cx + 3)} y2={y - GROSOR / 2 + 2.5} stroke="rgba(255,255,255,0.28)" strokeWidth="1.6" strokeLinecap="round" />
            <text x={finBarraMax + 14} y={y + 4.5} fontSize="12.5" fontWeight="700" fill="var(--text-primary)" fontFamily="Inter, sans-serif">
              {pct > 0 && pct < 1 ? '<1' : Math.round(pct)}%
            </text>
            <text x={W - 2} y={y + 4.5} fontSize="12.5" textAnchor="end" fill="var(--text-primary)" fontFamily="Inter, sans-serif">{d.cat}</text>
          </g>
        );
      })}
      <text x={cx + 8} y={cy - 24} fontSize="11.5" fill="var(--text-secondary)" fontFamily="Inter, sans-serif">Total</text>
      <text x={cx + 8} y={cy - 6} fontSize="17" fontWeight="800" fill="var(--text-primary)" fontFamily="Inter, sans-serif">${fm(total)}</text>
    </svg>
  );
}

// Barra horizontal segmentada por rubro, proporcional al gasto de cada uno, con brillo y canal hundido.
export function BarraProporcion({ datos }) {
  const total = datos.reduce((a, d) => a + d.valor, 0);
  const canal = { height: 14, borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(180deg, #e3d4bb, #f3eadb)', boxShadow: 'inset 0 2px 3px rgba(110,75,40,0.25), 0 1px 0 rgba(255,255,255,0.9)' };
  if (total <= 0) return <div style={canal} />;
  return (
    <div style={{ ...canal, display: 'flex', gap: 2 }}>
      {datos.map(d => {
        const c = colorCategoria(d.cat);
        return (
          <div key={d.cat} title={`${d.cat}: ${Math.round((d.valor / total) * 100)}%`}
            style={{ flexGrow: d.valor, flexBasis: 0, minWidth: 3, background: `linear-gradient(180deg, ${claro(c, 0.22)}, ${c} 55%, ${oscuro(c, 0.2)})` }} />
        );
      })}
    </div>
  );
}

export function PuntoColor({ cat, tamaño = 9 }) {
  const c = colorCategoria(cat);
  return <span style={{ width: tamaño, height: tamaño, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${claro(c, 0.35)}, ${oscuro(c, 0.15)})`, boxShadow: '0 1px 2px rgba(60,20,10,0.3)', flexShrink: 0, display: 'inline-block' }} />;
}

// Cápsula con relieve, icono y color del rubro (texto oscuro en los rubros de tono claro).
const RUBROS_CLAROS = new Set(['Vuelos', 'Viáticos']);
export function PildoraCategoria({ cat, texto }) {
  const c = colorCategoria(cat);
  const Icono = ICONOS[cat] || IconCoin;
  const claroFondo = RUBROS_CLAROS.has(cat) || c === COLOR_OTROS;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      padding: '4px 11px 4px 9px', borderRadius: 20,
      background: `linear-gradient(180deg, ${claro(c, 0.18)}, ${c} 60%, ${oscuro(c, 0.12)})`,
      color: claroFondo ? '#3c0c1e' : 'white',
      boxShadow: '0 2px 5px rgba(70,30,15,0.25), inset 0 1px 0 rgba(255,255,255,0.35)',
    }}>
      <Icono width={13} height={13} strokeWidth={2.2} />
      {texto || cat}
    </span>
  );
}

// Cuadrito con relieve e icono del rubro, teñido con su color.
export function IconoCategoria({ cat }) {
  const c = colorCategoria(cat);
  const Icono = ICONOS[cat] || IconCoin;
  return (
    <span style={{
      width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(180deg, ${claro(c, 0.62)}, ${claro(c, 0.42)})`, color: oscuro(c, 0.25),
      boxShadow: `0 2px 4px rgba(80,40,20,0.22), inset 0 1px 0 rgba(255,255,255,0.7)`, border: `1px solid ${claro(c, 0.3)}`,
    }}>
      <Icono width={15} height={15} strokeWidth={2.2} />
    </span>
  );
}
