// REN3D · aves_menu.js — modelos 3D detallados de las aves para el menú «Elige tu ave».
// Cuerpos, cuellos, patas y plumas se generan como tubos suaves (sección elíptica que cambia de radio a lo largo de una curva)
// y las alas como superficies con plumas primarias; todo con color por vértice. Eje +z = hacia adelante, +y = arriba, metros.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const lin = (c) => c.map(v => Math.pow(v, 2.2)); // los colores se escriben en sRGB
const mix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); return a.map((v, i) => v + (b[i] - v) * t); };
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const EJE_X = new THREE.Vector3(1, 0, 0);

function cerrar(pos, col, idx, colorFn, tParam) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal, c = new Float32Array(pos.length);
  for (let i = 0; i < pos.length / 3; i++) { const k = lin(colorFn(tParam[i], n.getX(i), n.getY(i), n.getZ(i), pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])); c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// tubo liso por los puntos [x,y,z,rx,ry] (rx = semiancho lateral, ry = semialto); radio 0 en un extremo lo cierra en punta
function tubo(pts, colorFn, o = {}) {
  const nS = o.seg || 100, nR = o.rad || 20;
  const cur = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
  const rcur = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[3], p[4], 0)), false, 'centripetal');
  const pos = [], tp = [], idx = [];
  for (let i = 0; i <= nS; i++) {
    const t = i / nS, P = cur.getPoint(t), T = cur.getTangent(t), R = rcur.getPoint(t);
    const side = EJE_X.clone().addScaledVector(T, -EJE_X.dot(T)).normalize(), up = new THREE.Vector3().crossVectors(T, side).normalize();
    const rx = Math.max(0, R.x), ry = Math.max(0, R.y);
    for (let j = 0; j < nR; j++) { const a = j / nR * Math.PI * 2; pos.push(P.x + side.x * rx * Math.cos(a) + up.x * ry * Math.sin(a), P.y + side.y * rx * Math.cos(a) + up.y * ry * Math.sin(a), P.z + side.z * rx * Math.cos(a) + up.z * ry * Math.sin(a)); tp.push(t); }
  }
  for (let i = 0; i < nS; i++) for (let j = 0; j < nR; j++) { const a = i * nR + j, b = i * nR + (j + 1) % nR, c = (i + 1) * nR + j, d = (i + 1) * nR + (j + 1) % nR; idx.push(a, c, b, b, c, d); }
  let g = cerrar(pos, null, idx, colorFn, tp);
  // normales hacia afuera: se comprueba en un vértice del medio
  const m = Math.floor(nS / 2) * nR, P = cur.getPoint(0.5), nx = g.attributes.normal;
  if ((g.attributes.position.getX(m) - P.x) * nx.getX(m) + (g.attributes.position.getY(m) - P.y) * nx.getY(m) + (g.attributes.position.getZ(m) - P.z) * nx.getZ(m) < 0) {
    const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    g = cerrar(pos, null, Array.from(ix), colorFn, tp);
  }
  return g;
}
// superficie paramétrica (alas, cola): fn(u,v) -> [x,y,z]; colorFn(u,v)
function superficie(nu, nv, fn, colorFn) {
  const pos = [], tp = [], idx = [], uv = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const u = i / nu, v = j / nv; pos.push(...fn(u, v)); uv.push([u, v]); tp.push(i * (nv + 1) + j); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  return cerrar(pos, null, idx, (k) => colorFn(uv[k][0], uv[k][1]), tp);
}
// esfera/elipsoide pequeño (ojos, escudo, mejillas)
function esf(cx, cy, cz, rx, ry, rz, col) {
  const g = new THREE.SphereGeometry(1, 18, 12); g.deleteAttribute('uv'); const p = g.attributes.position, c = new Float32Array(p.count * 3), k = lin(col);
  for (let i = 0; i < p.count; i++) { p.setXYZ(i, p.getX(i) * rx + cx, p.getY(i) * ry + cy, p.getZ(i) * rz + cz); c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2]; }
  g.computeVertexNormals(); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
const unir = (gs) => mergeGeometries(gs.map(g => { const h = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(h.attributes)) if (!['position', 'normal', 'color'].includes(k)) h.deleteAttribute(k); return h; }));
const plano = (c) => () => c;
const NEGRO = [0.04, 0.04, 0.045], BLANCO = [0.94, 0.94, 0.92];

