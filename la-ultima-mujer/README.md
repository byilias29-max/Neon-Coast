# LA ÚLTIMA MUJER

Thriller 2D de supervivencia psicológica ambientado en **Puerto Niebla**. Mara Oribe despierta en la Clínica Aurora, siete días después de que la ciudad dejara de hacer ruido. Una transmisión de radio, una casa cerrada y una voz que no es la suya abren la primera grieta.

**Estado:** prólogo y Capítulo I jugables de principio a fin. La campaña completa está planificada en seis capítulos.

---

## Cómo jugar

El juego es HTML, CSS y JavaScript puro. No usa Node.js, dependencias, CDN ni recursos externos. Todo el arte, las texturas, las fotografías y el audio se generan en tiempo real.

Desde la raíz del repositorio:

```bash
cd la-ultima-mujer
python -m http.server 8123
```

Abre `http://127.0.0.1:8123/` en un navegador moderno. Se recomienda Chrome, Edge o Firefox actualizados y una ventana de escritorio.

La partida se guarda en el almacenamiento local del navegador:

- `lam_save_v1`: progreso y punto seguro.
- `lam_settings_v1`: opciones de audio, imagen y accesibilidad.

---

## Controles

| Acción | Tecla |
| --- | --- |
| Moverse | `WASD` o flechas |
| Apuntar la mirada / la antorcha | Ratón |
| Interactuar | `E` |
| Encender o apagar la antorcha | `F` |
| Correr | `Mayús` |
| Agacharse | `Ctrl` |
| Rellenar la antorcha | `R` |
| Diario de investigación | `J` |
| Inventario | `I` |
| Pausa / volver | `Esc` |
| Leer documentos | `E`, `Esc` o rueda del ratón |
| Desplazar documentos largos | Flechas o `Av Pág` / `Re Pág` |

Los diálogos se avanzan con `E`, `Enter` o `Espacio`. Las decisiones se seleccionan con el ratón.

---

## Contenido del Capítulo I

- Prólogo cinematográfico y despertar en la habitación 03.
- Clínica Aurora: pasillo, control de enfermería y radio.
- Calle Alhelí bajo la lluvia.
- Casa 14: salón, cocina, estudio, planta alta y sótano.
- Pared de fotografías con vigilancia oculta.
- Poema de Irene Rueda y mecanismo de cuatro marcas.
- Encuentro con Nadia Voss y sus decisiones de diálogo.
- Cinta maestra, regreso al refugio y cierre del capítulo.
- Diario con pistas, personas, lugares y preguntas abiertas.
- Inventario, antorcha con aceite, guardado manual y automático.
- Ajustes de audio, calidad de iluminación, partículas y accesibilidad.
- Pantalla de fin de capítulo con estadísticas y archivo de campaña.

### Solución del mecanismo (spoiler)

La secuencia está en el poema del escritorio del estudio:

1. Luna
2. Mano
3. Campana
4. Cuervo

La puerta no se abre con la voz. Se abre con la canción.

---

## Campaña planificada

| Capítulo | Título | Localización |
| --- | --- | --- |
| I | La señal | Clínica Aurora · Calle Alhelí |
| II | La voz | Radio Faro · Punta Niebla |
| III | Los que duermen | Hospital de Puerto Niebla |
| IV | Casa de muñecas | Casa 14 · Planta alta |
| V | El último faro | La costa · El faro |
| VI | La última mujer | NANA · El centro de la ciudad |

El Capítulo I está cerrado narrativamente. Los cinco restantes forman el arco completo y se presentan como archivo reservado en el menú de campaña.

---

## Diseño técnico

- **Perspectiva:** exploración cenital 3/4 con cámara cinematográfica, zoom adaptativo y colisiones por ejes.
- **Arte procedural:** escenarios, mobiliario, personajes, retratos, fotografías y documentos se dibujan en Canvas 2D con semillas deterministas.
- **Luz:** antorcha dinámica con polígono de visibilidad, oclusión por paredes y muebles, oscuridad estratificada y luces ambientales.
- **Audio:** Web Audio sintetizado; lluvia, pasillos, sótano, radio, cinta, pasos y paisajes sonoros. Sin muestras externas ni TTS.
- **Narrativa:** diálogos con retratos, monólogos contextuales, pensamientos ligados a objetos y pistas que se incorporan al diario.
- **Guardado:** autoguardado en transiciones y puntos seguros, guardado manual desde la pausa, continuación desde el menú.
- **Entrada:** enrutado centralizado de teclado y ratón; las pantallas modales consumen sus propias teclas y congelan la simulación.

---

## Estructura

```text
la-ultima-mujer/
├── index.html          Interfaz, pantallas y carga de módulos
├── css/style.css       Menús, HUD, documentos, diario y diálogos
├── js/
│   ├── config.js       Constantes y ajustes por defecto
│   ├── textures.js     Texturas procedurales
│   ├── art.js          Utilidades de dibujo e iconos
│   ├── scenery.js      Escenarios y arquitectura
│   ├── props*.js       Mobiliario y objetos
│   ├── characters.js   Personajes y retratos
│   ├── photos.js       Fotografías y evidencias
│   ├── world.js        Escenas, colisiones, interacciones y disparadores
│   ├── lighting.js     Antorcha, oclusión y oscuridad
│   ├── fx.js           Grano, viñeta, partículas y cámara
│   ├── audio.js        Síntesis de ambiente, música y efectos
│   ├── input.js        Teclado y puntero
│   ├── save.js         Serialización y almacenamiento
│   ├── story.js        Diálogos, documentos, objetivos y campaña
│   ├── ui.js           Pantallas, lector, diario, inventario, dial y capítulo
│   ├── cinematic.js    Prólogo
│   ├── game.js         Bucle, estado, interacciones y progresión
│   └── main.js         Arranque y captura de errores
└── README.md
```

---

## Verificación de la build

Se realizó una partida completa automatizada en Chrome headless (1600 × 900) cubriendo:

- despertar, objetos, antorcha y salida de la habitación 03;
- radio del control de enfermería y aparición del vigilante;
- calle, Casa 14, pared de fotografías y poema;
- mecanismo, sótano, Nadia, cinta y aceite;
- regreso a la clínica, cinta maestra y fin de capítulo;
- pantalla de capítulo, guardado manual, opciones, salida y continuación;
- consola del navegador sin errores durante la partida.

El proyecto original de Neon Coast permanece intacto en la raíz del repositorio; este juego vive por completo en `la-ultima-mujer/`.
