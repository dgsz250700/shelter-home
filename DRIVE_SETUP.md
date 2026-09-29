# Banco de PDF de Daniela en Google Drive

## Flujo del profesor

Admin → **Banco de Drive** → Conectar mi cuenta de Google → elegir la cuenta de Daniela → pegar el enlace de la carpeta → Importar y revisar → Activar.

Cada PDF se convierte en una microhabilidad con el nombre del archivo. Las prácticas nuevas priorizan los bancos activos de Drive: **una microhabilidad por día, exactamente diez preguntas**, con niveles internos 1,1,1,2,2,2,3,3,4,4 (en pantalla 0–3). La selección se mezcla por sesión sin repetir preguntas cuando se cumplen los mínimos. Un tema ya empezado ese día se conserva. Se mantienen las tres oportunidades diarias existentes.

## Modo carpeta compartida por enlace (activo)

Refugio lee la carpeta **Banco Preguntas Refugio** sin credenciales de Google: `GOOGLE_DRIVE_PUBLIC_FOLDER_ID` en Vercel (solo servidor). La carpeta debe estar compartida como «Cualquier persona con el enlace · Lector». Admin → Banco de Drive muestra los PDF; Importar y revisar → Activar sigue igual (requiere `DEEPSEEK_API_KEY`).

- Cualquiera con el enlace puede ver las preguntas y el solucionario: no compartir el enlace con Laura.
- Usa la vista embebida y la descarga públicas de Google, no documentadas; si dejan de funcionar, la pantalla muestra un error y se puede pasar a OAuth o cuenta de servicio.
- Solo se listan PDF de la carpeta (no subcarpetas); la carpeta se cambia desde Vercel, no desde la app. Si hay cuenta de servicio configurada, esta tiene prioridad.

## Activación inicial de Google (una vez, administrador técnico)

1. En Google Cloud habilitar **Google Drive API**. Configurar Google Auth Platform y un cliente OAuth **Web application**. Añadir Daniela como usuaria de prueba si el proyecto está en Testing. Redirect URI exacta: `https://animals-dani.vercel.app/api/tutor/drive/callback`.
2. Guardar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI` en Vercel, solo servidor; redesplegar.
3. Daniela autoriza dentro de Refugio. No necesita compartir su contraseña ni hacer pública su carpeta.

El scope `drive.readonly` permite lectura de Drive en Google; la aplicación restringe listados y descargas a la carpeta elegida. Los refresh tokens se cifran con AES-256-GCM y se guardan en `drive_connections`, sin permisos para `anon` ni `authenticated`. La clave se deriva de la service-role del servidor: al rotarla, hay que reconectar Google. OAuth usa state, PKCE y sesión tutor. En modo Testing de Google, el consentimiento puede caducar a los siete días: pasar la aplicación a producción según las reglas de Google para uso personal.

**Estado de esta entrega:** código y migración implementados; no hay credenciales OAuth de Google en el entorno local. No presentar la cuenta como conectada hasta completar los pasos anteriores. La sesión de Supabase no concede acceso a Drive.

## Preparar un PDF

- Un archivo por microhabilidad, texto seleccionable, hasta 15 MB y 30 páginas/30.000 caracteres.
- Encabezados **Nivel 0**, **Nivel 1**, **Nivel 2**, **Nivel 3**. También se reconocen 1–4 si el documento usa esa escala.
- Mínimo 3, 3, 2 y 2 preguntas respectivamente. Hasta 15 por nivel, 60 por banco.
- Incluir respuestas/solucionario. Se importan abiertas, opciones, verdadero/falso y parejas.
- DeepSeek transcribe por nivel durante la importación; no genera preguntas durante la práctica. Los enunciados deben existir literalmente en el texto extraído y el profesor revisa el resultado antes de publicarlo. La validación de formato no sustituye la revisión pedagógica.
- Escaneos y ejercicios dependientes de imágenes necesitan la importación manual del estudio: no se simula OCR ni extracción automática de diagramas.

Actualizar archivos consulta Drive. Reimportar y activar reemplaza atómicamente el mismo banco, sin duplicar la habilidad; se bloquea si Laura tiene una sesión de hoy abierta con ella. Si el PDF cambia durante la revisión, se pide reimportar. No se borran bancos al eliminar un archivo en Drive; se desactivan desde Habilidades. No hay sincronización ni publicación desatendida: un PDF modificado requiere revisión.

## Compatibilidad con cuenta de servicio

Sigue disponible `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` + `GOOGLE_DRIVE_FOLDER_ID`: compartir la carpeta como lector con esa cuenta. Esta opción fija la carpeta desde el servidor y tiene prioridad si está configurada; no usa OAuth personal.

Referencias: [OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [scopes de Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [permisos y RLS de Supabase](https://supabase.com/docs/guides/api/securing-your-api).
