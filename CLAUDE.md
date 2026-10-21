# Neon Coast — instrucciones para Claude Code (y para cualquier agente)

Juego 3D de mundo abierto en Three.js r128, sin build step: `index.html` + 46 módulos
`src/*.js` cargados por `<script>`. Todo es procedural (geometría, texturas y audio
generados en runtime). Three.js se sirve desde `vendor/three.min.js`: no hay CDN.

## Cómo ejecutar
```sh
python -m http.server 8202 --directory .   # sirve el juego en http://localhost:8202
```
No hace falta `npm` ni bundler. **Verifica SIEMPRE en el navegador** (y con la
consola abierta: debe quedar 0 errores).

Pruebas (Playwright, opcional):
```sh
pip install -r tests/requirements.txt
python -m playwright install chromium
python tests/run_tests.py        # comprueba mapa, minimapa y barrios; no toca el repo
```

## Reglas de trabajo (obligatorias)
1. **No rompas la retícula**: `CELL=76`, `R=16` (calzada), `B=60` (manzana), `H=5`, `EXT=418`.
   Las calles van en los múltiplos de `CELL`; las aceras son losas de `B`; el mar está en `x > EXT`.
2. **Colisiones**: todo lo sólido se registra en `boxes` como `{x, z, hw, hd}`. Un edificio o prop
   que no esté en `boxes` se puede atravesar; uno mal registrado bloquea la calzada.
3. **Nada en la calzada**: nada puede ocupar `|x - k*CELL| < R/2` ni `|z - k*CELL| < R/2`.
   `src/calzada.js` audita y reubica; si añades una construcción, colócala en una manzana.
4. **Materiales**: `MeshStandardMaterial` con `map` procedural (`tex(canvas, rx, ry)`), `roughness`
   real, `normalMap` con `heightToNormal(canvas)`. Nada de color plano sin textura.
5. **Rendimiento**: fusiona geometría con `merge()` (exige geometría indexada), instancía lo
   repetido (`THREE.InstancedMesh`) y añade LOD por distancia en lo que se mueve mucho.
6. **Render**: `rd.shadowMap.autoUpdate=false`; si añades objetos que proyectan sombra, fuerza
   `rd.shadowMap.needsUpdate=true` en un hook.
7. **Hooks**: el bucle principal (`src/boot.js`) llama `NC.run('pre', dt)` y `NC.run('post', dt)`.
   Úsalos para la lógica por frame; nunca toques `step()` directamente.
8. **Un solo dueño por estado**: p. ej. el nivel de búsqueda solo lo escribe `src/policia.js`
   (`NC.Pol.setLevel(n)` / `NC.Pol.clear()`); el motor solo lo baja con su decaimiento.
   Las estrellas del HUD solo las pinta `src/policia.js`.
9. **Sincronización**: antes de terminar, `git pull --rebase origin main`, commit y `push`.
   El proyecto está enlazado a Vercel (`ilias-f1bc/neon-coast`) y **cada push a `main` despliega**.
   Para desplegar a mano: `deno run -A npm:vercel@latest deploy --prod --yes`
   (o `npx vercel deploy --prod --yes`).
10. **No subas artefactos**: `shots/`, `__shot.png`, `shotserver.mjs`, `tests/shot_dpr*.png` y
    `tests/sto_zone_snippet.js` están en `.gitignore`.
11. **Caché**: los `<script src="src/x.js?v=9e">` llevan versión; **al editar un módulo, sube el
    `?v=`** o el navegador sirve la versión cacheada (pasa al `?v=9f`).
12. **Un solo sistema de malla humana**: `src/gente.js` es el dueño (`hgeo3`, `mkHuman3` y el LOD).
    No vuelvas a crear otro `mkHuman` paralelo.

