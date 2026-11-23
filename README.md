# Central Logística

Plataforma web para organizar giras y eventos: calendario con plan logístico, giras con mapa de ruta, eventos, gastos con gráficas, equipo, checklist, aerolíneas y salones. Incluye inicio de sesión, roles con permisos por sección y registro de actividad.

Hecha con React + Vite, Supabase (base de datos y cuentas) y Vercel (publicación).

## Qué trae

- **Calendario** mensual con eventos, agenda, hoteles, vuelos, traslados y notas por día. Sincronización opcional con Google Calendar.
- **Giras** con fechas, ciudades y mini mapa de la ruta (México y EUA).
- **Eventos** agrupados por mes, con equipo asignado y gasto por evento.
- **Gastos** por categoría, por gira y por ciudad, en MXN o USD, con comprobantes.
- **Equipo** con ficha de cada persona (contacto, pasaporte, visa, documentos).
- **Checklist** por evento, **Aerolíneas** y **Salones**.
- **Cuentas y roles:** una cuenta Admin, más Editor y Viewer. La admin decide qué sección puede ver o editar cada rol. Los datos personales del equipo solo los ve la admin.
- **Actividad:** cada vez que alguien agrega, edita o borra algo, queda anotado y la admin recibe un aviso en vivo.

Los permisos se cumplen en la base de datos (Row Level Security), no solo en la pantalla.

## Instalación

Necesitas cuentas gratis en [Supabase](https://supabase.com), [Vercel](https://vercel.com) y [GitHub](https://github.com).

### Paso 1. Copia el proyecto

Haz un *fork* de este repositorio (botón **Fork** arriba a la derecha), o usa **Use this template**.

### Paso 2. Crea la base de datos

1. En Supabase crea un proyecto nuevo.
2. Entra a **SQL Editor**, pega todo el contenido de [`supabase/instalacion.sql`](supabase/instalacion.sql) y dale **Run**.

### Paso 3. Crea tu cuenta de admin

1. En Supabase ve a **Authentication > Users > Add user** y crea tu usuario con correo y contraseña (marca *Auto Confirm User*).
2. En **SQL Editor** corre esto, con tu correo:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"acceso":"admin"}',
    raw_user_meta_data = raw_user_meta_data || '{"nombre":"Tu Nombre"}'
where email = 'tu-correo@ejemplo.com';
```

Las demás cuentas (Editor y Viewer) las creas después desde la app, en la sección **Usuarios**.

Recomendado: en **Authentication > Sign In / Providers** desactiva *Allow new users to sign up*, para que solo entre quien tú des de alta. (Aunque lo dejes abierto, una cuenta sin rol asignado no ve nada.)

### Paso 4. Publica en Vercel

1. En Vercel, **Add New > Project** e importa tu copia del repositorio.
2. En **Environment Variables** agrega las de [`.env.example`](.env.example), con los datos de **Supabase > Project Settings > API**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (es secreta: nunca la pongas con prefijo `VITE_` ni la subas al repositorio)
3. Dale **Deploy**. Entra con la cuenta del paso 3.

### Paso 5 (opcional). Google Calendar

Crea credenciales OAuth en [Google Cloud Console](https://console.cloud.google.com) (API de Google Calendar), con la dirección de redirección `https://TU-DOMINIO.vercel.app/api/google/callback`, y agrega en Vercel `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`. Luego, en el Calendario de la app, usa **Conectar Google Calendar**.

### Paso 6 (opcional). Que Supabase no se duerma

Los proyectos gratis de Supabase se pausan tras 7 días sin uso. Este repositorio trae una tarea automática de GitHub que la despierta cada 3 días. Para activarla, en tu repositorio ve a **Settings > Secrets and variables > Actions** y agrega:
- `KEEPALIVE_SUPABASE_URL` (tu `VITE_SUPABASE_URL`)
- `KEEPALIVE_SUPABASE_ANON_KEY` (tu `VITE_SUPABASE_ANON_KEY`)

## Personalízala

- **Nombre:** cámbialo en [`src/marca.js`](src/marca.js).
- **Logo:** reemplaza [`src/assets/brand/logo.svg`](src/assets/brand/logo.svg) y [`public/favicon.svg`](public/favicon.svg).
- **Colores:** están al inicio de [`src/index.css`](src/index.css), en `:root`.

## Trabajar en tu computadora

```bash
npm install
cp .env.example .env.local   # y llena los valores
npm run dev
```

Las funciones del servidor (`/api`: cuentas y Google Calendar) solo corren en Vercel o con `vercel dev`.

## Licencia

MIT. Úsala, cópiala y cámbiala como quieras.
