import { supabase } from './supabaseClient';

export const TIPOS_LOGISTICA = ['Hotel', 'Vuelo', 'Traslado', 'Otro'];

function fromRow(row) {
  return {
    id: row.id,
    tipo: row.tipo || 'Otro',
    fecha: row.fecha || '',
    fechaFin: row.fecha_fin || '',
    hora: row.hora || '',
    horaFin: row.hora_fin || '',
    nota: row.nota || '',
  };
}

function toRow(l) {
  return {
    id: l.id,
    tipo: l.tipo,
    fecha: l.fecha,
    fecha_fin: l.tipo === 'Hotel' && l.fechaFin ? l.fechaFin : null,
    hora: l.hora || null,
    hora_fin: l.horaFin || null,
    nota: l.nota || null,
  };
}

export async function listLogistica() {
  const { data, error } = await supabase.from('logistica').select('*').order('fecha', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createLogistica(l) {
  const { data, error } = await supabase.from('logistica').insert(toRow({ ...l, id: Date.now() })).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateLogistica(l) {
  const { data, error } = await supabase.from('logistica').update(toRow(l)).eq('id', l.id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteLogistica(id) {
  const { error } = await supabase.from('logistica').delete().eq('id', id);
  if (error) throw error;
}
