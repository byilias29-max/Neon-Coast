# NEON RUSH — HANDOFF COMPLETO DEL CHAT
> Doc para continuar el trabajo en otro ordenador, sin perder **un solo detalle**.
> Fecha de corte: **23-oct-2026**. Última verificación en navegador el mismo día.
> Léelo entero antes de tocar nada. El roadmap pendiente está en la **sección 10**.

---

## 1. Contexto del repositorio (global)

- Repo: **Neon Coast** — `https://github.com/byilias29-max/Neon-Coast`, rama `main`.
- Contenido del repo:
  - Juego 3D original **Neon Coast**: `index.html` en la raíz + `src/*.js` (Three.js). **NO TOCAR.**
  - **`neon-rush/`**: el juego 2D creado en este chat. Es lo único de lo que habla este doc.
  - `CLAUDE.md`: reglas del repo. Las que nos afectan (replicadas en sección 11).
  - `tests/` y `test.html` de trabajo anterior ajeno a neon-rush: no son parte del juego.
- Despliegue: **push a `main` = deploy automático en Vercel**. Detrás de Vercel no hay build step: sirve los archivos estáticos tal cual. `/neon-rush/` se sirve como directorio con su `index.html`.
- Live: la home del dominio es Neon Coast (3D); el juego nuevo vive en la ruta `/neon-rush/`.

---

## 2. Estado git exacto (cortado el 23-oct-2026)

```
fafa9c4  NEON RUSH: sistema de prestigio y utilidades matematicas extra (avance)
9069643  NEON RUSH: juego 2D infinito de accion con progresion y dopamine   <-- commit completo del juego
d63570a  Merge branch 'fix/restaurar-contenido'   <-- base sobre la que se rebió
```

- Ambos commits de neon-rush **están subidos a `origin/main`** (desplegados en Vercel).
- `core.js` del inflado de prestigio se verificó en navegador (0 errores, 1500 frames sim, **0.87 ms/frame** steady-state) antes de commitear.
- `working tree` limpio. `neon-rush/shots/` (capturas de prueba) está cubierto por el `.gitignore` (`shots/`) y fue borrado tras probar.
- Recordatorio: **`git pull --rebase origin main` antes de seguir** en casa si alguien tocó el remoto.

---

## 3. Inventario de archivos de `neon-rush/`

```
neon-rush/
  index.html        (279 líneas) shell + TODO el CSS neon + script tags con cache-busting ?v=8
  README.md         (doc de jugabilidad/controles/arquitectura, es lo "oficial")
  HANDOFF.md        (este doc)
  src/
    core.js       (~310) nucleo: maths + easing + RNG seedeado + Input + Save + Prestige
    audio.js      (~250) WebAudio 100% procedural: SFX + musia generativa por oleada
    fx.js         (~400) paleta viva, camara, particulas, texto flotante, post-proceso
    entities.js   (~530) jugador completo + las 8 armas + spawn de balas + HUD helpers de jugador
    enemies.js    (~520) defs de 10 enemigos, IA, elites/mods, 3 jefes con fases, dano/muerte/botin
    waves.js      (~330) Director (oleadas, budget, mutadores, eventos, cofres, jefes)
    upgrades.js   (~400) 33 cartas in-run, 13 meta-mejoras, 5 avatares, contratos diarios
    ui.js         (~480) menus DOM (titulo/tienda/cartas/pausa/gameover) + HUD canvas completo
    game.js       (~880) bucle, partida, balas, recogibles, obstaculos, render mundo, hiper
```

- Orden de carga en `index.html` (¡IMPORTANTE, es un orden con dependencias!):
  `core → audio → fx → entities → enemies → waves → upgrades → ui → game` y luego `NR.Game.init();`.
- **Namespace global único: `window.NR`**. Cada módulo es una IIFE clásica. Sin imports, sin build, sin dependencias.
- Regla de oro: al editar cualquier módulo, **subir `?v=N`** (ahora `?v=8`) en las 9 líneas de script de `index.html` (una sola cifra compartida).

---

## 4. Contratos de arquitectura — la API de `NR.*`

### 4.1 `NR.M` (math) y extras del último commit
Original: `clamp, lerp, damp, rand, randInt, chance, pick, shuffle, sign, dist, dist2, fmt, time`.
**Añadido en `fafa9c4`** (verificado):
- `easeOutElastic(t)`, `easeOutBounce(t)`, `easeInOutExpo(t)`, `easeOutCirc(t)`
- `hsl2rgb(h, s, l)` → `{r,g,b}`; `rgb(h, s, l, a)` → `rgba(...)` string
- `randGauss(mean, std)` (Box-Muller), `weightedPick(items, weightFn)`
- `dist2` devuelve distancia sin raíz para comparaciones baratas.

### 4.2 `NR.RNG(seed)` y `NR.dailySeed()`
- RNG mulberry-ish conmuctible: `let r = NR.RNG(123); r() → [0,1)`.
- `dailySeed()` = `YY*10000 + (MM+1)*100 + DD`. La usan los **contratos diarios**.
- ⚠ **PENDIENTE de exponer como modo de juego** (diario/semanal con semilla). Ver roadmap C.

