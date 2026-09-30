---
name: Refugio
description: Refugio 2D ilustrado para practicar y cuidar gatos.
colors:
  ink: "#17394a"
  muted: "#496477"
  cream: "#f7f7f0"
  paper: "#fffefa"
  teal: "#006e75"
  coral: "#d64724"
  yellow: "#ffc739"
  line: "#d6dfe0"
  primary: "#2448aa"
  primary-hover: "#183989"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Nunito, sans-serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 800
    lineHeight: 1.3
  body:
    fontFamily: "Nunito, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Nunito, sans-serif"
    fontSize: "14px"
    fontWeight: 700
rounded:
  control: "9px"
  secondary: "10px"
  panel: "12px"
  container: "14px"
  scene: "18px"
spacing:
  compact: "12px"
  regular: "16px"
  roomy: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.panel}"
    padding: "15px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.secondary}"
    padding: "10px 16px"
  admin-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px"
---

# Design System: Refugio

## Overview

**Creative North Star: "Refugio · Centro de rescate"**

Este registro actualiza la dirección ya fijada: un refugio 2D colorido, ilustrado y divertido para Laura. Turquesa, naranja y amarillo solar construyen un centro de animales con enfermería, adopción, transportadoras, patio y comedor. Los gatos pequeños, con colores naturales, son personajes interactivos; el lugar conserva su carácter de rescate, sin sofá ni decoración de casa.

El arte original local mantiene una ilustración pictórica con contornos suaves. Numa, gato naranja con gafas cobalto y cuaderno, acompaña el aprendizaje en español. El espacio del profe comparte el personaje y la tipografía, con papel claro e índigo para leer, preparar y revisar contenido. Es un refinamiento del mundo existente, no una nueva propuesta visual.

**Key Characteristics:**
- Refugio 2D saturado con gatos ilustrados pequeños y colores naturales.
- Nunito redondeada, texto oscuro y superficies claras para aprender.
- Numa acompaña la preparación del profe; las pistas de Laura son deterministas.
- Movimiento de respuesta y ambiente con reducción disponible.

## Colors

### Primary
El índigo de acción (`primary`) y su estado de hover ordenan los controles de estudio y administración. El turquesa (`teal`) conserva el vínculo con el refugio.

### Secondary
El amarillo solar (`yellow`) y el naranja (`coral`) pertenecen al mundo cálido de animales y cuidado. La invitación de misión usa una variante amarilla sobre fondo azul profundo.

### Neutral
`ink` sostiene la lectura; `muted` aporta contexto. `cream` es el fondo general, `paper` el papel de ejercicio y `white` las superficies de trabajo. `line` separa contenido sin añadir peso visual.

**The Papel Legible Rule.** Los textos de aprendizaje y los campos editables viven sobre superficies claras; las ilustraciones son escenario o personaje acompañante.

## Typography

Nunito local, con respaldo sans-serif, une títulos y cuerpo. El cuerpo regular contrasta con títulos y acciones gruesos. Los archivos servidos son `nunito-regular.ttf` y `nunito-bold.ttf`; no se presupone una familia variable por declarar varios pesos.

La ecuación usa el rol display; los enunciados largos tienen un tamaño menor (`clamp(23px, 3vw, 30px)`). Los encabezados principales del profe bajan de 38px a 28px en móvil. Las respuestas de Numa usan 15px e interlineado 1.7; los informes amplían el interlineado a 1.85 y limitan el ancho de lectura. Las cifras de progreso usan números tabulares.

**The Pregunta Clara Rule.** La pregunta domina su tarjeta; la ayuda, las instrucciones y el estado conservan una jerarquía secundaria.

## Layout

El contenedor del juego llega a 1560px, con márgenes laterales de 24px; en móvil se reducen a 10px. El refugio ilustrado usa la altura disponible (`calc(100svh - 210px)`, mínimo 480px, máximo 900px). En móvil ocupa 65svh, con mínimo 410px y máximo 700px. El paisaje se recorta con `object-fit: cover`.

La práctica usa una capa fija desplazable, centrada en escritorio y alineada arriba en móvil, con tarjeta de hasta 600px. El refugio queda atenuado y sin interacción mientras se responde. El área del profe llega a 1240px y reduce sus márgenes de 32px a 16px. Los cambios principales ocurren a 900px y 760px; los formularios pasan a una columna en móvil. La composición concreta del profe se conserva en `.impeccable/surfaces/tutor.md`.

## Elevation & Depth

Las capas del paisaje, las sombras suaves de gatos y la luz aportan profundidad a un mundo 2D. Los paneles de trabajo se apoyan principalmente en tonos claros y bordes. El botón primario usa sombra difusa (`0 5px 12px #1a348523`); el ejercicio, una sombra más amplia (`0 20px 64px #09273d55`) y el fondo atenuado. No son sombras duras desplazadas como lenguaje general.

