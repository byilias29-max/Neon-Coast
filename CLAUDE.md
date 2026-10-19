# Neon Coast — instrucciones para Claude Code (y para cualquier agente)

Juego 3D de mundo abierto en Three.js r128, sin build step: `index.html` + módulos `src/*.js`
cargados por `<script>`. Todo es procedural (geometría, texturas y audio generados en runtime).

## Cómo ejecutar
```sh
cd F:/neoncoast
python -m http.server 8123 --directory F:/neoncoast   # sirve el juego en http://localhost:8123
```
No hay `npm`, no hay bundler, no hay tests automatizados. Verifica SIEMPRE en el navegador.

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
8. **Sincronización**: antes de terminar, `git pull --rebase origin main`, commit y `push`.
   El proyecto está enlazado a Vercel (`ilias-f1bc/neon-coast`) y **cada push a `main` despliega**.
   Para desplegar a mano: `deno run -A npm:vercel@latest deploy --prod --yes`
   (no hay Node/npm en esta máquina; el CLI de Vercel corre bajo Deno).
9. **No subas artefactos**: `shots/`, `__shot.png` y `shotserver.mjs` están en `.gitignore`.
10. **Caché**: los `<script src="src/x.js?v=9e">` llevan versión; **al editar un módulo, sube el
    `?v=`** o el navegador serves la versión cacheada (pasa al `?v=9f`).

## Mapa de módulos
| Archivo | Qué hace |
|---|---|
| `index.html` | motor: renderer, escena, jugador, coches, NPCs, misiones sandbox, bucle |
| `src/core.js` | `NC` (hooks, log, css) · `src/boot.js` conecta los hooks al bucle |
| `src/cielo.js` | paletas de cielo, horizonte, estrellas, luna, entorno PMREM dinámico |
| `src/vegetacion.js` | árboles con ramas, cipreses, palmeras, arbustos, viento, por barrio |
| `src/edificios.js` | planta baja (escaparates, toldos, rótulos), remates, tuberías, escaleras |
| `src/city.js` | remates urbanos, mobiliario, plazas, aparcamientos, ruinas |
| `src/lod.js` | edificios en supertrozos con descarte por distancia |
| `src/interiores.js` | lobby de hotel, clínica, taller |
| `src/streets.js` | asfalto, marcas viales, cebras, aparcados |
| `src/clima.js` | lluvia fina, salpicaduras, asfalto mojado, reflejos, charcos |
| `src/doors.js` / `src/roomdoor.js` | puertas de coche / puertas de interiores |
| `src/shops.js` / `src/tienda.js` | comercios 3D / escaparate con previsualización 3D |
| `src/gente.js` | humanos detallados, LOD y personalidad |
| `src/story.js` | historia por capítulos, diálogo, reparto |
| `src/mision.js` | misión de 9 fases "El paquete de Colina" |
| `src/map.js` / `src/mapa.js` | minimapa y mapa grande / icono del coche y flechas de borde |
| `src/hud.js` / `src/interfaz.js` | HUD / sistema visual unificado |
| `src/textures.js` | biblioteca procedural de texturas (ya cargada y en uso) |

## Verificación
Captura desde la página y guárdala en `shots/`:
```js
rd.render(scene, camera);                      // render y lectura en el MISMO tick
fetch('http://localhost:8902/shot?n=nombre', { method:'POST', body: cn.toDataURL('image/png') });
```
El servidor de capturas es `deno run --allow-net --allow-write shotserver.mjs` (puerto 8902).
`cn.toDataURL()` fuera del tick de render sale negro; y si mueves la cámara a mano, actualiza
`skyG.position.copy(camera.position)` o el domo del cielo se sale del plano lejano.
