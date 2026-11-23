import { supabase } from './supabaseClient';

function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    fechaInicio: row.fecha_inicio || '',
    fechaFin: row.fecha_fin || '',
    notas: row.notas || '',
    monedaPrincipal: row.moneda_principal || 'MXN',
    tipoCambioReferencia: row.tipo_cambio_referencia ?? '',
  };
}

function toRow(g) {
  return {
    id: g.id,
    nombre: g.nombre,
    fecha_inicio: g.fechaInicio || null,
    fecha_fin: g.fechaFin || null,
    notas: g.notas || null,
    moneda_principal: g.monedaPrincipal || 'MXN',
    tipo_cambio_referencia: g.tipoCambioReferencia === '' ? null : g.tipoCambioReferencia,
  };
}

async function obtenerTipoCambioUSD() {
  const hoy = new Date().toISOString().slice(0, 10);
  try {
    const cache = JSON.parse(localStorage.getItem('lc_tipo_cambio_usd') || 'null');
    if (cache && cache.fecha === hoy) return cache.valor;
  } catch {
    // caché corrupto, seguimos y lo pedimos de nuevo
  }
  const res = await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=MXN');
  if (!res.ok) throw new Error('No se pudo consultar el tipo de cambio.');
  const data = await res.json();
  const valor = data.rates?.MXN;
  if (!valor) throw new Error('Respuesta inesperada del servicio de tipo de cambio.');
  localStorage.setItem('lc_tipo_cambio_usd', JSON.stringify({ fecha: hoy, valor }));
  return valor;
}

// Mantiene al día, sin que nadie tenga que pedirlo, el tipo de cambio de referencia
// de las giras marcadas como "en dólares" — se compara contra el tipo de cambio del
// día (cacheado por obtenerTipoCambioUSD) y solo se actualiza en la base si cambió.
async function refrescarTiposCambioGirasUSD(giras) {
  const girasUSD = giras.filter(g => g.monedaPrincipal === 'USD');
  if (girasUSD.length === 0) return giras;
  try {
    const valorHoy = await obtenerTipoCambioUSD();
    const porActualizar = girasUSD.filter(g => Number(g.tipoCambioReferencia) !== valorHoy);
    if (porActualizar.length === 0) return giras;
    const resultados = await Promise.all(porActualizar.map(g =>
      supabase.from('giras').update({ tipo_cambio_referencia: valorHoy }).eq('id', g.id).select().single()
    ));
    const actualizadasPorId = new Map(
      resultados.filter(r => !r.error).map(r => [r.data.id, fromRow(r.data)])
    );
    return giras.map(g => actualizadasPorId.get(g.id) || g);
  } catch {
    // si falla la consulta del tipo de cambio, seguimos con lo que ya estaba guardado
    return giras;
  }
}

export async function listGiras() {
  const { data, error } = await supabase.from('giras').select('*').order('fecha_inicio', { ascending: true });
  if (error) throw error;
  const giras = (data || []).map(fromRow);
  return refrescarTiposCambioGirasUSD(giras);
}

export async function createGira(gira) {
  const { data, error } = await supabase.from('giras').insert(toRow(gira)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateGira(gira) {
  const { data, error } = await supabase.from('giras').update(toRow(gira)).eq('id', gira.id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteGira(id) {
  const { error } = await supabase.from('giras').delete().eq('id', id);
  if (error) throw error;
}
