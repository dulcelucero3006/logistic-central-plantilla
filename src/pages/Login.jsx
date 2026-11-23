import { useState } from 'react';
import { useSesion } from '../lib/sesion';
import logoMark from '../assets/brand/logo.svg';
import { MARCA } from '../marca';

const ip = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconMail = () => (<svg {...ip}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>);
const IconLock = () => (<svg {...ip}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>);
const IconOjo = ({ tachado }) => (
  <svg {...ip}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {tachado && <path d="M4 4l16 16" />}
  </svg>
);

function traducirError(msg = '') {
  if (/invalid login credentials/i.test(msg)) return 'El correo o la contraseña no coinciden.';
  if (/email not confirmed/i.test(msg)) return 'Esta cuenta todavía no está activada.';
  if (/rate limit|too many/i.test(msg)) return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
  if (/fetch|network/i.test(msg)) return 'No hay conexión. Revisa tu internet.';
  return 'No se pudo entrar. Intenta de nuevo.';
}

// Marco compartido por la pantalla de entrada y la de "sin acceso".
export function MarcoEntrada({ children }) {
  return (
    <div className="login-pantalla">
      <div className="login-tarjeta">
        <div className="login-lado">
          <span className="login-logo"><img src={logoMark} alt="" /></span>
          <div className="login-marca"><span>{MARCA.linea1}</span><span>{MARCA.linea2}</span></div>
          <p className="login-lema">Giras, eventos, gastos y equipo en un solo lugar.</p>
        </div>
        <div className="login-form">{children}</div>
      </div>
    </div>
  );
}

export default function Login() {
  const { entrar } = useSesion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Escribe tu correo y tu contraseña.'); return; }
    setEnviando(true);
    const { error: err } = await entrar(email, password);
    setEnviando(false);
    if (err) setError(traducirError(err.message));
  }

  return (
    <MarcoEntrada>
      <h1 className="login-titulo">Hola de nuevo</h1>
      <p className="login-sub">Inicia sesión para continuar.</p>
      <form onSubmit={onSubmit} noValidate>
        <label className="form-label" htmlFor="login-email">Correo</label>
        <div className="login-campo">
          <span className="login-campo-icono"><IconMail /></span>
          <input id="login-email" className="form-input" type="email" autoComplete="username" autoFocus
            value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
        </div>
        <label className="form-label" htmlFor="login-pass" style={{ marginTop: 14 }}>Contraseña</label>
        <div className="login-campo">
          <span className="login-campo-icono"><IconLock /></span>
          <input id="login-pass" className="form-input" type={ver ? 'text' : 'password'} autoComplete="current-password"
            value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" />
          <button type="button" className="login-ver" onClick={() => setVer(v => !v)} title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <IconOjo tachado={ver} />
          </button>
        </div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-primary login-boton" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="login-ayuda">¿Olvidaste tu contraseña? Pide a quien administra la app que te asigne una nueva.</p>
      </form>
    </MarcoEntrada>
  );
}
