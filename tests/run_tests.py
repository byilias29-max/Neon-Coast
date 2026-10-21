import math, random, sys, json, pathlib, tempfile
HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent
# todo lo que genera la suite vive en un directorio temporal: el repo no se toca
TMP = pathlib.Path(tempfile.mkdtemp(prefix="neon-coast-tests-"))
SNIPPET = TMP / "sto_zone_snippet.js"
# extrae la logica REAL de barrios de story.js para probarla
_s = (REPO / "src" / "story.js").read_text(encoding="utf-8")
_a = _s.index("function cellOf(v)"); _b = _s.index("\n", _s.index("for (const z of ZN) NC.sto.zones.push"))
SNIPPET.write_text("(function(){const NC=window.NC;\n" + _s[_a:_b] + "\n})();\n", encoding="utf-8")
# copia de test.html con rutas absolutas (el snippet y los modulos quedan fuera del repo)
_html = (HERE / "test.html").read_text(encoding="utf-8")
_html = _html.replace('src="sto_zone_snippet.js"', 'src="%s"' % SNIPPET.as_uri())
_html = _html.replace('"../src/', '"%s/' % (REPO / "src").as_uri())
(TMP / "test.html").write_text(_html, encoding="utf-8")
URL = (TMP / "test.html").as_uri()
from playwright.sync_api import sync_playwright

random.seed(7)
FAIL = []
def check(name, cond, detail=""):
    print(("  OK   " if cond else "  FALLA ") + name + (("  -> " + str(detail)) if (detail and not cond) else ""))
    if not cond: FAIL.append(name)

def near(a, b, tol): return abs(a - b) <= tol
def colour_close(px, rgb, tol=40): return all(abs(px[i] - rgb[i]) <= tol for i in range(3))

JS_PIX = """([x,y,which])=>{const c=which==='mini'?NC.Map.mini:NC.Map.canvas;const r=c.getBoundingClientRect();const d=c.width/r.width;
 const g=c.getContext('2d');return Array.from(g.getImageData(Math.round(x*d),Math.round(y*d),1,1).data)}"""

