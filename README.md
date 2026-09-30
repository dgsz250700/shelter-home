# El refugio de Laura

Juego educativo en Next.js, con refugio 2D ilustrado, Supabase y acceso directo para Laura. Solo Admin pide usuario y contraseña.

## Estado

Las cuatro áreas están implementadas: acceso y persistencia, motor adaptativo, misión de diez desafíos con rescates y panel de tutor. La revisión visual incluye habitación 2D, gatos interactivos, racha con calendario y ejercicios grandes.

En `/tutor`, el usuario `admin` usa la contraseña existente. Desde «Nueva habilidad» se crean prácticas con enunciados, respuestas y pistas propias; también se editan prioridades, niveles, activación y notas. Las tres familias originales generan ejercicios automáticamente. Las prácticas personalizadas admiten números, fracciones y coeficientes.

Producción: https://animals-dani.vercel.app

## Instalación y despliegue

Requisitos: Node.js 22+, Corepack/pnpm, una cuenta de GitHub, un proyecto Supabase nuevo y un proyecto Vercel propio. Copiar `.env.example` a `.env.local` y completar las claves del proyecto. La clave de servicio es exclusiva del servidor. El script de instalación aplica las migraciones y el seed, crea los usuarios con contraseñas aleatorias, guarda las credenciales en un archivo local excluido de Git y configura las variables de producción en el proyecto Vercel enlazado.

```sh
pnpm install --frozen-lockfile
pnpm exec supabase login
pnpm exec vercel login
pnpm exec vercel link
pnpm setup:doctor
pnpm setup:daniela
```

Para entregar el proyecto sin experiencia técnica, abre [DANIELA_SETUP.md](DANIELA_SETUP.md). Daniela puede copiar un único prompt desde [DANIELA_AGENT_PROMPT.md](DANIELA_AGENT_PROMPT.md) en Codex o Claude y el agente ejecutará el proceso, deteniéndose solo en logins, CAPTCHA, costos o secretos. Usa un proyecto Supabase exclusivo para este refugio; no compartas una base usada por otras aplicaciones.

Para desarrollar: `pnpm dev`.

Las migraciones están en `supabase/migrations` y el contenido inicial en `supabase/seed.sql`. La creación de los dos usuarios Auth es administrativa; no hay registro público. El generador de credenciales está en `lib/data/provision.mjs`.

## Decisiones de acceso

Todos los visitantes de la URL usan el mismo refugio de Laura, por petición expresa. Sus credenciales permanecen en el servidor y sus consultas se ejecutan como estudiante, sujetas a RLS. Admin conserva sesión por cookies y validación de rol en el servidor. No se envían claves privadas al navegador.

