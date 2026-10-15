// REN3D · pajaro.js — MODO PÁJARO
// Juego de vuelo sobre el Humedal El Burro: eres una garza. Atrapa peces que saltan en el agua, llévalos al nido y pasa por los aros.
// Funciona de tres maneras: 🥽 gafas VR (WebXR: Quest, Pico, SteamVR/Windows MR…), 📱 celular en visor Cardboard (pantalla dividida + giroscopio)
// y 💻 pantalla normal (mouse y teclado).
import * as THREE from 'three';
import { StereoEffect } from 'three/addons/effects/StereoEffect.js';

const CSS = `
#pjMenu,#pjListo{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(4,10,18,.72);backdrop-filter:blur(6px);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff}
#pjMenu .card,#pjListo .card{width:min(640px,92vw);max-height:92vh;overflow:auto;background:rgba(10,22,34,.96);border:1px solid rgba(74,222,128,.45);border-radius:16px;padding:22px 24px;box-shadow:0 18px 60px rgba(0,0,0,.6)}
#pjMenu h2,#pjListo h2{font-size:21px;margin-bottom:6px}
#pjMenu p,#pjListo p{font-size:13.5px;line-height:1.5;color:#cbd5e1;margin:6px 0}
#pjMenu .opts{display:flex;flex-direction:column;gap:9px;margin:14px 0}
#pjMenu .opts button,#pjListo button.go{padding:13px 16px;font-size:15px;text-align:left;border-radius:11px;border:1px solid rgba(74,222,128,.5);background:linear-gradient(135deg,rgba(22,101,52,.75),rgba(3,105,161,.65))}
#pjListo button.go{width:100%;text-align:center;font-size:17px;margin-top:12px}
#pjMenu .opts button small{display:block;font-weight:500;color:#bbf7d0;margin-top:3px;font-size:12px}
#pjMenu .opts button:hover,#pjListo button.go:hover{filter:brightness(1.25)}
#pjEstado{font-size:12.5px;color:#7dd3fc;min-height:18px;margin:4px 0 8px}
#pjMenu details{font-size:12.5px;color:#cbd5e1;margin:8px 0}
#pjMenu summary{cursor:pointer;font-weight:700;color:#4ade80}
#pjMenu details ul{margin:6px 0 0 18px;line-height:1.55}
#pjHud{position:fixed;top:14px;left:14px;z-index:30;display:none;min-width:200px;background:rgba(7,18,26,.82);border:1px solid rgba(74,222,128,.45);border-radius:12px;padding:10px 14px;color:#fff;font:13px system-ui,sans-serif;pointer-events:none}
#pjHud .n{font-size:22px;font-weight:800;color:#4ade80}
#pjHud .arrow{display:inline-block;font-size:26px;transition:transform .1s;color:#fde047}
#pjSalir{position:fixed;top:14px;right:14px;z-index:31;display:none}
#pjMsg{position:fixed;left:50%;bottom:16%;transform:translateX(-50%);z-index:31;display:none;background:rgba(7,18,26,.9);border:1px solid rgba(253,224,71,.6);border-radius:14px;padding:10px 20px;font:700 16px system-ui,sans-serif;color:#fef9c3;pointer-events:none;text-align:center}
#pjRuido{position:fixed;inset:0;z-index:29;display:none;pointer-events:none;box-shadow:inset 0 0 160px 40px rgba(239,68,68,.55);opacity:0;transition:opacity .15s}
#pjHud .barra{display:inline-block;width:92px;height:8px;border-radius:5px;background:rgba(255,255,255,.18);vertical-align:middle;overflow:hidden}
#pjHud .barra i{display:block;height:100%;border-radius:5px}
#pjHud .aviso{margin-top:4px;color:#fca5a5;font-weight:800}
body.pj .hud,body.pj #trafficHud,body.pj #toast{display:none!important}
body.pj #pjRuido{display:block}
body.pj.pjcb #pjRuido,body.pj.pjvr #pjRuido{display:none!important}
body.pj #pjHud.on,body.pj #pjSalir.on{display:block}
body.pj.pjcb #pjHud,body.pj.pjcb #pjSalir,body.pj.pjcb #pjMsg{display:none!important}
`;

