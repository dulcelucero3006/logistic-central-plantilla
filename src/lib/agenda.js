import { supabase } from './supabaseClient';
import { apiFetch } from './sesion';

function fromRow(row) {
  return {
    id: row.id,
    titulo: row.titulo || '',
    fecha: row.fecha || '',
    hora: row.hora || '',
    fechaFin: row.fecha_fin || '',
    horaFin: row.hora_fin || '',
    todoElDia: row.todo_el_dia || false,
    color: row.color || '#3b82f6',
    notas: row.notas || '',
    googleEventId: row.google_event_id || null,
    tipo: row.tipo || 'Recordatorio',
  };
}

function toRow(a) {
  return {
    id: a.id,
    titulo: a.titulo,
    fecha: a.fecha || null,
    hora: a.hora || null,
    fecha_fin: a.fechaFin || null,
    hora_fin: a.horaFin || null,
    todo_el_dia: !!a.todoElDia,
    color: a.color || null,
    notas: a.notas || null,
    tipo: a.tipo || 'Recordatorio',
    // google_event_id a propósito no va aquí: lo maneja el sync de Google
    // directo contra la base de datos, para que un guardado normal desde el
    // formulario nunca lo borre sin querer.
  };
}

export async function listAgenda() {
  const { data, error } = await supabase.from('agenda').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createAgenda(item) {
  const { data, error } = await supabase.from('agenda').insert(toRow(item)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateAgenda(item) {
  const { data, error } = await supabase.from('agenda').update(toRow(item)).eq('id', item.id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteAgenda(id) {
  const { data } = await supabase.from('agenda').select('google_event_id').eq('id', id).maybeSingle();
  if (data?.google_event_id) {
    try {
      await apiFetch('/api/google/delete-event', {
        method: 'POST',
        body: JSON.stringify({ googleEventId: data.google_event_id }),
      });
    } catch {
      // si falla el borrado en Google Calendar no bloqueamos el borrado local
    }
  }
  const { error } = await supabase.from('agenda').delete().eq('id', id);
  if (error) throw error;
}

// Borra solo el renglón local, sin tocar Google Calendar — para cuando una
// entrada de agenda se convierte en Evento y el vínculo con Google se
// transfiere al evento nuevo en vez de perderse.
export async function deleteAgendaLocal(id) {
  const { error } = await supabase.from('agenda').delete().eq('id', id);
  if (error) throw error;
}