/* ----------------------------------------------------------------- garza real (Ardea alba), de pie ----------------------------------------------------------------- */
function garza() {
  const plumaje = (t, nx, ny) => mix(mix(BLANCO, [0.78, 0.81, 0.85], ss(0.15, -0.9, ny) * 0.55), [1, 1, 1], ss(0.4, 1, ny) * 0.4);
  const cuerpo = tubo([
    [0, 0.585, -0.42, 0, 0], [0, 0.6, -0.32, 0.03, 0.026], [0, 0.63, -0.17, 0.068, 0.07], [0, 0.65, -0.02, 0.088, 0.098], [0, 0.68, 0.11, 0.078, 0.092], [0, 0.745, 0.19, 0.042, 0.055],
    [0, 0.84, 0.19, 0.028, 0.03], [0, 0.95, 0.145, 0.022, 0.024], [0, 1.04, 0.15, 0.021, 0.022], [0, 1.1, 0.2, 0.023, 0.024], [0, 1.125, 0.265, 0.03, 0.03], [0, 1.125, 0.32, 0.024, 0.022], [0, 1.118, 0.345, 0.008, 0.01]
  ], (t, nx, ny, nz, x, y, z) => t > 0.93 ? [0.92, 0.78, 0.15] : (t > 0.86 && z > 0.29 ? mix(plumaje(t, nx, ny), [0.93, 0.8, 0.18], 0.7) : plumaje(t, nx, ny)), { seg: 220, rad: 24 });
  const pico = tubo([[0, 1.118, 0.34, 0.013, 0.017], [0, 1.113, 0.4, 0.0105, 0.0135], [0, 1.103, 0.5, 0.0035, 0.004], [0, 1.1, 0.515, 0, 0]], (t) => mix([0.95, 0.76, 0.1], [0.78, 0.5, 0.06], ss(0.5, 1, t) * 0.7), { seg: 30, rad: 14 });
  const piezas = [cuerpo, pico];
  for (const s of [1, -1]) {
    piezas.push(esf(s * 0.027, 1.13, 0.292, 0.0085, 0.0085, 0.0085, [0.95, 0.85, 0.2]), esf(s * 0.0335, 1.13, 0.292, 0.0045, 0.0045, 0.0045, NEGRO));
    // ala plegada sobre el flanco
    piezas.push(tubo([[s * 0.083, 0.725, 0.13, 0.004, 0.04], [s * 0.091, 0.685, -0.02, 0.012, 0.078], [s * 0.08, 0.63, -0.22, 0.009, 0.055], [s * 0.05, 0.585, -0.42, 0.003, 0.012], [s * 0.035, 0.575, -0.47, 0, 0]], (t, nx, ny) => mix(plumaje(t, nx, ny), [0.7, 0.74, 0.8], ss(0.5, 0.95, t) * 0.4), { seg: 60, rad: 16 }));
    // patas: tibia con piel amarillenta arriba, tarso negro, dedos largos
    piezas.push(tubo([[s * 0.048, 0.66, 0.0, 0.02, 0.02], [s * 0.05, 0.52, -0.012, 0.0125, 0.0125], [s * 0.05, 0.36, -0.04, 0.0085, 0.0085], [s * 0.05, 0.19, -0.015, 0.0072, 0.0072], [s * 0.05, 0.02, 0.018, 0.0082, 0.0082]], (t) => mix([0.9, 0.9, 0.86], [0.07, 0.07, 0.06], ss(0.2, 0.42, t)), { seg: 80, rad: 12 }));
    for (const d of [-0.03, 0, 0.03]) piezas.push(tubo([[s * 0.05, 0.018, 0.018, 0.0075, 0.0075], [s * (0.05 + d * 0.7), 0.009, 0.1, 0.005, 0.005], [s * (0.05 + d * 1.4), 0.005, 0.16, 0.0035, 0.0035]], plano([0.06, 0.06, 0.055]), { seg: 18, rad: 8 }));
    piezas.push(tubo([[s * 0.05, 0.018, 0.018, 0.0075, 0.0075], [s * 0.05, 0.008, -0.03, 0.005, 0.005], [s * 0.05, 0.005, -0.06, 0.0035, 0.0035]], plano([0.06, 0.06, 0.055]), { seg: 12, rad: 8 }));
  }
  // plumas nupciales (aigrettes) que caen sobre la cola
  for (const x of [-0.035, -0.018, 0, 0.018, 0.035]) piezas.push(tubo([[x, 0.725, 0.0, 0.002, 0.012], [x * 1.4, 0.75, -0.14, 0.002, 0.014], [x * 2, 0.7, -0.3, 0.0015, 0.008], [x * 2.6, 0.62, -0.42, 0, 0]], (t) => mix([0.97, 0.97, 0.95], [0.86, 0.88, 0.9], t * 0.6), { seg: 40, rad: 8 }));
  return unir(piezas);
}