const giro = (a, b) => { let x = b - a; while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DATOS = [
  'Los humedales filtran el agua y guardan agua de lluvia: protegen a los barrios de las inundaciones.',
  'La tingua de pico rojo y el pato turrio viven en los humedales de la sabana de Bogotá.',
  'Las garzas pescan quedándose muy quietas y dando una estocada rápida con el pico.',
  'El pasto y los juncos del borde del agua son el refugio de los polluelos.',
  'Un humedal sano tiene agua limpia, juncos, árboles en la orilla y muchas aves.',
  'El ruido y el humo de los carros asustan a las aves y les dificultan anidar cerca de las avenidas.',
  'Los humedales urbanos son islas de vida: las aves deben cruzar calles peligrosas para llegar a ellos.'
];

const ESQUEST = /OculusBrowser|Quest|Pico/i.test(navigator.userAgent); // gafas independientes (sin PC)
export function crearPajaro(ctx) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const div = (id, html, cls) => { const e = document.createElement('div'); e.id = id; if (cls) e.className = cls; e.innerHTML = html || ''; document.body.appendChild(e); return e; };
  const menu = div('pjMenu', `<div class="card">
    <h2>🐦 Modo Pájaro · Humedal El Burro</h2>
    <p>Eres una <b>garza</b> que vuela sobre el humedal. <b>Atrapa peces</b> que saltan en el agua (vuela bajo sobre ellos) y <b>llévalos al nido</b> (columna dorada), que queda <b>al otro lado de la avenida</b>. Cuando hay mucho tráfico el ruido y el aire revuelto te frenan y te hunden: ¡aletea, cruza volando alto o espera a que pase la hora pico! Tienes 3 vidas. Entrega 10 peces para completar la misión.</p>
    <div class="opts">
      <button data-m="vr">🥽 Gafas de realidad virtual<small id="pjXr">Meta Quest, Pico, PC con gafas (SteamVR / Windows MR)… se conectan con WebXR</small></button>
      <button data-m="cardboard">📱 Celular + visor Cardboard<small>Pantalla dividida para visores de celular; mueves la cabeza y el celular lo detecta</small></button>
      <button data-m="pantalla">💻 En pantalla (mouse y teclado)<small>Para probar el juego en el computador</small></button>
    </div>
    <label style="display:block;font-size:12.5px;color:#cbd5e1;margin:2px 0"><input type="checkbox" id="pjEsp"> Mostrar en esta pantalla lo mismo que ves en las gafas (en las Quest solas déjalo apagado para ir más fluido)</label>
    <div id="pjEstado"></div>
    <details><summary>¿Cómo se maneja?</summary><ul>
      <li><b>Gafas VR:</b> vuelas hacia donde miras. Gatillo = acelerar · botón lateral (grip) = frenar · palanca izquierda/derecha = girar · ¡mueve los brazos como alas para impulsarte!</li>
      <li><b>Cardboard:</b> mira hacia donde quieres volar · toca la pantalla para acelerar.</li>
      <li><b>Pantalla:</b> clic para capturar el mouse y mirar · <kbd>W</kbd>/<kbd>Shift</kbd> acelerar · <kbd>S</kbd> frenar · <kbd>A</kbd>/<kbd>D</kbd> girar · <kbd>Espacio</kbd> aletear · <kbd>Esc</kbd> salir.</li>
      <li>Vuela bajo (menos de 7 m) sobre un pez para atraparlo. Puedes llevar hasta 3 peces (pesan: con ellos te hundes más sobre la avenida). Para entregar, acércate al nido dorado.</li>
      <li><b>Avenida:</b> cerca de la calle, bajo y con mucho tráfico, la turbulencia te hunde y el ruido sube. Aletear (<kbd>Espacio</kbd>) te sube pero gasta energía; la energía se recupera lejos del tráfico. Si tocas la calle o un carro pierdes una vida y los peces que llevas.</li>
    </ul></details>
    <button data-m="cerrar">Cerrar</button></div>`);
  const listo = div('pjListo', `<div class="card"><h2 id="pjListoT">✅ Mundo listo</h2><p id="pjListoP"></p><button class="go" id="pjGo">▶ Empezar</button></div>`);
  const hud = div('pjHud', '');
  const btnSalir = document.createElement('button'); btnSalir.id = 'pjSalir'; btnSalir.textContent = '✖ Salir del modo pájaro'; document.body.appendChild(btnSalir);
  const msgEl = div('pjMsg', '');
  const ruidoEl = div('pjRuido', '');
  const $ = (id) => document.getElementById(id);

  // ---- estado ----
  let T3 = null, activo = false, modo = null, loop = null, ultimo = 0;
  const rig = new THREE.Group(); rig.rotation.order = 'YXZ';
  let yaw = 0, pit = 0, vel = 14, impulso = 0, acelera = false, frena = false;
  const teclas = {};
  const guardado = {};
  let efecto = null, sesionXR = null, wakeLock = null;
  const dir = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  let calidad = 0, tAcum = 0, nAcum = 0, tPrev = 0;
  let picoM = null, alaI = null, alaD = null, hudPlano = null, hudCv = null, hudTex = null, tHud = 0, tAleteo = 0;
  const sim = { puntos: 0, llevando: 0, entregados: 0, tiempo: 0, mejor: 0, terminado: false, aro: 0, aros: 0, msgHasta: 0, msgTxt: '', vidas: 3, energia: 100, inmune: 0, perdido: false, ex: 0, golpes: 0 };
  let caida = 0, lift = 0, sacudida = 0; // movimiento vertical extra: la turbulencia del tráfico te hunde, aletear te sube
  let peces = [], nido = null, marcas = null, arosPos = [], aroMesh = null;
  let audio = null, vientoG = null, trafG = null, motG = null, tBocina = 3;

  // ---------------------------------------------------------------- menú y arranque
  const estado = (t) => { $('pjEstado').textContent = t || ''; };
  async function abrirMenu() {
    menu.style.display = 'flex'; estado(''); pjEsp.checked = espejo;
    try {
      if (navigator.xr && await navigator.xr.isSessionSupported('immersive-vr')) $('pjXr').textContent = '✔ Tu navegador reconoce gafas VR (WebXR). ' + (ESQUEST ? 'Se carga la versión media (con edificios). Para el máximo realismo conecta las gafas al PC (Quest Link) y abre la página en Chrome o Edge.' : 'Se carga la versión completa, con edificios, sombras y tráfico.') + '';
      else $('pjXr').textContent = navigator.xr ? 'WebXR sin gafas conectadas: conecta las gafas (Quest Link / SteamVR) o abre esta página en el navegador de las gafas.' : 'Este navegador no tiene WebXR: abre la página en el navegador de las gafas (Quest: Meta Browser) o en Chrome/Edge con las gafas conectadas.';
    } catch (e) { /* sin WebXR */ }
  }
  menu.addEventListener('click', (e) => {
    if (e.target === menu) { menu.style.display = 'none'; return; }
    const b = e.target.closest('button[data-m]'); if (!b) return;
    const m = b.getAttribute('data-m');
    if (m === 'cerrar') { menu.style.display = 'none'; return; }
    elegir(m);
  });
  const esperarGesto = (titulo, texto, boton) => new Promise((res) => {
    $('pjListoT').textContent = titulo; $('pjListoP').textContent = texto; $('pjGo').textContent = boton; listo.style.display = 'flex';
    $('pjGo').onclick = () => { listo.style.display = 'none'; res(); };
  });
  async function elegir(m) {
    // celular: versión ligera. Quest sola: versión media (con edificios, sin sombras ni tráfico). Gafas conectadas al PC (Link/SteamVR): versión completa
    const nivel = m === 'cardboard' ? 'ligero' : (m === 'vr' && ESQUEST) ? 'medio' : 'completo';
    let cargo = false;
    if (!ctx.listo()) {
      cargo = true; estado('Cargando el mundo' + (nivel === 'completo' ? '' : nivel === 'medio' ? ' (versión media para las gafas)' : ' (versión ligera)') + '… puede tardar un poco');
      try { await ctx.cargar(nivel); } catch (e) { estado('No se pudo cargar el mundo: ' + (e && e.message || e)); return; }
    }
    if (!ctx.listo()) { estado('El mundo 3D no cargó.'); return; }
    menu.style.display = 'none';
    if (cargo || m === 'vr') {
      const txt = m === 'vr' ? 'Ponte las gafas y pulsa el botón. Si el navegador pide permiso para la realidad virtual, acéptalo.' : m === 'cardboard' ? 'Pulsa el botón, pon el celular en horizontal dentro del visor y acepta el permiso de movimiento.' : 'Pulsa el botón para volar.';
      await esperarGesto('✅ Mundo listo', txt, m === 'vr' ? '🥽 Entrar en realidad virtual' : '▶ Empezar a volar');
    }
    comenzar(m);
  }

  // ---------------------------------------------------------------- objetos del juego
  // ala de garza hecha de plumas: cada pluma tiene forma, raquis y barbas dibujadas (textura), y el ala se dobla en la muñeca al aletear
  function texPluma(punta) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32; const g = cv.getContext('2d');
    const hw = (u) => 14.5 * Math.min(1, 0.35 + u * 4) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 3.2)));
    g.beginPath(); g.moveTo(0, 16); for (let i = 0; i <= 40; i++) { const u = i / 40; g.lineTo(u * 127, 16 - hw(u)); } for (let i = 40; i >= 0; i--) { const u = i / 40; g.lineTo(u * 127, 16 + hw(u)); } g.closePath();
    const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, '#f7f6f1'); gr.addColorStop(punta ? 0.5 : 1, '#efeee8'); if (punta) { gr.addColorStop(0.78, '#8b909a'); gr.addColorStop(1, '#2a2e36'); }
    g.fillStyle = gr; g.fill(); g.save(); g.clip();
    g.lineWidth = 0.9; for (let x = 4; x < 124; x += 2.6) { g.strokeStyle = 'rgba(70,70,60,' + (0.1 + 0.08 * ((x * 7) % 3)) + ')'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x, 16); g.lineTo(x + 13, 16 + s * 14); g.stroke(); } } // barbas
    g.strokeStyle = punta ? 'rgba(20,22,28,.65)' : 'rgba(150,148,138,.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 16); g.lineTo(124, 16); g.stroke(); // raquis
    g.restore();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function geoPluma(L, W) { // lámina fina, en el plano XZ, que sale del origen hacia +X (sin dibujar el borde con una caja)
    const n = 7, P = [], U = [], I = [];
    for (let i = 0; i <= n; i++) { const t = i / n, x = t * L, w = W / 2 * (0.55 + 0.45 * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2)); P.push(x, 0, -w, x, 0, w); U.push(t, 0, t, 1); if (i < n) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
  }
  function crearAlas() {
    const mBlanca = new THREE.MeshLambertMaterial({ map: texPluma(false), alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0x2a2a28 }), mPunta = new THREE.MeshLambertMaterial({ map: texPluma(true), alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0x242426 });
    const mk = (lado) => {
      const piv = new THREE.Group(), esp = new THREE.Group(), muneca = new THREE.Group(); esp.add(muneca); piv.add(esp); if (lado < 0) esp.scale.x = -1;
      const pl = (par, mat, L, W, x, z, ang, y, rz) => { const m = new THREE.Mesh(geoPluma(L, W), mat); m.position.set(x, y || 0, z); m.rotation.y = -ang; if (rz) m.rotation.z = rz; m.frustumCulled = false; par.add(m); return m; };
      const brazo = 0.5, mx = brazo, mz = -0.07; muneca.position.set(mx, 0, mz);
      for (let k = 0; k < 9; k++) pl(esp, k < 3 ? mBlanca : mBlanca, 0.40 + 0.04 * Math.sin(k / 8 * Math.PI), 0.1, brazo * (0.04 + k / 8 * 0.9), -0.02 + (mz + 0.02) * (k / 8), 1.3 - 0.18 * (k / 8), 0.0, 0.02); // secundarias (en el antebrazo)
      const prim = []; for (let k = 0; k < 10; k++) { const a = 0.02 + k / 9 * 0.95, L = 0.34 + 0.24 * Math.sin((1 - k / 9) * 1.35 + 0.15); prim.push(pl(muneca, mPunta, L, 0.09, 0, 0.0, a, 0.004 * k, 0)); } // primarias en abanico, de punta oscura
      for (let k = 0; k < 7; k++) pl(esp, mBlanca, 0.2 + 0.05 * (k % 2), 0.12, brazo * (0.02 + k / 6 * 0.95), -0.035, 1.25, 0.012, 0.0); // cubiertas (tapan la base de las plumas)
      for (let k = 0; k < 5; k++) pl(muneca, mBlanca, 0.17, 0.11, 0.0 + k * 0.01, -0.01 - k * 0.012, 0.35 + k * 0.2, 0.012, 0.0);
      piv.scale.setScalar(0.62); piv.position.set(lado * 0.26, -0.36, -0.7); piv.userData = { muneca, prim }; return piv;
    };
    alaI = mk(-1); alaD = mk(1);
    // pico amarillo, largo y fino, que se ve al mirar hacia abajo
    const pico = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.34, 6), new THREE.MeshLambertMaterial({ color: 0xe8b923, emissive: 0x4a3a05 })); pico.rotation.x = -Math.PI / 2; pico.position.set(0, -0.09, -0.45); pico.frustumCulled = false; picoM = pico;
  }
  function crearHudPlano() {
    hudCv = document.createElement('canvas'); hudCv.width = 640; hudCv.height = 360;
    hudTex = new THREE.CanvasTexture(hudCv); hudTex.colorSpace = THREE.SRGBColorSpace;
    hudPlano = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.405), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
    hudPlano.position.set(0, -0.6, -1.5); hudPlano.renderOrder = 999; hudPlano.frustumCulled = false;
  }
  const matHaz = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  function crearPez() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xd2dde2, metalness: 0.6, roughness: 0.22, emissive: 0x3c5260, emissiveIntensity: 0.6 });
    const cu = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 9), mat); cu.scale.set(0.45, 0.8, 2.0); g.add(cu);
    const co = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 4), mat); co.rotation.x = -Math.PI / 2; co.rotation.z = Math.PI / 4; co.position.z = -0.55; g.add(co);
    g.visible = false; return g;
  }
  function puntoAgua(burro, margen) { for (let i = 0; i < 40; i++) { const p = ctx.aves().punto(burro, margen); if (p) return p; } return [burro.cx, burro.cz]; }
  function ponerPez(f) {
    const b = ctx.aves().burro, p = puntoAgua(b, 14);
    f.x = p[0]; f.z = p[1]; f.vivo = true; f.sig = 0.5 + Math.random() * 3; f.salto = -1; f.mesh.visible = false; f.haz.visible = true; f.haz.position.set(f.x, 30, f.z);
  }
  // ---------------------------------------------------------------- avenida con tráfico (queda entre el humedal y el nido)
  const via = { cadenas: [], coches: [], seg: [], intens: 0.3, hora: 0, d: 999, estado: 0 };
  const lw = (x, z) => ctx.lw(x, z);
  const rnd = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  function cercaDe(pts, x, z) { // punto del borde del polígono más cercano a (x,z): [qx, qz, distancia]
    let m = 1e9, qx = x, qz = z;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length], dx = c[0] - a[0], dz = c[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1), px = a[0] + t * dx, pz = a[1] + t * dz, q = Math.hypot(x - px, z - pz);
      if (q < m) { m = q; qx = px; qz = pz; }
    }
    return [qx, qz, m];
  }
  function construirAvenida(b) {
    via.cadenas = []; via.coches = []; via.seg = [];
    const N = T3.net; if (!N || !N.edges) return;
    const E = [], mx0 = b.x0 - 260, mx1 = b.x1 + 260, mz0 = b.z0 - 260, mz1 = b.z1 + 260;
    for (const e of N.edges) {
      if (e[0] === 'local' || !e[1] || e[1].length < 2) continue;
      const pts = e[1].map(p => lw(p[0], p[1])); let md = 1e9;
      for (const p of pts) if (p[0] > mx0 && p[0] < mx1 && p[1] > mz0 && p[1] < mz1) md = Math.min(md, cercaDe(b.pts, p[0], p[1])[2]);
      E.push({ cl: e[0], pts, md, usado: false });
    }
    const k = (p) => Math.round(p[0] / 3) + ',' + Math.round(p[1] / 3), ady = new Map();
    E.forEach((e, i) => { for (const f of [0, 1]) { const kk = k(f ? e.pts[e.pts.length - 1] : e.pts[0]); if (!ady.has(kk)) ady.set(kk, []); ady.get(kk).push([i, f]); } });
    const extender = (path, largoMax) => { // sigue la vía por su extremo, eligiendo siempre el tramo más recto, para que la avenida no termine de golpe
      let largo = 0;
      while (largo < largoMax) {
        const h = path[path.length - 1], p0 = path[Math.max(0, path.length - 2)];
        let ux = h[0] - p0[0], uz = h[1] - p0[1]; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
        let mejor = null, mv = 0.35;
        for (const [i, f] of ady.get(k(h)) || []) {
          const e = E[i]; if (e.usado) continue; const q = f ? e.pts.slice().reverse() : e.pts, vx = q[1][0] - q[0][0], vz = q[1][1] - q[0][1], dot = (vx * ux + vz * uz) / (Math.hypot(vx, vz) || 1);
          if (dot > mv) { mv = dot; mejor = [i, q]; }
        }
        if (!mejor) break;
        E[mejor[0]].usado = true; const q = mejor[1];
        for (let j = 1; j < q.length; j++) { largo += Math.hypot(q[j][0] - q[j - 1][0], q[j][1] - q[j - 1][1]); path.push(q[j]); }
      }
    };
    let semillas = E.filter(e => e.cl === 'major' && e.md < 170).sort((a, c) => a.md - c.md);
    if (!semillas.length) semillas = E.filter(e => e.md < 170).sort((a, c) => a.md - c.md);
    for (const s of semillas) {
      if (s.usado || via.cadenas.length >= 4) continue;
      s.usado = true; const path = s.pts.slice(); extender(path, 450); path.reverse(); extender(path, 450);
      const cum = [0]; for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
      if (cum[cum.length - 1] < 40) continue;
      via.cadenas.push({ pts: path, cum, L: cum[cum.length - 1] });
      for (let i = 0; i < path.length - 1; i++) via.seg.push([path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]]);
    }
    // avenida de dos calzadas: si hay otra cadena paralela muy cerca, cada una es de un solo sentido (se conduce por la derecha); si no, doble sentido
    const medio = (ch) => { let j = 0; while (j < ch.pts.length - 2 && ch.cum[j + 1] < ch.L / 2) j++; const a = ch.pts[j], e = ch.pts[j + 1], l = (ch.cum[j + 1] - ch.cum[j]) || 1; return { x: (a[0] + e[0]) / 2, z: (a[1] + e[1]) / 2, dx: (e[0] - a[0]) / l, dz: (e[1] - a[1]) / l }; };
    via.cadenas.forEach((ch, ci) => {
      const m = medio(ch); let mejor = null, md = 55;
      via.cadenas.forEach((o, oi) => {
        if (oi === ci) return; let dm = 1e9, ox = 0, oz = 0;
        for (let i = 0; i < o.pts.length - 1; i++) { const a = o.pts[i], e = o.pts[i + 1], dx = e[0] - a[0], dz = e[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = clamp(((m.x - a[0]) * dx + (m.z - a[1]) * dz) / l2, 0, 1), px = a[0] + t * dx, pz = a[1] + t * dz, q = Math.hypot(m.x - px, m.z - pz); if (q < dm) { dm = q; ox = px; oz = pz; } }
        if (dm < md && dm > 3) { md = dm; mejor = [ox, oz]; }
      });
      if (mejor) ch.unico = ((m.x - mejor[0]) * -m.dz + (m.z - mejor[1]) * m.dx) > 0 ? 1 : -1;
    });
    // carros: muchos más que en la simulación normal; según la hora pico se ven unos u otros (rank = orden en que aparecen)
    const Ltot = via.cadenas.reduce((a, c) => a + c.L, 0), TOT = T3.liviano ? 150 : 320; let id = 0;
    via.cadenas.forEach((ch, ci) => {
      const n = Math.round(TOT * ch.L / (Ltot || 1));
      for (let i = 0; i < n; i++) {
        const dir = ch.unico || (id % 2 ? 1 : -1), lane = ch.unico ? (id % 3) : ((id >> 1) % 2);
        via.coches.push({ id: id++, ch: ci, j: 0, s: rnd(id * 3 + 1) * ch.L, dir, off: ch.unico ? (lane - 1) * 3.0 : dir * (2.0 + lane * 2.8), v0: 9 + lane * 0.8 + rnd(id * 5 + 2) * 3.5, rank: rnd(id * 7 + 4), act: false, x: 0, z: 0, h: 0 });
      }
    });
    via.coches.forEach(c => { posCoche(c); c.act = c.rank < 0.3; });
  }
  function posCoche(c) {
    const ch = via.cadenas[c.ch], pts = ch.pts, cum = ch.cum; let j = c.j;
    while (j > 0 && cum[j] > c.s) j--;
    while (j < pts.length - 2 && cum[j + 1] < c.s) j++;
    c.j = j; const a = pts[j], e = pts[j + 1], l = (cum[j + 1] - cum[j]) || 1, t = clamp((c.s - cum[j]) / l, 0, 1), dx = (e[0] - a[0]) / l, dz = (e[1] - a[1]) / l, off = c.off;
    c.x = a[0] + (e[0] - a[0]) * t - dz * off; c.z = a[1] + (e[1] - a[1]) * t + dx * off; c.h = Math.atan2(dx * c.dir, dz * c.dir);
  }
  function distVia(x, z) { // distancia al eje de la avenida
    let m = 1e9;
    for (const s of via.seg) { const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz || 1e-9, t = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / l2, 0, 1), q = Math.hypot(x - (s[0] + t * dx), z - (s[1] + t * dz)); if (q < m) m = q; }
    return m;
  }
  function nidoAlOtroLado(b) { // el nido queda pasando la avenida: al lado contrario del humedal
    if (!via.cadenas.length) return null;
    const av = ctx.aves(); let mejor = null, md = 1e12, cx = 0, cz = 0;
    for (let i = 0; i < 200; i++) { const q = puntoAgua(b, 5); cx += q[0] / 200; cz += q[1] / 200; } // centro del agua (donde saltan los peces)
    const cruza = (ax, az, bx, bz) => via.seg.some(s => { // ¿el trayecto A→B atraviesa algún tramo de la avenida?
      const d1x = bx - ax, d1z = bz - az, d2x = s[2] - s[0], d2z = s[3] - s[1], den = d1x * d2z - d1z * d2x; if (Math.abs(den) < 1e-9) return false;
      const t = ((s[0] - ax) * d2z - (s[1] - az) * d2x) / den, u = ((s[0] - ax) * d1z - (s[1] - az) * d1x) / den; return t > 0 && t < 1 && u > 0 && u < 1;
    });
    for (const ch of via.cadenas) for (let s = 0; s < ch.L; s += 10) {
      let j = 0; while (j < ch.pts.length - 2 && ch.cum[j + 1] < s) j++;
      const a = ch.pts[j], e = ch.pts[j + 1], l = (ch.cum[j + 1] - ch.cum[j]) || 1, t = (s - ch.cum[j]) / l, x = a[0] + (e[0] - a[0]) * t, z = a[1] + (e[1] - a[1]) * t, tx = (e[0] - a[0]) / l, tz = (e[1] - a[1]) / l;
      for (const lado of [-1, 1]) {
        const nx = x - tz * lado * 105, nz = z + tx * lado * 105; // 105 m a un lado de la vía, fuera de la turbulencia fuerte
        if (av.dentro(nx, nz, b.pts) || cercaDe(b.pts, nx, nz)[2] < 40 || distVia(nx, nz) < 80) continue;
        if (!cruza(nx, nz, cx, cz)) continue; // el nido tiene que quedar al otro lado de la avenida respecto al agua
        const dc = Math.hypot(nx - cx, nz - cz); if (dc < md) { md = dc; mejor = [nx, nz]; }
      }
    }
    return mejor;
  }
  // intensidad del tráfico (0 calmado … 1 hora pico): sube y baja cada minuto y sube un poco con cada entrega
  function pasoTrafico(dt) {
    via.hora += dt;
    const onda = 0.5 - 0.5 * Math.cos(via.hora / 60 * Math.PI * 2), meta = clamp(0.2 + 0.7 * onda + 0.04 * sim.entregados, 0.2, 1);
    via.intens += (meta - via.intens) * Math.min(1, dt * 0.35);
    const frac = (0.1 + 0.9 * via.intens) * (via.tope || 1), vm = 1 - 0.5 * via.intens, p = rig.position;
    for (const c of via.coches) {
      c.s += c.dir * c.v0 * vm * dt; const L = via.cadenas[c.ch].L; if (c.s > L) c.s -= L; else if (c.s < 0) c.s += L;
      posCoche(c);
      const q = c.rank < frac; if (q !== c.act && (Math.abs(c.x - p.x) + Math.abs(c.z - p.z) > 140 || p.y > 200)) c.act = q; // no aparecen ni desaparecen carros delante de ti
    }
    const est = via.intens > 0.78 ? 2 : via.intens < 0.42 ? 0 : 1;
    if (est !== via.estado) { if (est === 2 && via.estado !== 2) mensaje('🚨 ¡Hora pico! Muchos carros y mucho ruido: cruza volando alto', 3500); if (est === 0 && via.estado === 2) mensaje('🟢 Pasó la hora pico: buen momento para cruzar', 3000); via.estado = est; }
  }
  // fuerza de la turbulencia en un punto: cerca de la avenida, bajo y con mucho tráfico es máxima
  function exposicion(p) {
    via.d = distVia(p.x, p.z);
    return Math.pow(clamp(1 - via.d / 95, 0, 1), 0.8) * Math.pow(clamp(1 - p.y / 75, 0, 1), 0.8) * via.intens;
  }
  function aleteo() { // aletear sube, pero cansa
    if (sim.energia < 12) { if (performance.now() - (sim.avisoE || 0) > 2500) { sim.avisoE = performance.now(); mensaje('😮‍💨 ¡Sin energía! Planea unos segundos lejos del tráfico', 2000); } lift = Math.min(22, lift + 4); return; }
    sim.energia -= 12; lift = Math.min(22, lift + 15); impulso += 4; tAleteo = 0.6; pip(200, 140, 0.1, 0.05);
  }
  function chocar(motivo) {
    if (sim.inmune > 0 || sim.perdido) return;
    sim.vidas--; sim.golpes++; const perdidos = sim.llevando; sim.llevando = 0; sim.energia = 100; sim.inmune = 3.5; caida = 0; lift = 0;
    pip(220, 60, 0.5, 0.25); setTimeout(() => pip(150, 50, 0.4, 0.2), 120);
    const b = ctx.aves().burro, p0 = puntoSeguro(b); rig.position.set(p0[0], 38, p0[1]); vel = 14; impulso = 0;
    if (sim.vidas <= 0) {
      sim.perdido = true; sim.puntos = Math.max(0, sim.puntos - 100);
      mensaje('💀 ' + motivo + ' Sin vidas · ' + sim.entregados + ' peces entregados. Reiniciando…', 6000);
      setTimeout(() => { if (activo) { Object.assign(sim, { puntos: 0, llevando: 0, entregados: 0, tiempo: 0, terminado: false, aros: 0, vidas: 3, energia: 100, perdido: false, inmune: 3 }); via.hora = 0; mensaje('Nueva ronda: ¡cruza la avenida con cuidado!', 3500); } }, 6500);
    } else mensaje('💥 ' + motivo + (perdidos ? ' Perdiste ' + perdidos + ' pez' + (perdidos > 1 ? 'es' : '') + '.' : '') + ' Vidas: ' + sim.vidas, 4000);
  }
  function puntoSeguro(b) { // un punto del agua lo más lejos posible de la avenida (para arrancar y reaparecer tranquilo)
    let mejor = puntoAgua(b, 40), md = via.seg.length ? distVia(mejor[0], mejor[1]) : 0;
    for (let i = 0; i < 24 && via.seg.length; i++) { const q = puntoAgua(b, 40), d = distVia(q[0], q[1]); if (d > md) { md = d; mejor = q; } }
    return mejor;
  }
  function crearNido(b) {
    const av = ctx.aves(); let pos = nidoAlOtroLado(b);
    for (let i = 0; i < 80 && !pos; i++) { // sin avenida en los datos: nido cerca de la orilla
      const x = b.x0 - 150 + Math.random() * (b.x1 - b.x0 + 300), z = b.z0 - 150 + Math.random() * (b.z1 - b.z0 + 300);
      if (av.dentro(x, z, b.pts)) continue; const d = av.distBorde(x, z, b.pts);
      if (d > 30 && d < 90) pos = [x, z];
    }
    pos = pos || [b.cx + (b.x1 - b.x0) / 2 + 60, b.cz];
    const g = new THREE.Group(); g.position.set(pos[0], 0, pos[1]);
    const marron = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 13, 8), marron); tronco.position.y = 6.5; g.add(tronco);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.55, 8, 18), marron); aro.rotation.x = Math.PI / 2; aro.position.y = 13.2; g.add(aro);
    for (let i = 0; i < 3; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf6efd9 })); h.scale.y = 1.25; h.position.set(Math.cos(i * 2.1) * 0.6, 13.5, Math.sin(i * 2.1) * 0.6); g.add(h); }
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 160, 16, 1, true), matHaz(0xffc933, 0.38)); haz.position.y = 80; g.add(haz);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(11, 0.35, 8, 40), matHaz(0xffe58a, 0.7)); halo.rotation.x = Math.PI / 2; halo.position.y = 13; g.add(halo);
    T3.scene.add(g); return { g, x: pos[0], y: 13, z: pos[1] };
  }
  function crearAros(b) {
    const rx = (b.x1 - b.x0) / 2 + 90, rz = (b.z1 - b.z0) / 2 + 90; arosPos = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; arosPos.push(new THREE.Vector3(b.cx + Math.cos(a) * rx * 0.8, 28 + (i % 3) * 16, b.cz + Math.sin(a) * rz * 0.8)); }
    aroMesh = new THREE.Group();
    aroMesh.add(new THREE.Mesh(new THREE.TorusGeometry(10, 0.9, 10, 40), matHaz(0x5eead4, 0.9)));
    aroMesh.add(new THREE.Mesh(new THREE.TorusGeometry(10, 2.2, 8, 40), matHaz(0x2dd4bf, 0.18)));
    T3.scene.add(aroMesh); colocarAro();
  }
  function colocarAro() {
    const p = arosPos[sim.aro % arosPos.length], q = arosPos[(sim.aro + arosPos.length - 1) % arosPos.length];
    aroMesh.position.copy(p); aroMesh.lookAt(q.x, p.y, q.z); // el aro mira hacia el aro anterior (por donde vienes)
  }
  function preparar() {
    const av = ctx.aves(), b = av && av.burro; if (!b) throw new Error('No hay datos del Humedal El Burro');
    limpiarJuego();
    peces = []; for (let i = 0; i < 7; i++) {
      const mesh = crearPez(), haz = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 8, 1, true), matHaz(0x7dd3fc, 0.3));
      T3.scene.add(mesh, haz); const f = { mesh, haz }; ponerPez(f); peces.push(f);
    }
    try { construirAvenida(b); } catch (e) { console.warn('avenida:', e); via.cadenas = []; via.coches = []; via.seg = []; }
    T3.extraCars = via.coches.length ? (F) => { for (const c of via.coches) if (c.act) F.add(c.x, c.z, c.h, 5000 + c.id); } : null; // la flota de carros dibuja también los de la avenida
    nido = crearNido(b); crearAros(b);
    Object.assign(sim, { puntos: 0, llevando: 0, entregados: 0, tiempo: 0, terminado: false, aro: 0, aros: 0, vidas: 3, energia: 100, inmune: 2, perdido: false, ex: 0, golpes: 0 });
    via.hora = 0; via.intens = 0.3; via.estado = 0; caida = 0; lift = 0; sacudida = 0;
    try { sim.mejor = Number(localStorage.getItem('ren3d_pajaro_mejor') || 0); } catch (e) { sim.mejor = 0; }
    // arranque: sobre el agua del humedal, mirando al primer pez
    const p0 = puntoSeguro(b), f0 = peces[0];
    rig.position.set(p0[0], 38, p0[1]); yaw = Math.atan2(p0[0] - f0.x, p0[1] - f0.z); // la cámara mira hacia -Z girada por yaw: así arranca mirando al primer pez pit = -0.12; vel = 14; impulso = 0;
    rig.rotation.set(0, 0, 0);
  }
  function limpiarJuego() {
    for (const f of peces) { T3.scene.remove(f.mesh, f.haz); }
    peces = [];
    if (T3) T3.extraCars = null; via.coches = []; via.cadenas = []; via.seg = [];
    if (nido) { T3.scene.remove(nido.g); nido = null; }
    if (aroMesh) { T3.scene.remove(aroMesh); aroMesh = null; }
  }

  // ---------------------------------------------------------------- sonido (viento y avisos)
  function iniciarAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      audio = new AC(); const n = audio.sampleRate * 2, buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0);
      let l = 0; for (let i = 0; i < n; i++) { l = l * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = l * 6; }
      const src = audio.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = audio.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; vientoG = audio.createGain(); vientoG.gain.value = 0.05;
      src.connect(f); f.connect(vientoG); vientoG.connect(audio.destination); src.start();
      // ruido del tráfico: rumor grave de motores + zumbido de llantas; sube con la hora pico y cuando estás cerca de la avenida
      const s2 = audio.createBufferSource(); s2.buffer = buf; s2.loop = true; s2.playbackRate.value = 0.8;
      const f2 = audio.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 280; f2.Q.value = 0.6; trafG = audio.createGain(); trafG.gain.value = 0;
      s2.connect(f2); f2.connect(trafG); trafG.connect(audio.destination); s2.start();
      const mot = audio.createOscillator(); mot.type = 'sawtooth'; mot.frequency.value = 52; const fm = audio.createBiquadFilter(); fm.type = 'lowpass'; fm.frequency.value = 160; motG = audio.createGain(); motG.gain.value = 0;
      mot.connect(fm); fm.connect(motG); motG.connect(audio.destination); mot.start();
    } catch (e) { audio = null; }
  }
  function bocina() { // pitido de carro: dos tonos
    if (!audio) return;
    try { const t = audio.currentTime, g = audio.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 + 0.06 * via.intens, t + 0.03); g.gain.setValueAtTime(0.05, t + 0.28); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34); g.connect(audio.destination); for (const fq of [400 + Math.random() * 60, 500 + Math.random() * 60]) { const o = audio.createOscillator(); o.type = 'square'; o.frequency.value = fq; const fl = audio.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1400; o.connect(fl); fl.connect(g); o.start(t); o.stop(t + 0.36); } } catch (e) { /* sin audio */ }
  }
  function pip(f0, f1, dur, vol) {
    if (!audio) return;
    try { const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + dur); } catch (e) { /* sin audio */ }
  }

  // ---------------------------------------------------------------- mensajes y HUD
  function mensaje(t, seg) {
    sim.msgTxt = t; sim.msgHasta = performance.now() + (seg || 3000);
    if (modo !== 'cardboard') { msgEl.textContent = t; msgEl.style.display = 'block'; setTimeout(() => { if (performance.now() >= sim.msgHasta - 50) msgEl.style.display = 'none'; }, (seg || 3000) + 60); }
  }
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function objetivo() { // a dónde apuntar la flecha: el nido si ya llevas 3 peces, si no el pez más cercano
    if (sim.llevando >= 3 && nido) return { x: nido.x, y: nido.y, z: nido.z, txt: 'Llévalos al nido' };
    let best = null, bd = 1e12; const p = rig.position;
    for (const f of peces) { if (!f.vivo) continue; const d = (f.x - p.x) ** 2 + (f.z - p.z) ** 2; if (d < bd) { bd = d; best = f; } }
    if (best) return { x: best.x, y: 1, z: best.z, txt: 'Pez más cercano' };
    return nido ? { x: nido.x, y: nido.y, z: nido.z, txt: 'Nido' } : null;
  }
  function pintarHud() {
    const o = objetivo(), p = rig.position; let rel = 0, dist = 0;
    camaraDir(dir);
    if (o) { rel = giro(Math.atan2(dir.x, dir.z), Math.atan2(o.x - p.x, o.z - p.z)); dist = Math.hypot(o.x - p.x, o.z - p.z); }
    const pez = '🐟'.repeat(sim.llevando) + '·'.repeat(3 - sim.llevando), vid = '❤️'.repeat(Math.max(0, sim.vidas)) + '🖤'.repeat(Math.max(0, 3 - sim.vidas));
    const en = Math.round(sim.energia), colE = en > 50 ? '#4ade80' : en > 20 ? '#fde047' : '#f87171', tr = Math.round(via.intens * 100), colT = tr > 75 ? '#f87171' : tr > 45 ? '#fb923c' : '#4ade80';
    const aviso = sim.ex > 0.12 ? (sim.energia < 12 ? '⚠ ¡Sin energía! Te hundes' : '⚠ Turbulencia del tráfico: sube y aletea') : '';
    if (modo !== 'cardboard') {
      hud.innerHTML = `<div class="n">${sim.puntos} pts <span style="font-size:15px">${vid}</span></div><div>Peces entregados: <b>${sim.entregados}/10</b> · Llevas: ${pez}</div><div>⏱ ${fmt(sim.tiempo)} · Altura ${Math.round(p.y)} m · ${Math.round(vel * 3.6)} km/h</div>`
        + `<div>Energía <span class="barra"><i style="width:${en}%;background:${colE}"></i></span></div><div>🚗 Tráfico <span class="barra"><i style="width:${tr}%;background:${colT}"></i></span> 🔊</div>`
        + (o ? `<div style="margin-top:4px">${o.txt}: <span class="arrow" style="transform:rotate(${-rel}rad)">➤</span> ${Math.round(dist)} m</div>` : '') + (aviso ? `<div class="aviso">${aviso}</div>` : '') + `<div style="color:#5eead4">Aros: ${sim.aros} · mejor puntaje ${sim.mejor}</div>`;
    }
    if (modo !== 'pantalla' && hudCv) {
      const g = hudCv.getContext('2d'), W = hudCv.width, H = hudCv.height;
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(7,22,30,.78)'; g.strokeStyle = sim.ex > 0.12 ? 'rgba(248,113,113,.95)' : 'rgba(74,222,128,.8)'; g.lineWidth = 4;
      g.beginPath(); if (g.roundRect) g.roundRect(4, 4, W - 8, H - 8, 26); else g.rect(4, 4, W - 8, H - 8); g.fill(); g.stroke();
      g.fillStyle = '#4ade80'; g.font = '800 52px system-ui,sans-serif'; g.fillText(sim.puntos + ' pts', 28, 64); g.font = '600 34px system-ui,sans-serif'; g.fillText(vid, 300, 62);
      g.fillStyle = '#fff'; g.font = '600 32px system-ui,sans-serif';
      g.fillText('Peces ' + sim.entregados + '/10   ' + pez, 28, 110); g.fillText('⏱ ' + fmt(sim.tiempo) + '   ' + Math.round(p.y) + ' m', 28, 152);
      const barra = (y, v, c, t) => { g.fillStyle = '#fff'; g.font = '600 26px system-ui,sans-serif'; g.fillText(t, 28, y + 20); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(210, y, 220, 18); g.fillStyle = c; g.fillRect(210, y, 220 * clamp(v, 0, 1), 18); };
      barra(166, sim.energia / 100, colE, 'Energía'); barra(198, via.intens, colT, '🚗 Tráfico');
      g.fillStyle = '#fde047'; g.font = '600 30px system-ui,sans-serif'; g.fillText(o ? o.txt + ' ' + Math.round(dist) + ' m' : '', 28, 262);
      if (o) { g.save(); g.translate(W - 80, 100); g.rotate(-rel); g.fillStyle = '#fde047'; g.beginPath(); g.moveTo(0, -48); g.lineTo(34, 34); g.lineTo(0, 16); g.lineTo(-34, 34); g.closePath(); g.fill(); g.restore(); }
      if (aviso) { g.fillStyle = '#fca5a5'; g.font = '800 26px system-ui,sans-serif'; g.fillText(aviso.slice(0, 38), 28, 300); }
      if (performance.now() < sim.msgHasta) { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(14, 308, W - 28, 46); g.fillStyle = '#fef9c3'; g.font = '700 26px system-ui,sans-serif'; g.fillText(sim.msgTxt.slice(0, 42), 26, 342); }
      hudTex.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- reglas del juego
  function juego(dt) {
    const p = rig.position, av = ctx.aves(), b = av.burro;
    if (!sim.terminado) sim.tiempo += dt;
    // avenida: tráfico, energía, ruido y choques
    if (via.coches.length) {
      pasoTrafico(dt);
      sim.energia = sim.ex < 0.06 ? Math.min(100, sim.energia + 9 * dt) : Math.max(0, sim.energia - 4 * sim.ex * dt);
      sim.inmune = Math.max(0, sim.inmune - dt);
      if (sim.inmune <= 0 && !sim.perdido) {
        if (p.y < 12) for (const c of via.coches) if (c.act && Math.abs(c.x - p.x) < 14 && Math.abs(c.z - p.z) < 14) { // muy cerca del tráfico y bajo: te asustas y te pierdes
          const h = Math.hypot(c.x - p.x, c.z - p.z); if (h < 14 && (p.y < 4 ? h < 4.5 : h < 11)) { chocar(p.y < 4 ? '¡Un carro te golpeó!' : 'Te acercaste demasiado al tráfico y te asustaste.'); break; }
        }
        if (p.y < 2.8 && via.d < 14) chocar('Te hundiste hasta la avenida.');
        if (sim.energia <= 0 && sim.ex > 0.25) chocar('El ruido y el humo te agotaron.');
      }
      const prox = clamp(1 - via.d / 260, 0, 1) * clamp(1 - p.y / 300, 0.15, 1), lou = via.intens * prox;
      if (audio && trafG) {
        trafG.gain.value = 0.015 * via.intens + 0.95 * lou * lou; motG.gain.value = 0.14 * lou * lou;
        tBocina -= dt; if (tBocina <= 0) { tBocina = (2 + Math.random() * 4) / (0.3 + via.intens * 1.6); if (lou > 0.2 && Math.random() < 0.8) bocina(); }
      }
      ruidoEl.style.opacity = String(clamp(sim.ex * 1.5 + (sim.inmune > 3 ? 0.5 : 0), 0, 0.9));
    }
    // peces: de vez en cuando saltan; si vuelas bajo y cerca, los atrapas
    for (const f of peces) {
      if (!f.vivo) { f.espera -= dt; if (f.espera <= 0) ponerPez(f); continue; }
      f.sig -= dt;
      if (f.salto < 0 && f.sig <= 0) { f.salto = 0; av.anillo(f.x, f.z); }
      if (f.salto >= 0) {
        f.salto += dt / 0.95; const u = f.salto;
        if (u >= 1) { f.salto = -1; f.sig = 2 + Math.random() * 3; f.mesh.visible = false; av.anillo(f.x, f.z); }
        else { f.mesh.visible = true; f.mesh.position.set(f.x, 0.4 + 4.2 * 4 * u * (1 - u), f.z); f.mesh.rotation.x = (u - 0.5) * 2.2; f.mesh.rotation.y = f.x; }
      }
      const dh = Math.hypot(f.x - p.x, f.z - p.z);
      if (dh < 7 && p.y < 7.5 && sim.llevando < 3) { // ¡atrapado!
        f.vivo = false; f.espera = 1.5; f.mesh.visible = false; f.haz.visible = false; av.anillo(f.x, f.z);
        sim.llevando++; sim.puntos += 25; pip(520, 1040, 0.18, 0.18);
        mensaje(sim.llevando >= 3 ? '🐟 ¡3 peces! Llévalos al nido dorado' : '🐟 ¡Pez atrapado! (' + sim.llevando + '/3)', 2200);
      } else if (dh < 7 && p.y < 7.5 && sim.llevando >= 3 && performance.now() - (sim.avisoLleno || 0) > 4000) { sim.avisoLleno = performance.now(); mensaje('Ya llevas 3 peces: ve al nido 🪺', 2000); }
    }
    // nido
    if (nido) {
      nido.g.children[nido.g.children.length - 1].rotation.z += dt * 0.5;
      const dn = Math.hypot(nido.x - p.x, nido.y - p.y, nido.z - p.z);
      if (dn < 13 && sim.llevando > 0) {
        const n = sim.llevando; sim.llevando = 0; sim.entregados += n; sim.puntos += 100 * n; pip(660, 1320, 0.35, 0.2); setTimeout(() => pip(880, 1760, 0.4, 0.15), 160);
        mensaje('🪺 ¡Entregaste ' + n + ' pez' + (n > 1 ? 'es' : '') + '! +' + (100 * n) + ' pts', 2800);
        if (sim.entregados % 3 === 0 || sim.entregados < 3) setTimeout(() => mensaje('ℹ️ ' + DATOS[(sim.entregados + 1) % DATOS.length], 5500), 3000);
        if (sim.entregados >= 10 && !sim.terminado) terminar();
      }
    }
    // aros
    if (aroMesh) {
      aroMesh.rotation.z += dt * 0.6;
      if (p.distanceTo(aroMesh.position) < 12) { sim.aro++; sim.aros++; sim.puntos += 50; pip(400, 900, 0.25, 0.15); mensaje('⭕ Aro +50', 1500); colocarAro(); }
    }
    // vuelo rasante: deja ondas sobre el agua
    if (p.y < 3.2 && b && av.dentro(p.x, p.z, b.pts)) { sim.tOnda = (sim.tOnda || 0) - dt; if (sim.tOnda <= 0) { sim.tOnda = 0.35; av.anillo(p.x, p.z); } }
    // fuera del territorio
    if (b && Math.hypot(p.x - b.cx, p.z - b.cz) > 2600) { rig.position.set(b.cx, 60, b.z0 - 80); mensaje('Regresaste al humedal El Burro', 2500); }
  }
  function terminar() {
    sim.terminado = true; const t = sim.tiempo, bono = Math.max(0, Math.round((240 - t) * 2)); sim.puntos += bono;
    if (sim.puntos > sim.mejor) { sim.mejor = sim.puntos; try { localStorage.setItem('ren3d_pajaro_mejor', String(sim.puntos)); } catch (e) { /* sin almacenamiento */ } }
    mensaje('🏆 ¡Misión cumplida! ' + sim.puntos + ' pts · ' + fmt(t) + ' · sigue volando o reinicia', 9000);
    pip(523, 1046, 0.5, 0.2); setTimeout(() => pip(784, 1568, 0.6, 0.2), 250);
    setTimeout(() => { if (activo && sim.terminado) { Object.assign(sim, { puntos: 0, llevando: 0, entregados: 0, tiempo: 0, terminado: false, aros: 0 }); mensaje('Nueva ronda: ¡atrapa 10 peces!', 3000); } }, 12000);
  }

  // ---------------------------------------------------------------- entradas
  const camaraDir = (v) => { rig.updateMatrixWorld(true); T3.camera.getWorldDirection(v); return v; };
  let ori = null, oriYawBase = null, tieneOri = false;
  const qOri = new THREE.Quaternion(), qA = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), qB = new THREE.Quaternion(), eu = new THREE.Euler(), zee = new THREE.Vector3(0, 0, 1);
  const onOri = (e) => { if (e.alpha == null) return; ori = e; tieneOri = true; };
  async function pedirOrientacion() {
    try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return false; } } catch (e) { return false; }
    window.addEventListener('deviceorientation', onOri, true); return true;
  }
  const onKey = (e) => {
    if (!activo) return; teclas[e.code] = e.type === 'keydown';
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.type === 'keydown' && e.code === 'Space' && !e.repeat) aleteo();
    if (e.type === 'keydown' && e.code === 'Escape' && !document.pointerLockElement) salir();
  };
  const onMouse = (e) => {
    if (!activo || modo === 'vr' || (modo === 'cardboard' && tieneOri)) return;
    if (document.pointerLockElement || e.buttons) { yaw -= e.movementX * 0.0024; pit = clamp(pit - e.movementY * 0.0024, -1.25, 1.25); }
  };
  let tToque = 0;
  const onTouchStart = () => { if (activo && (modo === 'cardboard')) { acelera = true; tToque = performance.now(); } };
  const onTouchEnd = () => { acelera = false; if (activo && modo === 'cardboard' && performance.now() - tToque < 220) aleteo(); }; // toque corto = aletear
  const onClickCanvas = () => { if (activo && modo === 'pantalla' && !document.pointerLockElement) { try { T3.renderer.domElement.requestPointerLock(); } catch (e) { /* sin bloqueo */ } } };
  let cdGiro = 0, ctrlY = [null, null], cdAleteo = 0, xrAcelera = 0, xrFrena = 0;
  function leerXR(dt) {
    const s = T3.renderer.xr.getSession && T3.renderer.xr.getSession(); if (!s) return;
    cdGiro -= dt; cdAleteo -= dt; let ac = xrAcelera > 0, fr = xrFrena > 0;
    for (const src of s.inputSources) {
      const gp = src.gamepad; if (!gp) continue;
      const x = gp.axes[2] || 0, y = gp.axes[3] || 0;
      if (Math.abs(x) > 0.7 && cdGiro <= 0) { yaw -= Math.sign(x) * Math.PI / 6; cdGiro = 0.3; }
      if (y < -0.6) ac = true; if (y > 0.6) fr = true;
      if (gp.buttons[0] && gp.buttons[0].pressed) ac = true;
      if (gp.buttons[1] && gp.buttons[1].pressed) fr = true;
    }
    // aletear: bajar rápido las manos da impulso
    for (let i = 0; i < 2; i++) {
      const c = T3.renderer.xr.getController(i); if (!c) continue;
      const y = c.position.y; if (ctrlY[i] != null && dt > 0) { const vy = (y - ctrlY[i]) / dt; if (vy < -1.6 && cdAleteo <= 0) { aleteo(); cdAleteo = 0.4; } }
      ctrlY[i] = y;
    }
    acelera = ac; frena = fr;
  }

  // ---------------------------------------------------------------- bucle
  function bucle() { try { paso(); } catch (e) { if (!bucle.avisado) { bucle.avisado = true; console.warn('modo pájaro:', e); } } }
  function paso(dtFijo) { // dtFijo: sólo para pruebas automáticas (avanza la simulación sin esperar cuadros)
    const now = performance.now() / 1000, dt = dtFijo || clamp(now - (ultimo || now), 0.001, 0.05); ultimo = now;
    const cam = T3.camera;
    sim.ex = via.seg.length ? exposicion(rig.position) : 0; sacudida += dt * 11;
    if (modo !== 'pantalla' && !dtFijo) { // si las gafas/celular no sostienen ~60 cuadros por segundo, se baja el detalle poco a poco para que se vea fluido
      if (tPrev) { tAcum += now - tPrev; nAcum++; } tPrev = now;
      if (nAcum >= 90) { const ms = tAcum / nAcum * 1000; tAcum = 0; nAcum = 0;
        if (ms > 17.5 && calidad < 3) { calidad++; if (calidad === 1) { T3.sun.castShadow = false; via.tope = 0.55; } else if (calidad === 2) { via.tope = 0.3; if (T3.trees) T3.trees.minMs = 2500; try { if (modo === 'vr') T3.renderer.xr.setFoveation(0.6); } catch (e) { /* ok */ } } else { via.tope = 0.15; try { const A = ctx.aves(); if (A && A.grp) A.grp.visible = false; } catch (e) { /* ok */ } } }
      }
    }
    if (modo === 'vr') { leerXR(dt); rig.rotation.set(0, yaw, 0); }
    else if (modo === 'cardboard' && tieneOri && ori) {
      const a = (ori.alpha || 0) * Math.PI / 180, bt = (ori.beta || 0) * Math.PI / 180, gm = (ori.gamma || 0) * Math.PI / 180, o = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * Math.PI / 180;
      eu.set(bt, a, -gm, 'YXZ'); qOri.setFromEuler(eu); qOri.multiply(qA); qOri.multiply(qB.setFromAxisAngle(zee, -o));
      if (oriYawBase == null) { eu.setFromQuaternion(qOri, 'YXZ'); oriYawBase = eu.y; }
      cam.quaternion.copy(qOri); rig.rotation.set(0, yaw - oriYawBase, 0);
      acelera = acelera || !!teclas.KeyW;
    } else { // pantalla (o cardboard sin giroscopio: se mira con el mouse)
      if (teclas.KeyA || teclas.ArrowLeft) yaw += 1.3 * dt; if (teclas.KeyD || teclas.ArrowRight) yaw -= 1.3 * dt;
      if (teclas.ArrowUp) pit = clamp(pit + 0.9 * dt, -1.25, 1.25); if (teclas.ArrowDown) pit = clamp(pit - 0.9 * dt, -1.25, 1.25);
      acelera = !!(teclas.KeyW || teclas.ShiftLeft || teclas.ShiftRight) || (modo === 'cardboard' && acelera); frena = !!teclas.KeyS;
      rig.rotation.set(pit + Math.sin(sacudida * 1.3) * 0.012 * sim.ex, yaw + Math.sin(sacudida * 0.9) * 0.01 * sim.ex, Math.sin(sacudida) * 0.03 * sim.ex); // el aire revuelto sacude la vista
    }
    camaraDir(dir);
    // velocidad: planeo suave; la picada acelera, subir frena; aletear da impulsos
    let obj = 15; if (acelera) obj = 30; if (frena) obj = 7;
    obj *= 1 + clamp(-dir.y * 0.6, -0.35, 0.5); impulso *= Math.exp(-1.6 * dt); obj += impulso;
    obj *= (1 - 0.4 * sim.ex) * (1 - 0.04 * sim.llevando); // con tráfico pesado el aire te frena; los peces pesan
    vel += (obj - vel) * Math.min(1, dt * 1.5); vel = Math.max(6, vel);
    rig.position.addScaledVector(dir, vel * dt);
    // turbulencia sobre la avenida: te hunde (más con peces y sin energía); aletear (lift) te sube
    const hundir = sim.ex * (7 + 1.3 * sim.llevando) * (sim.energia < 5 ? 1.6 : 1);
    caida += (-hundir - caida) * Math.min(1, dt * 2.5); lift *= Math.exp(-1.5 * dt);
    rig.position.y += (caida + lift + sim.ex * (Math.sin(sacudida) * 0.9 + Math.sin(sacudida * 2.7) * 0.6)) * dt;
    if (rig.position.y < 1.8) rig.position.y = 1.8; if (rig.position.y > 600) rig.position.y = 600;
    // alas
    tAleteo = Math.max(0, tAleteo - dt);
    const fq = 1.2 + (acelera ? 2.2 : 0) + (impulso > 1 ? 2 : 0) + (tAleteo > 0 ? 2 : 0), amp = (dir.y < -0.35 ? 0.12 : 0.5) * (frena ? 0.4 : 1);
    const ang = 0.18 + Math.sin(now * fq * Math.PI * 2) * amp;
    if (alaI) {
      alaI.rotation.z = -ang; alaD.rotation.z = ang;
      const ph = now * fq * Math.PI * 2, mun = Math.sin(ph - 1.0) * amp * 0.75 - 0.05, abre = 0.14 * (1 - Math.min(1, Math.abs(amp) * 1.3)) + 0.06 * Math.max(0, Math.cos(ph)); // la muñeca va un poco atrasada y las puntas se abren al planear
      for (const a of [alaI, alaD]) { a.userData.muneca.rotation.z = mun; a.userData.prim.forEach((p, k) => { p.rotation.y = -(0.02 + k / 9 * 0.95) - (k - 4.5) * abre * 0.2; }); }
    }
    if (vientoG && audio) vientoG.gain.value = 0.02 + Math.min(0.12, vel / 400);
    juego(dt);
    T3.vpos = rig.position;
    ctx.sim(dt, rig.position);
    tHud -= dt; if (tHud <= 0) { tHud = 0.2; pintarHud(); }
    if (modo === 'cardboard' && efecto) efecto.render(T3.scene, cam); else T3.renderer.render(T3.scene, cam);
    if (modo === 'vr' && espejo) renderEspejo();
  }

  // ---------------------------------------------------------------- espejo: lo que ves en las gafas también se dibuja en la pantalla del computador
  let espejo = false, camEsp = null, nEsp = 0; // en las Quest solas no hay pantalla de PC: se apaga para ganar velocidad
  function renderEspejo() {
    if ((nEsp++ & 1) || !T3) return; // se refresca cada 2 cuadros
    const r = T3.renderer, cam = T3.camera, w = r.domElement.width, h = r.domElement.height;
    try {
      if (!camEsp) camEsp = new THREE.PerspectiveCamera(75, 1, 0.5, 30000);
      cam.matrixWorld.decompose(camEsp.position, camEsp.quaternion, tmp2.set(1, 1, 1));
      camEsp.aspect = w / h; camEsp.updateProjectionMatrix(); camEsp.updateMatrixWorld(true);
      const xrOn = r.xr.enabled; r.xr.enabled = false;
      const rt = r.getRenderTarget(); r.setRenderTarget(null); r.setScissorTest(false); r.setViewport(0, 0, w / r.getPixelRatio(), h / r.getPixelRatio());
      r.render(T3.scene, camEsp);
      r.xr.enabled = xrOn; r.setRenderTarget(rt);
    } catch (e) { espejo = false; console.warn('espejo en pantalla:', e); try { r.xr.enabled = true; } catch (e2) { /* ok */ } }
  }

  // ---------------------------------------------------------------- entrar / salir
  async function comenzar(m) {
    T3 = ctx.T3(); modo = m; espejo = pjEsp.checked;
    const r = T3.renderer, cam = T3.camera;
    Object.assign(guardado, { pos: cam.position.clone(), tgt: T3.orbit.target.clone(), near: cam.near, far: cam.far, sombra: T3.sun.castShadow, pr: r.getPixelRatio(), quat: cam.quaternion.clone() });
    try {
      T3.orbit.enabled = false; cam.near = 0.5; cam.far = 30000; cam.updateProjectionMatrix();
      if (m === 'cardboard' || (m === 'vr' && ESQUEST)) T3.sun.castShadow = false; // celular y Quest solas: sin sombras para ir fluido (las sombras en baja resolución se veían como cuadros)
      if (m !== 'pantalla') { if (T3.trees) { T3.trees.umbral = 40; T3.trees.minMs = 800; } if (T3.plants) T3.plants.minMs = 800; } // recorrer todos los árboles cada pocos metros daba tirones
      T3.scene.add(rig); rig.add(cam); cam.position.set(0, 0, 0); cam.quaternion.identity();
      if (!alaI) { crearAlas(); crearHudPlano(); }
      cam.add(alaI, alaD, picoM, hudPlano); hudPlano.visible = m !== 'pantalla'; // el HUD dentro de la escena es para gafas y Cardboard
      preparar();
    } catch (e) { console.warn('pájaro:', e); estado(String(e.message || e)); abortar(); menu.style.display = 'flex'; return; }
    if (m === 'vr') {
      try {
        if (!navigator.xr) throw new Error('Este navegador no tiene WebXR');
        r.xr.setReferenceSpaceType('local'); r.xr.enabled = true;
        try { r.xr.setFramebufferScaleFactor(ESQUEST ? 1.0 : 1.3); } catch (e) { /* ok */ } // más resolución = menos borroso
        sesionXR = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
        await r.xr.setSession(sesionXR); try { r.xr.setFoveation(ESQUEST ? 0.2 : 0); } catch (e) { /* ok */ }
        try { if (sesionXR.supportedFrameRates && sesionXR.supportedFrameRates.includes(ESQUEST ? 72 : 90)) await sesionXR.updateTargetFrameRate(ESQUEST ? 72 : 90); } catch (e) { /* ok */ }
        sesionXR.addEventListener('end', () => { if (activo) salir(); });
        for (let i = 0; i < 2; i++) { // manos: esferas luminosas y gatillo/grip
          const c = r.xr.getController(i); rig.add(c);
          c.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshBasicMaterial({ color: i ? 0xfde047 : 0x5eead4 })));
          c.addEventListener('selectstart', () => { xrAcelera++; }); c.addEventListener('selectend', () => { xrAcelera = Math.max(0, xrAcelera - 1); });
          c.addEventListener('squeezestart', () => { xrFrena++; }); c.addEventListener('squeezeend', () => { xrFrena = Math.max(0, xrFrena - 1); });
        }
        document.body.classList.add('pjvr'); r.setPixelRatio(1);
      } catch (e) {
        console.warn('WebXR:', e); abortar(); menu.style.display = 'flex'; estado('No se pudo entrar en VR: ' + (e && e.message || e) + '. Revisa que las gafas estén conectadas y que la página esté en https.'); return;
      }
    } else if (m === 'cardboard') {
      r.setPixelRatio(1); efecto = new StereoEffect(r); efecto.setSize(innerWidth, innerHeight); oriYawBase = null;
      try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch (e) { /* ok */ }
      try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { /* ok */ }
      try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* ok */ }
      const ok = await pedirOrientacion(); if (!ok) ctx.say('Sin giroscopio: mira con el mouse/dedo', 4000);
      cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    }
    activo = true; document.body.classList.add('pj');
    document.body.classList.toggle('pjcb', m === 'cardboard'); hud.classList.toggle('on', m !== 'cardboard'); btnSalir.classList.toggle('on', true);
    ultimo = 0; iniciarAudio();
    r.setAnimationLoop(bucle);
    mensaje('🐦 ¡Vuela! Atrapa peces que saltan en el agua', 4000);
  }
  function abortar() { activo = false; restaurar(); }
  function restaurar() {
    const r = T3 && T3.renderer; if (!r) return;
    try { r.setAnimationLoop(null); } catch (e) { /* ok */ }
    try { if (sesionXR) { const s = sesionXR; sesionXR = null; s.end().catch(() => {}); } } catch (e) { /* ok */ }
    try { for (let i = 0; i < 2; i++) { const c = r.xr.getController(i); rig.remove(c); } r.xr.enabled = false; } catch (e) { /* ok */ }
    const cam = T3.camera;
    try { cam.remove(alaI, alaD, picoM, hudPlano); rig.remove(cam); T3.scene.remove(rig); } catch (e) { /* ok */ }
    limpiarJuego(); T3.vpos = null;
    cam.position.copy(guardado.pos); cam.quaternion.copy(guardado.quat); cam.near = guardado.near; cam.far = guardado.far; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    T3.orbit.target.copy(guardado.tgt); T3.orbit.enabled = true; T3.orbit.update();
    T3.sun.castShadow = guardado.sombra; r.setPixelRatio(guardado.pr); r.setSize(innerWidth, innerHeight); r.setScissorTest(false); r.setViewport(0, 0, innerWidth, innerHeight);
    efecto = null; window.removeEventListener('deviceorientation', onOri, true); ori = null; tieneOri = false;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ok */ }
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* ok */ }
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* ok */ }
    try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) { /* ok */ }
    try { if (audio) { audio.close(); audio = null; vientoG = null; trafG = null; motG = null; } } catch (e) { /* ok */ }
    document.body.classList.remove('pj', 'pjvr', 'pjcb'); hud.classList.remove('on'); btnSalir.classList.remove('on'); msgEl.style.display = 'none';
    xrAcelera = 0; xrFrena = 0; ctrlY = [null, null]; acelera = false; frena = false;
    if (T3.trees) { T3.trees.umbral = 0; T3.trees.minMs = 0; } if (T3.plants) T3.plants.minMs = 0; via.tope = 1; calidad = 0; tAcum = 0; nAcum = 0; tPrev = 0; try { const A = ctx.aves(); if (A && A.grp) A.grp.visible = true; } catch (e) { /* ok */ }
  }
  function salir() { if (!activo) return; activo = false; restaurar(); modo = null; ctx.say('Saliste del modo pájaro', 2500); }
  btnSalir.onclick = salir;
  addEventListener('keydown', onKey); addEventListener('keyup', onKey); addEventListener('mousemove', onMouse);
  addEventListener('touchstart', onTouchStart, { passive: true }); addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('click', (e) => { if (e.target && e.target.tagName === 'CANVAS') onClickCanvas(); });
  addEventListener('resize', () => { if (activo && efecto) { efecto.setSize(innerWidth, innerHeight); T3.camera.aspect = innerWidth / innerHeight; T3.camera.updateProjectionMatrix(); } });
  return { abrirMenu, salir, get activo() { return activo; }, get modo() { return modo; }, renderEspejo, get debug() { return { sim, via, peces, nido, rig, vel, paso, tecla: (c, v) => { teclas[c] = v; }, aleteo, ver: (y, p) => { yaw = y; pit = p; } }; } };
}