### 4.3 `NR.Input`
```js
Input = {
  keys: {}, hits: Object.create(null),      // 'w','a',... : true mientras está pulsada
  mouse: { x, y, wx, wy, down, rdown, hitDown, hitUp, moved },  // wx/wy = coords mundo
  pad: { moveX, moveY, aimX, aimY, fire, dash, hyper, any },
  lastInput: 'kb' | 'mb' | 'tp' | 'pad',
  init(canvas), axis(), firing(), dashHit(), pollPad(), endFrame()
}
// detectar "se acaba de pulsar": Input.hit['Space'] (truthy en el frame exacto)
```
⚠ Nota aprendida a las malas: `Input.firing` es una **función**; si en un script de test haces
`NR.Input.firing = true` lo rompes para siempre hasta recarga (bug cometido 1 vez este mismo día).

### 4.4 `NR.Save` (localStorage `neonrush.save.v1`)
```js
defaults() → {
  nucleos, totalNucleos, meta:{}, avatar:'nova', unlocked:{nova:true},
  best: { score, wave, kills, time },
  stats: { runs, kills, wave, time, deaths,
           perfectWaves, hyperActivations, dashes, grazes, chestsOpened,
           bossesKilled, prestige, totalScore },          // los ultimos 7 NUEVOS, poco usados aún
  contracts: { date:'', list:[] },
  weekly: { seed, completed, score, modifiers },           // NUEVO, sin usar
  daily:  { seed, completed, score, modifiers },           // NUEVO, sin usar
  settings: { mute, shake, glow,
              trails, screenshake, hitstop, particles, colorblind, reducedFlash }, // los ultimos 6 NUEVOS, UI solo binde mute/shake/glow
  seen: { intro },    // intro tutorial: solo si nunca has jugado (9 s de tips)
  prestige: { level, totalScore, unlockedPerks:{} },        // NUEVO
  leaderboards: { daily:[], weekly:[], allTime:[] }          // NUEVO, sin usar
}
```
- `load()` hace merge **aditivo** con defaults: nunca rompe saves de usuarios en producción (importante mantener esa política).
- API: `load(), save(), addNucleos(n), addStat(key, val), reset()`.
- **NUEVO**: `checkPrestige()` → si `stats.totalScore >= prestige.totalScore + (100000 + level*50000)`
  sube nivel de prestigio, regala `nuevoLevel * 500` núcleos y devuelve el nuevo nivel (0 si no).
  ⚠ No la llama **nadie** todavía → hay que llamarla en `gameOver()`.

### 4.5 `NR.Prestige.Perks` (NUEVO en `fafa9c4`, sin integrar)
```js
Perks.list = [
 { id:'prestige_1',  name:'ECO DE GUERRA',       desc:'Empiezas con +1 arma aleatoria',        icon:'⚔' },
 { id:'prestige_2',  name:'VITALIDAD PRIMORDIAL',desc:'+25% vida max, +1 dash',                icon:'♥' },
 { id:'prestige_3',  name:'FLUJO ETERNO',        desc:'Hiper carga 30% mas rapido',            icon:'∞' },
 { id:'prestige_4',  name:'MAESTRO DE ARMAS',    desc:'Todas las armas empiezan nv1',          icon:'⬆' },
 { id:'prestige_5',  name:'SUERTE DEL CAMPEON',  desc:'+50% suerte, cofres mas seguido',       icon:'☘' },
 { id:'prestige_6',  name:'ESCUDO REACTIVO',     desc:'+15 escudo al matar elite',             icon:'◇' },
 { id:'prestige_7',  name:'INSTINTO DEPREDADOR', desc:'Dash 50% mas largo, 25% mas dano',      icon:'⚡' },
 { id:'prestige_8',  name:'CADENA INFINITA',     desc:'El combo no decae con el tiempo',       icon:'🔗' },
 { id:'prestige_9',  name:'ETERNO RETORNO',      desc:'Con hiper cargado, revives al 30%',     icon:'🔄' },
 { id:'prestige_10', name:'ASCENSION',           desc:'Avatar secreto VOID',                   icon:'☐' }
]
Perks.has(id)  // true si el perk está comprado/desbloqueado por nivel
Perks.get(id)
```
Convención de encaje un poco a decidir: `unlockedPerks` se marca al subir de prestigio con
`unlockedPerks['prestige_'+n] = true`. Para cheks por *nivel requerido*: `prestige.level >= 1`
equivale a has('prestige_1') porque suben secuencialmente.

---

## 5. Sistemas de juego, tal cual están implementados

### 5.1 Jugador (`entities.js`)
- Velocidad `430 * stats.speed` con acel. exponencial (`damp 14`). `hp` base 100*meta.
- **Dash**: `0.16 s`, velocidad `1450`, **iframe 0.22 s**, daño `p.dmg * 1.4`, **destruye balas enemigas** en radio
  `r+12` (grazing con print "DESTRUIDO"), cd por carga `1.15 * stats.dashCd`, hasta `stats.dashCharges` cargas.
  Trail propio: array `p.trail` (26 posiciones, vida 0.32).
- `p.drones[]`, `scatterBonus`, `droneBonus` están en el objeto player.
- Grazing: pasar cerca de bala enemiga sin tocarla da `+3.5 flow` y a veces `+40 score`.
- Iincoming de dana: `armor` reduce; `shield` antes que hp; racha sin daño da +30 escudo.