/* ----------------------------------------------------------------- tingua de pico rojo (Gallinula galeata) ----------------------------------------------------------------- */
function tingua() {
  const PIZARRA = [0.1, 0.13, 0.21], NEGRUZCO = [0.045, 0.055, 0.09], OLIVA = [0.25, 0.22, 0.1];
  const cuerpo = tubo([
    [0, 0.215, -0.185, 0, 0], [0, 0.2, -0.14, 0.026, 0.02], [0, 0.17, -0.07, 0.066, 0.057], [0, 0.162, 0.02, 0.083, 0.072], [0, 0.18, 0.09, 0.068, 0.07], [0, 0.225, 0.122, 0.036, 0.046],
    [0, 0.27, 0.132, 0.026, 0.03], [0, 0.305, 0.14, 0.025, 0.027], [0, 0.327, 0.163, 0.029, 0.029], [0, 0.329, 0.19, 0.03, 0.028], [0, 0.325, 0.213, 0.017, 0.016]
  ], (t, nx, ny, nz) => t > 0.55 ? mix(NEGRUZCO, PIZARRA, 0.2) : mix(mix(PIZARRA, [0.2, 0.26, 0.38], ss(-0.2, 0.9, ny) * 0.55), OLIVA, ss(0.55, 1, ny) * ss(0.55, 0.1, t) * 0.8), { seg: 160, rad: 22 });
  const pico = tubo([[0, 0.326, 0.205, 0.0135, 0.0125], [0, 0.322, 0.235, 0.0105, 0.0095], [0, 0.317, 0.262, 0.0035, 0.0035], [0, 0.316, 0.268, 0, 0]], (t) => t > 0.7 ? [0.96, 0.86, 0.2] : [0.86, 0.09, 0.06], { seg: 24, rad: 14 });
  const piezas = [cuerpo, pico, esf(0, 0.345, 0.2, 0.0145, 0.02, 0.0175, [0.86, 0.08, 0.06]),
    tubo([[0, 0.176, -0.095, 0.02, 0.012], [0, 0.19, -0.15, 0.017, 0.012], [0, 0.208, -0.19, 0.004, 0.004], [0, 0.212, -0.195, 0, 0]], plano([0.93, 0.93, 0.9]), { seg: 24, rad: 12 })];
  for (const s of [1, -1]) {
    piezas.push(esf(s * 0.028, 0.333, 0.194, 0.0065, 0.0065, 0.0065, [0.55, 0.12, 0.08]), esf(s * 0.0325, 0.333, 0.194, 0.0035, 0.0035, 0.0035, NEGRO));
    piezas.push(tubo([[s * 0.074, 0.2, 0.075, 0.008, 0.035], [s * 0.083, 0.178, -0.02, 0.014, 0.05], [s * 0.062, 0.168, -0.13, 0.007, 0.024], [s * 0.025, 0.188, -0.185, 0, 0]], (t, nx, ny) => mix(OLIVA, [0.14, 0.14, 0.12], ss(0.3, 1, t) * 0.7 + ss(-0.1, -0.8, ny) * 0.3), { seg: 50, rad: 14 }));
    piezas.push(tubo([[s * 0.087, 0.157, 0.05, 0.004, 0.005], [s * 0.09, 0.153, -0.04, 0.005, 0.006], [s * 0.075, 0.152, -0.12, 0.002, 0.003]], plano([0.95, 0.95, 0.92]), { seg: 24, rad: 8 })); // franja blanca del flanco
    piezas.push(tubo([[s * 0.046, 0.15, 0.01, 0.016, 0.016], [s * 0.05, 0.1, 0.0, 0.0095, 0.0095], [s * 0.05, 0.045, -0.012, 0.0062, 0.0062], [s * 0.05, 0.011, 0.015, 0.0068, 0.0068]], (t) => t < 0.28 ? mix(NEGRUZCO, [0.9, 0.35, 0.1], ss(0.05, 0.15, t)) : mix([0.88, 0.45, 0.1], [0.68, 0.76, 0.22], ss(0.28, 0.45, t)), { seg: 40, rad: 12 }));
    for (const d of [-0.026, 0, 0.026]) piezas.push(tubo([[s * 0.05, 0.012, 0.015, 0.0065, 0.0065], [s * (0.05 + d * 0.8), 0.007, 0.065, 0.0042, 0.0042], [s * (0.05 + d * 1.5), 0.0045, 0.105, 0.003, 0.003]], plano([0.66, 0.74, 0.2]), { seg: 16, rad: 8 }));
    piezas.push(tubo([[s * 0.05, 0.012, 0.015, 0.0065, 0.0065], [s * 0.05, 0.007, -0.01, 0.004, 0.004], [s * 0.05, 0.0045, -0.04, 0.003, 0.003]], plano([0.66, 0.74, 0.2]), { seg: 10, rad: 8 }));
  }
  return unir(piezas);
}