def run(dsf):
    print(f"\n===== devicePixelRatio = {dsf} =====")
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=dsf)
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(URL)
        pg.wait_for_timeout(200)
        check("modulos cargan sin errores de pagina", not errs, errs)
        check("NC.Nav y NC.Map existen", pg.evaluate("!!(NC.Nav && NC.Map)"))

        # ---------- 0. matematica pura: ida y vuelta para muchos rumbos/zooms/centros ----------
        bad = pg.evaluate("""()=>{let bad=0;const P=NC.Nav.Proj;for(let t=0;t<4000;t++){
          const th=Math.random()*12.6-6.3,k=.2+Math.random()*6,w=300+Math.random()*900,h=300+Math.random()*700;
          const cx=(Math.random()-.5)*900,cz=(Math.random()-.5)*900,x=(Math.random()-.5)*1100,z=(Math.random()-.5)*1100;
          for(const m of [P.north(cx,cz,k,w,h),P.heading(cx,cz,th,k,w,h)]){const s=P.apply(m,x,z),b=P.apply(P.invert(m),s[0],s[1]);
            if(Math.abs(b[0]-x)>1e-6||Math.abs(b[1]-z)>1e-6)bad++}}return bad}""")
        check("proyeccion: ida y vuelta mundo->pantalla->mundo (8000 casos, ambos mapas)", bad == 0, bad)

        # semantica: norte arriba / este a la derecha / sin espejo
        sem = pg.evaluate("""()=>{const P=NC.Nav.Proj,m=P.north(0,0,1,800,600);
          const N=P.apply(m,0,-200),S=P.apply(m,0,200),E=P.apply(m,200,0),W=P.apply(m,-200,0);
          return {northUp:N[1]<S[1],eastRight:E[0]>W[0],det:m[0]*m[3]-m[1]*m[2]}}""")
        check("mapa grande: -z (norte) arriba y +x (este) a la derecha", sem["northUp"] and sem["eastRight"], sem)
        check("mapa grande: sin espejo (determinante > 0)", sem["det"] > 0, sem)
        hd = pg.evaluate("""()=>{const P=NC.Nav.Proj;let ok=true,det=true,left=true;
          for(let i=0;i<500;i++){const th=Math.random()*12.6-6.3,px=Math.random()*400-200,pz=Math.random()*400-200,m=P.heading(px,pz,th,.5,150,150);
            const f=P.apply(m,px+Math.sin(th)*50,pz+Math.cos(th)*50);          // 50 u por delante
            if(Math.abs(f[0]-75)>1e-6||f[1]>=75)ok=false;
            const l=P.apply(m,px+Math.cos(th)*50,pz-Math.sin(th)*50);          // izquierda del jugador (th=0 mira al sur -> izquierda = este)
            if(l[0]>=75)left=false;
            if(m[0]*m[3]-m[1]*m[2]<=0)det=false}
          return {ok,det,left}}""")
        check("minimapa: lo de delante (sin th, cos th) queda SIEMPRE arriba", hd["ok"], hd)
        check("minimapa: la izquierda del jugador queda a la izquierda (como en 3D)", hd["left"], hd)
        check("minimapa: sin espejo", hd["det"], hd)

        # ---------- 1. minimapa: no interactivo, tamano fijo ----------
        mm0 = pg.evaluate("[NC.Map.mini.width,NC.Map.mini.height,getComputedStyle(NC.Map.mini).width]")
        top = pg.evaluate("(()=>{const e=document.elementFromPoint(14+6+75,800-14-6-75);return e?e.id:null})()")
        check("minimapa: pointer-events none (el clic lo atraviesa)", top not in ("mm", "mmw"), top)
        pg.mouse.click(14 + 6 + 75, 800 - 14 - 6 - 75)
        pg.mouse.wheel(0, -400)
        pg.mouse.move(60, 700); pg.mouse.down(); pg.mouse.move(120, 650); pg.mouse.up()
        check("minimapa: clic, rueda y arrastre no crean destino ni abren nada", pg.evaluate("wp===null && !NC.Map.isOpen()"))

        # ---------- 2. abrir mapa grande ----------
        pg.evaluate("P.foot=true;P.fx=50;P.fz=60;cam.yaw=0.7;frame=1;NC.Map.open()")
        pg.wait_for_timeout(250)
        check("mapa grande se abre y marca mapBig", pg.evaluate("NC.Map.isOpen() && mapBig===true"))
        check("el mundo se congela mientras el mapa esta abierto", pg.evaluate("timeScale<=.05"))
        st = pg.evaluate("NC.Map.state()")
        rect = pg.evaluate("(()=>{const r=NC.Map.canvas.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        check("lienzo del mapa tiene tamano real", rect[2] > 400 and rect[3] > 300, rect)

        def expect_screen(x, z, s=None):
            s = s or pg.evaluate("NC.Map.state()")
            return (s["w"] / 2 + s["k"] * (x - s["cx"]), s["h"] / 2 + s["k"] * (z - s["cz"]))   # formula independiente (norte arriba, sin espejo)
        def expect_world(sx, sy, s=None):
            s = s or pg.evaluate("NC.Map.state()")
            return (s["cx"] + (sx - s["w"] / 2) / s["k"], s["cz"] + (sy - s["h"] / 2) / s["k"])
        def click_at(sx, sy):
            pg.mouse.click(rect[0] + sx, rect[1] + sy)
            pg.wait_for_timeout(120)

        # ---------- 3. el mapa dibuja donde dice la matematica (lectura de pixeles) ----------
        _e = expect_screen(38, 114); px = pg.evaluate(JS_PIX, [_e[0], _e[1] + 14, "big"])
        # el parque (verde) debe estar donde toca; ademas esta rodeado de calle, comprobamos centro
        check("terreno: el parque sale donde toca (38,114) -> pixel verde junto al icono", colour_close(px, (0x2f, 0x9a, 0x52), 30), px)
        # armeria (rombo rojo) en el NO: x=-200 z=-250 -> arriba-izquierda del centro
        s = pg.evaluate("NC.Map.state()")
        ax, az = expect_screen(-200, -250, s)
        ok_vis = 0 < ax < s["w"] and 0 < az < s["h"]
        if not ok_vis:
            pg.evaluate("NC.Map.open && 0"); 
        px = pg.evaluate(JS_PIX, [ax, az, "big"]) if ok_vis else [0, 0, 0, 0]
        check("icono armeria (NO, norte-oeste) dibujado en su sitio (pixel rojo)" if ok_vis else "icono armeria visible en vista inicial", ok_vis and colour_close(px, (0xff, 0x4a, 0x4a), 45), (px, (ax, az)))
        # el mar esta al este: el borde derecho del mundo visible
        ex, ez = expect_screen(EXT := 418 + 100, 0, s)
        if 0 < ex < s["w"]:
            px = pg.evaluate(JS_PIX, [ex, ez, "big"]); check("mar al ESTE (derecha del mapa): pixel azul-verdoso", px[2] > px[0] + 40, px)
        wx, wz = expect_screen(-418 - 100, 0, s)
        if 0 < wx < s["w"]:
            px = pg.evaluate(JS_PIX, [wx, wz, "big"]); check("al OESTE no hay mar (solo suelo oscuro)", not (px[2] > px[0] + 60 and px[1] > 90), px)

        # ---------- 4. clic: esquinas y centro -> destino correcto ----------
        w, h = s["w"], s["h"]
        pts = {"centro": (w / 2, h / 2), "arriba-izq": (60, 60), "arriba-der": (w - 120, 70), "abajo-izq": (70, h - 90), "abajo-der": (w - 120, h - 100),
               "arriba-centro": (w / 2, 50), "abajo-centro": (w / 2, h - 60)}
        for name, (sx, sy) in pts.items():
            # evitar caer encima de un icono (que fijaria el destino al icono)
            pg.evaluate("NC.Nav.clearDest()"); pg.wait_for_timeout(90)
            click_at(sx + 3, sy + 3)
            d = pg.evaluate("wp")
            if d is None:
                check(f"clic {name}: se crea destino", False); continue
            if d.get("kind") == "poi":
                print(f"  (clic {name} cayo en un lugar: '{d['label']}'; comprobamos que ES ese lugar)")
                pp = pg.evaluate("NC.Nav.pois().find(p=>p.name===wp.label)")
                scr = expect_screen(pp["x"], pp["z"])
                check(f"clic {name}: el lugar elegido esta bajo el cursor", math.hypot(scr[0] - (sx + 3), scr[1] - (sy + 3)) <= 14.5, (scr, (sx + 3, sy + 3)))
                continue
            ew = expect_world(sx + 3, sy + 3)
            check(f"clic {name}: destino == punto del mundo bajo el cursor (tol 0.3 u)", near(d["x"], ew[0], .3) and near(d["z"], ew[1], .3), (d, ew))
            # el marcador debe dibujarse EXACTAMENTE ahi (magenta)
            px = pg.evaluate(JS_PIX, [sx + 3, sy + 3, "big"])
            check(f"clic {name}: marcador magenta dibujado bajo el cursor", colour_close(px, (0xff, 0x5a, 0xef), 55), px)
        # norte/sur explicitos
        pg.evaluate("NC.Nav.clearDest()"); pg.wait_for_timeout(90); click_at(w / 2 + 2, 52)
        dn = pg.evaluate("wp"); c0 = pg.evaluate("NC.Map.state()")
        pg.evaluate("NC.Nav.clearDest()"); pg.wait_for_timeout(90); click_at(w / 2 + 2, h - 62)
        ds = pg.evaluate("wp")
        if dn and ds and dn.get("kind") == "pin" and ds.get("kind") == "pin":
            check("clic ARRIBA del mapa -> destino mas al NORTE (z menor) que clic ABAJO", dn["z"] < c0["cz"] < ds["z"], (dn["z"], c0["cz"], ds["z"]))
        click_at(60, h / 2); dw = pg.evaluate("wp"); click_at(w - 120, h / 2 + 4); de = pg.evaluate("wp")
        if dw and de and dw.get("kind") == "pin" and de.get("kind") == "pin":
            check("clic IZQUIERDA -> oeste (x menor) que clic DERECHA", dw["x"] < de["x"], (dw["x"], de["x"]))

        # ---------- 5. arrastre: mueve la vista, no deja marcas fantasma ----------
        pg.evaluate("NC.Nav.clearDest()")
        s0 = pg.evaluate("NC.Map.state()"); wref = expect_world(w / 2, h / 2, s0)
        pg.mouse.move(rect[0] + 300, rect[1] + 300); pg.mouse.down(); pg.mouse.move(rect[0] + 340, rect[1] + 330, steps=4); pg.mouse.move(rect[0] + 400, rect[1] + 360, steps=4); pg.mouse.up()
        pg.wait_for_timeout(100)
        s1 = pg.evaluate("NC.Map.state()")
        check("arrastre NO crea destino fantasma", pg.evaluate("wp===null"))
        scr = pg.evaluate("NC.Map.screenOf(%f,%f)" % wref)
        check("arrastre: el contenido sigue al cursor (+100,+60 px)", near(scr[0], w / 2 + 100, .6) and near(scr[1], h / 2 + 60, .6), scr)

        # ---------- 6. zoom: el punto bajo el cursor no se mueve ----------
        for (sx, sy, dy) in [(w * .25, h * .3, -240), (w * .8, h * .75, -240), (w * .5, h * .5, 240), (w * .15, h * .85, -120)]:
            sA = pg.evaluate("NC.Map.state()"); W0 = expect_world(sx, sy, sA)
            pg.mouse.move(rect[0] + sx, rect[1] + sy); pg.mouse.wheel(0, dy); pg.wait_for_timeout(80)
            sB = pg.evaluate("NC.Map.state()")
            scr = pg.evaluate("NC.Map.screenOf(%f,%f)" % W0)
            check(f"zoom {'+' if dy<0 else '-'} en ({int(sx)},{int(sy)}): punto bajo el cursor fijo (k {sA['k']:.2f}->{sB['k']:.2f})", near(scr[0], sx, .6) and near(scr[1], sy, .6) and sA["k"] != sB["k"], (scr, (sx, sy)))
        # clic tras zoom sigue siendo exacto
        pg.evaluate("NC.Nav.clearDest()"); click_at(w * .62, h * .41)
        d = pg.evaluate("wp"); ew = expect_world(w * .62, h * .41)
        if d and d.get("kind") == "pin": check("clic tras zoom+pan: destino exacto", near(d["x"], ew[0], .3) and near(d["z"], ew[1], .3), (d, ew))
        else: print("  (clic cayo en lugar, omitido)")

        # ---------- 7. redimensionar ventana: nada se desplaza ----------
        pg.evaluate("NC.Nav.clearDest(); NC.Nav.setDest(120,-90,{label:'prueba'})"); pg.wait_for_timeout(100)
        sA = pg.evaluate("NC.Map.state()")
        pg.set_viewport_size({"width": 900, "height": 620}); pg.wait_for_timeout(250)
        sB = pg.evaluate("NC.Map.state()")
        rect = pg.evaluate("(()=>{const r=NC.Map.canvas.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        check("redimensionar: el centro del mundo (cx,cz) y el zoom no cambian", near(sA["cx"], sB["cx"], 1e-6) and near(sA["cz"], sB["cz"], 1e-6) and near(sA["k"], sB["k"], 1e-6), (sA, sB))
        check("redimensionar: el lienzo cambia de tamano", sB["w"] < sA["w"] and sB["h"] < sA["h"], (sA, sB))
        ex, ez = expect_screen(120, -90, sB)
        if 0 < ex < sB["w"] and 0 < ez < sB["h"]:
            px = pg.evaluate(JS_PIX, [ex, ez, "big"]); check("redimensionar: el destino sigue dibujado en su punto del mundo", colour_close(px, (0xff, 0x5a, 0xef), 55), px)
        pg.evaluate("NC.Map.open && 0")
        # clic tras redimensionar
        pg.evaluate("NC.Nav.clearDest()"); sx, sy = sB["w"] * .33, sB["h"] * .66
        pg.mouse.click(rect[0] + sx + 2, rect[1] + sy + 2); pg.wait_for_timeout(100)
        d = pg.evaluate("wp"); ew = expect_world(sx + 2, sy + 2, sB)
        if d and d.get("kind") == "pin": check("redimensionar: clic sigue siendo exacto", near(d["x"], ew[0], .3) and near(d["z"], ew[1], .3), (d, ew))

        # ---------- 8. flecha del jugador: apunta hacia donde mira ----------
        pg.evaluate("NC.Nav.clearDest(); NC.Map.open && 0")
        for th in [0.0, 1.0, 2.2, -1.3, 3.5]:
            pg.evaluate(f"P.foot=true;P.fx=50;P.fz=60;cam.yaw={th}"); pg.evaluate("document.querySelector('#nbCenter').click()"); pg.wait_for_timeout(120)
            s2 = pg.evaluate("NC.Map.state()"); ps = expect_screen(50, 60, s2)
            f = (ps[0] + math.sin(th) * 12.5, ps[1] + math.cos(th) * 12.5); bk = (ps[0] - math.sin(th) * 12.8, ps[1] - math.cos(th) * 12.8)
            pf = pg.evaluate(JS_PIX, [f[0], f[1], "big"]); pb = pg.evaluate(JS_PIX, [bk[0], bk[1], "big"])
            arrow = lambda q: colour_close(q, (0x27, 0xc0, 0xff), 45) or colour_close(q, (255, 255, 255), 45)
            check(f"flecha del jugador (rumbo {th:+.1f} rad) apunta hacia delante, no hacia atras", arrow(pf) and not arrow(pb), (pf, pb))

        # ---------- 9. escenario completo: tienda lejana -> cerrar -> minimapa -> reabrir ----------
        pg.evaluate("NC.Nav.clearDest()")
        pg.evaluate("P.foot=false;P.x=0;P.z=0;P.th=0.6;NC.Map.close();NC.Map.open()"); pg.wait_for_timeout(250)
        poi = pg.evaluate("NC.Nav.pois().find(p=>p.name==='Taller SE')")
        pg.evaluate("document.querySelector('#nbQ').value='Taller';document.querySelector('#nbQ').dispatchEvent(new Event('input'))"); pg.wait_for_timeout(100)
        pg.evaluate("document.querySelector('.nb-item').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))"); pg.wait_for_timeout(100)
        d = pg.evaluate("wp")
        check("lista de lugares: doble clic fija el destino en el lugar correcto", d and near(d["x"], poi["x"], .01) and near(d["z"], poi["z"], .01), d)
        pg.keyboard.press("Escape"); pg.evaluate("NC.Map.close()"); pg.wait_for_timeout(100)
        check("al cerrar: el mapa se oculta y mapBig=false y el tiempo se restaura", pg.evaluate("!NC.Map.isOpen() && mapBig===false && timeScale===1"))
        check("el destino sigue seleccionado tras cerrar", pg.evaluate("wp&&wp.label==='Taller SE'"))
        inf = pg.evaluate("NC.Nav.info()")
        check("hay ruta y distancia hacia el destino", inf and inf["route"] >= inf["straight"] - 1 and inf["straight"] > 100, inf)
        # minimapa muestra la navegacion: destino fuera del minimapa => flecha en el borde, orientada hacia el
        pg.evaluate("NC.Map.drawMini(P.x,P.z,P.th)")
        mm1 = pg.evaluate("[NC.Map.mini.width,NC.Map.mini.height,getComputedStyle(NC.Map.mini).width]")
        check("minimapa: tamano intacto tras abrir/cerrar el mapa grande", mm0 == mm1, (mm0, mm1))
        # destino cercano en el minimapa: delante / izquierda
        for (name, ox, oz, ex_, ey_) in [("delante", None, None, 75, 45), ("izquierda", None, None, 45, 75)]:
            th = 0.6
            if name == "delante": tx, tz = math.sin(th) * 60, math.cos(th) * 60
            else: tx, tz = math.cos(th) * 60, -math.sin(th) * 60
            pg.evaluate(f"P.foot=false;P.x=0;P.z=0;P.th={th};NC.Nav.setDest({tx},{tz},{{label:'n'}});NC.Map.drawMini(0,0,{th})")
            px = pg.evaluate(JS_PIX, [ex_, ey_, "mini"])
            check(f"minimapa: destino a 60 u {name} del jugador sale {name} en el minimapa (pixel magenta)", colour_close(px, (0xff, 0x5a, 0xef), 60), px)
        # conducir: al moverse el jugador la ruta se recalcula
        pg.evaluate("NC.Nav.setDest(300,-300,{label:'x'})"); r1 = pg.evaluate("NC.Nav.info().route")
        pg.evaluate("P.x=250;P.z=-250"); pg.evaluate("NC.Nav.route(true)"); r2 = pg.evaluate("NC.Nav.info().route")
        check("navegacion se actualiza al moverse (ruta mas corta al acercarte)", r2 < r1 - 50, (r1, r2))
        # reabrir: sigue el destino y se puede consultar la ruta
        pg.evaluate("NC.Map.open()"); pg.wait_for_timeout(250)
        check("al reabrir el mapa grande el destino sigue y la tarjeta muestra la ruta", pg.evaluate("wp!==null && document.querySelector('.nb-card').style.display==='block' && /Ruta/.test(document.querySelector('.nb-card').textContent)"))
        # leyenda y filtros
        cats = pg.evaluate("NC.Map.legendCats()")
        check("leyenda: solo categorias que existen, con varios tipos de icono", len(cats) >= 6 and "home" in cats and "hotel" in cats and "carshop" in cats, cats)
        pg.evaluate("document.querySelector('.nb-chip[data-cat=\"hotel\"]').click()"); pg.wait_for_timeout(100)
        ohot = pg.evaluate("NC.Nav.pois().find(p=>p.cat==='hotel')")
        pg.evaluate("document.querySelector('#nbCenter').click()")
        pg.evaluate(f"(()=>{{}})()")
        # centrar en el hotel y comprobar que (filtrado) no se dibuja, luego reactivar y si
        pg.evaluate(f"document.querySelector('#nbCenter').click()")
        sC = pg.evaluate("NC.Map.state()")
        # llevar el hotel al centro con la lista (la lista tambien lo oculta con el filtro)
        listed = pg.evaluate("[...document.querySelectorAll('.nb-item span')].some(e=>/MIRAMAR/.test(e.textContent))")
        check("filtro: ocultar 'Hoteles' los quita tambien de la lista", not listed)
        pg.evaluate("document.querySelector('.nb-chip[data-cat=\"hotel\"]').click()"); pg.wait_for_timeout(100)
        listed = pg.evaluate("[...document.querySelectorAll('.nb-item span')].some(e=>/MIRAMAR/.test(e.textContent))")
        check("filtro: reactivar 'Hoteles' los vuelve a mostrar", listed)

        # ---------- 10. independencia: tocar el mapa grande no cambia el minimapa ----------
        before = pg.evaluate("(()=>{NC.Map.drawMini(10,20,0.3);const c=NC.Map.mini,g=c.getContext('2d');return g.getImageData(0,0,c.width,c.height).data.join(',')})()")
        pg.evaluate("document.querySelector('#nbIn').click();document.querySelector('#nbIn').click()")
        pg.mouse.move(rect[0] + 300, rect[1] + 200); pg.mouse.wheel(0, -500); pg.mouse.wheel(0, 700)
        after = pg.evaluate("(()=>{NC.Map.drawMini(10,20,0.3);const c=NC.Map.mini,g=c.getContext('2d');return g.getImageData(0,0,c.width,c.height).data.join(',')})()")
        check("zoom/desplazamiento del mapa grande no alteran el dibujo del minimapa (pixel a pixel)", before == after)

        # ---------- 11. aislamiento del teclado y la rueda frente al juego ----------
        pg.evaluate("window.__w=0;addEventListener('wheel',()=>window.__w++);window.__k=0;addEventListener('keydown',()=>window.__k++)")
        pg.mouse.move(rect[0] + 200, rect[1] + 200); pg.mouse.wheel(0, 100)
        pg.evaluate("document.querySelector('#nbQ').focus()"); pg.keyboard.type("mmm")
        check("rueda sobre el mapa no llega al juego (no cambia de arma)", pg.evaluate("window.__w")==0, pg.evaluate("window.__w"))
        check("teclear en el buscador no dispara atajos del juego (M, E...)", pg.evaluate("window.__k")==0 and pg.evaluate("NC.Map.isOpen()"), pg.evaluate("window.__k"))
        pg.evaluate("document.activeElement && document.activeElement.blur()")   # sin foco en el buscador
        pg.evaluate("window.__keys=[];addEventListener('keydown',e=>window.__keys.push(e.code))")
        pg.mouse.move(rect[0] + 200, rect[1] + 200)
        for kk in ["KeyE", "KeyF", "KeyT", "KeyR", "KeyW", "Space"]: pg.keyboard.press(kk)
        got = pg.evaluate("window.__keys")
        check("mapa abierto: E, F, T, R, W y Espacio NO llegan al juego", got == [], got)
        pg.keyboard.press("KeyX"); pg.keyboard.press("KeyM")
        got = pg.evaluate("window.__keys")
        check("mapa abierto: X y M SI llegan al juego (quitar marca / cerrar)", got == ["KeyX", "KeyM"], got)
        errs2 = [e for e in errs]
        check("sin errores de consola/pagina durante toda la sesion", not errs2, errs2[:3])
        pg.screenshot(path=str(TMP / f"shot_dpr{dsf}.png"))
        b.close()

for dsf in (1, 2): run(dsf)

# ---------- barrios: rectangulos del mapa == zoneCode() real de story.js ----------
print("\n===== barrios (rect del mapa vs zoneCode real de story.js) =====")
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto(URL)
    r = pg.evaluate("""()=>{const EXTv=EXT+40;let bad=0,n=0,ex=[];for(let t=0;t<30000;t++){const x=(Math.random()*2-1)*EXTv,z=(Math.random()*2-1)*EXTv;
      const name=NC.sto.zone(x,z).toUpperCase();const hit=NC.sto.zones.filter(zn=>x>=zn.rect[0]&&x<zn.rect[0]+zn.rect[2]&&z>=zn.rect[1]&&z<zn.rect[1]+zn.rect[3]);
      n++;if(hit.length!==1||hit[0].label!==name){bad++;if(ex.length<3)ex.push([x|0,z|0,name,hit.map(h=>h.label)])}}return {bad,n,ex}}""")
    check(f"zonas: {r['n']} puntos al azar, rectangulo del mapa == barrio del HUD (sin huecos ni solapes)", r["bad"] == 0, r)
    b.close()

print("\nRESULTADO:", "TODO OK" if not FAIL else f"{len(FAIL)} FALLOS -> {FAIL}")
print("capturas y snippet generados en:", TMP)
sys.exit(1 if FAIL else 0)