### 5.2 Las 8 armas (`Nr.Weapons` en `entities.js`)
| id | nombre | cd | mult | notas |
|---|---|---|---|---|
| pulse | PULSO | 0.115 | 1.0 | arma base, siempre presente |
| twin | GEMELA | 0.13 | 0.72 | 2 balas paralelas |
| scatter | ALBA | 0.42 | 0.55 | cono de `5 + scatterBonus` balas |
| rail | RAIL | 0.52 | 2.1 | atraviesa 3, bala grande blanca |
| seeker | SEGUIDOR | 0.62 | 0.85 | homing 5.4, vida 2.2 |
| nova | NOVA | 0.95 | 0.9 | anillo `ring:true` |
| arc | ARCO | 0.38 | 1.25 | rayo a lo cercano (usa `damage(...,'arc')`) |
| drones | DRONES | 0 | 0.4 | cd 0: dispara cada drone en su timer propio |
- Subida de nivel de arma (`run.wlv[id]`): `+28% mult, -12% cd` por nivel (funciones `multOf/cdOf`).
- El daño final SIEMPRE va por `p.curMult` (multiplicador seteado en el loop de fuego):
  `dmg = armasMult * curMult * stats.dmg`, con crit (x2 por `stats.critDmg`).
- Hiper: `x2.2` sobre `curMult`.

### 5.3 Enemigos (`NR.Enemies.defs`) — 10 tipos + élites
```
runner:   hp 16,  spd 168, r 11, xp  3, cost  3, wave  1, dmg  7, hue 340
mine:     hp 10,  spd 195, r 10, xp  4, cost  5, wave  3, dmg 14, hue 25
shooter:  hp 24,  spd  95, r 12, xp  6, cost  6, wave  4, dmg  7, hue 300
charger:  hp 32,  spd  88, r 13, xp  7, cost  7, wave  5, dmg 10, hue 15
weaver:   hp 26,  spd 145, r 11, xp  8, cost  8, wave  6, dmg  9, hue 275
splitter: hp 48,  spd 105, r 16, xp  9, cost 10, wave  7, dmg 10, hue 350
orbiter:  hp 34,  spd 132, r 13, xp  9, cost 11, wave  8, dmg  8, hue 312
shield:   hp 64,  spd  84, r 15, xp 12, cost 13, wave  9, dmg 11, hue 330
turret:   hp 78,  spd   0, r 19, xp 15, cost 16, wave 11, dmg  9, hue 288
brute:    hp 135, spd  64, r 24, xp 20, cost 22, wave 13, dmg 15, hue 5
```
- spawn hace `r*1.15`. Élite: `x1.9 hp, x1.35 spd, x2.4 xp, x1.4 dmg, aura dorada`.
- Mods de mutador en spawn: `hp/size/xp/speed/bulletSpeed/split/curve/elite` (en `em`).
- Muerte: `damage() → kill()` suelta ether (verde) y a veces núcleo (dorado)…

### 5.4 Los 3 jefes (`spawnBoss`, `updateBoss`)
- núcleo (hp 720 + wave*150, fases con anillos de balas), enjambre (invoca minions), centro (láseres + dash).
- ciclo: `floor(wave/10 - 1) % 3`. Barra de vida en HUD (name label).
- ⚠ existen pero cada 10 oleadas: probarlo rápido en sim: forzar `NR.Director.startWave(10, g)`.

### 5.5 Director de oleadas (`waves.js`)
- Fases: `idle | active | intermission (3.2 s)`.
- **Budget de spawn**: `13 + wave*6 + wave^1.42 * 0.85`; elige tipos con `cost <= budget-spent+6`;
  enemigos con `d.wave <= wave+2` desbloqueados.
- **Gap de spawn**: `max(0.12, 0.75 - wave*0.008) * rand(0.4,1.6)`.
- Pos spawn: 72% bordes / 28% interior, siempre `>330px del jugador`.
- **Cofre cada 5 oleadas** (`n % 5 === 0`): carta + 1200 pts + 100 flow + escudo lleno.
  (cofre giros en la posición del mapa, se abre al acercarte).
- Boss cada `10`. Evento `n % 5 === 0 && n > 5`.

### 5.6 Los 11 mutadores (`NR.Mutators`)
```
marea    MAREJADA  +60% enemigos, -25% vida enemiga
sprint   SPRINT    +30% velocidad enemiga
blindado BLINDADO  +40% vida, escudo en enemigos
tormenta TORMENTA  +55% velocidad de balas enemigas
rebote   REBOTE    rebotan en las paredes
eliseo   ELISEO    +60% eter recogido
gigantes GIGANTES  +30% talla, +35% vida
doble    DOBLE     se parten al morir
vortice  VORTICE   balas enemigas en curva
furia    FURIA     +45% cadencia de ataque
elites   ELITES    30% de enemigos de élite
```
- Elección: multadores `1` o `2` (2 en wave % 3 == 0), + 35% de chance de un extra desde wave 15.

### 5.7 Los 4 eventos especiales (cada 5 oleadas)
```
purga    PURGA    lluvias de balas (spawn de 8 en círculo cada 0.55 s, 16 s), dona +ETER
oro      ORO      todo el eter x3 durante 18 s
promesa  PROMESA  8 s de calma (freezer de spawns) → carta gratis al terminar
histeria HISTERIA todo x1.8 de velocidad (spd extra x1.8 en spawn + existentes) 16 s
```
- `promesa` al terminar encola `g.queueCard()`. Fixes de este chat: histeria y promesa funcionan.

### 5.8 El nivel de eter y de escalado
- eter color verde `#7bffb0`-ish (hue 145 fijo). Al `level up` (~220, `*1.22` per level): **carta inmediata** (pausa el juego como si fuera oleada superada).
- eter event ORO multiplica **x3** (no x2.5 como se pudiese confundir con el otro fix; `r_oro` AVARO es otro tema).
- `stats.xpGain` multiplicador (meta + card ETER).
- Puntos por eter: `valor * 8 * scoreMult`.

