import { supabase } from './supabaseClient';

function fromRow(row) {
  return {
    id: row.id,
    texto: row.texto || '',
    fecha: row.fecha || '',
    creadoEn: row.creado_en || '',
  };
}

export async function listNotasGiras() {
  const { data, error } = await supabase.from('notas_giras').select('*').order('creado_en', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createNotaGira(fecha, texto) {
  const { data, error } = await supabase.from('notas_giras').insert({ id: Date.now(), fecha, texto }).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateNotaGira(id, texto) {
  const { data, error } = await supabase.from('notas_giras').update({ texto }).eq('id', id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteNotaGira(id) {
  const { error } = await supabase.from('notas_giras').delete().eq('id', id);
  if (error) throw error;
}
