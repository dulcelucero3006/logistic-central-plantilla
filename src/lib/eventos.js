import { supabase } from './supabaseClient';
import { apiFetch } from './sesion';

function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    fecha: row.fecha || '',
    fechaFin: row.fecha_fin || '',
    hora: row.hora || '',
    horaFin: row.hora_fin || '',
    lugar: row.lugar || '',
    aforo: row.aforo ?? 0,
    registrados: row.registrados ?? 0,
    estado: row.estado || 'Borrador',
    descripcion: row.descripcion || '',
    responsable: row.responsable || '',
    color: row.color || '#1d4ed8',
    miembros: row.miembros || [],
    oculto: row.oculto || false,
    giraId: row.gira_id || null,
  };
}

function toRow(e) {
  return {
    id: e.id,
    nombre: e.nombre,
    fecha: e.fecha || null,
    fecha_fin: e.fechaFin || null,
    hora: e.hora || null,
    hora_fin: e.horaFin || null,
    lugar: e.lugar || null,
    aforo: e.aforo ?? 0,
    registrados: e.registrados ?? 0,
    estado: e.estado || 'Borrador',
    descripcion: e.descripcion || null,
    responsable: e.responsable || null,
    color: e.color || '#1d4ed8',
    miembros: e.miembros || [],
    oculto: !!e.oculto,
    gira_id: e.giraId || null,
  };
}

async function migrarDeLocalStorageSiHaceFalta() {
  const raw = localStorage.getItem('lc_eventos');
  if (!raw) return;
  try {
    const antiguos = JSON.parse(raw);
    if (Array.isArray(antiguos) && antiguos.length > 0) {
      const { error } = await supabase.from('eventos').upsert(antiguos.map(toRow));
      if (error) return;
    }
    localStorage.removeItem('lc_eventos');
  } catch {
    localStorage.removeItem('lc_eventos');
  }
}

// Marca como "Completado" cualquier evento cuya fecha ya pasó (y no está Cancelado),
// sin que nadie tenga que entrar a cambiarlo a mano.
async function marcarCompletadosSiPasaronDeFecha(eventos) {
  const hoy = new Date().toISOString().slice(0, 10);
  const candidatos = eventos.filter(e => {
    const fechaLimite = e.fechaFin || e.fecha;
    return fechaLimite && fechaLimite < hoy && e.estado !== 'Completado' && e.estado !== 'Cancelado';
  });
  if (candidatos.length === 0) return eventos;
  try {
    const resultados = await Promise.all(candidatos.map(e =>
      supabase.from('eventos').update({ estado: 'Completado' }).eq('id', e.id).select().single()
    ));
    const actualizadosPorId = new Map(
      resultados.filter(r => !r.error).map(r => [r.data.id, fromRow(r.data)])
    );
    return eventos.map(e => actualizadosPorId.get(e.id) || e);
  } catch {
    // si falla, seguimos con lo que ya estaba guardado
    return eventos;
  }
}

export async function listEventos() {
  await migrarDeLocalStorageSiHaceFalta();
  const { data, error } = await supabase.from('eventos').select('*').order('id', { ascending: true });
  if (error) throw error;
  const eventos = (data || []).map(fromRow);
  return marcarCompletadosSiPasaronDeFecha(eventos);
}

export async function createEvento(evento) {
  const { data, error } = await supabase.from('eventos').insert(toRow(evento)).select().single();
  if (error) throw error;
  return fromRow(data);
}

// Para cuando un evento "nace" de una entrada de agenda ya ligada a Google
// Calendar: transfiere ese vínculo al evento nuevo, en vez de perderlo.
export async function vincularAGoogle(id, googleEventId) {
  const { error } = await supabase.from('eventos').update({ google_event_id: googleEventId }).eq('id', id);
  if (error) throw error;
}

export async function updateEvento(evento) {
  const { data, error } = await supabase.from('eventos').update(toRow(evento)).eq('id', evento.id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteEvento(id) {
  const { data } = await supabase.from('eventos').select('google_event_id').eq('id', id).maybeSingle();
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
  const { error } = await supabase.from('eventos').delete().eq('id', id);
  if (error) throw error;
}