### 5.9 Combo
- Ventana **2.6 s** por kill; cada **8 kills** el multiplicador `+0.5`, cap x8 (`run.multiplier()`).
- maxCombo se guarda en run y sale en gameover / stats.
- ⚠ prestigio perk CADENA INFINITA pedirá congelar decaimiento: hay que meter un if aquí.

### 5.10 Hiper / sobrecarga (tecla Q)
- Carga solo por jugar (flow/damage/roces); duracion `8 s * stats.hyperDur`, ts del tiempo 0.34.
- Ação visual: letterbox, arcoiris, speed lines (en HUD), glitch aberration extra.
- Contador `hyperUses` en run y en stats; contar `stats.hyperActivations` al usaro (no se llama aún).

### 5.11 Cofres, obstáculos, recogibles
- Obstáculos: 9 pilares (54x54, indestructibles) + 16 cajas (42x42, `hp 26`, estallan en esquirlas).
- Recogibles (spawn al morir / eventos): **ether (verde), nucleo (dorado), corazon (rojo), escudo (azul), iman, bomba (daño 500 al área), cofre**. Iman atrae a rango `130 * stats.magnet`; tras 1.0 s de vida **autocompite** hacia el jugador (fixed en este chat: no se pierde más).
- Balance final del botin ajustado a manos: la dificultad no da patatas.

### 5.12 Progresión permanente (tienda)
- **13 meta-mejoras** (`Meta.upgrades`) con costes `f(level)` tipo `40 + l*38` etc.
- **5 avatares** (umbrales de `totalNucleos`): nova 0 / volta 700 / titan 1800 / ghost 3500 / crisis 6000.
  Stats por avatar ver sección "Avatares" (nv. su ficha en `upgrades.js` líneas 286-290).
- **8 tipos de contratos diarios** (kills, wave, score, combo, cores, nodmg, hyper, elite), 3 activos con seed diario.
  ⚠ COFRE: el chequeo de 'cores' usa el balance actual de núcleos (Save.data.nucleos), no `run.cores`
  de la partida: documentar/quitar en próxima iteración si molesta.
- Contratos: los refrescos se hacen desde título/tienda;
  **pendiente**: `Save.checkPrestige()` debe llamarse in `gameOver` (roadmap G).

---

## 6. Audio (`audio.js`): WebAudio 100% procedural
- Cadena: `master → compressor`; 2 buses `sfx / mus`; reverb cortito con impulse generado con ruido.
- Música generativa: bpm `124 + min(26, wave*1.6)`; escala por `wave % nEscalas`; raiz via `wave/4`.
  Capas que van entrando por **intensidad**: kick → hats → bass (patrón en 8 pasos) → arp → pad → lead.
  Ducking agresivo para que el SFX acabe encima (sidechain manual con `_duck`).
- SFX: `shot(pitch,kind), hit(crit), kill(combo,big), explode, pickup(v), dash, hurt, ui, waveUp, card,
  hyper, boss, thunder…`. Kill pitch sube con el combo → efect dopa.

---

## 7. Juice / render pipeline (lo que ya funciona)
Orden de draw en `game.draw()`:
1. fondo degradado (bg dark) → **grid parallax** con hue rotando
2. suelo / losas / sellos de círculo
3. borde de arena (glow rojo pulsante cuando te acercas)
4. obstáculos, recogibles, cofres
5. enemigos (halo magenta, sprites simples vector-drawn)
6. balas de enemigo, balas del jugador (chevrones con trail)
7. player (cian `#3ad9ff`, trail, drones, ring de dash, ghost de iframe)
8. `FX.draw` → anillos, partículas, textos flotantes → `FX.drawText`
9. **post-proceso**: bloom en canvas a 1/4 res con `filter: blur(2.5px) brightness(1.18) contrast(1.35) saturate(1.35)` + lighter a alpha 0.5.
   - aberración cromática: si `FX.aberr > 0.4` dos copias tintadas (rojo/cian) ± offset.
   - scanlines pattern 4x4, vignette rebuild-safe (`P.vw/P.vh` → check tamaño).
   - flashes (list con vida), modo hiper: gradiente arcoiris + letterbox bars + 2 líneas hue.
10. HUD completo en canvas (ver `ui.hud`): hp con segmentos, escudo, dash charges, barra flow Q,
    wave/oleada grandes + mutadores + evento timer, score/núcleos, combo gigante x escala,
    barra de jefe abajo, armas con nivel abajo-izq, eter/nivel abajo-dcha, toasts, banners,
    contratos late-derecha, vignette de hp bajo, "SOBRECARGA x s", tutorial first-run 9 s.
- `FX.hitstop` congela update (frames cero), `Cam.trauma` shake, `FX.punch` zoom-punch.
- Cam sigue jugador con look-ahead ratón... zoom = `clamp(min(h/660, w/980), 0.5, 2.2) + punch`.
- Paleta viva (`NR.Pal`): hue = `(190 + wave*23) % 360`, hue2=+145, hue3=+280. Enemigos magenta hue 330
  FIJO (código de color: jugador cian, enemigo magenta/rojos, mundo rota). En modo hiper hue cicla.
- FPS objetivo 60. **Medido: 0.87 ms/frame steady** — margen gigante para las mejoras del roadmap.

