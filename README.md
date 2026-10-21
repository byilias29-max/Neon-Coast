# Neon Coast

Juego 3D de mundo abierto en el navegador: una ciudad costera al atardecer donde
recorres las calles a pie o en coche, atracas tiendas, compras armas, tuneas tu
coche y escapas de una policía de hasta 5 estrellas.

Todo es **procedural**: no hay ni un solo asset binario en el juego. La geometría,
las texturas, los rótulos y el audio se generan en tiempo de ejecución con
Three.js r128. El proyecto **no tiene build step**: `index.html` carga los
módulos de `src/` con `<script>` y listo.

- Motor: **Three.js r128** (servido desde `vendor/three.min.js`, sin CDN).
- Módulos: 46 ficheros en `src/`, cargados en orden por `index.html`.
- Audio: WebAudio (osciladores), sin ficheros de sonido.
- Despliegue: Vercel (`vercel.json` con cabeceras de seguridad y CSP).

## Cómo ejecutarlo

No hace falta instalar nada: sirve la carpeta con cualquier servidor estático.

```sh
# Python (Windows / macOS / Linux)
python -m http.server 8202 --directory .

# o con Node
npx serve -l 8202 .
```

Y abre <http://localhost:8202/>.

> Importante: **no abras `index.html` con doble clic** (`file://`). El juego usa
> `<script>` clásicos y necesita un servidor HTTP para que el navegador no los
> bloquee por CORS.

## Controles

| Tecla | Acción |
|---|---|
| `W A S D` / flechas | Moverse (a pie) o girar el coche |
| Ratón | Cámara (clic en la escena para capturar el puntero) |
| `Shift` | Correr |
| `Espacio` | Saltar / frenar el coche |
| `C` | Agacharse |
| Clic izq. / `J` | Atacar |
| Clic der. | Apuntar |
| `1`–`4` | Cambiar de arma |
| `R` | Recargar |
| `E` | Usar (atracar, saludar, puerta, grafiti, bar, balón) |
| `B` | Tienda / concesionario |
| `H` | Botiquín |
| `F` | Subir / bajar del coche |
| `T` | Taxi (junto a un peatón) |
| `I` | Inventario |
| `M` | Mapa grande |
| `V` | Ampliar / reducir el minimapa |
| `X` | Quitar la marca del mapa |
| `Esc` | Menú de pausa (mapa, opciones, ayuda) |

En el menú de pausa hay además una pestaña **Ayuda** con los mismos atajos.

### Trucos

Escribe el código en el juego (se detectan mientras pulsas letras):

| Código | Efecto |
|---|---|
| `HESOYAM` | Salud y blindaje al máximo, +$500 |
| `BAGUVIX` | Salud infinita |
| `FULLCLIP` | Munición infinita |
| `NUTTERTOOLS` | Bate + pistola |
| `PROFESSIONALTOOLS` | Arsenal completo |
| `AEZAKMI` | Police a ciegas (no suben las estrellas) |
| `LEAVEMEALONE` | Quita la búsqueda |
| `BRINGITON` | 5 estrellas |
| `ROCKETMAN` | Coche cohete |
| `CPKTNWT` | Para el tráfico |
| `CRAZYTOWN` | Pánico peatonal |
| `MONEYTALKS` | +$500 |
| `GHOSTTOWN` | Sin tráfico |
| `PLATINUM` / `SUPERSTAR` | Clasificados |

Además, el código Konami en el título desbloquea la **sala de desarrollo**.

## Estructura

```
index.html          monolito: renderer, escena, jugador, coches, misiones y bucle
vendor/three.min.js Three.js r128 (local, sin CDN)
src/*.js            46 módulos, cargados por <script> en index.html
tests/              suite de Playwright (mapa, minimapa, barrios)
vercel.json         despliegue y cabeceras de seguridad
CLAUDE.md           notas para agentes: reglas de trabajo y mapa de módulos
```

Los módulos se registran en `window.NC` (`src/core.js`) y se enganchan al bucle
principal con `NC.hooks.pre` / `NC.hooks.post` (`src/boot.js`).

## Pruebas

Hay una suite de Playwright que comprueba el mapa grande, el minimapa y la
coherencia de los barrios con el código real de `src/story.js`:

```sh
pip install -r tests/requirements.txt
python -m playwright install chromium
python tests/run_tests.py
```

La suite no necesita el juego completo: monta `tests/test.html`, una página
mínima con los mismos globales, y dibuja los mapas contra la geometría real.

## Despliegue

El repositorio está enlazado a un proyecto de Vercel: **cada `push` a `main`
despliega**. Para desplegar a mano:

```sh
npx vercel deploy --prod --yes
```

`vercel.json` define la CSP, HSTS, `X-Frame-Options` y `Permissions-Policy`.
Si añades un origen externo (un CDN, una fuente…), actualiza también la CSP.

## Licencia

MIT. Three.js se distribuye bajo su propia licencia (MIT), incluida en
`vendor/three.min.js`.
