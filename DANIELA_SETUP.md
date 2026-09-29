# Refugio listo para Daniela

Esta guía deja Refugio en cuentas propias de Daniela y preparado para desarrollar con Codex o Claude. No necesitas saber de bases de datos ni despliegues: el agente hace el trabajo técnico y solo te pide ayuda para iniciar sesión, crear proyectos o copiar claves privadas.

## La versión corta

1. Acepta la invitación al repositorio en GitHub.
2. Clona el repositorio o ábrelo como proyecto local en Codex/Claude.
3. Abre [DANIELA_AGENT_PROMPT.md](DANIELA_AGENT_PROMPT.md), copia el bloque completo y pégalo en el chat del agente.
4. Sigue únicamente las pausas que el agente marque como “paso humano”.

Al terminar tendrás:

- Refugio funcionando localmente con `pnpm dev`;
- un Supabase exclusivo bajo tu cuenta;
- un Vercel exclusivo conectado a tu GitHub;
- producción online;
- acceso de Laura y acceso `maracuya` del tutor;
- verificaciones automáticas para seguir vibecodeando sin romper producción.

## Qué te pedirá el agente

### 1. Iniciar sesión

El agente abrirá o ejecutará los inicios de sesión de Supabase y Vercel. Tú completas email, contraseña, autorización del navegador o CAPTCHA. Nunca pegues contraseñas dentro del chat.

### 2. Crear un Supabase nuevo

El proyecto debe ser nuevo y usarse solo para Refugio. No uses `DAN GPT` ni el project ref `pwcvskguqyhbhlwnsmmy`: ese proyecto contiene otras aplicaciones.

Guarda la contraseña de la base cuando Supabase la muestre. El agente te indicará dónde poner, de forma local, estos cinco valores:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key)
- `SUPABASE_SERVICE_ROLE_KEY` (secret/service-role key)

La contraseña de la base permanece solo en el equipo local. La clave privada se configura como secreto del servidor en Vercel; nunca se convierte en una variable `NEXT_PUBLIC_*`, se muestra en el chat ni se guarda en Git.

### 3. Crear un Vercel nuevo

Importa el repositorio desde tu GitHub y crea un proyecto Vercel propio. El agente lo enlazará localmente y comprobará `.vercel/project.json` antes de tocar la base.

## Lo que hará el agente

El flujo técnico está automatizado y siempre sigue este orden:

```text
pnpm install --frozen-lockfile
        ↓
login y enlace de Vercel/Supabase
        ↓
pnpm setup:doctor
        ↓
pnpm setup:daniela
        ↓
prueba del navegador + logs de producción
        ↓
pnpm dev
```

`pnpm setup:daniela` aplica migraciones y datos iniciales, crea o recupera los usuarios de forma reanudable, verifica RLS, sincroniza las variables necesarias con Vercel, ejecuta pruebas/build y despliega producción. Si se corta internet, el agente puede repetir el comando sin crear usuarios duplicados.

## Credenciales que recibirás

El instalador crea dos usuarios y guarda sus contraseñas en `.env.credentials.json`:

- `student`: lo usa el servidor para abrir el refugio de Laura;
- `tutor`: permite entrar por `/auth`; en la pantalla se escribe el usuario `maracuya` y la contraseña del tutor.

Ese archivo está fuera de Git. Al finalizar, guarda ambas credenciales en tu gestor de contraseñas. No compartas el archivo por chat, correo ni commits.

## Tu rutina para vibecodear

Abre el repositorio en Codex o Claude y describe el cambio que quieres. Antes de aceptar un cambio importante, pídele al agente:

```text
Implementa el cambio, ejecuta pnpm verify, prueba la pantalla afectada en navegador y no despliegues si hay errores.
```

Comandos útiles:

```sh
pnpm setup:doctor   # explica qué falta, sin mostrar secretos
pnpm dev            # abre el entorno local
pnpm verify         # tipos + lint + pruebas + build
pnpm setup:verify   # comprueba login, datos y aislamiento RLS
```

## Opcionales

- IA de Numa: añade `DEEPSEEK_API_KEY` como secreto de producción. Sin esa clave, el refugio y los ejercicios normales siguen funcionando.
- Google Drive: el agente puede seguir [DRIVE_SETUP.md](DRIVE_SETUP.md). El callback debe usar el dominio nuevo de Daniela.
- Previews: usa otro Supabase para previews. No conectes ramas experimentales a la base de producción con la clave privada.

## Si algo sale mal

Pega esto al agente:

```text
Ejecuta pnpm setup:doctor. Diagnostica el primer paso rojo, corrígelo sin revelar secretos, ejecuta pnpm setup:verify y pnpm verify, y después comprueba producción y logs de Vercel.
```

Si la portada queda en `Abriendo el refugio…`, el agente debe revisar primero Vercel Runtime Logs y luego comprobar que el usuario estudiante puede leer su fila de `public.profiles`. La migración `20260925151338_restore_profile_read_policies.sql` protege esa relación.
