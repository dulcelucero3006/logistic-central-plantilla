import { useId } from 'react';
import { coordsDeCiudad } from '../lib/ciudadesCoords';
import { CONTORNO_MEXICO, CONTORNO_USA } from '../lib/contornosPaises';

const W = 240;
const H = 150;
const ALTO_CHIPS = 26; // franja de abajo reservada para la fila de chips con las ciudades
const ALTO_MAPA = H - ALTO_CHIPS;
const ANCHO_MINIMO = 19; // grados (corregidos por latitud): siempre se ve buena parte del país
const MARGEN = 1.7;
const ALTO_ETQ = 14;

// Curva suave cerrada (Catmull-Rom a Bézier) para que las costas no se vean picudas.
function pathSuaveCerrado(pts) {
  const n = pts.length;
  const f = v => v.toFixed(1);
  const d = [`M ${f(pts[0][0])} ${f(pts[0][1])}`];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d.push(`C ${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`);
  }
  return d.join(' ') + ' Z';
}

function pinPath(x, y) {
  const r = 5.5;
  const cy = y - 10;
  return `M ${x} ${y} C ${x - r * 1.15} ${y - r * 1.3} ${x - r} ${cy - r} ${x} ${cy - r} C ${x + r} ${cy - r} ${x + r * 1.15} ${y - r * 1.3} ${x} ${y} Z`;
}

