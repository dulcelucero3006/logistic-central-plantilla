import { supabase } from './supabaseClient';

function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    rol: row.rol || '',
    email: row.email || '',
    telefono: row.telefono || '',
    departamento: row.departamento || 'Logística',
    color: row.color || '#1d4ed8',
    iniciales: row.iniciales || '',
    docs: row.docs || [],
    pasaporteNumero: row.pasaporte_numero || '',
    pasaporteExpedicion: row.pasaporte_expedicion || '',
    pasaporteVencimiento: row.pasaporte_vencimiento || '',
    tieneVisa: row.tiene_visa || false,
    visaExpedicion: row.visa_expedicion || '',
    visaVencimiento: row.visa_vencimiento || '',
    visaNumero: row.visa_numero || '',
    favorito: row.favorito || false,
    fechaNacimiento: row.fecha_nacimiento || '',
    nacionalidad: row.nacionalidad || '',
  };
}

function toRow(m) {
  return {
    id: m.id,
    nombre: m.nombre,
    rol: m.rol || null,
    email: m.email || null,
    telefono: m.telefono || null,
    departamento: m.departamento || null,
    color: m.color || '#1d4ed8',
    iniciales: m.iniciales || null,
    docs: m.docs || [],
    pasaporte_numero: m.pasaporteNumero || null,
    pasaporte_expedicion: m.pasaporteExpedicion || null,
    pasaporte_vencimiento: m.pasaporteVencimiento || null,
    tiene_visa: !!m.tieneVisa,
    visa_expedicion: m.visaExpedicion || null,
    visa_vencimiento: m.visaVencimiento || null,
    visa_numero: m.visaNumero || null,
    favorito: !!m.favorito,
    fecha_nacimiento: m.fechaNacimiento || null,
    nacionalidad: m.nacionalidad || null,
  };
}

async function migrarDeLocalStorageSiHaceFalta() {
  const raw = localStorage.getItem('lc_equipo');
  if (!raw) return;
  try {
    const antiguos = JSON.parse(raw);
    if (Array.isArray(antiguos) && antiguos.length > 0) {
      const { error } = await supabase.from('equipo').upsert(antiguos.map(toRow));
      if (error) return;
    }
    localStorage.removeItem('lc_equipo');
  } catch {
    localStorage.removeItem('lc_equipo');
  }
}

export async function listEquipo() {
  await migrarDeLocalStorageSiHaceFalta();
  const { data, error } = await supabase.from('equipo').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

// Para roles que no son admin: solo nombre, área/rol, color e iniciales (sin datos
// personales; la base de datos no les entrega nada más).
export async function listEquipoPublico() {
  const { data, error } = await supabase.from('equipo_publico').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createMiembro(miembro) {
  const { data, error } = await supabase.from('equipo').insert(toRow(miembro)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateMiembro(miembro) {
  const { data, error } = await supabase.from('equipo').update(toRow(miembro)).eq('id', miembro.id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteMiembro(id) {
  const { error } = await supabase.from('equipo').delete().eq('id', id);
  if (error) throw error;
}
