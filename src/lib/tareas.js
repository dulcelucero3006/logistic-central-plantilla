import { supabase } from './supabaseClient';

function fromRow(row) {
  return {
    id: row.id,
    titulo: row.titulo || '',
    descripcion: row.descripcion || '',
    estado: row.estado || 'Pendiente',
    prioridad: row.prioridad || 'Media',
    fechaLimite: row.fecha_limite || '',
    responsable: row.responsable || '',
    eventoId: row.evento_id || '',
    orden: row.orden ?? null,
  };
}

function toRow(t) {
  return {
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion || null,
    estado: t.estado || 'Pendiente',
    prioridad: t.prioridad || 'Media',
    fecha_limite: t.fechaLimite || null,
    responsable: t.responsable || null,
    evento_id: t.eventoId || null,
    orden: t.orden ?? null,
  };
}

async function migrarDeLocalStorageSiHaceFalta() {
  const raw = localStorage.getItem('lc_tareas');
  if (!raw) return;
  try {
    const antiguas = JSON.parse(raw);
    if (Array.isArray(antiguas) && antiguas.length > 0) {
      const { error } = await supabase.from('tareas').upsert(antiguas.map(toRow));
      if (error) return;
    }
    localStorage.removeItem('lc_tareas');
  } catch {
    localStorage.removeItem('lc_tareas');
  }
}

export async function listTareas() {
  await migrarDeLocalStorageSiHaceFalta();
  const { data, error } = await supabase.from('tareas').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createTareas(tareas) {
  const { data, error } = await supabase.from('tareas').insert(tareas.map(toRow)).select();
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function updateTarea(tarea) {
  const { data, error } = await supabase.from('tareas').update(toRow(tarea)).eq('id', tarea.id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteTarea(id) {
  const { error } = await supabase.from('tareas').delete().eq('id', id);
  if (error) throw error;
}
