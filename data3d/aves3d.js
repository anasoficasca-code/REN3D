// REN3D · aves3d.js
// Aves 3D de varias piezas (cuerpo, cuello, cabeza, pico, ojos, patas, alas) con color por vértice y plumaje de cada especie:
// patos (macho y hembra tipo cuaquero), fochas (tinguas), garzas blancas posadas y en vuelo, y patos en vuelo.
// Se reparten por todos los humedales y lagunas de los datos; las que nadan se mueven dentro del agua, las garzas caminan en la orilla
// y las que vuelan dan vueltas sobre el humedal batiendo las alas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const lin = (c) => c.map(v => Math.pow(v, 2.2)); // los colores se escriben en sRGB y se pasan a lineal
const mezcla = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
const paso = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// elipsoide con color por vértice (col = [r,g,b] o función (ux,uy,uz) del punto sobre la esfera unidad), inclinación (pitch) y alabeo (roll)
function elip(cx, cy, cz, rx, ry, rz, col, o = {}) {
  const g = new THREE.SphereGeometry(1, o.w || 12, o.h || 9); g.deleteAttribute('uv');
  const p = g.attributes.position, c = new Float32Array(p.count * 3), aW = new Float32Array(p.count);
  const cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i), k = lin(typeof col === 'function' ? col(ux, uy, uz) : col);
    c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2];
    let x = ux * rx, y = uy * ry, z = uz * rz;
    const y2 = y * cp - z * sp, z2 = y * sp + z * cp; y = y2; z = z2;
    const x2 = x * cr - y * sr, y3 = x * sr + y * cr; x = x2; y = y3;
    p.setXYZ(i, x + cx, y + cy, z + cz);
  }
  g.computeVertexNormals();
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('aW', new THREE.BufferAttribute(aW, 1));
  return g;
}
const espejo = (g) => { const h = g.clone(); const p = h.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i)); const n = h.attributes.normal; for (let i = 0; i < n.count; i++) n.setX(i, -n.getX(i)); return h; };
const unir = (gs) => mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g));

// ala plana con 9 estaciones a lo largo de la envergadura (para que se doble al batir); cada estación = borde de ataque + borde de salida
function ala(lado, envergadura, r0, cuerda, colorFn, amp, barrido) {
  const n = 9, P = [], C = [], A = [], N = [], I = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = lado * (r0 + (envergadura - r0) * t), ch = cuerda * (1 - 0.6 * t * t), sw = (barrido || 0.2) * t * t * envergadura;
    let zL = ch * 0.4 - sw, zT = -ch * 0.6 - sw;
    if (t > 0.66) zT += (i % 2 ? 0.07 : -0.02) * cuerda; // puntas de las plumas primarias
    const cL = lin(colorFn(t, 0)), cT = lin(colorFn(t, 1));
    P.push(x, 0, zL, x, 0, zT); C.push(...cL, ...cT); A.push(amp, amp); N.push(0, 1, 0, 0, 1, 0);
    if (i < n - 1) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aW', new THREE.Float32BufferAttribute(A, 1)); g.setIndex(I);
  return g;
}

const NEGRO = [0.03, 0.03, 0.035], BLANCO = [0.93, 0.93, 0.9];

