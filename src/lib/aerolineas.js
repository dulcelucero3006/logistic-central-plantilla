import { supabase } from './supabaseClient';

function fromRow(row) {
  return {
    id: row.id,
    nombre: row.nombre || '',
    cuenta: row.cuenta || '',
    correo: row.correo || '',
    contrasena: row.contrasena || '',
    maletaDoc1: row.maleta_doc1 ?? '',
    maletaDoc2: row.maleta_doc2 ?? '',
    maletaMano: row.maleta_mano ?? '',
    notas: row.notas || '',
  };
}

function toRow(a) {
  return {
    id: a.id,
    nombre: a.nombre,
    cuenta: a.cuenta || null,
    correo: a.correo || null,
    contrasena: a.contrasena || null,
    maleta_doc1: a.maletaDoc1 === '' ? null : a.maletaDoc1,
    maleta_doc2: a.maletaDoc2 === '' ? null : a.maletaDoc2,
    maleta_mano: a.maletaMano === '' ? null : a.maletaMano,
    notas: a.notas || null,
  };
}

async function migrarDeLocalStorageSiHaceFalta() {
  const raw = localStorage.getItem('lc_aerolineas');
  if (!raw) return;
  try {
    const antiguas = JSON.parse(raw);
    if (Array.isArray(antiguas) && antiguas.length > 0) {
      const { error } = await supabase.from('aerolineas').upsert(antiguas.map(toRow));
      if (error) return;
    }
    localStorage.removeItem('lc_aerolineas');
  } catch {
    localStorage.removeItem('lc_aerolineas');
  }
}

export async function listAerolineas() {
  await migrarDeLocalStorageSiHaceFalta();
  const { data, error } = await supabase.from('aerolineas').select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createAerolinea(a) {
  const { data, error } = await supabase.from('aerolineas').insert(toRow(a)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateAerolinea(a) {
  const { data, error } = await supabase.from('aerolineas').update(toRow(a)).eq('id', a.id).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteAerolinea(id) {
  const { error } = await supabase.from('aerolineas').delete().eq('id', id);
  if (error) throw error;
}