---

## 8. Cómo probar (receta exacta) — Windows aquí, portable a casa

### 8.1 Servidor local de juego
```
cd neon-rush
python -m http.server 8123           # (Windows Ok con Python instalado)
# abrir http://127.0.0.1:8123/index.html
```
Sin build. Sin npm. Sin deps. Solo abrir la página.

### 8.2 Capturas de canvas (lo usaré para analizar jefes/balas)
En el chat se usó un servidor Python (shotserver, originalmente en Temp) que **acepta POST de base64**:
- Levantar con `python shotserver.py 8232` en otra terminal.
- En el navegador (p. ej. consola DevTools):
```js
fetch('http://127.0.0.1:8232/shot?n=NAME', { method:'POST', body: canvas.toDataURL('image/png') });
```
Esto guarda a `neon-rush/shots/NAME.png` (carpeta git-ignorada). El listado del script sigue aquí —
**cópialo si no existe** (fuente completa del `shotserver.py` que se usó en este chat):

```python
import base64, http.server, os, socketserver, urllib.parse, sys

ROOT = r"C:\Users\ilias.bou.smx_insalf\Documents\Proyecto predeterminado\neon-rush"  # AJUSTA al clon local
SHOTS = os.path.join(ROOT, "shots")
os.makedirs(SHOTS, exist_ok=True)

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204); self.end_headers()

    def do_POST(self):
        q = urllib.parse.urlparse(self.path)
        if q.path != "/shot":
            self.send_response(404); self.end_headers(); return
        n = urllib.parse.parse_qs(q.query).get("n", ["shot"])[0]
        n = "".join(c for c in n if c.isalnum() or c in "._-")
        ln = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(ln).decode("utf8", "ignore")
        if "," in body: body = body.split(",", 1)[1]
        with open(os.path.join(SHOTS, n + ".png"), "wb") as f:
            f.write(base64.b64decode(body))
        self.send_response(200); self.send_header("Content-Type", "text/plain"); self.end_headers()
        self.wfile.write(str(len(body)).encode())

class S(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8232
    S(("127.0.0.1", port), H).serve_forever()
```
⚠ Ajusta `ROOT` a la ruta de tu clon en casa; también puedes borrar la línea y usar `os.getcwd()`.

### 8.3 Pitfall del navegador automatizado (aplicable si usas pruebas headless / tab escondida)
- Ciertos automatismos marcan `document.hidden = true` → `rAF pausado` → la pantalla no avanza sola.
  Solución probada: **simular frames a mano**:
```js
const dt = 1/60;
for (let i = 0; i < 600; i++) { NR.Game.update(dt); NR.Game.draw(); }
```
- ⚠ El tab tiene que cargarse con lo script tags con `?v=N` (v=8) y `NR.Game.init()` ya ejecutado en el HTML.
- ⚠ No hagas `NR.Input.firing = true`: la función es `firing()`; para disparar usa
  `NR.Input.pad.fire = true; NR.Input.mouse.down = true;` y llama dash con
  `NR.Input.hit['Space'] = true` (lo reseteas tu mismo al frame siguiente).
- ⚠ Expects grandes (>60 s) en algunos harness de devtools se expiran: hacer porciones cortas
  (mejor 3 evaluaciones de 5 s que una de 30 s).
- Capturas de ventanas **DOM** (título, tienda, cartas): se usó `html2canvas` inyectado desde CDN,
  con hack: **desactivar animaciones** antes (`document.querySelectorAll('.screen,.pcard,.ucard')`
  → style `animation: none`), porque clona a t=0 con `fill-mode: backwards` (todo opacidad 0).
  Y ojo: "logo" con `background-clip:text` se renderiza como **gradiente en bloque** (limitación de html2canvas)
  pero en el navegador real se ve bien.

### 8.4 Verificación de API interna (analizador rápido)
```js
const need = ['NR.M','NR.RNG','NR.Input','NR.Save','NR.Prestige','NR.Pal','NR.Cam','NR.FX','NR.E',
              'NR.Weapons','NR.Enemies','NR.Director','NR.Mutators','NR.Events','NR.Cards','NR.Meta',
              'NR.Avatars','NR.Contracts','NR.UI','NR.Game','NR.Audio'];
const missing = need.filter(k => !eval(k));
console.assert(!missing.length, 'FALTA: ' + missing);
```
Si sale vacía la lista de faltantes, el juego cargo bien.

### 8.5 Sim AI completa para tests de estrés (la usada este chat)
```js
// en devtools (cuidado con NR.Input.firing = función!)
NR.Game.startRun();
let maxMs = 0;
for (let i = 0; i < 3600; i++) {
  NR.Input.keys['w'] = i % 480 < 240; NR.Input.keys['a'] = i % 960 < 480;
  NR.Input.pad.fire = true; NR.Input.mouse.down = true;
  if (i % 120 === 0) NR.Input.hit['Space'] = true;
  NR.Game.update(1/60); NR.Game.draw();
  NR.Input.hit['Space'] = false;
}
// meta de rendimiento: avg < 2 ms/frame steady-state
```
Y al hacer waves avanzadas: `NR.Director.startWave(N, NR.Game)` para teletransportarte a oleada N.

---

