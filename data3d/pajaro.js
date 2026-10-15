// REN3D · pajaro.js — JUEGO DE AVES DEL HUMEDAL
// Escoges un ave (garza real, gaviota andina o pato turrio); cada una tiene su propia dinámica de vuelo y su propia misión sobre el Humedal El Burro.
// Funciona de tres maneras: gafas VR (WebXR: Quest, Pico, SteamVR/Windows MR), celular en visor Cardboard (pantalla dividida + giroscopio)
// y pantalla normal (mouse y teclado).
import * as THREE from 'three';
import { StereoEffect } from 'three/addons/effects/StereoEffect.js';

const CSS = `
#pjMenu,#pjListo{position:fixed;inset:0;z-index:80;display:none;font-family:"Segoe UI",system-ui,-apple-system,Roboto,sans-serif;color:#e8f1f8}
#pjMenu{overflow:auto;background:radial-gradient(1200px 700px at 78% -10%,rgba(56,189,248,.16),transparent 60%),radial-gradient(900px 600px at 5% 110%,rgba(52,211,153,.12),transparent 60%),rgba(3,8,14,.93);backdrop-filter:blur(8px)}
#pjMenu:before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(115deg,rgba(255,255,255,.025) 0 1px,transparent 1px 46px)}
#pjMenu .wrap{position:relative;max-width:1080px;margin:0 auto;padding:26px 28px 34px;min-height:100%;display:flex;flex-direction:column}
#pjMenu header{display:flex;align-items:center;gap:16px;border-bottom:1px solid rgba(148,163,184,.18);padding-bottom:14px}
#pjMenu .marca{font-weight:800;letter-spacing:.42em;font-size:15px;color:#fff}
#pjMenu .sub{font-size:11.5px;letter-spacing:.22em;text-transform:uppercase;color:#7b8ea3;flex:1}
#pjMenu .x{background:none;border:1px solid rgba(148,163,184,.3);color:#9fb3c8;padding:8px 18px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;border-radius:0}
#pjMenu .x:hover{background:rgba(255,255,255,.08);color:#fff}
#pjMenu h1{font-size:clamp(26px,4.4vw,44px);line-height:1.05;font-weight:800;letter-spacing:-.01em;margin:30px 0 6px;text-transform:uppercase}
#pjMenu h1 span{color:#7dd3fc}
#pjMenu .lead{font-size:14px;color:#93a6ba;max-width:640px;line-height:1.55;margin-bottom:22px}
#pjMenu .aves{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
#pjMenu .ave{position:relative;text-align:left;border:none;border-radius:0;padding:0;background:none;color:inherit;font:inherit;cursor:pointer;transition:transform .18s}
#pjMenu .ave .in{display:block;height:100%;padding:18px 18px 16px;background:linear-gradient(170deg,rgba(18,30,44,.94),rgba(8,15,24,.96));clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px));box-shadow:inset 0 0 0 1px rgba(148,163,184,.2)}
#pjMenu .ave:hover{transform:translateY(-4px)}
#pjMenu .ave.sel .in{background:linear-gradient(170deg,color-mix(in srgb,var(--c) 18%,#0b1622),rgba(8,15,24,.97));box-shadow:inset 0 0 0 2px var(--c)}
#pjMenu .ave .num{position:absolute;right:16px;top:12px;font-size:11px;letter-spacing:.2em;color:#64748b;z-index:2}
#pjMenu .ave.sel .num{color:var(--c)}
#pjMenu .ave svg{display:block;width:100%;height:92px;margin-bottom:8px}
#pjMenu .ave svg .ala{fill:var(--c);opacity:.92}
#pjMenu .ave svg .cu{fill:#eaf3fa}
#pjMenu .ave svg .pc{fill:#f2c230}
#pjMenu .ave h3{font-size:22px;font-weight:800;letter-spacing:.02em;text-transform:uppercase}
#pjMenu .ave .rol{display:block;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--c);margin:3px 0 10px;font-style:normal;font-weight:700}
#pjMenu .ave p{font-size:12.5px;line-height:1.5;color:#a3b5c7;margin:0 0 12px;min-height:56px}
#pjMenu .ave .st{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:5px}
#pjMenu .ave .st li{display:flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#7b8ea3}
#pjMenu .ave .st li b{width:84px;font-weight:600}
#pjMenu .ave .st li span{display:flex;gap:3px}
#pjMenu .ave .st li span i{width:22px;height:5px;background:rgba(148,163,184,.22)}
#pjMenu .ave .st li span i.o{background:var(--c)}
#pjMenu .ave .meta{display:block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d7e4ef;border-top:1px solid rgba(148,163,184,.2);padding-top:10px}
#pjMenu .pie{margin-top:24px;display:flex;flex-wrap:wrap;gap:18px 30px;align-items:flex-end;border-top:1px solid rgba(148,163,184,.18);padding-top:18px}
#pjMenu .ctrl{display:flex;flex-direction:column;gap:7px}
#pjMenu .ctrl label,#pjMenu .esp{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:#7b8ea3}
#pjMenu .seg{display:flex}
#pjMenu .seg button{border-radius:0;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.25);margin-left:-1px;color:#b7c6d6;padding:11px 18px;font-size:12px;letter-spacing:.14em;text-transform:uppercase}
#pjMenu .seg button.on{background:#e8f1f8;color:#07121c;border-color:#e8f1f8}
#pjMenu .jugar{margin-left:auto;border:none;border-radius:0;padding:17px 56px;font-size:15px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#04121c;background:linear-gradient(100deg,var(--cs,#7dd3fc),#34d399);clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%);transition:filter .15s,transform .15s}
#pjMenu .jugar:hover{filter:brightness(1.12);transform:translateY(-2px)}
#pjXr{flex-basis:100%;font-size:12px;color:#7dd3fc;min-height:16px;order:5}
#pjEstado{flex-basis:100%;font-size:12px;color:#fbbf24;min-height:16px;order:6}
#pjMenu .esp{display:flex;align-items:center;gap:8px;cursor:pointer}
#pjMenu details{margin-top:18px;font-size:12.5px;color:#93a6ba}
#pjMenu summary{cursor:pointer;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#7dd3fc}
#pjMenu details ul{margin:10px 0 0 18px;line-height:1.7}
#pjMenu kbd{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);padding:1px 6px;font-size:11px;color:#fff}
@media(max-width:860px){#pjMenu .aves{grid-template-columns:1fr}#pjMenu .jugar{margin-left:0;width:100%}#pjMenu .wrap{padding:18px 16px 28px}#pjMenu .ave p{min-height:0}}
#pjListo{align-items:center;justify-content:center;background:rgba(3,8,14,.86);backdrop-filter:blur(6px)}
#pjListo .card{width:min(520px,92vw);background:linear-gradient(170deg,rgba(18,30,44,.97),rgba(8,15,24,.98));padding:26px 28px;clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px));box-shadow:inset 0 0 0 1px rgba(125,211,252,.35)}
#pjListo h2{font-size:20px;letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px}
#pjListo p{font-size:13.5px;line-height:1.55;color:#a3b5c7;margin:6px 0}
#pjListo button.go{width:100%;margin-top:16px;border:none;border-radius:0;padding:15px;font-size:14px;font-weight:800;letter-spacing:.26em;text-transform:uppercase;color:#04121c;background:linear-gradient(100deg,#7dd3fc,#34d399)}
#pjEstado:empty,#pjXr:empty{display:none}
#pjHud{position:fixed;top:18px;left:18px;z-index:30;display:none;width:268px;padding:14px 16px 12px;color:#e8f1f8;font:12.5px "Segoe UI",system-ui,sans-serif;pointer-events:none;background:linear-gradient(170deg,rgba(10,20,31,.84),rgba(5,11,18,.88));clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));box-shadow:inset 0 0 0 1px rgba(148,163,184,.28)}
#pjHud .cab{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid rgba(148,163,184,.2);padding-bottom:7px;margin-bottom:8px}
#pjHud .ave{font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--c,#7dd3fc);font-weight:700}
#pjHud .n{font-size:26px;font-weight:800;letter-spacing:.02em;line-height:1}
#pjHud .n small{font-size:10px;letter-spacing:.2em;color:#7b8ea3;margin-left:4px;font-weight:600}
#pjHud .fila{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:5px 0;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#7b8ea3}
#pjHud .fila b{color:#e8f1f8;letter-spacing:.06em;font-size:13px;font-weight:700}
#pjHud .pips{display:flex;gap:4px}
#pjHud .pips i{width:15px;height:8px;background:rgba(148,163,184,.25);transform:skewX(-20deg)}
#pjHud .pips i.o{background:var(--c,#7dd3fc)}
#pjHud .pips.vida i.o{background:#f87171}
#pjHud .barra{display:block;width:118px;height:6px;background:rgba(148,163,184,.22);overflow:hidden}
#pjHud .barra i{display:block;height:100%}
#pjHud .guia{display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(148,163,184,.2);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#fde68a}
#pjHud .arrow{display:inline-block;font-size:20px;transition:transform .1s;color:#fde047;line-height:1}
#pjHud .aviso{margin-top:7px;color:#fca5a5;font-weight:700;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase}
#pjSalir{position:fixed;top:18px;right:18px;z-index:31;display:none;border:none;border-radius:0;padding:11px 22px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;background:rgba(8,16,26,.78);color:#dbeafe;box-shadow:inset 0 0 0 1px rgba(148,163,184,.35);clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}
#pjSalir:hover{background:rgba(190,60,60,.8);color:#fff}
#pjMsg{position:fixed;left:50%;bottom:15%;transform:translateX(-50%);z-index:31;display:none;max-width:min(680px,90vw);background:rgba(5,11,18,.9);padding:12px 28px;font:700 13.5px "Segoe UI",system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#f8fafc;pointer-events:none;text-align:center;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);box-shadow:inset 0 -2px 0 #fbbf24}
#pjRuido{position:fixed;inset:0;z-index:29;display:none;pointer-events:none;box-shadow:inset 0 0 160px 40px rgba(239,68,68,.55);opacity:0;transition:opacity .15s}
body.pj .hud,body.pj #trafficHud,body.pj #toast{display:none!important}
body.pj #pjRuido{display:block}
body.pj.pjcb #pjRuido,body.pj.pjvr #pjRuido{display:none!important}
body.pj #pjHud.on,body.pj #pjSalir.on{display:block}
body.pj.pjcb #pjHud,body.pj.pjcb #pjSalir,body.pj.pjcb #pjMsg{display:none!important}
body.pj #hud-c{display:none!important}
`;