/* ----------------------------------------------------------------- gaviota andina (Chroicocephalus serranus), en vuelo planeado ----------------------------------------------------------------- */
function gaviota() {
  const GRIS = [0.7, 0.73, 0.78], ENCAPUCHADO = [0.17, 0.11, 0.09], ROJO = [0.8, 0.12, 0.1];
  const cuerpo = tubo([
    [0, 0.0, -0.2, 0, 0], [0, 0.0, -0.16, 0.022, 0.02], [0, 0.0, -0.07, 0.05, 0.052], [0, 0.005, 0.05, 0.058, 0.06], [0, 0.012, 0.15, 0.045, 0.048], [0, 0.02, 0.2, 0.032, 0.034],
    [0, 0.026, 0.235, 0.034, 0.034], [0, 0.026, 0.268, 0.034, 0.033], [0, 0.02, 0.295, 0.016, 0.016], [0, 0.018, 0.305, 0.004, 0.004]
  ], (t, nx, ny, nz, x, y, z) => mix(mix(BLANCO, [0.86, 0.88, 0.9], ss(0.1, -0.9, ny) * 0.5), ENCAPUCHADO, ss(0.225, 0.245, z)), { seg: 180, rad: 22 });
  const pico = tubo([[0, 0.02, 0.292, 0.0085, 0.0095], [0, 0.017, 0.318, 0.0065, 0.0075], [0, 0.0105, 0.346, 0.0028, 0.0028], [0, 0.009, 0.353, 0, 0]], plano(ROJO), { seg: 24, rad: 12 });
  const cola = superficie(10, 14, (u, v) => { const w = 0.028 + 0.052 * v, x = (u - 0.5) * 2 * w; return [x, 0.002 - 0.012 * v, -0.15 - v * 0.16 + 0.03 * (x / w) * (x / w) * v]; }, (u, v) => mix(BLANCO, [0.88, 0.9, 0.93], v * 0.5));
  const piezas = [cuerpo, pico, cola];
  for (const s of [1, -1]) {
    piezas.push(esf(s * 0.0305, 0.034, 0.268, 0.0075, 0.0075, 0.0075, [0.05, 0.03, 0.03]), esf(s * 0.0285, 0.034, 0.268, 0.0105, 0.0105, 0.0105, [0.96, 0.96, 0.95]));
    // ala: brazo ancho, muñeca elevada y mano con las 5-6 plumas primarias separadas (negras con espejos blancos)
    piezas.push(superficie(100, 18, (u, v) => {
      const arm = Math.min(1, u / 0.42), hand = Math.max(0, (u - 0.42) / 0.58);
      const x = s * (0.045 + 0.53 * u), y = 0.15 * arm * (2 - arm) - 0.15 * Math.pow(hand, 1.25) + 0.012 * Math.sin(Math.PI * v) * (1 - 0.6 * u) - 0.02 * v * v * (0.5 + hand);
      const zLE = 0.055 - 0.03 * arm - 0.3 * Math.pow(hand, 1.45);
      let ch = u < 0.42 ? 0.185 - 0.03 * arm : 0.155 * (1 - Math.pow(hand, 1.5)) + 0.022;
      if (u > 0.5) ch *= 1 + 0.09 * ss(0.5, 0.75, u) * (0.5 + 0.5 * Math.cos(Math.PI * 2 * 5.5 * (u - 0.5) / 0.5));
      return [x, y, zLE - v * ch];
    }, (u, v) => {
      let c = mix([0.74, 0.77, 0.82], GRIS, ss(0.0, 0.8, v) * 0.7); // dorso gris perla, borde de ataque algo más claro
      c = mix(c, [0.95, 0.95, 0.95], ss(0.9, 1, v) * ss(0.2, 0.5, u) * 0.6); // borde de salida blanquecino
      const negro = ss(0.74, 0.79, u) * ss(0.15, 0.4, v); // puntas negras
      c = mix(c, [0.04, 0.04, 0.05], negro);
      return mix(c, [0.93, 0.93, 0.93], ss(0.93, 1.0, u) * ss(0.8, 0.95, v) * 0.5);
    }));
  }
  // patas rojas recogidas bajo la cola
  for (const s of [1, -1]) piezas.push(tubo([[s * 0.02, -0.03, -0.1, 0.006, 0.006], [s * 0.022, -0.045, -0.16, 0.005, 0.005], [s * 0.024, -0.05, -0.2, 0.003, 0.003]], plano(ROJO), { seg: 20, rad: 8 }), esf(s * 0.024, -0.05, -0.21, 0.008, 0.003, 0.014, ROJO));
  return unir(piezas);
}

export function geometriaAveMenu(id) { return id === 'garza' ? garza() : id === 'tingua' ? tingua() : id === 'gaviota' ? gaviota() : null; }