## 9. Bugs arreglados durante este chat (para NO repetir)
1. `Cam.punch` → se movió a `FX.punch` (la cam no recibe punch directo).
2. `NR.FX.explode` no existía → correcto es `NR.Audio.explode`.
3. `const real` reasignado dentro de funciones → `let`.
4. IDs duplicados de elementos (`st-best` repetido) → haz grep de ids antes de añadir elementos DOM.
5. Overlay centrado con `margin:auto` (flex + `align-items:flex-start` obliga a `margin:auto` en `.screen`).
6. **Vignette de blooma con tamaño incorrecto tras resize** → check `P.vw/vh/w` y rebuild (`buildVignette`).
7. Éter perdido lejos del jugador → autocompite a los **1.0 s** de vida.
8. `histeria` y `promesa` no hacían nada → corregidos (spd x1.8 y freeze de spawns + carta gratis).
9. Jefes aparecían cerca del jugador → se obliga `>420px` desviado y clamped a bordes.
10. Dash no dañaba si el target estaba en iframe propio (contar cooldown y dashSet).
11. `?v=N` cache-busting: si no, los usuarios de Vercel seguirán con la versión vieja.
12. Tab oculta pausa rAF (ver 8.3).
13. `Input.firing` ES función. No machques `NR.Input.X` con booleans si X no lo era antes.

## 9b. Información de estructura de run (que a veces cuesta hallarla)
```js
run = {
  avatar, stats, weapons:['pulse'], wlv:{}, cardLvls:{},
  wave, score, kills, eliteKills, cores,
  combo, comboT, maxCombo, hyperUses, revives, noDamage, damageTaken,
  ether, level, nextLevel, echoQueue, toasts,
  mods, modNames, event, start, cardsTaken,
  addWeapon(id), notify(msg, ?life), multiplier(), elapsed()
}
// pero el PLAYER esta en la instancia Game, NO en run:
NR.Game.player  // { hp, shield, x, y, r, dmg, stats, drones, trail, ... }
```
⚠ El resto del equipo conoce: **`g.player`** (no `run.p`), `g.run`, `g.boss`, `g.world = {w:2700, h:1750}`,
`g.scene` ∈ `'title' | 'run' | 'paused' | 'over' | 'cards'` (tal cual se lancen los screens).
LOS ENEMIGOS: `NR.E.enemies` (y balas: `NR.E.pbul`, `NR.E.ebul`, `NR.E.pickups` probablemente,
VERIFICAR con grep `pbul|ebul|prisma` en entities.js).

---

## 10. TRABAJO PENDIENTE (lo importante de esta sección)

El último pedido del usuario: **"mejoralo, mas dopaminico, mas movimiento, mas colores… utilitza tu modelo a tope"**.

### 10.0 YA HECHO de ese pedido (commit `fafa9c4`, verificado)
- core.js: eases (elastic/bounce/expo/circ), `hsl2rgb/rgb`, `randGauss`, `weightedPick`.
- Save: settings extra (trails/screenshake/hitstop/particles/colorblind/reducedFlash), stats extra,
  daily/weekly, level de prestigio, `checkPrestige()`, **`NR.Prestige.Perks` (10 perks)**.
- ⚠ Todo lo otro de este queda pendiente a partir de aquí.

### 10.1 P0 — REVAMP COMPLETO DE `fx.js` (la pieza prometida más grande) — NO EMPEZADO
> Puedes reescribir el archivo entero manteniendo lo que ya se usa desde fuera:
> firma pública a conservar: `Pal.update/c/main/mainDim/alt/warn/white/enemy/ether`,
> `Cam.x/y/zoom/update/follow`, `FX.spawn/sparks/shards/smoke/ring/flash/hitstop/draw/drawText/clear/punch/explode…`
> **Grep desde los otros módulos para saber qué se llama antes de romper nada.**

1. **Partículas**: 15+ types nuevos: spark actual + `trail/ribbon` (segmento con vida con histéresis),
   `lightning` (segmentos que se regeneran por frame), `confeti` (rect gira con gravedad),
   `mini-star`, `ember` (va con gravedad y hue-warm-up), `glass` (shards triangulares), `plasma` (mezcla hue),
   `shockwave` (2 anillos concéntricos alpha), glow-blob. Pool hasta **2600** partículas y
   budget global por `settings.particles` (0.25 / 0.5 / 1 / 1.5x).
2. **Trail system** global: `FX.trail(id)` — puntos; ribbon dual-color (cian/white) para el player;
   trail chevron para rail y seeker ya existe; añadir trail de dash como ribbon.
3. **Cámara**: zoom-kick al kill (+0.04 decae), kick direccional (empujón físico) al recibir daño,
   look-ahead más agresivo con velocidad (mutar el offset hacia la dirección del input),
   rotación sutil por trauma (±2°), "breathing" idle del zoom (±0.005 seno).
4. **Post FX extra**: film grain animado (canvas pattern con seed random por frame);
   lens distortion en hiper (map radial barato con 6 franjas verticales de stretch del propio canvas);
   RGB split progresivo con el daño (subir `FX.aberr` progresivamente al recibir daño + decae);
   flash types tipados (`'white'/'red'/'gold'/'green'/'hyper'`) con easing distinto;
   fondo de pantalla "flat vignette" que late (pulse) cuando `hp < 30%`; hitstop con **1 frame de warp**.
5. **Paleta**: bloques de 5 oleadas con paletas curadas (guarismo por wave block), hue drift continuo
   (`0.3°/s`), boss override color (magenta carbón + rojo), hyper más saturada, sombras/suelo de color
   del bioma actual.