## Mapa de módulos (orden de carga en `index.html`)
| # | Archivo | Qué hace |
|---|---|---|
| 1 | `src/core.js` | `NC` (hooks, log, css) · `src/boot.js` conecta los hooks al bucle |
| 2 | `src/textures.js` | biblioteca de texturas procedurales (tela, hormigón, rótulos) |
| 3 | `src/ui.js` | cursor neón global y detección centralizada de interfaces |
| 4 | `src/doors.js` | puertas de calle con secuencia de entrada/salida |
| 5 | `src/streets.js` | asfalto, marcas viales, pasos de cebra, coches aparcados |
| 6 | `src/city.js` | edificios terminados (azoteas, balcones,/ruinas) y mobiliario urbano |
| 7 | `src/decorado.js` | mobiliario urbano procedural detallado |
| 8 | `src/limpieza.js` | pase final: retira lo que invade la calzada o flota |
| 9 | `src/edificios.js` | planta baja viva (escaparates, toldos, rótulos) y remates de fachada |
| 10 | `src/lod.js` | edificios en supertrozos con descarte por distancia |
| 11 | `src/interiores.js` | lobby de hotel, clínica, taller |
| 12 | `src/interiors.js` | completa tiendas, concesionarios y la nave industrial |
| 13 | `src/usables.js` | kioscos y productos visibles con vista previa |
| 14 | `src/shops.js` | comercios completos: registradoras, letreros, estanterías |
| 15 | `src/tienda.js` | escaparate con previsualización 3D real y compra verificada |
| 16 | `src/house.js` | casa propia: comprar por puerta, dormir, armario, escritorio |
| 17 | `src/detail.js` | bordillos, contenedores, hidrantes, sombrillas de playa |
| 18 | `src/cielo.js` | paletas de cielo, horizonte, estrellas, luna, entorno PMREM |
| 19 | `src/hud.js` | barra inferior de inventario y cambio de arma |
| 20 | `src/audio.js` | ambiente: lluvia, truenos, viento, mar, motor |
| 21 | `src/clima.js` | lluvia, salpicaduras, asfalto mojado y reflejos |
| 22 | `src/missions.js` | **gate de avance de las misiones sandbox** de `index.html` (`MIS`/`freeMis`) |
| 23 | `src/wheel.js` | rueda de armas y objetos (Tab) |
| 24 | `src/nav.js` | navegación compartida: destino, ruta y puntos de interés (`NC.Nav`) |
| 25 | `src/map.js` | minimapa (`#mm`) y mapa grande (`#nbm`): `NC.Map`, `window.toggleMap` |
| 26 | `src/mapa.js` | tecla `V` (ampliar minimapa), cursor del mapa e icono del coche |
| 27 | `src/districts.js` | entrances de barrio, palmeras, barcos, contenedores de la nave |
| 28 | `src/vegetacion.js` | árboles, palmeras, cipreses, arbustos, viento |
| 29 | `src/carjack.js` | robo de coches: el coche robado pasa a ser el jugable |
| 30 | `src/roomdoor.js` | puertas giratorias de interiores e interactuables |
| 31 | `src/story.js` | barrios con identidad, conversaciones, historia por capítulos, `NC.sto` |
| 32 | `src/calzada.js` | auditoría de ocupaciones y reubicación sobre la calzada |
| 33 | `src/mision.js` | **misión de 9 fases** "El paquete de Colina" (`NC.mision`) |
| 34 | `src/intro.js` | introducción cinematográfica (Esc para saltar) y bandas negras |
| 35 | `src/cine.js` | motor de cinemáticas en tiempo real (`NC.cine`) |
| 36 | `src/gente.js` | **sistema humano**: malla con pelo y ropa, LOD y personalidad |
| 37 | `src/vidas.js` | historias personales, relaciones y rutinas de los personajes |
| 38 | `src/policia.js` | **dueño del nivel de búsqueda**, incidentes y persecuciones (`NC.Pol`) |
| 39 | `src/spray.js` | spray de grafiti sobre superficies reales |
| 40 | `src/arquitectura.js` | generadores de fachadas con profundidad real y cartelería |
| 41 | `src/muros.js` | retira muros sueltos y revisa que cada local tenga puerta |
| 42 | `src/interior2.js` | interiores completos por tipo de establecimiento (el más grande) |
| 43 | `src/puertas.js` | sistema unificado de accesos (hoja real o umbral con fundido) |
| 44 | `src/pausa.js` | menú de pausa: silencio del audio y simulación congelada |
| 45 | `src/interfaz.js` | sistema visual unificado del HUD y los menús |
| 46 | `src/boot.js` | conecta los hooks al paso principal |

### `mision.js` vs `missions.js`
No son el mismo módulo:
- `src/mission.js` → `src/mision.js`: la **misión de historia** de 9 fases "El paquete de Colina"
  (Rita Vidal, la nave, la caja fuerte). Vive en `NC.mision`.
- `src/missions.js`: el **gate de avance de las misiones sandbox** que define `index.html`
  (la lista `MIS` de 14 misiones sueltas + `freeMis()`): comprueba cada paso (robar, matar, wanted,
  velocidad, dinero, comprar) y hace avanzar la misión.

## Verificación
Captura desde la página y guárdala en `shots/`:
```js
rd.render(scene, camera);                      // render y lectura en el MISMO tick
fetch('http://localhost:8902/shot?n=nombre', { method:'POST', body: cn.toDataURL('image/png') });
```
El servidor de capturas es `deno run --allow-net --allow-write shotserver.mjs` (puerto 8902).
`cn.toDataURL()` fuera del tick de render sale negro; y si mueves la cámara a mano, actualiza
`skyG.position.copy(camera.position)` o el domo del cielo se sale del plano lejano.