const giro = (a, b) => { let x = b - a; while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sinEmoji = (s) => String(s).replace(/[\p{Extended_Pictographic}‍️▶➜✔✖]/gu, '').replace(/\s{2,}/g, ' ').trim();
const DATOS = [
  'Los humedales filtran el agua y guardan agua de lluvia: protegen a los barrios de las inundaciones.',
  'La tingua de pico rojo y el pato turrio viven en los humedales de la sabana de Bogotá.',
  'Las garzas pescan quedándose muy quietas y dando una estocada rápida con el pico.',
  'El pasto y los juncos del borde del agua son el refugio de los polluelos.',
  'Un humedal sano tiene agua limpia, juncos, árboles en la orilla y muchas aves.',
  'El ruido y el humo de los carros asustan a las aves y les dificultan anidar cerca de las avenidas.',
  'Los humedales urbanos son islas de vida: las aves deben cruzar calles peligrosas para llegar a ellos.'
];

// Cada ave cambia la velocidad, la energía, el giro, la capacidad de carga y, sobre todo, la misión
const AVES_JUEGO = {
  garza: {
    id: 'garza', nombre: 'Garza real', rol: 'Pescadora', color: '#7dd3fc', objetivo: 'pesca', meta: 10, cap: 3,
    resumen: 'Atrapa los peces que saltan en el humedal y llévalos a tu nido, que queda al otro lado de la avenida. Vuelo elegante y estable.',
    vel: { min: 6, cru: 15, max: 30 }, regen: 9, hundir: 1.0, giro: 1.3, item: ['pez', 'peces'],
    stats: [['Velocidad', 2], ['Resistencia', 3], ['Agilidad', 2], ['Dificultad', 2]], metaTxt: 'Entrega 10 peces al nido',
    ala: { base: '#f7f6f1', punta: '#2a2e36', espejo: null }, pico: 0xe8b923, escala: 0.62,
    svg: '<path class="ala" d="M100 50C72 28 32 26 3 46c34-2 62 8 97 17 35-9 63-19 97-17-29-20-69-18-97 4z"/><ellipse class="cu" cx="100" cy="54" rx="8" ry="17"/><path class="cu" d="M96 40 92 16c-1-5 8-5 8 0l-2 24z"/><path class="pc" d="M92 16l-4-9 8 3z"/>'
  },
  gaviota: {
    id: 'gaviota', nombre: 'Gaviota andina', rol: 'Carroñera veloz', color: '#fbbf24', objetivo: 'carronera', meta: 8, cap: 2,
    resumen: 'Recoge restos de comida que quedan junto a la avenida y llévalos a salvo a tu nido en el humedal. Muy rápida, pero cada recogida es una apuesta.',
    vel: { min: 9, cru: 21, max: 40 }, regen: 7, costo: 14, hundir: 0.8, giro: 1.7, item: ['resto de comida', 'restos de comida'],
    stats: [['Velocidad', 3], ['Resistencia', 1], ['Agilidad', 3], ['Dificultad', 3]], metaTxt: 'Rescata 8 restos de comida',
    ala: { base: '#cfd4dc', punta: '#15171d', espejo: null }, pico: 0xd9532b, escala: 0.58,
    svg: '<path class="ala" d="M100 52C78 34 50 28 24 38 16 28 7 28 1 35c24 17 60 19 99 28 39-9 75-11 99-28-6-7-15-7-23 3-26-10-54-4-76 14z"/><ellipse class="cu" cx="100" cy="55" rx="9" ry="14"/><circle class="cu" cx="100" cy="38" r="7"/><path class="pc" d="M105 38l9 3-9 3z"/>'
  },
  pato: {
    id: 'pato', nombre: 'Pato turrio', rol: 'Contrarreloj', color: '#34d399', objetivo: 'semillas', meta: 14, cap: 1,
    resumen: 'Roza el agua para recoger semillas flotantes antes de que se acabe el tiempo; cada semilla suma segundos. Pesado de girar, pero aguanta mucho.',
    vel: { min: 8, cru: 18, max: 34 }, regen: 12, costo: 10, hundir: 1.3, giro: 1.0, item: ['semilla', 'semillas'],
    stats: [['Velocidad', 3], ['Resistencia', 3], ['Agilidad', 1], ['Dificultad', 1]], metaTxt: 'Junta 14 semillas contra el reloj',
    ala: { base: '#a99a82', punta: '#3b2f22', espejo: '#2f6aa3' }, pico: 0x8fb4d9, escala: 0.66,
    svg: '<path class="ala" d="M100 50C80 36 52 34 28 46c26 6 50 12 72 20 22-8 46-14 72-20-24-12-52-10-72 4z"/><ellipse class="cu" cx="100" cy="56" rx="11" ry="15"/><circle class="cu" cx="100" cy="38" r="7"/><path class="pc" d="M95 37l-9 4 9 3z"/>'
  }
};

const ESQUEST = /OculusBrowser|Quest|Pico/i.test(navigator.userAgent); // gafas independientes (sin PC)
export function crearPajaro(ctx) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const div = (id, html, cls) => { const e = document.createElement('div'); e.id = id; if (cls) e.className = cls; e.innerHTML = html || ''; document.body.appendChild(e); return e; };
  const tarjeta = (a, i) => `<button class="ave" data-ave="${a.id}" style="--c:${a.color}"><span class="in"><span class="num">0${i + 1}</span><svg viewBox="0 0 200 80" aria-hidden="true">${a.svg}</svg><h3>${a.nombre}</h3><em class="rol">${a.rol}</em><p>${a.resumen}</p><ul class="st">${a.stats.map(([n, v]) => `<li><b>${n}</b><span>${[1, 2, 3].map(k => `<i class="${k <= v ? 'o' : ''}"></i>`).join('')}</span></li>`).join('')}</ul><span class="meta">${a.metaTxt}</span></span></button>`;
  const menu = div('pjMenu', `<div class="wrap">
    <header><span class="marca">REN3D</span><span class="sub">Humedal El Burro · Kennedy · Bogotá</span><button class="x" data-m="cerrar">Cerrar</button></header>
    <h1>Escoge qué ave<br><span>quieres ser hoy</span></h1>
    <p class="lead">Cada ave vuela distinto y tiene su propia misión. La avenida que cruza el humedal es el peligro de todas: con mucho tráfico el ruido y el aire revuelto te frenan, te hunden y pueden hacerte perder.</p>
    <div class="aves">${Object.values(AVES_JUEGO).map(tarjeta).join('')}</div>
    <div class="pie">
      <div class="ctrl"><label>Controles</label><div class="seg" id="pjSeg"><button data-c="pantalla" class="on">Pantalla</button><button data-c="vr">Gafas VR</button><button data-c="cardboard">Celular + visor</button></div></div>
      <label class="esp"><input type="checkbox" id="pjEsp"> Ver en el computador lo que ves en las gafas</label>
      <button class="jugar" data-m="jugar" id="pjJugar">Comenzar vuelo</button>
      <div id="pjXr"></div><div id="pjEstado"></div>
    </div>
    <details><summary>Cómo se maneja</summary><ul>
      <li><b>Pantalla:</b> clic para capturar el mouse y mirar. <kbd>W</kbd> o <kbd>Shift</kbd> acelerar, <kbd>S</kbd> frenar, <kbd>A</kbd> <kbd>D</kbd> girar, <kbd>Espacio</kbd> aletear, <kbd>Esc</kbd> salir.</li>
      <li><b>Gafas VR:</b> vuelas hacia donde miras. Gatillo acelera, botón lateral frena, palanca gira. Mueve los brazos como alas para impulsarte.</li>
      <li><b>Celular + visor:</b> mira hacia donde quieres volar. Mantén el dedo para acelerar y toca rápido para aletear.</li>
      <li><b>Avenida:</b> cerca de la calle, bajo y con tráfico pesado la turbulencia te hunde. Aletear sube pero gasta energía, que se recupera lejos del tráfico. Tocar la calle, un carro o quedarte muy cerca de ellos te cuesta una vida.</li>
    </ul></details>
  </div>`);
  const listo = div('pjListo', `<div class="card"><h2 id="pjListoT">Mundo listo</h2><p id="pjListoP"></p><button class="go" id="pjGo">Empezar</button></div>`);
  const hud = div('pjHud', '');
  const btnSalir = document.createElement('button'); btnSalir.id = 'pjSalir'; btnSalir.textContent = 'Salir'; document.body.appendChild(btnSalir);
  const msgEl = div('pjMsg', '');
  const ruidoEl = div('pjRuido', '');
  const $ = (id) => document.getElementById(id);
  const pjEsp = $('pjEsp');

  // ---- estado ----
  let T3 = null, activo = false, modo = null, loop = null, ultimo = 0;
  let AVE = AVES_JUEGO.garza, modoSel = 'pantalla';
  const rig = new THREE.Group(); rig.rotation.order = 'YXZ';
  let yaw = 0, pit = 0, vel = 14, impulso = 0, acelera = false, frena = false;
  const teclas = {};
  const guardado = {};
  let efecto = null, sesionXR = null, wakeLock = null;
  const dir = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  let calidad = 0, tAcum = 0, nAcum = 0, tPrev = 0;
  let picoM = null, alaI = null, alaD = null, hudPlano = null, hudCv = null, hudTex = null, tHud = 0, tAleteo = 0;
  const sim = { puntos: 0, llevando: 0, entregados: 0, tiempo: 0, mejor: 0, terminado: false, aro: 0, aros: 0, msgHasta: 0, msgTxt: '', vidas: 3, energia: 100, inmune: 0, perdido: false, ex: 0, golpes: 0, restante: 0 };
  let caida = 0, lift = 0, sacudida = 0; // movimiento vertical extra: la turbulencia del tráfico te hunde, aletear te sube
  let peces = [], nido = null, marcas = null, arosPos = [], aroMesh = null;
  let audio = null, vientoG = null, trafG = null, motG = null, tBocina = 3;

  // ---------------------------------------------------------------- menú y arranque
  const estado = (t) => { $('pjEstado').textContent = t || ''; };
  const pintarSel = () => {
    menu.querySelectorAll('.ave').forEach(b => b.classList.toggle('sel', b.getAttribute('data-ave') === AVE.id));
    menu.style.setProperty('--cs', AVE.color);
    menu.querySelectorAll('#pjSeg button').forEach(b => b.classList.toggle('on', b.getAttribute('data-c') === modoSel));
  };
  async function abrirMenu() {
    menu.style.display = 'block'; estado(''); pjEsp.checked = espejo; pintarSel(); await infoXr();
  }
  async function infoXr() {
    const el = $('pjXr'); if (modoSel === 'cardboard') { el.textContent = 'Pon el celular en horizontal dentro del visor; se pedirá permiso de movimiento.'; return; }
    if (modoSel !== 'vr') { el.textContent = ''; return; }
    try {
      if (navigator.xr && await navigator.xr.isSessionSupported('immersive-vr')) el.textContent = 'Tu navegador reconoce gafas VR (WebXR). ' + (ESQUEST ? 'Se carga una versión más ligera para que vaya fluido. Para el máximo detalle conecta las gafas al PC (Quest Link) y abre la página en Chrome o Edge.' : 'Se carga la versión completa, con edificios y tráfico.');
      else el.textContent = navigator.xr ? 'WebXR sin gafas conectadas: conecta las gafas (Quest Link o SteamVR) o abre esta página en el navegador de las gafas.' : 'Este navegador no tiene WebXR: abre la página en el navegador de las gafas o en Chrome o Edge con las gafas conectadas.';
    } catch (e) { /* sin WebXR */ }
  }
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('.ave'); if (a) { AVE = AVES_JUEGO[a.getAttribute('data-ave')] || AVE; pintarSel(); return; }
    const c = e.target.closest('#pjSeg button'); if (c) { modoSel = c.getAttribute('data-c'); pintarSel(); infoXr(); return; }
    const b = e.target.closest('button[data-m]'); if (!b) return;
    const m = b.getAttribute('data-m');
    if (m === 'cerrar') { menu.style.display = 'none'; return; }
    elegir(modoSel);
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
      cargo = true; estado('Cargando el mundo' + (nivel === 'completo' ? '' : nivel === 'medio' ? ' (versión media para las gafas)' : ' (versión ligera)') + '. Puede tardar un poco...');
      try { await ctx.cargar(nivel); } catch (e) { estado('No se pudo cargar el mundo: ' + (e && e.message || e)); return; }
    }
    if (!ctx.listo()) { estado('El mundo 3D no cargó.'); return; }
    menu.style.display = 'none';
    if (cargo || m === 'vr') {
      const txt = m === 'vr' ? 'Ponte las gafas y pulsa el botón. Si el navegador pide permiso para la realidad virtual, acéptalo.' : m === 'cardboard' ? 'Pulsa el botón, pon el celular en horizontal dentro del visor y acepta el permiso de movimiento.' : 'Pulsa el botón para volar.';
      await esperarGesto('Mundo listo · ' + AVE.nombre, txt, m === 'vr' ? 'Entrar en realidad virtual' : 'Empezar a volar');
    }
    comenzar(m);
  }


  // ---------------------------------------------------------------- objetos del juego
  // ala de garza hecha de plumas: cada pluma tiene forma, raquis y barbas dibujadas (textura), y el ala se dobla en la muñeca al aletear
  function texPluma(tipo) { // tipo: 'base' (cuerpo del ala), 'punta' (primarias oscuras) o 'espejo' (parche de color de los patos)
    const pal = AVE.ala, punta = tipo === 'punta';
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32; const g = cv.getContext('2d');
    const hw = (u) => 14.5 * Math.min(1, 0.35 + u * 4) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 3.2)));
    g.beginPath(); g.moveTo(0, 16); for (let i = 0; i <= 40; i++) { const u = i / 40; g.lineTo(u * 127, 16 - hw(u)); } for (let i = 40; i >= 0; i--) { const u = i / 40; g.lineTo(u * 127, 16 + hw(u)); } g.closePath();
    const gr = g.createLinearGradient(0, 0, 128, 0);
    if (tipo === 'espejo') { gr.addColorStop(0, pal.espejo); gr.addColorStop(0.8, pal.espejo); gr.addColorStop(0.92, '#f4f4f0'); gr.addColorStop(1, '#f4f4f0'); }
    else { gr.addColorStop(0, pal.base); gr.addColorStop(punta ? 0.5 : 1, pal.base); if (punta) { gr.addColorStop(0.8, pal.punta); gr.addColorStop(1, pal.punta); } }
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
    const mBlanca = new THREE.MeshLambertMaterial({ map: texPluma('base'), alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0x2a2a28 }), mPunta = new THREE.MeshLambertMaterial({ map: texPluma('punta'), alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0x242426 });
    const mEsp = AVE.ala.espejo ? new THREE.MeshLambertMaterial({ map: texPluma('espejo'), alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0x161c26 }) : mBlanca;
    const mk = (lado) => {
      const piv = new THREE.Group(), esp = new THREE.Group(), muneca = new THREE.Group(); esp.add(muneca); piv.add(esp); if (lado < 0) esp.scale.x = -1;
      const pl = (par, mat, L, W, x, z, ang, y, rz) => { const m = new THREE.Mesh(geoPluma(L, W), mat); m.position.set(x, y || 0, z); m.rotation.y = -ang; if (rz) m.rotation.z = rz; m.frustumCulled = false; par.add(m); return m; };
      const brazo = 0.5, mx = brazo, mz = -0.07; muneca.position.set(mx, 0, mz);
      for (let k = 0; k < 9; k++) pl(esp, k >= 2 && k <= 6 ? mEsp : mBlanca, 0.40 + 0.04 * Math.sin(k / 8 * Math.PI), 0.1, brazo * (0.04 + k / 8 * 0.9), -0.02 + (mz + 0.02) * (k / 8), 1.3 - 0.18 * (k / 8), 0.0, 0.02); // secundarias (en el antebrazo)
      const prim = []; for (let k = 0; k < 10; k++) { const a = 0.02 + k / 9 * 0.95, L = 0.34 + 0.24 * Math.sin((1 - k / 9) * 1.35 + 0.15); prim.push(pl(muneca, mPunta, L, 0.09, 0, 0.0, a, 0.004 * k, 0)); } // primarias en abanico, de punta oscura
      for (let k = 0; k < 7; k++) pl(esp, mBlanca, 0.2 + 0.05 * (k % 2), 0.12, brazo * (0.02 + k / 6 * 0.95), -0.035, 1.25, 0.012, 0.0); // cubiertas (tapan la base de las plumas)
      for (let k = 0; k < 5; k++) pl(muneca, mBlanca, 0.17, 0.11, 0.0 + k * 0.01, -0.01 - k * 0.012, 0.35 + k * 0.2, 0.012, 0.0);
      piv.scale.setScalar(AVE.escala); piv.position.set(lado * 0.26, -0.36, -0.7); piv.userData = { muneca, prim }; return piv;
    };
    alaI = mk(-1); alaD = mk(1);
    // pico amarillo, largo y fino, que se ve al mirar hacia abajo
    const pico = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.34, 6), new THREE.MeshLambertMaterial({ color: AVE.pico, emissive: 0x2a2208 })); pico.rotation.x = -Math.PI / 2; pico.position.set(0, -0.09, -0.45); pico.frustumCulled = false; picoM = pico;
  }
  function crearHudPlano() {
    hudCv = document.createElement('canvas'); hudCv.width = 640; hudCv.height = 360;
    hudTex = new THREE.CanvasTexture(hudCv); hudTex.colorSpace = THREE.SRGBColorSpace;
    hudPlano = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.405), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
    hudPlano.position.set(0, -0.6, -1.5); hudPlano.renderOrder = 999; hudPlano.frustumCulled = false;
  }
  const matHaz = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  function crearPez() { // el 'objeto' a recoger depende del ave: pez (garza), resto de comida (gaviota) o semilla flotante (pato)
    const g = new THREE.Group();
    if (AVE.objetivo === 'carronera') {
      const bolsa = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.7), new THREE.MeshLambertMaterial({ color: 0xd9a05b, emissive: 0x4a3010 })); bolsa.position.y = 0.3; g.add(bolsa);
      const pan = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf1d39a, emissive: 0x40320f })); pan.scale.y = 0.6; pan.position.set(0.15, 0.7, 0); g.add(pan); g.visible = false; return g;
    }
    if (AVE.objetivo === 'semillas') {
      const m = new THREE.MeshStandardMaterial({ color: 0xd9f26b, emissive: 0x4a5a10, emissiveIntensity: 0.7, roughness: 0.4 });
      for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), m); s.scale.set(1, 0.7, 1.5); s.position.set(Math.cos(i * 1.26) * 0.55, 0.1, Math.sin(i * 1.26) * 0.55); s.rotation.y = i; g.add(s); }
      const anillo = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 6, 20), new THREE.MeshBasicMaterial({ color: 0xbef264, transparent: true, opacity: 0.6, fog: false })); anillo.rotation.x = Math.PI / 2; g.add(anillo); g.visible = false; return g;
    }
    const mat = new THREE.MeshStandardMaterial({ color: 0xd2dde2, metalness: 0.6, roughness: 0.22, emissive: 0x3c5260, emissiveIntensity: 0.6 });
    const cu = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 9), mat); cu.scale.set(0.45, 0.8, 2.0); g.add(cu);
    const co = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 4), mat); co.rotation.x = -Math.PI / 2; co.rotation.z = Math.PI / 4; co.position.z = -0.55; g.add(co);
    g.visible = false; return g;
  }
  function puntoAgua(burro, margen) { for (let i = 0; i < 40; i++) { const p = ctx.aves().punto(burro, margen); if (p) return p; } return [burro.cx, burro.cz]; }
  function puntoVia(b) { // un punto a un lado de la avenida (acera o pasto) donde la gaviota encuentra comida
    const av = ctx.aves(); if (!via.cadenas.length) return puntoAgua(b, 14);
    for (let i = 0; i < 40; i++) {
      const ch = via.cadenas[Math.floor(Math.random() * via.cadenas.length)], s = Math.random() * ch.L; let j = 0; while (j < ch.pts.length - 2 && ch.cum[j + 1] < s) j++;
      const a = ch.pts[j], e = ch.pts[j + 1], l = (ch.cum[j + 1] - ch.cum[j]) || 1, t = (s - ch.cum[j]) / l, tx = (e[0] - a[0]) / l, tz = (e[1] - a[1]) / l, lado = Math.random() < 0.5 ? -1 : 1, off = lado * (13 + Math.random() * 22);
      const x = a[0] + (e[0] - a[0]) * t - tz * off, z = a[1] + (e[1] - a[1]) * t + tx * off; if (!av.dentro(x, z, b.pts)) return [x, z];
    }
    return puntoAgua(b, 14);
  }
  function ponerPez(f) {
    const b = ctx.aves().burro;
    f.vivo = true; f.sig = 0.5 + Math.random() * 3; f.salto = -1; f.haz.visible = true;
    if (AVE.objetivo === 'pesca') { const p = puntoAgua(b, 14); f.x = p[0]; f.z = p[1]; f.mesh.visible = false; f.haz.position.set(f.x, 30, f.z); return; }
    const p = AVE.objetivo === 'carronera' ? puntoVia(b) : puntoAgua(b, 10); f.x = p[0]; f.z = p[1]; f.mesh.visible = true; f.mesh.position.set(f.x, 0.5, f.z); f.haz.position.set(f.x, 30, f.z);
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
    if (sim.energia < 12) { if (performance.now() - (sim.avisoE || 0) > 2500) { sim.avisoE = performance.now(); mensaje('Sin energía: planea unos segundos lejos del tráfico', 2000); } lift = Math.min(22, lift + 4); return; }
    sim.energia -= AVE.costo || 12; lift = Math.min(22, lift + 15); impulso += 4; tAleteo = 0.6; pip(200, 140, 0.1, 0.05);
  }
  function chocar(motivo) {
    if (sim.inmune > 0 || sim.perdido) return;
    sim.vidas--; sim.golpes++; const perdidos = sim.llevando; sim.llevando = 0; sim.energia = 100; sim.inmune = 3.5; caida = 0; lift = 0;
    pip(220, 60, 0.5, 0.25); setTimeout(() => pip(150, 50, 0.4, 0.2), 120);
    const b = ctx.aves().burro, p0 = puntoSeguro(b); rig.position.set(p0[0], 38, p0[1]); vel = AVE.vel.cru; impulso = 0;
    if (sim.vidas <= 0) fallar(motivo);
    else mensaje(motivo + (perdidos ? ' Perdiste ' + perdidos + ' ' + (perdidos > 1 ? AVE.item[1] : AVE.item[0]) + '.' : '') + ' Vidas: ' + sim.vidas, 4000);
  }
  function nidoSeguro(b) { // nido de la gaviota: en la orilla del humedal, lejos de la avenida (el riesgo está en ir a buscar la comida)
    const av = ctx.aves(); let mejor = null, md = 1e9;
    for (let i = 0; i < 200; i++) {
      const x = b.x0 - 120 + Math.random() * (b.x1 - b.x0 + 240), z = b.z0 - 120 + Math.random() * (b.z1 - b.z0 + 240);
      if (av.dentro(x, z, b.pts)) continue; const d = cercaDe(b.pts, x, z)[2]; if (d < 25 || d > 90) continue;
      const dv = via.seg.length ? distVia(x, z) : 500; const sc = Math.abs(dv - 320); if (sc < md) { md = sc; mejor = [x, z]; } // a unos 300 m de la avenida: lejos del peligro, pero un viaje razonable
    }
    return mejor;
  }
  function puntoSeguro(b) { // un punto del agua lo más lejos posible de la avenida (para arrancar y reaparecer tranquilo)
    let mejor = puntoAgua(b, 40), md = via.seg.length ? distVia(mejor[0], mejor[1]) : 0;
    for (let i = 0; i < 24 && via.seg.length; i++) { const q = puntoAgua(b, 40), d = distVia(q[0], q[1]); if (d > md) { md = d; mejor = q; } }
    return mejor;
  }
  function crearNido(b) {
    const av = ctx.aves(); let pos = AVE.objetivo === 'pesca' ? nidoAlOtroLado(b) : nidoSeguro(b);
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
    try { construirAvenida(b); } catch (e) { console.warn('avenida:', e); via.cadenas = []; via.coches = []; via.seg = []; } // primero la avenida: los restos de comida y el nido dependen de ella
    peces = []; for (let i = 0; i < (AVE.objetivo === 'semillas' ? 9 : AVE.objetivo === 'carronera' ? 5 : 7); i++) {
      const mesh = crearPez(), haz = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 8, 1, true), matHaz(AVE.objetivo === 'carronera' ? 0xfbbf24 : AVE.objetivo === 'semillas' ? 0x34d399 : 0x7dd3fc, 0.3));
      T3.scene.add(mesh, haz); const f = { mesh, haz }; ponerPez(f); peces.push(f);
    }
    T3.extraCars = via.coches.length ? (F) => { for (const c of via.coches) if (c.act) F.add(c.x, c.z, c.h, 5000 + c.id); } : null; // la flota de carros dibuja también los de la avenida
    nido = AVE.objetivo === 'semillas' ? null : crearNido(b); crearAros(b);
    Object.assign(sim, { puntos: 0, llevando: 0, entregados: 0, tiempo: 0, terminado: false, aro: 0, aros: 0, vidas: 3, energia: 100, inmune: 2, perdido: false, ex: 0, golpes: 0, restante: 100 });
    via.hora = 0; via.intens = 0.3; via.estado = 0; caida = 0; lift = 0; sacudida = 0;
    try { sim.mejor = Number(localStorage.getItem('ren3d_pajaro_mejor') || 0); } catch (e) { sim.mejor = 0; }
    // arranque: sobre el agua del humedal, mirando al primer pez
    const p0 = puntoSeguro(b), f0 = peces[0];
    rig.position.set(p0[0], 38, p0[1]); yaw = Math.atan2(p0[0] - f0.x, p0[1] - f0.z); pit = -0.12; vel = AVE.vel.cru; impulso = 0; // la cámara mira hacia -Z girada por yaw: así arranca mirando al primer objetivo
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
    t = sinEmoji(t);
    sim.msgTxt = t; sim.msgHasta = performance.now() + (seg || 3000);
    if (modo !== 'cardboard') { msgEl.textContent = t; msgEl.style.display = 'block'; setTimeout(() => { if (performance.now() >= sim.msgHasta - 50) msgEl.style.display = 'none'; }, (seg || 3000) + 60); }
  }
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function objetivo() { // a dónde apuntar la flecha: el nido si vas con la carga completa, si no el objetivo más cercano
    if (nido && sim.llevando >= AVE.cap) return { x: nido.x, y: nido.y, z: nido.z, txt: 'Ve al nido' };
    let best = null, bd = 1e12; const p = rig.position;
    for (const f of peces) { if (!f.vivo) continue; const d = (f.x - p.x) ** 2 + (f.z - p.z) ** 2; if (d < bd) { bd = d; best = f; } }
    if (nido && sim.llevando > 0 && (!best || bd > 90000)) return { x: nido.x, y: nido.y, z: nido.z, txt: 'Ve al nido' };
    if (best) return { x: best.x, y: 1, z: best.z, txt: 'Objetivo cercano' };
    return nido ? { x: nido.x, y: nido.y, z: nido.z, txt: 'Nido' } : null;
  }
  const ETQ = { pesca: 'Peces', carronera: 'Comida', semillas: 'Semillas' };
  function pintarHud() {
    const o = objetivo(), p = rig.position; let rel = 0, dist = 0;
    camaraDir(dir);
    if (o) { rel = giro(Math.atan2(dir.x, dir.z), Math.atan2(o.x - p.x, o.z - p.z)); dist = Math.hypot(o.x - p.x, o.z - p.z); }
    const en = Math.round(sim.energia), colE = en > 50 ? '#4ade80' : en > 20 ? '#fde047' : '#f87171', tr = Math.round(via.intens * 100), colT = tr > 75 ? '#f87171' : tr > 45 ? '#fb923c' : '#4ade80';
    const aviso = sim.ex > 0.12 ? (sim.energia < 12 ? 'Sin energía: te hundes' : 'Turbulencia del tráfico: sube y aletea') : '';
    const pips = (n, tot, cls) => `<span class="pips ${cls || ''}">${Array.from({ length: tot }, (_, k) => `<i class="${k < n ? 'o' : ''}"></i>`).join('')}</span>`;
    const tiempo = AVE.objetivo === 'semillas' ? fmt(sim.restante) : fmt(sim.tiempo);
    if (modo !== 'cardboard') {
      hud.style.setProperty('--c', AVE.color);
      hud.innerHTML = `<div class="cab"><span class="ave">${AVE.nombre}</span><span class="n">${sim.puntos}<small>PTS</small></span></div>`
        + `<div class="fila">Vidas ${pips(sim.vidas, 3, 'vida')}</div>`
        + `<div class="fila">${ETQ[AVE.objetivo]} <b>${sim.entregados} / ${AVE.meta}</b></div>`
        + (AVE.cap > 1 ? `<div class="fila">Carga ${pips(sim.llevando, AVE.cap)}</div>` : '')
        + `<div class="fila">${AVE.objetivo === 'semillas' ? 'Tiempo restante' : 'Tiempo'} <b>${tiempo}</b></div>`
        + `<div class="fila">Energía <span class="barra"><i style="width:${en}%;background:${colE}"></i></span></div>`
        + `<div class="fila">Tráfico <span class="barra"><i style="width:${tr}%;background:${colT}"></i></span></div>`
        + `<div class="fila">Altura <b>${Math.round(p.y)} m</b></div><div class="fila">Velocidad <b>${Math.round(vel * 3.6)} km/h</b></div>`
        + (o ? `<div class="guia"><span class="arrow" style="transform:rotate(${-rel}rad)">&#10148;</span>${o.txt} ${Math.round(dist)} m</div>` : '') + (aviso ? `<div class="aviso">${aviso}</div>` : '')
        + `<div class="fila" style="margin-top:7px">Récord <b>${sim.mejor}</b></div>`;
    }
    if (modo !== 'pantalla' && hudCv) {
      const g = hudCv.getContext('2d'), W = hudCv.width, H = hudCv.height;
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(6,14,22,.82)'; g.strokeStyle = sim.ex > 0.12 ? 'rgba(248,113,113,.95)' : 'rgba(148,163,184,.55)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(4, 4); g.lineTo(W - 30, 4); g.lineTo(W - 4, 30); g.lineTo(W - 4, H - 4); g.lineTo(30, H - 4); g.lineTo(4, H - 30); g.closePath(); g.fill(); g.stroke();
      const txt = (s, x, y, f, c) => { g.font = f; g.fillStyle = c; g.fillText(s, x, y); };
      txt(AVE.nombre.toUpperCase(), 28, 40, '700 22px "Segoe UI",system-ui,sans-serif', AVE.color); txt(String(sim.puntos), 28, 96, '800 52px "Segoe UI",system-ui,sans-serif', '#fff'); txt('PTS', 30 + g.measureText(String(sim.puntos)).width + 8, 96, '600 20px "Segoe UI",system-ui,sans-serif', '#7b8ea3');
      for (let k = 0; k < 3; k++) { g.fillStyle = k < sim.vidas ? '#f87171' : 'rgba(148,163,184,.3)'; g.fillRect(W - 150 + k * 40, 60, 30, 14); }
      txt(ETQ[AVE.objetivo].toUpperCase() + '  ' + sim.entregados + ' / ' + AVE.meta, 28, 138, '700 28px "Segoe UI",system-ui,sans-serif', '#e8f1f8');
      txt((AVE.objetivo === 'semillas' ? 'RESTANTE ' : 'TIEMPO ') + tiempo + '   ALT ' + Math.round(p.y) + ' m', 28, 174, '600 24px "Segoe UI",system-ui,sans-serif', '#a3b5c7');
      if (AVE.cap > 1) for (let k = 0; k < AVE.cap; k++) { g.fillStyle = k < sim.llevando ? AVE.color : 'rgba(148,163,184,.3)'; g.fillRect(W - 150 + k * 40, 120, 30, 14); }
      const barra = (y, v, c, t) => { txt(t, 28, y + 15, '600 20px "Segoe UI",system-ui,sans-serif', '#7b8ea3'); g.fillStyle = 'rgba(148,163,184,.25)'; g.fillRect(190, y, 230, 14); g.fillStyle = c; g.fillRect(190, y, 230 * clamp(v, 0, 1), 14); };
      barra(190, sim.energia / 100, colE, 'ENERGÍA'); barra(218, via.intens, colT, 'TRÁFICO');
      if (o) { txt(o.txt.toUpperCase() + '  ' + Math.round(dist) + ' m', 28, 268, '700 24px "Segoe UI",system-ui,sans-serif', '#fde68a'); g.save(); g.translate(W - 70, 214); g.rotate(-rel); g.fillStyle = '#fde047'; g.beginPath(); g.moveTo(0, -40); g.lineTo(28, 28); g.lineTo(0, 12); g.lineTo(-28, 28); g.closePath(); g.fill(); g.restore(); }
      if (aviso) txt(aviso.toUpperCase().slice(0, 34), 28, 300, '800 22px "Segoe UI",system-ui,sans-serif', '#fca5a5');
      if (performance.now() < sim.msgHasta) { g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(14, 310, W - 28, 40); txt(sim.msgTxt.slice(0, 46), 26, 339, '700 22px "Segoe UI",system-ui,sans-serif', '#fef9c3'); }
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
      sim.energia = sim.ex < 0.06 ? Math.min(100, sim.energia + AVE.regen * dt) : Math.max(0, sim.energia - 4 * sim.ex * dt);
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
    // objetos de la misión: peces que saltan (garza), restos de comida junto a la avenida (gaviota) o semillas flotantes (pato)
    const obj = AVE.objetivo, nom = AVE.item[0], noms = AVE.item[1];
    if (obj === 'semillas' && !sim.terminado && !sim.perdido) { sim.restante -= dt; if (sim.restante <= 0) { sim.restante = 0; fallar('Se acabó el tiempo.'); } }
    for (const f of peces) {
      if (!f.vivo) { f.espera -= dt; if (f.espera <= 0) ponerPez(f); continue; }
      if (obj === 'pesca') {
        f.sig -= dt;
        if (f.salto < 0 && f.sig <= 0) { f.salto = 0; av.anillo(f.x, f.z); }
        if (f.salto >= 0) {
          f.salto += dt / 0.95; const u = f.salto;
          if (u >= 1) { f.salto = -1; f.sig = 2 + Math.random() * 3; f.mesh.visible = false; av.anillo(f.x, f.z); }
          else { f.mesh.visible = true; f.mesh.position.set(f.x, 0.4 + 4.2 * 4 * u * (1 - u), f.z); f.mesh.rotation.x = (u - 0.5) * 2.2; f.mesh.rotation.y = f.x; }
        }
      } else { f.mesh.position.y = 0.5 + 0.18 * Math.sin(sim.tiempo * 2.4 + f.x); f.mesh.rotation.y += dt * 0.8; }
      const dh = Math.hypot(f.x - p.x, f.z - p.z);
      if (dh < 7 && p.y < 7.5 && (obj === 'semillas' || sim.llevando < AVE.cap)) { // recogido
        f.vivo = false; f.espera = obj === 'carronera' ? 3 : 1.5; f.mesh.visible = false; f.haz.visible = false; av.anillo(f.x, f.z);
        if (obj === 'semillas') {
          sim.entregados++; sim.puntos += 100; sim.restante = Math.min(150, sim.restante + 6); pip(520, 1040, 0.18, 0.18);
          mensaje('Semilla ' + sim.entregados + '/' + AVE.meta + ' · +6 s', 1800);
          if (sim.entregados % 4 === 0) setTimeout(() => mensaje(DATOS[(sim.entregados + 1) % DATOS.length], 5000), 2000);
          if (sim.entregados >= AVE.meta && !sim.terminado) terminar();
        } else {
          sim.llevando++; sim.puntos += 25; pip(520, 1040, 0.18, 0.18);
          mensaje(sim.llevando >= AVE.cap ? 'Carga completa: llévala al nido' : (obj === 'pesca' ? 'Pez atrapado' : 'Comida recogida') + ' (' + sim.llevando + '/' + AVE.cap + ')', 2200);
        }
      } else if (dh < 7 && p.y < 7.5 && sim.llevando >= AVE.cap && performance.now() - (sim.avisoLleno || 0) > 4000) { sim.avisoLleno = performance.now(); mensaje('Ya vas con la carga completa: ve al nido', 2000); }
    }
    // nido
    if (nido) {
      nido.g.children[nido.g.children.length - 1].rotation.z += dt * 0.5;
      const dn = Math.hypot(nido.x - p.x, nido.y - p.y, nido.z - p.z);
      if (dn < 13 && sim.llevando > 0) {
        const n = sim.llevando, pts = (obj === 'carronera' ? 150 : 100) * n; sim.llevando = 0; sim.entregados += n; sim.puntos += pts; pip(660, 1320, 0.35, 0.2); setTimeout(() => pip(880, 1760, 0.4, 0.15), 160);
        mensaje('Entregaste ' + n + ' ' + (n > 1 ? noms : nom) + ' · +' + pts + ' pts', 2800);
        if (sim.entregados % 3 === 0 || sim.entregados < 3) setTimeout(() => mensaje(DATOS[(sim.entregados + 1) % DATOS.length], 5500), 3000);
        if (sim.entregados >= AVE.meta && !sim.terminado) terminar();
      }
    }    // aros
    if (aroMesh) {
      aroMesh.rotation.z += dt * 0.6;
      if (p.distanceTo(aroMesh.position) < 12) { sim.aro++; sim.aros++; sim.puntos += 50; pip(400, 900, 0.25, 0.15); mensaje('⭕ Aro +50', 1500); colocarAro(); }
    }
    // vuelo rasante: deja ondas sobre el agua
    if (p.y < 3.2 && b && av.dentro(p.x, p.z, b.pts)) { sim.tOnda = (sim.tOnda || 0) - dt; if (sim.tOnda <= 0) { sim.tOnda = 0.35; av.anillo(p.x, p.z); } }
    // fuera del territorio
    if (b && Math.hypot(p.x - b.cx, p.z - b.cz) > 2600) { rig.position.set(b.cx, 60, b.z0 - 80); mensaje('Regresaste al humedal El Burro', 2500); }
  }
  function nuevaRonda(msg) {
    Object.assign(sim, { puntos: 0, llevando: 0, entregados: 0, tiempo: 0, terminado: false, aros: 0, vidas: 3, energia: 100, perdido: false, inmune: 3, restante: 100 }); via.hora = 0;
    if (msg) mensaje(msg, 3500);
  }
  function fallar(motivo) { // se acabó la partida (sin vidas o sin tiempo): se muestra el resultado y empieza otra
    if (sim.perdido) return; sim.perdido = true; sim.puntos = Math.max(0, sim.puntos - 100);
    mensaje(motivo + ' Fin de la partida: ' + sim.entregados + '/' + AVE.meta + '. Reiniciando...', 6000);
    setTimeout(() => { if (activo) nuevaRonda('Nueva ronda: ' + AVE.metaTxt); }, 6500);
  }
  function terminar() {
    sim.terminado = true; const t = sim.tiempo, bono = AVE.objetivo === 'semillas' ? Math.round(sim.restante * 5) : Math.max(0, Math.round((240 - t) * 2)); sim.puntos += bono;
    if (sim.puntos > sim.mejor) { sim.mejor = sim.puntos; try { localStorage.setItem('ren3d_pajaro_mejor', String(sim.puntos)); } catch (e) { /* sin almacenamiento */ } }
    mensaje('Misión cumplida: ' + sim.puntos + ' pts en ' + fmt(t) + '. Sigue volando; la ronda se reinicia sola.', 9000);
    pip(523, 1046, 0.5, 0.2); setTimeout(() => pip(784, 1568, 0.6, 0.2), 250);
    setTimeout(() => { if (activo && sim.terminado) nuevaRonda('Nueva ronda: ' + AVE.metaTxt); }, 12000);
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
      if (teclas.KeyA || teclas.ArrowLeft) yaw += AVE.giro * dt; if (teclas.KeyD || teclas.ArrowRight) yaw -= AVE.giro * dt;
      if (teclas.ArrowUp) pit = clamp(pit + 0.9 * dt, -1.25, 1.25); if (teclas.ArrowDown) pit = clamp(pit - 0.9 * dt, -1.25, 1.25);
      acelera = !!(teclas.KeyW || teclas.ShiftLeft || teclas.ShiftRight) || (modo === 'cardboard' && acelera); frena = !!teclas.KeyS;
      rig.rotation.set(pit + Math.sin(sacudida * 1.3) * 0.012 * sim.ex, yaw + Math.sin(sacudida * 0.9) * 0.01 * sim.ex, Math.sin(sacudida) * 0.03 * sim.ex); // el aire revuelto sacude la vista
    }
    camaraDir(dir);
    // velocidad: planeo suave; la picada acelera, subir frena; aletear da impulsos
    let obj = AVE.vel.cru; if (acelera) obj = AVE.vel.max; if (frena) obj = AVE.vel.min + 1;
    obj *= 1 + clamp(-dir.y * 0.6, -0.35, 0.5); impulso *= Math.exp(-1.6 * dt); obj += impulso;
    obj *= (1 - 0.4 * sim.ex) * (1 - 0.04 * sim.llevando); // con tráfico pesado el aire te frena; los peces pesan
    vel += (obj - vel) * Math.min(1, dt * 1.5); vel = Math.max(AVE.vel.min, vel);
    rig.position.addScaledVector(dir, vel * dt);
    // turbulencia sobre la avenida: te hunde (más con peces y sin energía); aletear (lift) te sube
    const hundir = AVE.hundir * sim.ex * (7 + 1.3 * sim.llevando) * (sim.energia < 5 ? 1.6 : 1);
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
      crearAlas(); if (!hudPlano) crearHudPlano(); // las alas se rehacen en cada partida: cambian con el ave elegida
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
    mensaje(AVE.nombre + ': ' + AVE.metaTxt, 4500);
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