6. **Eventos/mutadores en pantalla**: glow edge del color del evento; iconitos de mutadores vivos en las 4 esquinas.
7. **Texto**: tipos nuevos en `drawText`: `rainbow` (gradient por segmentos), `outline` (stroke 2),
   `shake` jitter, `pop` (easeOutBack), `float-up`, `burst` con letra por letra.
8. **Marcas**: "WAVE 12 CLEARED" tracking animation, règrecion en historia (milestone banners).
   Stack: banner de director ya existe; añadir milestone de combo (25/50/100 kills→ textos "DIOS").

### 10.2 P1 — MOVIMIENTO NUEVO (más dopamenico de verdad)
- **Double-tap dirección** = micro-dash gratis sin consumo (cada 1.2 s por dirección) → "dash casual".
- **Wall bounce**: si el Dash termina en borde de arena, rebota con **+150 pts pantalla "REBOTE!"**.
- **Dash variants**: carta especial "REPROGRAMA DASH" (solo 1): elegir entre `punch` (dash para con AOE),
  `blink` (teleport 180 px afterimage), `cyclone` (dash giratorio que aún hace AOE viajero).
  Guardar el variante en `run.dashMode` y aplicar en el update del dash.
- **Momentum "ON FIRE"**: combo ≥ 20 → `+25% speed`, trail arcoiris, tint warm de pantalla,
  música wedge intensity extra (push la escala).
- **Slow-mo selectivo**: 5 kills con un mismo dash → "SPLASH!" + slowmo 0.10 s ×200 score.

### 10.3 P2 — ARMAS NUEVAS (y fusiones)
- **BEAM**: hold (no tap) rayo continuo con meter; quemar energía aflow mientras hold.
- **MINAS** (sticky, pones minas detonantes y caminas), **BOOMERANG** (vuelve, punch a la vuelta),
  **BLACKHOLE** (proyectil lento que atrae enemigos durante 2 s).
- Fase 2: **fusión de armas** (combinar dos weapons de run: RAIL+NOVA=BARRIDO; claves en cards únicas).
- **Crit chain**: 3 crits seguidos → explosión grande.
- Prestigio perk MAESTRO DE ARMAS: hacer que armas empiezan con `wlv = {id:1}`.

### 10.4 P3 — ENEMIGOS NUEVOS + JEFES 4 y 5
- `saw` (sierra que teleporta y gira), `healer` (aura que cura cercanos), `bomber` (kamikaze aimable),
  `sniper` (láser con telegraph).
- Boss 4 **'ESPIRAL'** (helíx de balas + espejos rotatorios), Boss 5 **'RELOJ'** (zonas de slowmo + garbage time).
- Élite con aura visual distinta (硬化 particles orbitando en hue prostético).

### 10.5 P4 — RETO DIARIO/SEMANAL con seed
- Modo totalmente separate: comenzar run con `NR.RNG(NR.dailySeed())` SIN costes gratuitos:
  custom mutators fijos, contratos vinculados, leaderboard **local** `Save.data.leaderboards.daily/weekly`
  (solo top 10 con fecha, nueva entrada de pantalla "RECORDS" en título).
- `Save.data.daily / weekly` están a punto en defaults: usarlos como cache de resultados.
- UI entrada nueva: botón "RETO DEL DIA" en título (solo colores, reusar lógica de run).
- Ideas nuevas de contratos: "sin dash", "solo melee", "caler 60 combo", "500 ether en 60 s".

### 10.6 P5 — AUDIO 2.0
- Sidechain manual más fuerte en el kick.
- SFX stacking: >10 combos añade segunda capa de hit-sound (choir).
- Hiper: riser sweep al activarse + crash shimmer al terminar.
- Jefes: stinger de acordes. Los kills ya escalan por pitch: seguir ese path pitched pentatonic.

### 10.7 P6 — UI extra azúcar
- **Flechas de daño direccional** (en los bordes apuntando hacia el enemigo que muerde).
- **Minimapa radar** con blanco de cofres (compass para no perderte en arena 2700x1750).
- **Anillo de countdown** de próxima oleada alrededor del player.
- **Level up screen flash** + cartas con borde arcoiris alterno para legendary.
- **End screen** con recap charts (simple bar por oleada con wave index; max 3 barras cada 10 wave).
- Sistema de **achievements toasts** ("GRAN COMBO", "NO-DMG")

### 10.8 P7 — INTEGRAR PRESTIGIO (ya programado en core.js)
- Llamar `Save.checkPrestige()` en `gameOver()` (game.js) y mostrar toast si sube.
- UI tienda: **4º tab "PRESTIGIO"** (`shopTab('pg')`), listar los 10 perks +нить estado
  (`NR.Prestige.Perks.has(id)` depends of level gecheck) con "necesitas nivel N".
- Aplicar efectos en run/start:
  - `prestige_1`: en `startRun`, push random arma `unlock` al player.
  - `prestige_2`: `s.maxHp *= 1.25; s.dashCharges += 1`.
  - `prestige_3`: `s.hyperDur *= 1.30` o rate de charge +30%.
  - `prestige_4`: `run.wlv` inicia todos con 1.
  - `prestige_5`: `s.luck *= 1.5`; cofre cada 5→ un check estándar `n % 5 === 0` (criterio: preguntar al
    editor si quiere cambiar o que cofres salen casi cada vez (n % 3 con perk)).
  - `prestige_6`: entra kill élite → `+15 shield` (en `Enemies.kill` al ver `e.elite`).
  - `prestige_7`: dash `0.24 s` y dmg `*1.75` (o siempre `*1.4*1.25`).
  - `prestige_8`: combo decaygone por tiempo (solo decae al recibir daño o pasar wave).
  - `prestige_9`: si `run.hyperUses > 0` y mueres y hyper activo → revives al 30% (utilizado con la
    maquinaria revives de player.hurt).
  - `prestige_10`: añadir avatar `void` a la lista de avatares (upgrade.js, unlock threshold alto pero gratis
    para prestigio 10).