function seEnciman(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// Acomoda cada etiqueta en el primer lugar libre (derecha, izquierda, arriba, abajo del pin)
// para que no se encimen entre sí ni tapen otros pines.
function acomodarEtiquetas(pines) {
  const cajasPin = pines.map(p => ({ x: p.xy[0] - 6, y: p.xy[1] - 17, w: 12, h: 17 }));
  const puestas = [];
  return pines.map((p, i) => {
    const [x, y] = p.xy;
    const w = p.nombre.length * 5.6 + 12;
    const opciones = [
      { x: x + 8, y: y - 18 },
      { x: x - 8 - w, y: y - 18 },
      { x: x - w / 2, y: y - 18 - ALTO_ETQ - 2 },
      { x: x - w / 2, y: y + 3 },
      { x: x + 8, y: y - 4 },
      { x: x - 8 - w, y: y - 4 },
      { x: x + 6, y: y - 34 },
      { x: x - 6 - w, y: y - 34 },
      { x: x + 6, y: y + 4 },
      { x: x - 6 - w, y: y + 4 },
    ].map(o => ({ ...o, w, h: ALTO_ETQ }));
    const dentro = c => c.x >= 3 && c.x + c.w <= W - 3 && c.y >= 3 && c.y + c.h <= ALTO_MAPA;
    const libre = c => dentro(c)
      && !puestas.some(o => seEnciman(c, o))
      && !cajasPin.some((b, j) => j !== i && seEnciman(c, b));
    const elegida = opciones.find(libre) || opciones.find(dentro) || opciones[0];
    puestas.push(elegida);
    return elegida;
  });
}

export default function MiniMapaGira({ eventos }) {
  const uid = useId().replace(/:/g, '');
  const puntos = (eventos || [])
    .map(e => ({ nombre: e.nombre, coords: coordsDeCiudad(e.nombre) }))
    .filter(p => p.coords);

  if (puntos.length === 0) return null;

  // Proyección con corrección por latitud y la misma escala en X y Y, para no deformar el país.
  const lats = puntos.map(p => p.coords[0]);
  const lons = puntos.map(p => p.coords[1]);
  const latC = (Math.max(...lats) + Math.min(...lats)) / 2;
  const lonC = (Math.max(...lons) + Math.min(...lons)) / 2;
  const k = Math.cos(latC * Math.PI / 180);
  const spanX = (Math.max(...lons) - Math.min(...lons)) * k * MARGEN;
  const spanY = (Math.max(...lats) - Math.min(...lats)) * MARGEN;
  const anchoU = Math.max(spanX, ANCHO_MINIMO, spanY * W / ALTO_MAPA);
  const escala = W / anchoU;
  const proyectar = ([lat, lon]) => [W / 2 + (lon - lonC) * k * escala, ALTO_MAPA / 2 + 6 - (lat - latC) * escala];

  const ordenados = puntos.map(p => ({ ...p, xy: proyectar(p.coords) }));
  const vistos = new Set();
  const unicos = [];
  ordenados.forEach(p => { if (!vistos.has(p.nombre)) { vistos.add(p.nombre); unicos.push(p); } });
  const etiquetas = acomodarEtiquetas(unicos);

  const tierra = [CONTORNO_USA, CONTORNO_MEXICO].map(c => pathSuaveCerrado(c.map(proyectar)));
  const chip = { background: '#f1e1c1', color: '#4a1426', fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5, boxShadow: '0 1px 2px rgba(107,74,42,0.25)', letterSpacing: 0.3, whiteSpace: 'nowrap' };

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#f6eedf', boxShadow: 'inset 0 1px 5px rgba(61,18,32,0.08)' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <filter id={`st-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.6" floodColor="#8a6a3a" floodOpacity="0.25" />
          </filter>
          <filter id={`sp-${uid}`} x="-60%" y="-40%" width="220%" height="180%">
            <feDropShadow dx="0" dy="1.3" stdDeviation="1" floodColor="#3c0c1e" floodOpacity="0.4" />
          </filter>
          <filter id={`se-${uid}`} x="-20%" y="-40%" width="140%" height="190%">
            <feDropShadow dx="0" dy="0.8" stdDeviation="0.9" floodColor="#6b4a2a" floodOpacity="0.28" />
          </filter>
        </defs>

        {tierra.map((d, i) => (
          <path key={i} d={d} fill="#ead8b4" stroke="#d9c094" strokeWidth="0.6" filter={`url(#st-${uid})`} />
        ))}

        {ordenados.slice(1).map((p, i) => {
          const [ax, ay] = ordenados[i].xy;
          const [bx, by] = p.xy;
          const cx = (ax + bx) / 2 + (by - ay) * 0.2;
          const cy = (ay + by) / 2 - (bx - ax) * 0.2;
          return (
            <path key={i} d={`M ${ax} ${ay - 2} Q ${cx} ${cy} ${bx} ${by - 2}`}
              fill="none" stroke="#8a2a46" strokeWidth="1" strokeDasharray="2.5 2" strokeLinecap="round" opacity="0.8" />
          );
        })}

        {unicos.map((p, i) => {
          const e = etiquetas[i];
          return (
            <g key={`e-${p.nombre}`} filter={`url(#se-${uid})`}>
              <rect x={e.x} y={e.y} width={e.w} height={e.h} rx={4} fill="#f1e1c1" />
              <text x={e.x + e.w / 2} y={e.y + 9.8} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#4a1426" fontFamily="Inter, sans-serif" letterSpacing="0.2">
                {p.nombre.toUpperCase()}
              </text>
            </g>
          );
        })}

        {unicos.map(p => {
          const [x, y] = p.xy;
          return (
            <g key={p.nombre} filter={`url(#sp-${uid})`}>
              <path d={pinPath(x, y)} fill="#8a1f3f" />
              <circle cx={x} cy={y - 10} r="2.1" fill="#f6eedf" />
            </g>
          );
        })}
      </svg>

      <div style={{ position: 'absolute', left: 8, right: 8, bottom: 7, display: 'flex', gap: 5, overflow: 'hidden' }}>
        {unicos.slice(0, 3).map(p => <span key={p.nombre} style={chip}>{p.nombre.toUpperCase()}</span>)}
        {unicos.length > 3 && <span style={chip}>+{unicos.length - 3}</span>}
      </div>
    </div>
  );
}
