# NEON RUSH

Juego 2D de acción **ultra-dopamínico**, **progresivo** y **endless**: nunca hay un momento
en el que no haya algo que hacer. HTML5 Canvas puro, **cero dependencias**, sin build step.

```
neon-rush/
├── index.html      shell, menus DOM y estilos neon
└── src/
    ├── core.js     matemáticas, RNG con semilla, input (teclado/ratón/mando/táctil) y guardado
    ├── audio.js    música y efectos 100% sintetizados con WebAudio (sin ficheros)
    ├── fx.js       paleta viva, partículas, texto flotante, cámara, hitstop y post-proceso
    ├── entities.js jugador, armas, balas, recogibles y obstáculos
    ├── enemies.js  10 tipos de enemigo con IA propia + 3 jefes
    ├── waves.js    director de oleadas: mutadores, eventos y dificultad infinita
    ├── upgrades.js cartas de partida, meta-mejoras, avatares y contratos diarios
    ├── ui.js       menús (DOM) y HUD (canvas)
    └── game.js     bucle, partida, simulación y render
```

## Cómo ejecutar

```sh
cd neon-rush
python -m http.server 8123
# abre http://localhost:8123
```

(O ábrelo con cualquier servidor estático; no necesita compilar nada.)

## Controles

| Acción | Teclado | Ratón | Mando |
|---|---|---|---|
| Mover | `WASD` / flechas | — | stick izquierda |
| Apuntar | — | posición del ratón | stick derecha |
| Disparar | mantener `J` | mantener clic izq. | `RT` / `X` |
| Dash | `Espacio` / `Shift` | clic der. | `A` |
| Sobrecarga (hiper) | `Q` | — | `B` |
| Pausa | `Esc` / `P` | — | — |

En móvil: arrastra el dedo para moverte (el dedo hace de stick) y tócalo lejos del centro para
disparar; el apuntado es automático al enemigo más cercano.

## La máquina de dopamina

**Cada 0.1 segundos pasa algo:**

- **Combos**: cada baja suma combo (2.6 s de ventana). El multiplicador sube cada 8 bajas
  (`x1` → `x1.5` → `x2`…), el número crece en pantalla y el sonido sube de tono.
- **Juice**: hitstop de 70 ms al recibir daño, screen shake con "trauma", destellos, aberración
  cromática, bloom, números de daño, esquirlas, anillos de choque y zoom punch.
- **Sovercarga (hiper)**: la barra de flujo se llena con bajas, roces de balas y eter.
  Al pulsar `Q` el tiempo se ralentiza al 34 %, haces el doble de daño, disparas solo, la
  paleta se vuelve psicodélica y aparecen rayas de velocidad y barras cinematográficas.
- **Roces**: rozar una bala enemiga da "¡ROCE!" y carga flujo. Jugar al límite paga.
- **Racha limpia**:Clear una oleada sin recibir daño multiplica la puntuación y repara escudo.

**Cada 20-30 segundos cambia algo:**

- **El director** reparte oleadas con presupuesto creciente y añade 1-3 **mutadores**:
  `MAREJADA` (más enemigos, menos vida), `SPRINT`, `BLINDADO`, `TORMENTA` (balas más rápidas),
  `REBOTE`, `ELISEO` (+60 % eter), `GIGANTES`, `DOBLE` (se parten al morir), `VORTICE`
  (balas curvas), `FURIA`, `ELITES`. Cada 3 oleadas se rompen las reglas.
- **Eventos** cada 5 oleadas: `PURGA` (lluvia de balas), `ORO` (éter x3), `PROMESA` (8 s de
  calma + carta gratis), `HISTERIA` (todo al doble de velocidad).
- **Jefes** cada 10 oleadas: `NUCLEO`, `ENJAMBRE`, `CENTRO`, con fases por vida.
- **Cofres de neón** cada 5 oleadas: un objetivo que perseguir que da carta y sobrecarga.

**Progresión dentro de la partida:**

- Carta de mejora cada 3 oleadas y en cada subida de nivel (cada ~220 de eter): 40 cartas
  repartidas en armas (GEMELA, ALBA, RAIL, SEGUIDOR, NOVA, ARCO, DRONES), estadística y
  riesgo/repago (MODO CARNE, DOBLE O NADA, PRISMA, ECO, SEGUNDO ALIENTO, CAMPANA…).
- El **dash** atraviesa enemigos, los empuja y destruye balas: es la herramienta de supervivencia.

**Progresión entre partidas:**

- **Núcleos**: moneda que se gana al jugar; 13 meta-mejoras permanentes (daño, cadencia,
  vida, dash extra, crítico, suerte, imán, escudo, hiper, eter, +1 carta, puntos).
- **Avatares**: 5 personajes con estadísticas y estilo distintos, se desbloquean con núcleos
  acumulados (VOLTA, TITAN, FANTASMA, CRISIS).
- **Contratos diarios**: 3 objetivos cada día (matar X, llegar a la oleada X, combo X,
  recoger núcleos, activar el hiper, terminar sin daño…) con recompensa en núcleos.

## Detalles técnicos

- **Sin assets**: geometría, texturas, música y efectos son procedurales.
- **Audio generativo**: capas (bombo, caja, charles, bajo, arpegio, pad) que entran según la
  intensidad del combate; la escala y el tempo cambian con la oleada.
- **Post-proceso**: bloom por downsampling a 1/4 con blur + aberración cromática en dos
  copias tintadas, vignette y scanlines.
- **Rendimiento**: ~1.4 ms por frame (update + draw) con cientos de entidades; partículas
  en pool, balas en arrays planos y culling por distancia.
- **Persistencia**: `localStorage` (`neonrush.save.v1`).
