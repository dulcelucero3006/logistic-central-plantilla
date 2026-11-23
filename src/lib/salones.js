import { supabase } from './supabaseClient';

function fromRow(row) {
  return {
    id: row.id,
    region: row.region || '',
    ciudad: row.ciudad || '',
    hotel: row.hotel || '',
    contacto: row.contacto || '',
    telefonos: row.telefonos?.length ? row.telefonos : [''],
    correo: row.correo || '',
    salon: row.salon || '',
    costo: row.costo ?? '',
    personas: row.personas ?? '',
    capacidadMaxima: row.capacidad_maxima ?? '',
    notas: row.notas || '',
  };
}

function toRow(s) {
  return {
    id: s.id,
    region: s.region || null,
    ciudad: s.ciudad,
    hotel: s.hotel || null,
    contacto: s.contacto || null,
    telefonos: (s.telefonos || []).filter(t => t.trim() !== ''),
    correo: s.correo || null,
    salon: s.salon,
    costo: s.costo === '' ? null : Number(s.costo),
    personas: s.personas === '' ? null : Number(s.personas),
    capacidad_maxima: s.capacidadMaxima === '' ? null : Number(s.capacidadMaxima),
    notas: s.notas || null,
  };
}

async function migrarDeLocalStorageSiHaceFalta() {
  const raw = localStorage.getItem('lc_salones');
  if (!raw) return;
  try {
    const antiguos = JSON.parse(raw);
    if (Array.isArray(antiguos) && antiguos.length > 0) {
      const { error } = await supabase.from('salones').upsert(antiguos.map(toRow));
      if (error) return;
    }
    localStorage.removeItem('lc_salones');
  } catch {
    localStorage.removeItem('lc_salones');
  }
}

export async function listSalones() {
  await migrarDeLocalStorageSiHaceFalta();
  const { data, error } = await supabase.from('salones').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createSalon(salon) {
  const { data, error } = await supabase.from('salones').insert(toRow(salon)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function createSalones(salones) {
  const { data, error } = await supabase.from('salones').insert(salones.map(toRow)).select();
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function updateSalon(salon) {
  const { data, error } = await supabase.from('salones').update(toRow(salon)).eq('id', salon.id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteSalon(id) {
  const { error } = await supabase.from('salones').delete().eq('id', id);
  if (error) throw error;
}