/* ------------------------------------------------------------------ modelos ------------------------------------------------------------------ */
// pato (cuaquero) nadando: 'macho' cabeza verde irisada, anillo blanco, pecho castaño y cola negra; 'hembra' pardo moteado; 'focha' negra con pico blanco
function modeloNadador(especie) {
  const m = especie === 'macho', f = especie === 'focha';
  const cuerpo = (ux, uy, uz) => {
    if (f) return mezcla([0.11, 0.12, 0.13], [0.2, 0.21, 0.22], paso(-0.2, 0.9, uy) * 0.4);
    if (!m) { const b = 0.5 + 0.5 * Math.sin(ux * 23 + uz * 31 + uy * 17); return mezcla([0.34, 0.25, 0.16], [0.52, 0.4, 0.27], b * 0.8 + paso(-0.6, 0.1, uy) * 0.2); }
    let c = mezcla([0.62, 0.61, 0.57], [0.4, 0.35, 0.28], paso(0.1, 0.8, uy)); // flancos gris claro, dorso pardo
    c = mezcla(c, [0.78, 0.77, 0.72], paso(-0.1, -0.7, uy) * 0.7);          // vientre
    c = mezcla(c, [0.38, 0.16, 0.11], paso(0.35, 0.8, uz) * paso(-0.5, 0.2, uy)); // pecho castaño
    return mezcla(c, [0.06, 0.06, 0.08], paso(-0.55, -0.9, uz));            // grupa negra
  };
  const cabezaC = f ? [0.07, 0.07, 0.08] : m ? [0.04, 0.29, 0.13] : [0.5, 0.4, 0.3];
  const picoC = f ? [0.93, 0.93, 0.88] : m ? [0.78, 0.72, 0.16] : [0.78, 0.5, 0.16];
  const cuelloC = f ? [0.08, 0.08, 0.09] : m ? [0.04, 0.29, 0.13] : [0.46, 0.36, 0.26];
  const alaC = (ux, uy, uz) => f ? [0.14, 0.15, 0.16] : (m ? mezcla([0.45, 0.4, 0.33], [0.14, 0.26, 0.62], paso(-0.1, -0.7, uz) * paso(0.2, 0.9, Math.abs(ux) + uy * 0.3)) : mezcla([0.38, 0.29, 0.2], [0.14, 0.26, 0.62], paso(-0.2, -0.7, uz) * 0.7));
  const piezas = [
    elip(0, 0.075, 0, 0.125, 0.10, 0.27, cuerpo),
    elip(0, 0.125, -0.29, 0.04, 0.035, 0.09, f ? [0.1, 0.1, 0.11] : m ? [0.06, 0.06, 0.08] : [0.3, 0.23, 0.15], { pitch: 0.5 }),
    elip(0, 0.2, f ? 0.2 : 0.205, 0.045, f ? 0.07 : 0.085, 0.05, cuelloC, { pitch: f ? 0.22 : 0.35 }),
    elip(0, f ? 0.28 : 0.30, f ? 0.235 : 0.245, 0.058, 0.058, 0.072, cabezaC),
    elip(0, f ? 0.268 : 0.285, f ? 0.31 : 0.325, f ? 0.026 : 0.03, 0.011, f ? 0.05 : 0.055, picoC, { pitch: 0.12 }),
    elip(0.04, f ? 0.294 : 0.315, f ? 0.25 : 0.26, 0.009, 0.009, 0.009, NEGRO, { w: 6, h: 5 }), elip(-0.04, f ? 0.294 : 0.315, f ? 0.25 : 0.26, 0.009, 0.009, 0.009, NEGRO, { w: 6, h: 5 }),
    elip(0.115, 0.115, -0.03, 0.035, 0.07, 0.2, alaC, { roll: -0.15 }), elip(-0.115, 0.115, -0.03, 0.035, 0.07, 0.2, alaC, { roll: 0.15 })
  ];
  if (m) piezas.push(elip(0, 0.165, 0.18, 0.052, 0.014, 0.052, BLANCO, { pitch: 0.25 })); // anillo blanco del cuello
  if (f) piezas.push(elip(0, 0.315, 0.292, 0.012, 0.026, 0.018, [0.95, 0.95, 0.9])); // escudo frontal blanco
  return unir(piezas);
}
// garza blanca posada (patas largas, cuello en S, pico amarillo largo)
function modeloGarzaPie() {
  const o = [0.12, 0.11, 0.1], Y = [0.9, 0.74, 0.14];
  return unir([
    elip(0, 0.62, 0, 0.065, 0.085, 0.2, BLANCO, { pitch: -0.15 }),
    elip(0, 0.6, -0.24, 0.025, 0.03, 0.08, BLANCO, { pitch: 0.2 }),
    elip(0.03, 0.3, 0.02, 0.009, 0.3, 0.009, o, { w: 6, h: 5 }), elip(-0.03, 0.3, 0.02, 0.009, 0.3, 0.009, o, { w: 6, h: 5 }),
    elip(0.03, 0.01, 0.05, 0.015, 0.006, 0.05, o, { w: 6, h: 5 }), elip(-0.03, 0.01, 0.05, 0.015, 0.006, 0.05, o, { w: 6, h: 5 }),
    elip(0, 0.72, 0.17, 0.03, 0.07, 0.03, BLANCO, { pitch: 0.5 }), elip(0, 0.83, 0.21, 0.026, 0.06, 0.026, BLANCO, { pitch: -0.2 }),
    elip(0, 0.95, 0.19, 0.024, 0.07, 0.024, BLANCO, { pitch: 0.3 }), elip(0, 1.05, 0.215, 0.022, 0.045, 0.022, BLANCO, { pitch: 0.9 }),
    elip(0, 1.075, 0.265, 0.022, 0.024, 0.05, BLANCO), elip(0, 1.065, 0.37, 0.011, 0.011, 0.1, Y, { pitch: 0.06 }),
    elip(0.02, 1.085, 0.27, 0.006, 0.006, 0.006, NEGRO, { w: 5, h: 4 }), elip(-0.02, 1.085, 0.27, 0.006, 0.006, 0.006, NEGRO, { w: 5, h: 4 }),
    elip(0.075, 0.63, -0.02, 0.025, 0.07, 0.2, BLANCO), elip(-0.075, 0.63, -0.02, 0.025, 0.07, 0.2, BLANCO)
  ]);
}
// garza en vuelo: cuello recogido en S, patas largas hacia atrás, alas anchas
function modeloGarzaVuelo() {
  const o = [0.12, 0.11, 0.1], Y = [0.9, 0.74, 0.14];
  const aC = (t, borde) => mezcla(BLANCO, [0.78, 0.78, 0.76], t * 0.5);
  return unir([
    elip(0, 0, 0, 0.06, 0.07, 0.2, BLANCO), elip(0, 0.03, 0.2, 0.03, 0.045, 0.07, BLANCO, { pitch: 0.9 }), elip(0, 0.045, 0.27, 0.022, 0.022, 0.045, BLANCO),
    elip(0, 0.04, 0.36, 0.01, 0.01, 0.09, Y), elip(0, 0.01, -0.25, 0.04, 0.02, 0.08, BLANCO),
    elip(0.02, -0.01, -0.42, 0.008, 0.008, 0.2, o, { w: 6, h: 5 }), elip(-0.02, -0.01, -0.42, 0.008, 0.008, 0.2, o, { w: 6, h: 5 }),
    ala(1, 0.82, 0.06, 0.36, aC, 0.9, 0.22), ala(-1, 0.82, 0.06, 0.36, aC, 0.9, 0.22)
  ]);
}
// pato en vuelo: cuello estirado, alas con espejo azul
function modeloPatoVuelo() {
  const aC = (t, borde) => borde === 0 ? [0.42, 0.36, 0.28] : mezcla(mezcla([0.36, 0.3, 0.23], [0.14, 0.27, 0.66], paso(0.1, 0.25, t) * paso(0.62, 0.45, t)), BLANCO, paso(0.8, 1, t) * 0.4);
  return unir([
    elip(0, 0, 0, 0.095, 0.085, 0.24, (ux, uy, uz) => mezcla([0.5, 0.45, 0.38], [0.78, 0.77, 0.72], paso(0, -0.8, uy))),
    elip(0, 0.01, 0.26, 0.04, 0.04, 0.12, [0.04, 0.29, 0.13]), elip(0, 0.015, 0.38, 0.05, 0.05, 0.065, [0.04, 0.29, 0.13]),
    elip(0, 0.005, 0.455, 0.027, 0.01, 0.05, [0.78, 0.72, 0.16]), elip(0, 0, -0.27, 0.05, 0.02, 0.08, [0.07, 0.07, 0.09]),
    ala(1, 0.5, 0.07, 0.22, aC, 0.8, 0.2), ala(-1, 0.5, 0.07, 0.22, aC, 0.8, 0.2)
  ]);
}