## Referencias de implementación

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js App Router](https://nextjs.org/docs/app)
- La escena actual usa ilustraciones WebP originales, recortes animados y CSS; los componentes 3D anteriores no se cargan en la aplicación.

## Admin: preparar material

1. Abre Nueva habilidad o edita una existente y selecciona preguntas propias.
2. En PDF e imágenes, abre tu archivo, elige página y recorte y pulsa Añadir como pregunta con imagen. Completa respuesta, nivel y tres pistas; guarda la habilidad.
3. Crear con IA acepta un prompt y, opcionalmente, texto extraído del PDF. Utiliza `DEEPSEEK_API_KEY` exclusivamente en el servidor; usa la facturación de esa cuenta. Revisa los borradores antes de guardar. `DEEPSEEK_MODEL` permite elegir el modelo (predeterminado `deepseek-v4-flash`).

El calendario permite un solo tema diario. Si ya empezó una práctica, el tema permanece ese día mientras esté activo. Nivel inicial también define el mínimo; nivel fijo impide la adaptación. PDF original no se almacena: se guardan las imágenes de preguntas seleccionadas. Los cuidados de los animales no suman respuestas académicas.

## Numa · tutor con memoria

DeepSeek explica el ejercicio actual en español, ofrece pistas y usa los últimos 200 intentos (20 por habilidad en el resumen). La memoria pedagógica y la conversación persisten en Supabase. Laura puede editar o vaciar su memoria y el profe puede consultar conversaciones y generar un informe. No se recopilan datos de navegación ni información personal adicional. La ayuda IA se registra como asistencia al calcular dominio. Los tiempos nuevos excluyen pestañas ocultas y espera de comprobación; los antiguos quedan fuera del análisis temporal IA.

Configura `DEEPSEEK_API_KEY` como secreto de Vercel y aplica `20260909200656_ai_tutor_memory.sql`. Nunca uses una variable NEXT_PUBLIC para la clave. Cada usuario tiene un máximo de 100 consultas en 24 horas, 6 por minuto y una solicitud simultánea. Los límites se aplican en Postgres; los ejercicios siguen funcionando sin IA. La API no evalúa respuestas ni modifica recompensas. El acceso directo de Laura sigue siendo compartido: quien abra el refugio accede a su conversación.

## Laboratorio del profe e ilustraciones (septiembre de 2026)

El panel se divide en Progreso, Laboratorio IA y Habilidades. El laboratorio toma evidencia de la habilidad elegida, permite elegir estrategia y objetivo pedagógico, genera preguntas y las pasa por una segunda revisión matemática. Puedes probar las respuestas sin registrar intentos de Laura y editar cada pregunta antes de activar la práctica. Los borradores generados se conservan en el navegador hasta guardarlos; las ediciones del formulario requieren pulsar Guardar. El catálogo permite buscar y filtrar prácticas activas o borradores. El análisis de Numa admite preguntas concretas, usa el modo de razonamiento para revisar ejemplos y permite descargar el informe.

Arte original generado con la herramienta integrada de OpenAI, optimizado como WebP local. La herramienta no permite seleccionar ni confirmar un modelo llamado «2.5». Archivos y prompts completos:

- `public/art/refuge-courtyard.webp` y `refuge-courtyard.webp.json`: patio del refugio, 1536 × 1024.
- `public/art/numa.webp` y `numa.webp.json`: Numa con transparencia.
- `components/scene/cat-figure.tsx`: gatos en SVG dibujados según tamaño, cuerpo, pelaje, cola, orejas y personalidad del catálogo.

Las animaciones de cuidado, gatos y ambiente respetan la preferencia de movimiento reducido del sistema y el control dentro del refugio. No se ha medido 60 FPS en un móvil físico.

## Despejes simbólicos y comedor diario

Los despejes usan 16 fórmulas de física, química y matemáticas de octavo, repartidas en cuatro niveles. Laura construye el lado despejado con un teclado de letras y operaciones: no sustituye números. La corrección compara expresiones racionales de forma exacta mediante polinomios; admite productos implícitos y expresiones equivalentes. Se distinguen mayúsculas y minúsculas. Este alcance admite letras de un carácter, enteros pequeños, +, −, ×, / y paréntesis; no raíces, potencias ni funciones. El editor del profe y la generación IA admiten el formato «Expresión con letras».

Los gatos son más pequeños y tienen colores fantásticos estables; al tocarlos aparece nombre, personalidad e historia. El comedor se desbloquea por una misión completada en la fecha local de hoy (Colombia), comprobada también por el servidor. Mañana vuelve a cerrarse hasta terminar los retos. Los aciertos intermedios dan mantas y afecto, sin entregar comida; los antiguos contadores se conservan como historial.

## Seguimiento propio y fiabilidad

Admin → **Uso y señales** muestra visitas, tiempo activo aproximado, pistas, edición agregada, consultas IA, archivos abiertos, controles explorados, salidas de misión y errores recuperables. Permite separar refugio/profe, incluir pruebas y exportar JSON. El estado IA muestra solicitudes completadas, fallidas, pendientes y sin cierre; los tiempos solo se calculan donde fueron medidos.

El refugio usa una identidad compartida: no demuestra que cada acción sea de Laura. No se capturan contraseñas, teclas o textos de edición, pantallas, contenido PDF adicional, IP ni navegación externa. Numa usa estas señales como observaciones, no como diagnósticos ni medidas de inteligencia. El tiempo activo deja de acumularse al ocultar la página o después de 90 segundos sin interacción.

La cola local conserva hasta 1.000 eventos por visita, durante hasta 7 días; reintenta con identificadores estables. El almacenamiento bloqueado permite envío en memoria mientras la pestaña siga abierta. Cierre forzado, limpieza del navegador, falta prolongada de conexión o superar la cola pueden perder eventos: no es captura absoluta. El panel consulta 14 días y hasta 5.000 eventos, mostrando si la muestra está limitada. La limpieza de eventos de más de 90 días se ejecuta durante la ingestión; sin tráfico se limpia al siguiente envío. Los intentos y conversaciones tienen su historial independiente. Las pruebas locales y vistas previas autenticadas se excluyen del uso ordinario; practicar realmente en el refugio sigue guardando intentos académicos en la cuenta compartida.

Migraciones `20260909211831`, `20260909213631` y `20260909214730`: eventos con RLS, guardados transaccionales, control de concurrencia, memoria con protección de ediciones manuales y procedencia de pruebas. `supabase/tests/atomic-learning.sql` y `atomic-coach.sql` verifican en una transacción revertida; ejecutarlas como administrador en un proyecto con seed. No dejan filas académicas de prueba.

## Interfaz concentrada y cuidado diario

La estudiante ve el refugio, sus gatos y un reto de diez preguntas. Las pistas permanecen; Numa solo está disponible en herramientas del profe. El botón del reto se cierra al completarlo ese día. La transacción entrega comida o una caja a Milo una sola vez, y rescata un gato al alcanzar 5, 10, 15… días consecutivos. Los gatos existentes permanecen. Energía: 100 al completar; tras días omitidos desciende suavemente hasta 55 y se recupera al completar.

Admin mantiene Progreso / Laboratorio IA / Habilidades. El antiguo panel de uso no se presenta; la telemetría sigue guardándose. La semana muestra intentos reales y niveles alcanzados, y la comparación usa días de la misma microhabilidad con niveles comunes. El laboratorio guarda el tema de clase, sugiere microhabilidades y conserva PDF/imágenes, preguntas propias y revisión antes de publicar.

Los niveles visibles 0–3 se almacenan como 1–4 para conservar compatibilidad. Los generadores de despeje usan veinte fórmulas y constantes enteras 10/25, sin decimales. El tema filtra familias de fórmulas cuando coincide con gases, termodinámica, Arquímedes, presión/densidad o matemáticas; otros temas se preparan con preguntas propias o IA. Una pregunta de repaso conserva su dificultad. Un banco propio sin todos los niveles usa los disponibles: no se inventan niveles que el contenido no tiene.

`supabase/tests/daily-care.sql` verifica reglas de racha y cuidado con rollback. No borra progreso real ni deja filas de prueba.

## Bancos mixtos y Drive
Admin permite combinar abiertas, opción múltiple, verdadero/falso y parejas. Las imágenes se adjuntan desde PDF o archivo y pueden acompañar cualquier formato. El banco se guarda desactivado para revisión; las nuevas sesiones mezclan sus preguntas por nivel.

La conexión privada de Drive necesita dos variables de servidor y compartir una carpeta como lector: ver [DRIVE_SETUP.md](DRIVE_SETUP.md). No está conectada hasta configurar esas credenciales; carga local de PDF disponible sin Google. La importación exige revisión: no hay OCR automático de escaneos ni sincronización desatendida.

Rescates por días logrados acumulados: 1, 3, 4, 5, 6, 7, 8, 9 y 10 (nueve gatos). Los gatos anteriores que todavía no corresponden al calendario se conservan en el historial y vuelven a mostrarse al alcanzar su día.
