import { exigirSesion } from '../_lib/sesion.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { googleCalendarFetch, getTokensRow } from '../_lib/google.js';

const ZONA = 'America/Mexico_City';

function sumarDias(fechaISO, dias) {
  const d = new Date(fechaISO + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
function restarDias(fechaISO, dias) {
  return sumarDias(fechaISO, -dias);
}
function sumarHora(hora, horas) {
  const [h, m] = hora.split(':').map(Number);
  const total = ((h + horas) % 24 + 24) % 24;
  return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function rangoAGoogle(fecha, hora, fechaFin, horaFin) {
  if (hora) {
    const ff = fechaFin || fecha;
    const hf = horaFin || sumarHora(hora, 1);
    return {
      start: { dateTime: `${fecha}T${hora}:00`, timeZone: ZONA },
      end: { dateTime: `${ff}T${hf}:00`, timeZone: ZONA },
    };
  }
  const ff = fechaFin || fecha;
  return {
    start: { date: fecha },
    end: { date: sumarDias(ff, 1) },
  };
}

function rangoDeGoogle(ev) {
  if (ev.start?.date) {
    return {
      fecha: ev.start.date,
      hora: null,
      fecha_fin: ev.end?.date ? restarDias(ev.end.date, 1) : ev.start.date,
      hora_fin: null,
      todo_el_dia: true,
    };
  }
  if (ev.start?.dateTime) {
    const [f, h] = ev.start.dateTime.split('T');
    const partes = { fecha: f, hora: h.slice(0, 5), todo_el_dia: false };
    if (ev.end?.dateTime) {
      const [f2, h2] = ev.end.dateTime.split('T');
      partes.fecha_fin = f2;
      partes.hora_fin = h2.slice(0, 5);
    } else {
      partes.fecha_fin = f;
      partes.hora_fin = null;
    }
    return partes;
  }
  return null;
}

const TABLAS = [
  {
    nombre: 'eventos',
    aGoogle: e => ({
      summary: e.nombre || '(Sin nombre)',
      location: e.lugar || undefined,
      description: e.descripcion || undefined,
      ...rangoAGoogle(e.fecha, e.hora, e.fecha_fin, e.hora_fin),
    }),
  },
  {
    nombre: 'agenda',
    aGoogle: a => ({
      summary: a.titulo || '(Sin título)',
      description: a.notas || undefined,
      ...rangoAGoogle(a.fecha, a.todo_el_dia ? null : a.hora, a.fecha_fin, a.todo_el_dia ? null : a.hora_fin),
    }),
  },
];

export default async function handler(req, res) {
  if (!(await exigirSesion(req, res, { editarAlguna: ['calendario'] }))) return;
  try {
    const tokensRow = await getTokensRow();
    const conectadoDesde = tokensRow?.connected_since ? new Date(tokensRow.connected_since) : new Date();

    // Ventana amplia a propósito: si un evento viejo quedara fuera de esta
    // ventana, el sync pensaría (equivocadamente) que lo borraron en Google
    // y lo desvincularía, para terminar creando un duplicado en la próxima
    // pasada. Mejor cubrir varios años hacia ambos lados.
    const hoy = new Date().toISOString().slice(0, 10);
    const timeMin = sumarDias(hoy, -3650);
    const timeMax = sumarDias(hoy, 1095);

    let googleEvents = [];
    let pageToken;
    do {
      const qs = new URLSearchParams({
        singleEvents: 'true',
        maxResults: '2500',
        timeMin: `${timeMin}T00:00:00Z`,
        timeMax: `${timeMax}T00:00:00Z`,
        ...(pageToken ? { pageToken } : {}),
      });
      const pagina = await googleCalendarFetch(`/calendars/primary/events?${qs.toString()}`);
      googleEvents = googleEvents.concat(pagina.items || []);
      pageToken = pagina.nextPageToken;
    } while (pageToken);

    const googleById = new Map(googleEvents.filter(ev => ev.status !== 'cancelled').map(ev => [ev.id, ev]));
    const idsVinculados = new Set();

    let creadosEnGoogle = 0, actualizadosEnGoogle = 0, creadosEnApp = 0, desvinculados = 0;

    for (const tabla of TABLAS) {
      const { data: filas, error } = await supabaseAdmin.from(tabla.nombre).select('*');
      if (error) throw error;

      for (const fila of filas) {
        try {
          if (fila.google_event_id) {
            idsVinculados.add(fila.google_event_id);
            if (googleById.has(fila.google_event_id)) {
              // PUT (reemplazo completo) en vez de PATCH: Google Calendar rechaza con PATCH
              // el cambio de un evento "todo el día" a uno con hora específica (o viceversa).
              await googleCalendarFetch(`/calendars/primary/events/${fila.google_event_id}`, {
                method: 'PUT',
                body: JSON.stringify(tabla.aGoogle(fila)),
              });
              actualizadosEnGoogle++;
            } else {
              await supabaseAdmin.from(tabla.nombre).update({ google_event_id: null }).eq('id', fila.id);
              desvinculados++;
            }
          } else {
            const creado = await googleCalendarFetch('/calendars/primary/events', {
              method: 'POST',
              body: JSON.stringify(tabla.aGoogle(fila)),
            });
            await supabaseAdmin.from(tabla.nombre).update({ google_event_id: creado.id }).eq('id', fila.id);
            idsVinculados.add(creado.id);
            creadosEnGoogle++;
          }
        } catch (errFila) {
          // una fila con datos raros no debe tumbar la sincronización completa
          console.error(`Error sincronizando ${tabla.nombre} #${fila.id}:`, errFila.message);
        }
      }
    }

    // Eventos creados directo en Google (no ligados a ningún evento ni entrada de agenda):
    // se importan como una entrada nueva de agenda, que es la forma más ligera del calendario.
    // Solo los creados desde que se conectó Google Calendar — nunca el historial de
    // antes de conectar, para no inundar la app con todo lo que ya hubiera en Google.
    for (const ev of googleEvents) {
      if (ev.status === 'cancelled' || idsVinculados.has(ev.id)) continue;
      if (!ev.created || new Date(ev.created) < conectadoDesde) continue;
      const rango = rangoDeGoogle(ev);
      if (!rango) continue;
      await supabaseAdmin.from('agenda').insert({
        id: Date.now() + Math.floor(Math.random() * 1000),
        titulo: ev.summary || '(Evento de Google Calendar)',
        notas: ev.description || null,
        color: '#3b82f6',
        ...rango,
        google_event_id: ev.id,
      });
      creadosEnApp++;
    }

    res.status(200).json({ ok: true, creadosEnGoogle, actualizadosEnGoogle, creadosEnApp, desvinculados });
  } catch (err) {
    if (err.code === 'NOT_CONNECTED') {
      res.status(409).json({ error: 'not_connected' });
      return;
    }
    res.status(500).json({ error: err.message || 'Error al sincronizar con Google Calendar.' });
  }
}
