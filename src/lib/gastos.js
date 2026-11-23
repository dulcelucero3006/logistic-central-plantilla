import { supabase } from './supabaseClient';

function fromRow(row) {
  return {
    id: row.id,
    concepto: row.concepto || '',
    categoria: row.categoria || '',
    otroDetalle: row.otro_detalle || '',
    proveedor: row.proveedor || '',
    notas: row.notas || '',
    monto: row.monto ?? 0,
    eventoId: row.evento_id || '',
    comprobantes: row.comprobantes || [],
    metodoPago: row.metodo_pago || '',
    moneda: row.moneda || 'MXN',
    tipoCambio: row.tipo_cambio ?? '',
  };
}

function toRow(g) {
  return {
    id: g.id,
    concepto: g.concepto,
    categoria: g.categoria || null,
    otro_detalle: g.otroDetalle || null,
    proveedor: g.proveedor || null,
    notas: g.notas || null,
    monto: g.monto || 0,
    evento_id: g.eventoId || null,
    comprobantes: g.comprobantes || [],
    metodo_pago: g.metodoPago || null,
    moneda: g.moneda || 'MXN',
    tipo_cambio: g.tipoCambio === '' ? null : g.tipoCambio,
  };
}

async function migrarDeLocalStorageSiHaceFalta() {
  const raw = localStorage.getItem('lc_partidas');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const antiguos = Array.isArray(parsed) ? parsed : Object.values(parsed).flat();
    if (antiguos.length > 0) {
      const { error } = await supabase.from('gastos').upsert(antiguos.map(toRow));
      if (error) return;
    }
    localStorage.removeItem('lc_partidas');
  } catch {
    localStorage.removeItem('lc_partidas');
  }
}

export async function listGastos() {
  await migrarDeLocalStorageSiHaceFalta();
  const { data, error } = await supabase.from('gastos').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createGasto(gasto) {
  const { data, error } = await supabase.from('gastos').insert(toRow(gasto)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateGasto(gasto) {
  const { data, error } = await supabase.from('gastos').update(toRow(gasto)).eq('id', gasto.id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteGasto(id) {
  const { error } = await supabase.from('gastos').delete().eq('id', id);
  if (error) throw error;
}