El ambiente desplaza partículas, los gatos respiran y reaccionan, la comida entra y los mensajes y preguntas aparecen con movimientos cortos. Las transiciones usan transformaciones, opacidad y también cambios de color, sombra o filtro según el elemento. Tanto la preferencia del sistema como el control de movimiento reducido desactivan animaciones y transiciones. No se ha medido una garantía de FPS.

## Shapes

Las esquinas suaves distinguen controles compactos, paneles y escenario según la escala del frontmatter. Los campos tienen borde visible; la navegación activa tiene borde inferior y fondo azul claro. Las siluetas orgánicas pertenecen a animales y arte del refugio. Los iconos funcionales son SVG acompañados por texto o etiqueta accesible.

## Components

- **Botones:** primario índigo, secundario blanco con borde y acciones discretas. La base táctil es 48px; el foco visible usa contorno cobalto de 3px con separación de 3px. Los controles deshabilitados bajan su opacidad.
- **Campos:** etiquetas visibles, texto de 16px y borde azul grisáceo en admin. Textareas conservan espacio de lectura y edición.
- **Navegación:** pestañas con texto e icono; el estado actual se distingue mediante fondo y borde inferior. En móvil las tres opciones del profe comparten el ancho.
- **Estados de habilidad:** etiquetas compactas Activa/Pausada con texto explícito y tonos diferenciados.
- **Paneles y preguntas:** papel claro, bordes suaves, preguntas desplegables y vista de ensayo separada con fondo cálido.
- **Numa:** imagen transparente local, conversación en párrafos legibles y versión compacta dentro del ejercicio. La memoria tiene acceso explícito para revisión.
- **Arte del refugio:** `public/art/refuge-courtyard.webp` y `numa.webp`; cada archivo tiene un JSON adyacente con prompt y procedencia. El modelo exacto no está expuesto por la herramienta integrada y no se atribuye a una versión nominal. Los gatos del refugio se dibujan en SVG a partir de sus rasgos y personalidad (`components/scene/cat-figure.tsx`).

## Do's and Don'ts

### Do:
- **Do** conservar el refugio 2D ilustrado, colorido y protagonizado por gatos.
- **Do** mantener texto de aprendizaje y edición sobre papel legible.
- **Do** respetar la reducción de movimiento del sistema y de la interfaz.
- **Do** usar estados explícitos para carga, error, guardado y ausencia de datos.

### Don't:
- **Don't** convertir el refugio en una sala doméstica con sofá.
- **Don't** dejar interactivo el escenario mientras la pregunta ocupa la capa central.
- **Don't** representar progreso inventado como evidencia de aprendizaje.

No canonizado: los valores heredados de estilos que quedan sobrescritos, posibles defectos de componentes fuera de las capturas revisadas y cualquier afirmación de rendimiento o modelo de imagen no verificada.

## Movimiento y práctica libre — septiembre 2026
El patio conserva su arte. Los gatos usan el recurso original sin rotación de color, articulado en cabeza, cuerpo, cola y patas, con párpados. Sus actividades alternan destinos variables, juego con pelota, acicalado, estiramiento, descanso y cercanía; las recompensas cambian su destino. El movimiento se pausa fuera de vista, con la práctica abierta y según preferencias del sistema. La cabecera interior dice «Hola, Laura» en blanco. Mis gatos usa retratos y relatos en filas legibles. La práctica libre se descubre bajo el reto con un selector de habilidad y nivel.

### Refinamiento del patio y la práctica — septiembre 2026
La cabecera recupera «Refugio de Laura». Los nombres de gatos son texto oscuro sin placa, con sombra suave para legibilidad. Los objetos ilustrados comparten volumen, luz cálida y perspectiva del patio; los elementos decorativos permanentes se distinguen del cuidado desbloqueado. La bienvenida es un diálogo de una sola misión y una acción principal. Las tarjetas alternan reconocimiento A/B/C y respuesta abierta, con escala métrica contextual y calculadora desplegable. Se conserva el refugio y sus gatos, con movimiento reducido respetado.

### Secciones y convivencia del patio
«Mis gatos» contiene únicamente la colección con retratos e historias. «Mis habilidades» reduce cada fila a icono temático, nombre, nivel y progreso; los accesos a reto y práctica libre pertenecen a «Mi refugio». El patio se pausa al ocultarse. Las huellas de navegación incluyen el nombre del gato; objetos y residentes reservan espacio y las rutas ceden el paso. La pelota gira sobre su lugar, separado de la cesta.

### Formatos de preguntas
El profesor elige varios formatos con casillas etiquetadas. Abiertas, opciones, verdadero/falso y parejas pueden acompañarse de una imagen adjunta. Relacionar usa dos columnas y un selector por fila, accesible por teclado y sin exigir arrastre. La carpeta de Drive vive dentro del importador y muestra su estado real de conexión.

### Cuidados y adopciones
Las reglas de recompensas viven en un desplegable bajo el reto; no añaden ruido al patio. La despedida usa un diálogo breve con el retrato existente y una única acción. «Ya tienen hogar» conserva nombres e historias debajo de los residentes. Los cuidados se dirigen a un gato concreto y los objetos heredan el atlas del refugio.