- ESO + **pantalla de prestigio** en gameover si subió.

### 10.9 P8 — SETTINGS serias (los defaults ya existen)
- Poner sliders reales en pausa (mute/shake/glow ya; añadir hitstop, trails, particles, reducedFlash,
  colorblind palette swap con hues seguros).
- Auto-calidad: si FPS < 50 en 2 s, bajar particles factor / glow (usar `Game.fps`).
- Slider master/music/sfx volume (Audio gain nodes in audio.js).
- FPCap option 30/60/uncapped (meter frame skip en loop ausente).

### 10.10 Vulnerabilidad detectada mientras documentaba (fix+tocar)
- `Input.mouse.wx/wy` existe; pero dash keybrd `dashHit()` en core.js se declara **nunca usada** de game.js
  (dash lo maneja Game con `Input.hit['Space']`). Unificar en ROADS: touch no tiene dash.
  ⚠ En **móvil no hay forma de hacer el dash** (touch no mapea Space). Fix de móvil híbrido:
  doble tap en joystick o esquina de pantalla especial (necesario si vas a promocionar móvil).

---

## 11. Reglas del repo que toca respetar (síntesis de `CLAUDE.md` + decisiones de este chat)

1. **Bump `?v=N`** de los 9 script tags de `index.html` (una sola cifra, `?v=9` tras editar módulos hoy).
2. Sin assets binarios: todo procedural (código + WebAudio + Canvas vector). El CSS va en `index.html`.
3. `localStorage` **key no cambiar**: `neonrush.save.v1` — y **merge aditivo** en `load()` (nuevos campos siempre con default, cero borrado de progreso).
4. Estilo: comentarios en **español**, IIFE / objetos clásicos, nombres cortos, espacio de tabs (mirar cómo
   escribe: sin semicolons a veces? — spaghetti personal favorito del chat, copy the style).
5. Commit + push a `main` para cerrar trabajo (despliega Vercel). `git pull --rebase origin main` **antes** de push si hace falta.
6. No tocar `index.html` (raíz) ni `src/` del juego 3D Neon Coast.
7. `README.md` de neon-rush actualizar si cambia jugabilidad (hoy dicen '?v=8' etc. exactos, no es crítico).

---

## 12. Checklist de verificación antes de commit
1. Abrir la página con servidor local y mirar consola: **0 errores** con DevTools abierto.
2. Sim AI (sección 8.5) 3600+ frames sin console.error (con patching de consola).
3. Probar visualmente: título → jugar → cartas → pausa → death → shop → avatars → title.
4. Test de jefes forzando oleada: `NR.Director.startWave(10, NR.Game)`.
5. Medición fps con el medidor del 8.5.
6. Capturas con shotserver (opcional pero barato).
7. HIVEMIND de auditoría API (sección 8.4) = lista faltante vacía.
8. `git status` limpio; commit con message LIKE "NEON RUSH: …" (mayúsculas como los commits previos);
   push a main; **subir v=N en index.html primero**.

---

## 13. Ideas futuras (no priorizadas) — bin de inspiration
- Modo "BOSS RUSH" solo jefes (los 3 + espiral + reloj) con carta entre jefes.
- Grapple hook a pilares (Phantasy nivel).
- Santuario: estancia segura en la arena cada N oleadas para heal/crafteo.
- "ContratoNegro": contratos de riesgo (subgués extra rewards).
- Ranking local con nombre corto (max 4 chars arcade style).
- Muteo inteligente (fade out audio si tab pierde foco — audio listeners).
- "Modo juegod movil" full layout: joystick izq, dash botón, hiper botón (más tarde).
- Godot + Web export? NO: mantener el fixe JS clásico para Vercel + users ya actuales.

---

## 14. Prompt listo para la siguiente sesión de IA copy-paste

```
Hola. En este repo (Neon Coast) hay un juego 2D en `neon-rush/` llamado NEON RUSH, hecho en este chat.
Lee `neon-rush/HANDOFF.md` completo ANTES de tocar nada: contiene el estado exacto, la API de NR.*,
los bugs arreglados, la receta de pruebas y el roadmap pendiente (sección 10, empieza por P0: revamp de
`src/fx.js` para MUCHO más juice visual: 15+ tipos de particulças, sistema de trails, camara con kick,
post-proceso extra tipo grain/distorsion/RGB-split, paleta con bloques por 5 oleadas).
 recuerda: subir ?v=9 en index.html al tocar módulos, commit+push a main al terminar, save additive,
 namespace NR, sin dependencias, todo en canvas + WebAudio. El rendimiento actual es 0.87 ms/frame:
 hay margen. Si algo no te cuadra, grep primero, cambia después. El juego ya no debe romperse con
 guardado de los usuarios de Vercel (merge aditivo). ¡Adelante!
```

---

*Doc generado en el chat original el 23-oct-2026. Si cambias algo grande, actualiza la sección 10 y el commit hash de la 2.*
