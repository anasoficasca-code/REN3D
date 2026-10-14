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
body.pj .hud,body.pj #trafficHud,body.pj #toast{display:none!important}
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
  'Un humedal sano tiene agua limpia, juncos, árboles en la orilla y muchas aves.'
];

export function crearPajaro(ctx) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const div = (id, html, cls) => { const e = document.createElement('div'); e.id = id; if (cls) e.className = cls; e.innerHTML = html || ''; document.body.appendChild(e); return e; };
  const menu = div('pjMenu', `<div class="card">
    <h2>🐦 Modo Pájaro · Humedal El Burro</h2>
    <p>Eres una <b>garza</b> que vuela sobre el humedal. <b>Atrapa peces</b> que saltan en el agua (vuela bajo sobre ellos), <b>llévalos al nido</b> (columna dorada) y pasa por los <b>aros</b> de vuelo. ¡Entrega 10 peces para completar la misión!</p>
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
      <li>Vuela bajo (menos de 7 m) sobre un pez para atraparlo. Puedes llevar hasta 3 peces. Para entregar, acércate al nido dorado.</li>
    </ul></details>
    <button data-m="cerrar">Cerrar</button></div>`);
  const listo = div('pjListo', `<div class="card"><h2 id="pjListoT">✅ Mundo listo</h2><p id="pjListoP"></p><button class="go" id="pjGo">▶ Empezar</button></div>`);
  const hud = div('pjHud', '');
  const btnSalir = document.createElement('button'); btnSalir.id = 'pjSalir'; btnSalir.textContent = '✖ Salir del modo pájaro'; document.body.appendChild(btnSalir);
  const msgEl = div('pjMsg', '');
  const $ = (id) => document.getElementById(id);

  // ---- estado ----
  let T3 = null, activo = false, modo = null, loop = null, ultimo = 0;
  const rig = new THREE.Group(); rig.rotation.order = 'YXZ';
  let yaw = 0, pit = 0, vel = 14, impulso = 0, acelera = false, frena = false;
  const teclas = {};
  const guardado = {};
  let efecto = null, sesionXR = null, wakeLock = null;
  const dir = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  let alaI = null, alaD = null, hudPlano = null, hudCv = null, hudTex = null, tHud = 0, tAleteo = 0;
  const sim = { puntos: 0, llevando: 0, entregados: 0, tiempo: 0, mejor: 0, terminado: false, aro: 0, aros: 0, msgHasta: 0, msgTxt: '' };
  let peces = [], nido = null, marcas = null, arosPos = [], aroMesh = null;
  let audio = null, vientoG = null;

  // ---------------------------------------------------------------- menú y arranque
  const estado = (t) => { $('pjEstado').textContent = t || ''; };
  async function abrirMenu() {
    menu.style.display = 'flex'; estado(''); pjEsp.checked = espejo;
    try {
      if (navigator.xr && await navigator.xr.isSessionSupported('immersive-vr')) $('pjXr').textContent = '✔ Tu navegador reconoce gafas VR (WebXR). Para ir fluido se carga la versión ligera (si ya abriste el mundo completo y va lento, recarga la página y entra directo por aquí).';
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
    const liviano = m !== 'pantalla'; // gafas y celular: sin edificios, sombras ni tráfico, para ir fluido
    let cargo = false;
    if (!ctx.listo()) {
      cargo = true; estado('Cargando el mundo' + (liviano ? ' (versión ligera para VR)' : '') + '… puede tardar un poco');
      try { await ctx.cargar(liviano); } catch (e) { estado('No se pudo cargar el mundo: ' + (e && e.message || e)); return; }
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
  function alaGeo() {
    const n = 8, P = [], C = [], I = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = 0.1 + t * 0.95, ch = 0.4 * (1 - 0.55 * t * t), sw = 0.22 * t * t;
      P.push(x, 0, 0.12 - sw, x, 0, 0.12 - ch - sw);
      const b = t > 0.72 ? 0.07 : 0.93 - t * 0.22; // blanca, con puntas oscuras
      C.push(b, b, b * 0.97, b * 0.9, b * 0.9, b * 0.88);
      if (i < n) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
    return g;
  }
  function crearAlas() {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const g = alaGeo();
    const mk = (lado) => { const piv = new THREE.Group(); const m = new THREE.Mesh(g, mat); if (lado < 0) m.scale.x = -1; m.frustumCulled = false; piv.add(m); piv.scale.setScalar(0.55); piv.position.set(lado * 0.3, -0.62, -0.9); return piv; };
    alaI = mk(-1); alaD = mk(1);
  }
  function crearHudPlano() {
    hudCv = document.createElement('canvas'); hudCv.width = 640; hudCv.height = 300;
    hudTex = new THREE.CanvasTexture(hudCv); hudTex.colorSpace = THREE.SRGBColorSpace;
    hudPlano = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.3375), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
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
  function crearNido(b) {
    const av = ctx.aves(); let pos = null;
    for (let i = 0; i < 80 && !pos; i++) {
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
    nido = crearNido(b); crearAros(b);
    Object.assign(sim, { puntos: 0, llevando: 0, entregados: 0, tiempo: 0, terminado: false, aro: 0, aros: 0 });
    try { sim.mejor = Number(localStorage.getItem('ren3d_pajaro_mejor') || 0); } catch (e) { sim.mejor = 0; }
    // arranque: sobre el agua del humedal, mirando al primer pez
    const p0 = puntoAgua(b, 40), f0 = peces[0];
    rig.position.set(p0[0], 38, p0[1]); yaw = Math.atan2(f0.x - p0[0], f0.z - p0[1]); pit = -0.12; vel = 14; impulso = 0;
    rig.rotation.set(0, 0, 0);
  }
  function limpiarJuego() {
    for (const f of peces) { T3.scene.remove(f.mesh, f.haz); }
    peces = [];
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
    } catch (e) { audio = null; }
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
    const pez = '🐟'.repeat(sim.llevando) + '·'.repeat(3 - sim.llevando);
    if (modo !== 'cardboard') {
      hud.innerHTML = `<div class="n">${sim.puntos} pts</div><div>Peces entregados: <b>${sim.entregados}/10</b> · Llevas: ${pez}</div><div>⏱ ${fmt(sim.tiempo)} · Altura ${Math.round(p.y)} m · ${Math.round(vel * 3.6)} km/h</div>` + (o ? `<div style="margin-top:4px">${o.txt}: <span class="arrow" style="transform:rotate(${-rel}rad)">➤</span> ${Math.round(dist)} m</div>` : '') + `<div style="color:#5eead4">Aros: ${sim.aros} · mejor puntaje ${sim.mejor}</div>`;
    }
    if (modo !== 'pantalla' && hudCv) {
      const g = hudCv.getContext('2d'), W = hudCv.width, H = hudCv.height;
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(7,22,30,.78)'; g.strokeStyle = 'rgba(74,222,128,.8)'; g.lineWidth = 4;
      g.beginPath(); if (g.roundRect) g.roundRect(4, 4, W - 8, H - 8, 26); else g.rect(4, 4, W - 8, H - 8); g.fill(); g.stroke();
      g.fillStyle = '#4ade80'; g.font = '800 56px system-ui,sans-serif'; g.fillText(sim.puntos + ' pts', 28, 74);
      g.fillStyle = '#fff'; g.font = '600 34px system-ui,sans-serif';
      g.fillText('Peces ' + sim.entregados + '/10   ' + pez, 28, 128); g.fillText('⏱ ' + fmt(sim.tiempo) + '   ' + Math.round(p.y) + ' m', 28, 176);
      g.fillStyle = '#fde047'; g.fillText(o ? o.txt + ' ' + Math.round(dist) + ' m' : '', 28, 226);
      if (o) { g.save(); g.translate(W - 80, 100); g.rotate(-rel); g.fillStyle = '#fde047'; g.beginPath(); g.moveTo(0, -48); g.lineTo(34, 34); g.lineTo(0, 16); g.lineTo(-34, 34); g.closePath(); g.fill(); g.restore(); }
      if (performance.now() < sim.msgHasta) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(14, 238, W - 28, 52); g.fillStyle = '#fef9c3'; g.font = '700 28px system-ui,sans-serif'; g.fillText(sim.msgTxt.slice(0, 40), 26, 276); }
      hudTex.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- reglas del juego
  function juego(dt) {
    const p = rig.position, av = ctx.aves(), b = av.burro;
    if (!sim.terminado) sim.tiempo += dt;
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
    if (e.type === 'keydown' && e.code === 'Space' && !e.repeat) impulso += 4;
    if (e.type === 'keydown' && e.code === 'Escape' && !document.pointerLockElement) salir();
  };
  const onMouse = (e) => {
    if (!activo || modo === 'vr' || (modo === 'cardboard' && tieneOri)) return;
    if (document.pointerLockElement || e.buttons) { yaw -= e.movementX * 0.0024; pit = clamp(pit - e.movementY * 0.0024, -1.25, 1.25); }
  };
  const onTouchStart = () => { if (activo && (modo === 'cardboard')) acelera = true; };
  const onTouchEnd = () => { acelera = false; };
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
      const y = c.position.y; if (ctrlY[i] != null && dt > 0) { const vy = (y - ctrlY[i]) / dt; if (vy < -1.6 && cdAleteo <= 0) { impulso += 3.5; cdAleteo = 0.4; tAleteo = 0.6; pip(180, 120, 0.12, 0.06); } }
      ctrlY[i] = y;
    }
    acelera = ac; frena = fr;
  }

  // ---------------------------------------------------------------- bucle
  function bucle() { try { paso(); } catch (e) { if (!bucle.avisado) { bucle.avisado = true; console.warn('modo pájaro:', e); } } }
  function paso() {
    const now = performance.now() / 1000, dt = clamp(now - (ultimo || now), 0.001, 0.05); ultimo = now;
    const cam = T3.camera;
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
      rig.rotation.set(pit, yaw, 0);
    }
    camaraDir(dir);
    // velocidad: planeo suave; la picada acelera, subir frena; aletear da impulsos
    let obj = 15; if (acelera) obj = 30; if (frena) obj = 7;
    obj *= 1 + clamp(-dir.y * 0.6, -0.35, 0.5); impulso *= Math.exp(-1.6 * dt); obj += impulso;
    vel += (obj - vel) * Math.min(1, dt * 1.5); vel = Math.max(6, vel);
    rig.position.addScaledVector(dir, vel * dt);
    if (rig.position.y < 1.8) rig.position.y = 1.8; if (rig.position.y > 600) rig.position.y = 600;
    // alas
    tAleteo = Math.max(0, tAleteo - dt);
    const fq = 1.2 + (acelera ? 2.2 : 0) + (impulso > 1 ? 2 : 0) + (tAleteo > 0 ? 2 : 0), amp = (dir.y < -0.35 ? 0.12 : 0.5) * (frena ? 0.4 : 1);
    const ang = 0.18 + Math.sin(now * fq * Math.PI * 2) * amp;
    if (alaI) { alaI.rotation.z = -ang; alaD.rotation.z = ang; }
    if (vientoG && audio) vientoG.gain.value = 0.02 + Math.min(0.12, vel / 400);
    juego(dt);
    T3.vpos = rig.position;
    ctx.sim(dt, rig.position);
    tHud -= dt; if (tHud <= 0) { tHud = 0.2; pintarHud(); }
    if (modo === 'cardboard' && efecto) efecto.render(T3.scene, cam); else T3.renderer.render(T3.scene, cam);
    if (modo === 'vr' && espejo) renderEspejo();
  }

  // ---------------------------------------------------------------- espejo: lo que ves en las gafas también se dibuja en la pantalla del computador
  let espejo = !/OculusBrowser|Quest/i.test(navigator.userAgent), camEsp = null, nEsp = 0; // en las Quest solas no hay pantalla de PC: se apaga para ganar velocidad
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
      if (m !== 'pantalla') T3.sun.castShadow = false; // sin sombras: ganas muchos cuadros por segundo
      T3.scene.add(rig); rig.add(cam); cam.position.set(0, 0, 0); cam.quaternion.identity();
      if (!alaI) { crearAlas(); crearHudPlano(); }
      cam.add(alaI, alaD, hudPlano); hudPlano.visible = m !== 'pantalla'; // el HUD dentro de la escena es para gafas y Cardboard
      preparar();
    } catch (e) { console.warn('pájaro:', e); estado(String(e.message || e)); abortar(); menu.style.display = 'flex'; return; }
    if (m === 'vr') {
      try {
        if (!navigator.xr) throw new Error('Este navegador no tiene WebXR');
        r.xr.setReferenceSpaceType('local'); r.xr.enabled = true;
        try { r.xr.setFramebufferScaleFactor(1.0); } catch (e) { /* ok */ }
        sesionXR = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
        await r.xr.setSession(sesionXR); try { r.xr.setFoveation(1); } catch (e) { /* ok */ }
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
    try { cam.remove(alaI, alaD, hudPlano); rig.remove(cam); T3.scene.remove(rig); } catch (e) { /* ok */ }
    limpiarJuego(); T3.vpos = null;
    cam.position.copy(guardado.pos); cam.quaternion.copy(guardado.quat); cam.near = guardado.near; cam.far = guardado.far; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    T3.orbit.target.copy(guardado.tgt); T3.orbit.enabled = true; T3.orbit.update();
    T3.sun.castShadow = guardado.sombra; r.setPixelRatio(guardado.pr); r.setSize(innerWidth, innerHeight); r.setScissorTest(false); r.setViewport(0, 0, innerWidth, innerHeight);
    efecto = null; window.removeEventListener('deviceorientation', onOri, true); ori = null; tieneOri = false;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ok */ }
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* ok */ }
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* ok */ }
    try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) { /* ok */ }
    try { if (audio) { audio.close(); audio = null; vientoG = null; } } catch (e) { /* ok */ }
    document.body.classList.remove('pj', 'pjvr', 'pjcb'); hud.classList.remove('on'); btnSalir.classList.remove('on'); msgEl.style.display = 'none';
    xrAcelera = 0; xrFrena = 0; ctrlY = [null, null]; acelera = false; frena = false;
  }
  function salir() { if (!activo) return; activo = false; restaurar(); modo = null; ctx.say('Saliste del modo pájaro', 2500); }
  btnSalir.onclick = salir;
  addEventListener('keydown', onKey); addEventListener('keyup', onKey); addEventListener('mousemove', onMouse);
  addEventListener('touchstart', onTouchStart, { passive: true }); addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('click', (e) => { if (e.target && e.target.tagName === 'CANVAS') onClickCanvas(); });
  addEventListener('resize', () => { if (activo && efecto) { efecto.setSize(innerWidth, innerHeight); T3.camera.aspect = innerWidth / innerHeight; T3.camera.updateProjectionMatrix(); } });
  return { abrirMenu, salir, get activo() { return activo; }, get modo() { return modo; }, renderEspejo, get debug() { return { sim, peces, nido, rig, vel, ver: (y, p) => { yaw = y; pit = p; } }; } };
}
