import { supabase } from './supabaseClient';

// Registro de actividad: lo llena la base de datos sola (un "trigger" por tabla)
// cada vez que alguien agrega, edita o borra algo. Solo la admin lo puede leer.

const QUE = {
  eventos: ['el evento', 'Eventos'],
  giras: ['la gira', 'Giras'],
  gastos: ['el gasto', 'Gastos'],
  tareas: ['la tarea', 'Checklist'],
  agenda: ['la actividad de agenda', 'Calendario'],
  logistica: ['la logística', 'Calendario'],
  notas_giras: ['la nota', 'Calendario'],
  salones: ['el salón', 'Salones'],
  aerolineas: ['la aerolínea', 'Aerolíneas'],
  proveedores: ['el proveedor', 'Salones'],
  equipo: ['a la persona', 'Equipo'],
};

export const VERBO = { agrego: 'agregó', edito: 'editó', borro: 'borró' };

export const RUTA_SECCION = {
  calendario: '/calendario', giras: '/giras', eventos: '/eventos', gastos: '/presupuesto',
  equipo: '/equipo', checklist: '/checklist', aerolineas: '/aerolineas', salones: '/salones',
};

const CAMPOS = {
  nombre: 'Nombre', fecha: 'Fecha', fecha_fin: 'Fecha fin', hora: 'Hora', hora_fin: 'Hora fin', lugar: 'Lugar',
  estado: 'Estado', monto: 'Monto', concepto: 'Concepto', categoria: 'Categoría', notas: 'Notas', nota: 'Nota',
  texto: 'Texto', titulo: 'Título', descripcion: 'Descripción', responsable: 'Responsable', prioridad: 'Prioridad',
  fecha_limite: 'Fecha límite', metodo_pago: 'Método de pago', moneda: 'Moneda', tipo_cambio: 'Tipo de cambio',
  comprobantes: 'Comprobantes', docs: 'Documentos', miembros: 'Equipo asignado', gira_id: 'Gira', gira: 'Gira',
  evento_id: 'Evento', oculto: 'Oculto', registrados: 'Registrados', aforo: 'Aforo', color: 'Color',
  proveedor: 'Proveedor', otro_detalle: 'Detalle', contrasena: 'Contraseña', cuenta: 'Cuenta', correo: 'Correo',
  hotel: 'Hotel', salon: 'Salón', ciudad: 'Ciudad', region: 'Región', costo: 'Costo', personas: 'Personas',
  capacidad_maxima: 'Capacidad máxima', telefonos: 'Teléfonos', contacto: 'Contacto', tipo: 'Tipo',
  todo_el_dia: 'Todo el día', fecha_inicio: 'Fecha inicio', moneda_principal: 'Moneda principal',
  tipo_cambio_referencia: 'Tipo de cambio de referencia', maleta_doc1: 'Maleta documentada 1',
  maleta_doc2: 'Maleta documentada 2', maleta_mano: 'Maleta de mano', email: 'Correo', telefono: 'Teléfono',
  departamento: 'Área', rol: 'Rol', favorito: 'Favorito', iniciales: 'Iniciales', pasaporte_numero: 'Número de pasaporte',
  pasaporte_vencimiento: 'Vencimiento de pasaporte', pasaporte_expedicion: 'Expedición de pasaporte',
  tiene_visa: 'Tiene visa', visa_numero: 'Número de visa', visa_vencimiento: 'Vencimiento de visa',
  visa_expedicion: 'Expedición de visa', fecha_nacimiento: 'Fecha de nacimiento', nacionalidad: 'Nacionalidad',
  calificacion: 'Calificación', activo: 'Activo',
};

export function nombreCampo(k) {
  return CAMPOS[k] || k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

export function valorBonito(v) {
  if (v === null || v === undefined || v === '') return '(vacío)';
  if (v === 'true') return 'Sí';
  if (v === 'false') return 'No';
  const fecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (fecha) return `${fecha[3]}/${fecha[2]}/${fecha[1]}`;
  return v;
}

export function queEs(tabla) {
  return QUE[tabla]?.[0] || 'un registro';
}

export function nombreSeccion(tabla) {
  return QUE[tabla]?.[1] || tabla;
}

// "Ana agregó el gasto"
export function frase(a) {
  return `${a.usuarioNombre} ${VERBO[a.accion] || a.accion} ${queEs(a.tabla)}`;
}

function fromRow(r) {
  return {
    id: r.id,
    creadoEn: r.creado_en,
    usuarioId: r.usuario_id,
    usuarioNombre: r.usuario_nombre || 'Alguien',
    usuarioEmail: r.usuario_email || '',
    rol: r.rol || '',
    tabla: r.tabla,
    seccion: r.seccion,
    accion: r.accion,
    descripcion: r.descripcion || '',
    cambios: r.cambios || null,
    leido: r.leido,
  };
}

export async function listActividad({ antesDe = null, limite = 100 } = {}) {
  let q = supabase.from('actividad').select('*').order('creado_en', { ascending: false }).limit(limite);
  if (antesDe) q = q.lt('creado_en', antesDe);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function contarNoLeidas() {
  const { count } = await supabase.from('actividad').select('id', { count: 'exact', head: true }).eq('leido', false);
  return count || 0;
}

export async function marcarTodoLeido() {
  await supabase.from('actividad').update({ leido: true }).eq('leido', false);
  window.dispatchEvent(new Event('actividad-cambio'));
}

// Avisa en vivo cada vez que se anota algo nuevo.
export function escucharActividad(alLlegar) {
  const canal = supabase
    .channel(`actividad-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'actividad' }, payload => alLlegar(fromRow(payload.new)))
    .subscribe();
  return () => { supabase.removeChannel(canal); };
}