/* ------------------------------------------------------------------ geometría de los cuerpos de agua ------------------------------------------------------------------ */
const dentro = (x, z, v) => { let ins = false; for (let i = 0, j = v.length - 1; i < v.length; j = i++) { if (((v[i][1] > z) !== (v[j][1] > z)) && (x < (v[j][0] - v[i][0]) * (z - v[i][1]) / (v[j][1] - v[i][1]) + v[i][0])) ins = !ins; } return ins; };
function distBorde(x, z, v) { let m = 1e9; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); const q = Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz)); if (q < m) m = q; } return m; }

export function crearAves(T3, W, lw) {
  const cuerpos = [];
  for (const w of W || []) {
    if (!/humedal|laguna/i.test(w.tipo || '')) continue;
    const pts = w.pts.map(p => lw(p[0], p[1]));
    if (pts.length < 4 || Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) > 1.0) continue;
    pts.pop();
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, a = 0, cx = 0, cz = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); a += p[0] * q[1] - q[0] * p[1]; cx += p[0]; cz += p[1]; }
    const area = Math.abs(a) / 2; if (area < 3000) continue;
    cuerpos.push({ pts, area, x0, x1, z0, z1, cx: cx / pts.length, cz: cz / pts.length, y: 0.35 });
  }
  const semilla = { n: 1 };
  const R = () => rnd(semilla.n++);
  const punto = (c, margen, maxMargen) => {
    for (let t = 0; t < 80; t++) {
      const x = c.x0 + R() * (c.x1 - c.x0), z = c.z0 + R() * (c.z1 - c.z0);
      if (!dentro(x, z, c.pts)) continue;
      const d = distBorde(x, z, c.pts); if (d >= margen && d <= (maxMargen || 1e9)) return [x, z];
    }
    return null;
  };

  // aves por tipo: cada una con su malla instanciada
  const TIPOS = [
    { id: 'macho', geo: modeloNadador('macho'), freq: 0, mov: 'nada', esc: 0.95 },
    { id: 'hembra', geo: modeloNadador('hembra'), freq: 0, mov: 'nada', esc: 0.95 },
    { id: 'focha', geo: modeloNadador('focha'), freq: 0, mov: 'nada', esc: 0.85 },
    { id: 'garza', geo: modeloGarzaPie(), freq: 0, mov: 'camina', esc: 1.0 },
    { id: 'garzaVuelo', geo: modeloGarzaVuelo(), freq: 2.3, mov: 'vuela', esc: 1.15 },
    { id: 'patoVuelo', geo: modeloPatoVuelo(), freq: 7.5, mov: 'vuela', esc: 1.0 }
  ];
  const aves = [];
  const agregar = (tipo, c, x, z, extra) => aves.push({ tipo, c, x, z, h: R() * 6.28, th: R() * 6.28, tt: R() * 4, v: 0, pausa: R() * 3, ph: R() * 6.28, esc: TIPOS[tipo].esc * (0.92 + R() * 0.16), dab: 0, sigDab: 8 + R() * 30, k: 0, ...extra });
  let totalNad = 0;
  cuerpos.forEach((c, ci) => {
    const nPatos = Math.max(4, Math.min(34, Math.round(c.area / 2200))), nFocha = Math.max(2, Math.min(14, Math.round(c.area / 5500))), nGarza = Math.max(1, Math.min(8, Math.round(c.area / 9000)));
    for (let i = 0; i < nPatos; i++) { const p = punto(c, 3); if (p) { agregar(i % 3 === 2 ? 1 : 0, c, p[0], p[1], { vel: 0.3 + R() * 0.35 }); totalNad++; } }
    for (let i = 0; i < nFocha; i++) { const p = punto(c, 2.5); if (p) agregar(2, c, p[0], p[1], { vel: 0.25 + R() * 0.3 }); }
    for (let i = 0; i < nGarza; i++) { const p = punto(c, 0.8, 7); if (p) agregar(3, c, p[0], p[1], { vel: 0.1 + R() * 0.1 }); }
  });
  // en vuelo: sobre los humedales más grandes
  const grandes = cuerpos.slice().sort((a, b) => b.area - a.area).slice(0, 7);
  grandes.forEach((c, ci) => {
    const radio = Math.max(60, Math.min(220, Math.sqrt(c.area) * 0.45));
    for (let i = 0; i < 4; i++) agregar(4, c, c.cx, c.cz, { vuelo: true, ca: R() * 6.28, cr: radio * (0.8 + R() * 0.4), alt: 32 + R() * 38, dir: R() < 0.5 ? 1 : -1, vel: 9 + R() * 3, fr: 2.1 + R() * 0.5 });
    const ca0 = R() * 6.28, dir = R() < 0.5 ? 1 : -1; // bandada de patos: varios con casi la misma órbita
    for (let i = 0; i < 6; i++) agregar(5, c, c.cx, c.cz, { vuelo: true, ca: ca0 + i * 0.035, cr: radio * 0.85 + (i % 2) * 6, alt: 40 + (i % 3) * 3, dir, vel: 12 + R() * 1.2, fr: 7 + R() * 1.2 });
  });

  // mallas instanciadas (una por tipo)
  const grp = new THREE.Group();
  const mats = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, side: THREE.DoubleSide, envMap: T3.env || null, envMapIntensity: 0.35 });
  mats.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = T3.avesU;
    sh.vertexShader = 'attribute float aW;\nattribute float aPh;\nattribute float aFr;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      if (aW > 0.0) { float ax = abs(position.x), fl = sin(uTime * aFr + aPh); // las alas se doblan más hacia la punta
        transformed.y += fl * aW * (0.5 * ax + 0.5 * ax * ax * 1.4);
        transformed.z -= fl * aW * ax * 0.06;
        transformed.x *= (1.0 - 0.07 * abs(fl)); }`);
  };
  mats.customProgramCacheKey = () => 'aves3d-v1';
  const mallas = TIPOS.map((t, ti) => {
    const lista = aves.filter(b => b.tipo === ti), n = Math.max(1, lista.length);
    const geo = t.geo.clone();
    const ph = new Float32Array(n), fr = new Float32Array(n);
    lista.forEach((b, k) => { b.k = k; ph[k] = b.ph; fr[k] = b.fr || t.freq || 1; });
    geo.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1)); geo.setAttribute('aFr', new THREE.InstancedBufferAttribute(fr, 1));
    const m = new THREE.InstancedMesh(geo, mats, n); m.count = lista.length; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const col = new THREE.Color();
    lista.forEach((b, k) => { const v = 0.88 + R() * 0.24; col.setRGB(v, v, v * 0.97); m.setColorAt(k, col); });
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); grp.add(m);
    return m;
  });
  T3.scene.add(grp);

  const d = new THREE.Object3D(); d.rotation.order = 'YXZ';
  const giro = (a, b) => { let x = b - a; while (x > Math.PI) x -= 6.2832; while (x < -Math.PI) x += 6.2832; return x; };
  const api = { grp, lista: aves, total: aves.length, nadando: totalNad, cuerpos: cuerpos.length, porTipo: TIPOS.map((t, i) => t.id + ':' + aves.filter(b => b.tipo === i).length).join(' ') };
  api.update = (dt, now) => {
    for (const b of aves) {
      const t = TIPOS[b.tipo];
      let y = b.c.y, pitch = 0, roll = 0;
      if (b.vuelo) { // órbita elíptica sobre el humedal, con alabeo hacia el centro
        b.ca += b.dir * (b.vel / b.cr) * dt;
        b.x = b.c.cx + Math.cos(b.ca) * b.cr; b.z = b.c.cz + Math.sin(b.ca) * b.cr * 0.6;
        b.h = Math.atan2(-Math.sin(b.ca) * b.dir, Math.cos(b.ca) * 0.6 * b.dir);
        y = b.alt + Math.sin(now * 0.4 + b.ph) * 2.5; roll = -b.dir * 0.3; pitch = Math.sin(now * (b.fr || 3) + b.ph) * 0.05;
      } else {
        b.pausa -= dt;
        if (b.pausa <= 0 && b.dab <= 0) {
          b.tt -= dt; if (b.tt <= 0) { b.th = b.h + (R() - 0.5) * 1.8; b.tt = 2 + R() * 6; if (R() < (t.mov === 'camina' ? 0.6 : 0.2)) b.pausa = 1.5 + R() * (t.mov === 'camina' ? 9 : 4); }
          b.h += Math.max(-1.6 * dt, Math.min(1.6 * dt, giro(b.h, b.th)));
          const nx = b.x + Math.sin(b.h) * b.vel * dt, nz = b.z + Math.cos(b.h) * b.vel * dt;
          if ((++b.n3 || (b.n3 = 1)) % 3 === 0 || b.fuera) { b.fuera = !dentro(nx, nz, b.c.pts); }
          if (b.fuera) { b.th = b.h + Math.PI * (0.7 + R() * 0.6); b.h += 0.15; b.fuera = false; } else { b.x = nx; b.z = nz; }
        }
        if (t.mov === 'nada') {
          y = b.c.y + 0.012 + Math.sin(now * 1.7 + b.ph) * 0.008; roll = Math.sin(now * 1.3 + b.ph) * 0.03;
          if (b.tipo !== 2) { // los patos meten la cabeza al agua (pico y cola arriba) de vez en cuando
            b.sigDab -= dt; if (b.sigDab <= 0 && b.dab <= 0) { b.dab = 2.2; b.sigDab = 12 + R() * 35; }
            if (b.dab > 0) { b.dab -= dt; pitch = 0.9 * Math.sin(Math.min(1, (2.2 - b.dab) / 0.5) * Math.PI / 2) * Math.min(1, b.dab / 0.5); }
          }
        } else { y = b.c.y; }
      }
      d.position.set(b.x, y, b.z); d.rotation.set(pitch, b.h, roll); d.scale.setScalar(b.esc); d.updateMatrix();
      mallas[b.tipo].setMatrixAt(b.k, d.matrix);
    }
    mallas.forEach(m => { m.instanceMatrix.needsUpdate = true; });
  };
  return api;
}
