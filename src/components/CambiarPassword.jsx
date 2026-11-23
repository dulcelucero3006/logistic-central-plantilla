import { useState } from 'react';
import { useSesion } from '../lib/sesion';

// Ventanita para que la persona con sesión abierta cambie su propia contraseña.
export default function CambiarPassword({ onCerrar }) {
  const { cambiarPassword } = useSesion();
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (nueva.length < 8) { setError('Usa al menos 8 caracteres.'); return; }
    if (nueva !== repetir) { setError('Las dos contraseñas no son iguales.'); return; }
    setGuardando(true);
    const { error: err } = await cambiarPassword(nueva);
    setGuardando(false);
    if (err) {
      setError(/different|same/i.test(err.message) ? 'La nueva contraseña debe ser distinta a la actual.' : 'No se pudo cambiar. Intenta de nuevo.');
      return;
    }
    setListo(true);
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <form className="modal" style={{ maxWidth: 420 }} onSubmit={guardar}>
        <div className="modal-header">
          <span className="modal-title">Cambiar mi contraseña</span>
          <button type="button" className="close-btn" onClick={onCerrar}>×</button>
        </div>
        <div className="modal-body">
          {listo ? (
            <p style={{ margin: 0 }}>Listo, tu contraseña quedó cambiada. La próxima vez entra con la nueva.</p>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <input className="form-input" type="password" autoComplete="new-password" autoFocus value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Mínimo 8 caracteres" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Repítela</label>
                <input className="form-input" type="password" autoComplete="new-password" value={repetir} onChange={e => setRepetir(e.target.value)} />
              </div>
              {error && <div className="login-error" role="alert">{error}</div>}
            </>
          )}
        </div>
        <div className="modal-footer">
          {listo ? (
            <button type="button" className="btn btn-primary" onClick={onCerrar}>Cerrar</button>
          ) : (
            <>
              <button type="button" className="btn btn-outline" onClick={onCerrar}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
