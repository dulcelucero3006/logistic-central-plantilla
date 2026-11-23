const ip = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const ESTILO = {
  agrego: { fondo: 'linear-gradient(180deg, #e3f1e0, #cfe6c9)', color: '#2f6b2b', borde: '#b9d8b2' },
  edito: { fondo: 'linear-gradient(180deg, #faf0d4, #f1e0b0)', color: '#8a6512', borde: '#e6d29a' },
  borro: { fondo: 'linear-gradient(180deg, #f8e1e4, #f0c9cf)', color: '#9b2f3a', borde: '#e7b8bf' },
};

// Cuadrito con el ícono de la acción: más (agregó), lápiz (editó), bote (borró).
export function IconoAccion({ accion, tamaño = 32 }) {
  const e = ESTILO[accion] || ESTILO.edito;
  return (
    <span style={{
      width: tamaño, height: tamaño, flexShrink: 0, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: e.fondo, color: e.color, border: `1px solid ${e.borde}`,
      boxShadow: '0 2px 5px rgba(90,55,30,0.14), inset 0 1px 0 rgba(255,255,255,0.8)',
    }}>
      {accion === 'agrego' && <svg {...ip}><path d="M12 5v14M5 12h14" /></svg>}
      {accion === 'edito' && <svg {...ip}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>}
      {accion === 'borro' && <svg {...ip}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>}
    </span>
  );
}
