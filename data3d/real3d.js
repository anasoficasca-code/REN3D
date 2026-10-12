// REN3D · real3d.js
// Carros (cinco estilos, siempre de frente), arboles reales 3D (jacaranda y arbol pequeno, Poly Haven CC0, con niveles de detalle por
// distancia), pasto y arbustos reales 3D, agua con ondas reales y aves en todos los humedales. Creditos en data3d/CREDITOS.txt
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const gltfLoader = new GLTFLoader();
const hash = (i) => { i = (i + 0x7ed55d16) + (i << 12); i = (i ^ 0xc761c23c) ^ (i >>> 19); i = (i + 0x165667b1) + (i << 5); i = (i + 0xd3a2646c) ^ (i << 9); i = (i + 0xfd7046c5) + (i << 3); i = (i ^ 0xb55a4f09) ^ (i >>> 16); return (i >>> 0) / 4294967296; };

/* ------------------------------------------------------------------ entorno: reflejos del cielo ------------------------------------------------------------------ */
export function makeEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x255a98) }, mid: { value: new THREE.Color(0x6f98bd) }, bot: { value: new THREE.Color(0x9fb7c9) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top, mid, bot; void main(){ float y = normalize(vP).y; vec3 c = mix(bot, mid, smoothstep(-0.1, 0.3, y)); c = mix(c, top, smoothstep(0.25, 0.9, y)); c = mix(c, vec3(0.25, 0.28, 0.25), smoothstep(-0.02, -0.25, y)); gl_FragColor = vec4(c, 1.0); }'
  }));
  s.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: 0xfff4d8 }));
  sun.position.set(0.42, 0.62, 0.35).normalize().multiplyScalar(44); s.add(sun);
  const tex = pm.fromScene(s, 0.02).texture; pm.dispose();
  return tex;
}

/* ------------------------------------------------------------------ carros ------------------------------------------------------------------ */
// Perfiles laterales (x = largo, el frente es +x; y = alto) en metros. Todos los carros miran hacia +Z.
const ESTILOS = {
  sedan: { w: 1.80, r: 0.33, zD: 1.42, zT: -1.36, cuerpo: [[-2.12, 0.34], [2.12, 0.34], [2.18, 0.54], [2.10, 0.74], [1.52, 0.86], [0.78, 0.93], [-1.50, 0.95], [-2.06, 0.89], [-2.18, 0.62]], cab: [[-1.28, 0.93], [-0.84, 1.38], [0.28, 1.38], [0.96, 0.93]], techo: 1.38, mir: 0.55 },
  hatch: { w: 1.72, r: 0.31, zD: 1.16, zT: -1.10, cuerpo: [[-1.80, 0.34], [1.80, 0.34], [1.86, 0.54], [1.78, 0.72], [1.28, 0.84], [0.60, 0.91], [-1.58, 0.97], [-1.82, 0.88], [-1.88, 0.62]], cab: [[-1.58, 0.95], [-1.38, 1.40], [0.22, 1.42], [0.80, 0.91]], techo: 1.42, mir: 0.50 },
  suv: { w: 1.90, r: 0.37, zD: 1.45, zT: -1.40, cuerpo: [[-2.18, 0.42], [2.18, 0.42], [2.24, 0.66], [2.16, 0.92], [1.58, 1.02], [0.90, 1.08], [-1.70, 1.10], [-2.14, 1.04], [-2.24, 0.74]], cab: [[-1.84, 1.08], [-1.58, 1.60], [0.50, 1.62], [1.04, 1.08]], techo: 1.62, mir: 0.75 },
  taxi: { w: 1.80, r: 0.33, zD: 1.42, zT: -1.36, cuerpo: null, cab: null, techo: 1.38, mir: 0.55, taxi: true },
  van: { w: 1.95, r: 0.34, zD: 1.60, zT: -1.68, cuerpo: [[-2.50, 0.38], [2.50, 0.38], [2.56, 0.62], [2.44, 1.00], [1.84, 1.18], [-2.40, 1.20], [-2.54, 0.94]], cab: [[-2.30, 1.18], [-2.26, 1.92], [1.34, 1.92], [1.92, 1.20]], techo: 1.92, mir: 0.92 }
};
ESTILOS.taxi.cuerpo = ESTILOS.sedan.cuerpo; ESTILOS.taxi.cab = ESTILOS.sedan.cab;
const NOMBRES = ['sedan', 'hatch', 'suv', 'taxi', 'van'];
const PESOS = [0.34, 0.28, 0.18, 0.14, 0.06];
const PINTURAS = [0xf1f2f3, 0xf1f2f3, 0xc9ced3, 0xa7adb4, 0x23262b, 0x15171a, 0xa31d22, 0x1f3f7a, 0x2b2f36, 0xd8cdb8, 0x1f5a3d, 0x6b7280];

function extruir(pts, ancho, bisel, seg) {
  const shape = new THREE.Shape(); pts.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])); shape.closePath();
  const prof = Math.max(0.02, ancho - 2 * bisel);
  const g = new THREE.ExtrudeGeometry(shape, { depth: prof, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: seg, curveSegments: 1, steps: 1 });
  g.translate(0, 0, -prof / 2); g.rotateY(-Math.PI / 2); // largo -> +Z, ancho centrado en X
  return g;
}
function conColor(g, r, gr, b) { const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gr; c[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }
function caja(w, h, d, x, y, z, col) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return conColor(g, col[0], col[1], col[2]); }
function limpiar(g) { const o = new THREE.BufferGeometry(); o.setAttribute('position', g.attributes.position); o.setAttribute('normal', g.attributes.normal); o.setAttribute('uv', g.attributes.uv); if (g.index) o.setIndex(g.index); return o; }

function geometriasCarro(E) {
  const w = E.w, front = Math.max(...E.cuerpo.map(p => p[0])), rear = Math.min(...E.cuerpo.map(p => p[0]));
  const cuerpo = extruir(E.cuerpo, w, 0.10, 3), cab = extruir(E.cab, w - 0.30, 0.05, 2);
  const c = E.cab, t = E.techo;
  const techo = extruir([[c[1][0] - 0.05, t - 0.05], [c[2][0] + 0.05, t - 0.05], [c[2][0] + 0.03, t + 0.03], [c[1][0] - 0.03, t + 0.03]], w - 0.42, 0.02, 1);
  const body = mergeGeometries([cuerpo, techo].map(limpiar));
  const glass = limpiar(cab);
  // llantas, rines, parrilla, espejos
  const tr = [], lu = [];
  for (const sx of [-1, 1]) for (const z of [E.zD, E.zT]) {
    const tire = new THREE.CylinderGeometry(E.r, E.r, 0.24, 20); tire.rotateZ(Math.PI / 2); tire.translate(sx * (w / 2 - 0.10), E.r, z); tr.push(conColor(tire, 0.045, 0.045, 0.05));
    const rim = new THREE.CylinderGeometry(E.r * 0.62, E.r * 0.62, 0.26, 16); rim.rotateZ(Math.PI / 2); rim.translate(sx * (w / 2 - 0.095), E.r, z); tr.push(conColor(rim, 0.62, 0.64, 0.68));
  }
  tr.push(caja(w * 0.52, 0.15, 0.05, 0, 0.52, front + 0.02, [0.03, 0.03, 0.035]));
  tr.push(caja(w - 0.12, 0.10, 4.3, 0, 0.36, (front + rear) / 2, [0.04, 0.04, 0.045]));
  for (const sx of [-1, 1]) tr.push(caja(0.13, 0.11, 0.2, sx * (w / 2 + 0.06), E.cab[0][1] + E.mir * 0.28 + 0.12, E.cab[3][0] - 0.10, [0.04, 0.04, 0.045]));
  // faros, luces traseras, placas amarillas (como las de Colombia); el taxi lleva el aviso en el techo
  lu.push(caja(0.32, 0.11, 0.05, -w * 0.31, 0.70, front + 0.025, [1.0, 0.96, 0.82]), caja(0.32, 0.11, 0.05, w * 0.31, 0.70, front + 0.025, [1.0, 0.96, 0.82]));
  lu.push(caja(0.34, 0.12, 0.05, -w * 0.31, 0.76, rear - 0.025, [0.85, 0.05, 0.06]), caja(0.34, 0.12, 0.05, w * 0.31, 0.76, rear - 0.025, [0.85, 0.05, 0.06]));
  lu.push(caja(0.36, 0.14, 0.03, 0, 0.50, front + 0.045, [0.96, 0.78, 0.10]), caja(0.36, 0.14, 0.03, 0, 0.62, rear - 0.045, [0.96, 0.78, 0.10]));
  if (E.taxi) lu.push(caja(0.50, 0.15, 0.22, 0, t + 0.10, 0.0, [1.0, 0.98, 0.9]));
  return { body, glass, trim: mergeGeometries(tr.map(g => { const o = limpiar(g); o.setAttribute('color', g.attributes.color); return o; })), lights: mergeGeometries(lu.map(g => { const o = limpiar(g); o.setAttribute('color', g.attributes.color); return o; })),
    body1: limpiar(extruir(E.cuerpo, w, 0.03, 1)), glass1: limpiar(extruir(E.cab, w - 0.30, 0.0, 1)) };
}

export function createFleet(T3, env) {
  const SC = 1.4, NEAR = 130, CAPN = 280, CAPF = 2800, YBASE = 1.52;
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.30, clearcoat: 1, clearcoatRoughness: 0.05, envMap: env, envMapIntensity: 1.25 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x0b1117, metalness: 0.3, roughness: 0.04, envMap: env, envMapIntensity: 1.8 });
  const trimM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25, envMap: env, envMapIntensity: 0.6 });
  const lightM = new THREE.MeshBasicMaterial({ vertexColors: true });
  const est = NOMBRES.map(n => {
    const g = geometriasCarro(ESTILOS[n]);
    const mk = (geo, mat, cap, sombra) => { const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.frustumCulled = false; m.castShadow = sombra; m.receiveShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T3.scene.add(m); return m; };
    const o = { nombre: n, near: { body: mk(g.body, paint, CAPN, true), glass: mk(g.glass, glassM, CAPN, true), trim: mk(g.trim, trimM, CAPN, true), lights: mk(g.lights, lightM, CAPN, false) }, far: { body: mk(g.body1, paint, CAPF, true), glass: mk(g.glass1, glassM, CAPF, false) } };
    o.near.body.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAPN * 3), 3); o.far.body.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAPF * 3), 3);
    const nt = (q) => (q.index ? q.index.count : q.attributes.position.count) / 3; o.tris = nt(g.body) + nt(g.glass) + nt(g.trim) + nt(g.lights); o.tris1 = nt(g.body1) + nt(g.glass1);
    return o;
  });
  const MAXC = 3200, X = new Float32Array(MAXC), Z = new Float32Array(MAXC), H = new Float32Array(MAXC), ID = new Int32Array(MAXC);
  const estiloDe = new Int8Array(8192).fill(-1), colorDe = new Int8Array(8192).fill(-1);
  const d = new THREE.Object3D(), col = new THREE.Color();
  const fleet = { n: 0, estilos: est, begin() { this.n = 0; }, add(x, z, h, id) { if (this.n < MAXC) { X[this.n] = x; Z[this.n] = z; H[this.n] = h; ID[this.n] = id; this.n++; } } };
  fleet.end = function (cx, cz) {
    const cn = est.map(() => 0), cf = est.map(() => 0);
    for (let i = 0; i < this.n; i++) {
      const id = ID[i] & 8191;
      if (estiloDe[id] < 0) { const r = hash(id * 7 + 3); let a = 0, s = 0; for (; s < PESOS.length - 1; s++) { a += PESOS[s]; if (r < a) break; } estiloDe[id] = s; colorDe[id] = Math.floor(hash(id * 13 + 5) * PINTURAS.length); }
      const s = estiloDe[id], o = est[s], dx = X[i] - cx, dz = Z[i] - cz, cercano = dx * dx + dz * dz < NEAR * NEAR && cn[s] < CAPN;
      d.position.set(X[i], YBASE, Z[i]); d.rotation.set(0, H[i], 0); d.scale.setScalar(SC); d.updateMatrix();
      col.setHex(s === 3 ? 0xf2c200 : PINTURAS[colorDe[id]]);
      if (cercano) { const k = cn[s]++; for (const p of ['body', 'glass', 'trim', 'lights']) o.near[p].setMatrixAt(k, d.matrix); o.near.body.setColorAt(k, col); }
      else if (cf[s] < CAPF) { const k = cf[s]++; o.far.body.setMatrixAt(k, d.matrix); o.far.glass.setMatrixAt(k, d.matrix); o.far.body.setColorAt(k, col); }
    }
    est.forEach((o, s) => {
      for (const p of ['body', 'glass', 'trim', 'lights']) { o.near[p].count = cn[s]; o.near[p].instanceMatrix.needsUpdate = true; }
      o.near.body.instanceColor.needsUpdate = true;
      for (const p of ['body', 'glass']) { o.far[p].count = cf[s]; o.far[p].instanceMatrix.needsUpdate = true; }
      o.far.body.instanceColor.needsUpdate = true;
    });
    fleet.stats = { cerca: cn.reduce((a, b) => a + b, 0), lejos: cf.reduce((a, b) => a + b, 0), estilos: est.map((o, s) => o.nombre + ':' + (cn[s] + cf[s])).join(' '), trisCerca: est.map(o => Math.round(o.tris)).join('/'), trisLejos: est.map(o => Math.round(o.tris1)).join('/') };
  };
  return fleet;
}

/* ------------------------------------------------------------------ utilidades de modelos ------------------------------------------------------------------ */
function recolectar(scene) { const out = []; scene.updateMatrixWorld(true); scene.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); out.push({ geo: g, mat: o.material }); } }); return out; }
function cajaDe(partes) { const b = new THREE.Box3(); partes.forEach(p => { p.geo.computeBoundingBox(); b.union(p.geo.boundingBox); }); return b; }
function ajustarMat(m, env, o) { m.side = THREE.DoubleSide; m.metalness = 0; m.roughness = o.roughness ?? 0.85; if (o.tinte) m.color.multiplyScalar(o.tinte); if (o.alphaTest) { m.alphaTest = o.alphaTest; m.transparent = false; m.depthWrite = true; } m.envMap = env; m.envMapIntensity = o.env ?? 0.45; m.needsUpdate = true; return m; }
const estaDentro = (x, z, v) => { let ins = false; for (let i = 0, j = v.length - 1; i < v.length; j = i++) { if (((v[i][1] > z) !== (v[j][1] > z)) && (x < (v[j][0] - v[i][0]) * (z - v[i][1]) / (v[j][1] - v[i][1]) + v[i][0])) ins = !ins; } return ins; };
function distBorde(x, z, v) { let m = 1e9; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); const q = Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz)); if (q < m) m = q; } return m; }
function cuerposDeAgua(W, lw) {
  const out = [];
  for (const w of W || []) {
    const pts = w.pts.map(p => lw(p[0], p[1])); if (pts.length < 3) continue;
    const cerrado = pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1.0;
    let area = 0, cx = 0, cz = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; cx += a[0]; cz += a[1]; }
    out.push({ pts: cerrado ? pts.slice(0, -1) : pts, cerrado, area: Math.abs(area) / 2, cx: cx / pts.length, cz: cz / pts.length, tipo: (w.tipo || '').toLowerCase() });
  }
  return out;
}

/* ------------------------------------------------------------------ arboles reales con niveles de detalle ------------------------------------------------------------------ */
// Cerca: modelo real completo. Media distancia: modelo real reducido. Lejos: siluetas del mismo arbol real (dibujadas una vez desde el propio modelo), nunca esferas.
const ESPECIES_ARBOL = [
  { base: 'jacaranda', peso: 0.30, ancho: 13 }, { base: 'arbolpeq', peso: 0.25, ancho: 9 },
  { base: 'island_tree_01', peso: 0.25, ancho: 12 }, { base: 'island_tree_02', peso: 0.20, ancho: 12 }
];
function realzarMaterial(m, env, hoja) {
  ajustarMat(m, env, { roughness: 0.9, tinte: hoja ? 1.25 : 1.0, env: 0.4 });
  // las caras que no miran al sol no se ven negras: la textura aporta un poco de luz propia
  if (m.map) { m.emissiveMap = m.map; m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = hoja ? 0.42 : 0.18; }
  m.needsUpdate = true; return m;
}
function dibujarSiluetas(T3, partes, alto, ancho) {
  const lado = Math.max(alto, ancho) * 1.08, rt = new THREE.WebGLRenderTarget(512, 512, { samples: 4 }), s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xdfeaff, 0x6a7a55, 1.4)); const sol = new THREE.DirectionalLight(0xfff1d6, 2.6); sol.position.set(30, 60, 40); s.add(sol);
  partes.forEach(p => { const mesh = new THREE.Mesh(p.geo, p.mat); s.add(mesh); });
  const cam = new THREE.OrthographicCamera(-lado / 2, lado / 2, lado / 2, -lado / 2, 1, 200); cam.position.set(0, lado / 2, 80); cam.lookAt(0, lado / 2, 0);
  const r = T3.renderer, c0 = new THREE.Color(); r.getClearColor(c0); const a0 = r.getClearAlpha(), rt0 = r.getRenderTarget();
  r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(s, cam); r.setRenderTarget(rt0); r.setClearColor(c0, a0);
  return { tex: rt.texture, lado };
}
export async function buildTrees(T3, T, W, lw, env, Pq, Net) {
  const stride = Math.max(1, Math.ceil(T.t.length / 130000)); // se muestran todos los arboles de los datos
  const X = [], Z = [], Hh = [], SP = [], pesoTot = ESPECIES_ARBOL.reduce((a, e) => a + e.peso, 0);
  const elegir = (r) => { r *= pesoTot; for (let k = 0; k < ESPECIES_ARBOL.length; k++) { r -= ESPECIES_ARBOL[k].peso; if (r < 0) return k; } return ESPECIES_ARBOL.length - 1; };
  for (let i = 0; i < T.t.length; i += stride) { const t = T.t[i], w = lw(t[0], t[1]); X.push(w[0]); Z.push(w[1]); Hh.push(Math.max(4, Math.min(16, t[2] || 6))); SP.push(elegir(hash(i * 3 + 1))); }
  const aguas = cuerposDeAgua(W, lw); let ribera = 0;
  for (const a of aguas) {
    for (let i = 0; i < a.pts.length && ribera < 9000; i += 3) {
      const p = a.pts[i]; let dx, dz;
      if (a.cerrado) { dx = p[0] - a.cx; dz = p[1] - a.cz; } else { const q = a.pts[Math.min(i + 1, a.pts.length - 1)]; dx = -(q[1] - p[1]); dz = q[0] - p[0]; if ((i % 8) >= 4) { dx = -dx; dz = -dz; } }
      const L = Math.hypot(dx, dz) || 1, r = 6 + hash(i * 17 + 3) * 20;
      if (hash(i * 29 + 7) < 0.88) { X.push(p[0] + dx / L * r + (hash(i * 5 + 1) - 0.5) * 6); Z.push(p[1] + dz / L * r + (hash(i * 11 + 9) - 0.5) * 6); Hh.push(5 + hash(i) * 7); SP.push(elegir(hash(i * 7 + 2))); ribera++; }
    }
  }
  // arboles dentro de las zonas verdes
  let enParques = 0;
  for (const p of (Pq || [])) {
    if (enParques > 26000) break;
    const v = []; for (const q of p.pts) { const w = lw(q[0], q[1]); v.push([w[0], w[1]]); }
    if (v.length > 1 && Math.hypot(v[0][0] - v[v.length - 1][0], v[0][1] - v[v.length - 1][1]) < 0.01) v.pop();
    if (v.length < 3) continue;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, area = 0;
    for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); z0 = Math.min(z0, a[1]); z1 = Math.max(z1, a[1]); area += a[0] * b[1] - b[0] * a[1]; }
    area = Math.abs(area) / 2; const quiero = Math.min(900, Math.floor(area / 240)); let puestos = 0, intentos = 0;
    while (puestos < quiero && intentos++ < quiero * 6) {
      const x = x0 + hash(enParques * 7 + intentos) * (x1 - x0), z = z0 + hash(enParques * 11 + intentos * 3 + 1) * (z1 - z0);
      if (estaDentro(x, z, v)) { X.push(x); Z.push(z); Hh.push(5 + hash(enParques * 13 + intentos) * 8); SP.push(elegir(hash(enParques * 17 + intentos * 5))); puestos++; enParques++; }
    }
  }
  // arboles de calle: a lo largo de las vias, alternando lados, para que las calles no queden peladas
  let deCalle = 0;
  for (const [clase, pts] of ((Net && Net.edges) || [])) {
    if (deCalle > 90000) break;
    const medio = clase === 'major' ? 7 : clase === 'mid' ? 5.2 : 3.4, paso = clase === 'local' ? 26 : 20; let acum = paso * 0.5, lado = (deCalle & 1) ? 1 : -1;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.5) continue;
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L; let t = paso - acum;
      while (t < L) {
        const k = (deCalle * 7 + i) * 31 + Math.floor(t * 3) + Math.floor(a[0]) % 97; // la semilla cambia con la posicion para no repetir el mismo "no" a lo largo del tramo
        if (hash(k * 3 + 1) < 0.62) { const w = lw(a[0] + ux * t - uy * medio * lado, a[1] + uy * t + ux * medio * lado); X.push(w[0] + (hash(k) - 0.5) * 1.2); Z.push(w[1] + (hash(k + 5) - 0.5) * 1.2); Hh.push(5 + hash(k * 5 + 2) * 5); SP.push(elegir(hash(k * 11 + 3))); deCalle++; lado = -lado; }
        t += paso * (0.8 + hash(k * 13 + 7) * 0.5);
      }
      acum = (acum + L) % paso;
    }
  }
  const N = X.length, ROT = new Float32Array(N); for (let i = 0; i < N; i++) ROT[i] = hash(i * 41 + 11) * Math.PI * 2;
  const especies = [];
  for (const E of ESPECIES_ARBOL) {
    const niveles = {};
    for (const nv of ['L0', 'L1']) {
      const partes = [];
      for (const parte of ['madera', 'hojas']) { const g = await gltfLoader.loadAsync(`data3d/models/${E.base}_${nv}_${parte}.glb`); partes.push(...recolectar(g.scene).map(p => ({ ...p, hoja: parte === 'hojas' }))); }
      niveles[nv] = partes;
    }
    const b = cajaDe(niveles.L0), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, alto = b.max.y - b.min.y, ancho = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
    for (const nv of ['L0', 'L1']) niveles[nv].forEach(p => { p.geo.translate(-cx, -b.min.y, -cz); realzarMaterial(p.mat, env, p.hoja); });
    const sil = dibujarSiluetas(T3, niveles.L0, alto, ancho);
    especies.push({ ...E, niveles, alto, ancho, sil });
  }
  const CAP0 = 80, CAP1 = 1400, R0 = 55, R1 = 260, d = new THREE.Object3D(), col = new THREE.Color();
  const lod = especies.map(e => ({ L0: e.niveles.L0.map(p => { const m = new THREE.InstancedMesh(p.geo, p.mat, CAP0); m.count = 0; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; T3.scene.add(m); return m; }),
    L1: e.niveles.L1.map(p => { const m = new THREE.InstancedMesh(p.geo, p.mat, CAP1); m.count = 0; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; T3.scene.add(m); return m; }) }));
  lod.forEach(l => [...l.L0, ...l.L1].forEach(m => { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(m.instanceMatrix.count * 3), 3); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }));
  // lejos: tres planos cruzados con la silueta real de la especie
  const cruz = (lado) => { const ps = [0, Math.PI / 3, -Math.PI / 3].map(a => { const g = new THREE.PlaneGeometry(lado, lado); g.translate(0, lado / 2, 0); g.rotateY(a); return g; }); return mergeGeometries(ps); };
  const lejos = especies.map((e, ei) => { const mat = new THREE.MeshBasicMaterial({ map: e.sil.tex, alphaTest: 0.42, side: THREE.DoubleSide }); const cap = SP.reduce((a, q) => a + (q === ei ? 1 : 0), 0) + 16; const m = new THREE.InstancedMesh(cruz(e.sil.lado), mat, cap); m.count = 0; m.frustumCulled = false; m.castShadow = false; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T3.scene.add(m); return m; });
  const escala = (i) => { const e = especies[SP[i]]; return Math.min(Hh[i] / e.alto, e.ancho / e.ancho0 || Hh[i] / e.alto); };
  especies.forEach(e => { e.ancho0 = e.ancho; });
  const esc = (i) => { const e = especies[SP[i]]; return Math.min(Hh[i] / e.alto, ESPECIES_ARBOL[SP[i]].ancho / e.ancho); };
  const FM = new Float32Array(N * 16), FC = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { d.position.set(X[i], 0, Z[i]); d.rotation.set(0, ROT[i], 0); d.scale.setScalar(esc(i)); d.updateMatrix(); FM.set(d.matrix.elements, i * 16); const tv = 0.88 + hash(i * 19) * 0.24; FC[i * 3] = tv; FC[i * 3 + 1] = tv; FC[i * 3 + 2] = tv; }
  const ult = { x: 1e9, z: 1e9, t: 0 }, cand = [];
  const api = { N, ribera, enParques, deCalle, especies: especies.map(e => e.base + ':' + e.niveles.L0.reduce((a, p) => a + (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3, 0) + '/' + e.niveles.L1.reduce((a, p) => a + (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3, 0)) };
  api.update = (cam, force) => {
    const now = performance.now(), dx = cam.position.x - ult.x, dz = cam.position.z - ult.z;
    if (!force && dx * dx + dz * dz < 36 && now - ult.t < 1500) return;
    ult.x = cam.position.x; ult.z = cam.position.z; ult.t = now;
    cand.length = 0;
    for (let i = 0; i < N; i++) { const ex = X[i] - ult.x, ez = Z[i] - ult.z, d2 = ex * ex + ez * ez; if (d2 < R1 * R1) cand.push([i, d2]); }
    cand.sort((a, b) => a[1] - b[1]);
    const n0 = lod.map(() => 0), n1 = lod.map(() => 0), asignado = new Uint8Array(N);
    for (const [i, d2] of cand) {
      const s = SP[i], sc = esc(i), tv = 0.82 + hash(i * 19) * 0.34;
      d.position.set(X[i], 0, Z[i]); d.rotation.set(0, ROT[i], 0); d.scale.setScalar(sc); d.updateMatrix(); col.setRGB(tv, tv * (0.96 + hash(i) * 0.08), tv * 0.94);
      if (d2 < R0 * R0 && n0[s] < CAP0) { const k = n0[s]++; lod[s].L0.forEach(m => { m.setMatrixAt(k, d.matrix); m.setColorAt(k, col); }); asignado[i] = 1; }
      else if (n1[s] < CAP1) { const k = n1[s]++; lod[s].L1.forEach(m => { m.setMatrixAt(k, d.matrix); m.setColorAt(k, col); }); asignado[i] = 1; }
    }
    lod.forEach((l, s) => { l.L0.forEach(m => { m.count = n0[s]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }); l.L1.forEach(m => { m.count = n1[s]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }); });
    const nf = lejos.map(() => 0);
    for (let i = 0; i < N; i++) {
      if (asignado[i]) continue;
      const s = SP[i], k = nf[s]++, ca = lejos[s].instanceColor.array;
      lejos[s].instanceMatrix.array.set(FM.subarray(i * 16, i * 16 + 16), k * 16); ca[k * 3] = FC[i * 3]; ca[k * 3 + 1] = FC[i * 3 + 1]; ca[k * 3 + 2] = FC[i * 3 + 2];
    }
    lejos.forEach((m, s) => { m.count = nf[s]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
    api.stats = { cerca: n0.join('+'), medio: n1.join('+'), lejos: nf.join('+') };
  };
  api.update({ position: new THREE.Vector3(1e8, 0, 1e8) }, true);
  return api;
}

/* ------------------------------------------------------------------ pasto 3D verde, matas y plantas reales ------------------------------------------------------------------ */
function geometriaPasto(sem, o) {
  o = Object.assign({ blades: 18, hMin: 0.25, hMax: 0.55, radio: 0.17, ancho: 0.03, incl: [0.06, 0.26], base: [0.10, 0.26, 0.05], punta: [0.50, 0.74, 0.20] }, o || {});
  const rnd = (i) => hash(sem * 1000 + i * 7 + 1), P = [], C = [], I = [];
  for (let b = 0; b < o.blades; b++) {
    const ang = rnd(b * 5) * Math.PI * 2, rad = Math.sqrt(rnd(b * 5 + 1)) * o.radio, alto = o.hMin + rnd(b * 5 + 2) * (o.hMax - o.hMin), inclina = (o.incl[0] + rnd(b * 5 + 3) * (o.incl[1] - o.incl[0])) * alto, dir = ang + (rnd(b * 5 + 4) - 0.5) * 1.4;
    const ox = Math.cos(ang) * rad, oz = Math.sin(ang) * rad, ancho = o.ancho * (0.8 + rnd(b * 5 + 6) * 0.6), px = -Math.sin(dir), pz = Math.cos(dir), jit = (rnd(b * 5 + 8) - 0.5) * 0.12;
    const v0 = P.length / 3;
    for (let s = 0; s <= 3; s++) {
      const t = s / 3, y = alto * t, off = inclina * t * t, w = ancho * (1 - t * 0.9) * 0.5, cx = ox + Math.cos(dir) * off, cz = oz + Math.sin(dir) * off;
      const col = [o.base[0] + (o.punta[0] - o.base[0]) * t + jit * 0.5, o.base[1] + (o.punta[1] - o.base[1]) * t + jit, o.base[2] + (o.punta[2] - o.base[2]) * t];
      if (s < 3) { P.push(cx - px * w, y, cz - pz * w, cx + px * w, y, cz + pz * w); C.push(col[0], col[1], col[2], col[0], col[1], col[2]); }
      else { P.push(cx, y, cz); C.push(col[0], col[1], col[2]); }
    }
    I.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2, v0 + 2, v0 + 3, v0 + 4, v0 + 3, v0 + 5, v0 + 4, v0 + 4, v0 + 5, v0 + 6);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
  const n = g.attributes.normal.array; for (let i = 0; i < n.length; i += 3) { n[i] *= 0.4; n[i + 1] = 0.9; n[i + 2] *= 0.4; } return g;
}
export async function buildNearPlants(T3, W, lw, env, Pq) {
  const plantas = [['fern_02', 4, 0.50, 1.00, 0.26], ['celandine_01', 5, 0.24, 0.45, 0.14], ['nettle_plant', 6, 0.50, 0.95, 0.20], ['periwinkle_plant', 6, 0.45, 0.85, 0.22], ['calathea_orbifolia_01', 5, 0.55, 1.05, 0.18]];
  const variantes = [];
  for (const [id, cuantas, a0, a1, peso] of plantas) {
    const g = await gltfLoader.loadAsync(`data3d/models/${id}.glb`); const partes = recolectar(g.scene).slice(0, cuantas);
    partes.forEach(p => { p.geo.computeBoundingBox(); const b = p.geo.boundingBox, h0 = Math.max(0.02, b.max.y - b.min.y); p.geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); ajustarMat(p.mat, env, { roughness: 0.9, alphaTest: 0.45, env: 0.2, tinte: 1.15 }); p.mat.emissiveMap = p.mat.map; p.mat.emissive = new THREE.Color(1, 1, 1); p.mat.emissiveIntensity = 0.38; variantes.push({ geo: p.geo, mat: p.mat, h0, a0, a1, peso: peso / partes.length }); });
  }
  const pastoMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  pastoMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = T3.waterU;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
        transformed.x += sin(uTime * 1.8 + ph) * 0.07 * position.y;
        transformed.z += cos(uTime * 1.3 + ph) * 0.05 * position.y;
      #endif`);
  };
  const pastos = [0, 1, 2, 3].map(s => geometriaPasto(s + 1)), juncos = [0, 1].map(s => geometriaPasto(40 + s, { blades: 16, hMin: 1.2, hMax: 2.3, radio: 0.24, ancho: 0.04, incl: [0.10, 0.30], base: [0.16, 0.30, 0.07], punta: [0.58, 0.62, 0.22] }));
  const NP = pastos.length, NJ = juncos.length, NV = variantes.length, TIPOS = NP + NJ + NV;
  const sx = [], sz = [], tp = [], esc = [], rot = [];
  const poner = (x, z, i, modo) => { // modo: 0 pasto, 1 planta real, 2 junco
    if (sx.length > 700000) return;
    let t;
    if (modo === 1) { let r = hash(i * 23 + 5) * variantes.reduce((a, v) => a + v.peso, 0), v = 0; for (; v < NV - 1; v++) { r -= variantes[v].peso; if (r < 0) break; } t = NP + NJ + v; esc.push((variantes[v].a0 + hash(i * 3 + 2) * (variantes[v].a1 - variantes[v].a0)) / variantes[v].h0); }
    else if (modo === 2) { t = NP + Math.floor(hash(i * 13 + 4) * NJ); esc.push(0.8 + hash(i * 3 + 2) * 0.5); }
    else { t = Math.floor(hash(i * 13 + 4) * NP); esc.push(1.4 + hash(i * 3 + 2) * 1.2); }
    sx.push(x); sz.push(z); tp.push(t); rot.push(hash(i * 7 + 1) * Math.PI * 2);
  };
  let n = 0;
  for (const s of (T3.grassSpots || [])) poner(s[0], s[1], n++, hash(n) < 0.12 ? 1 : 0);
  // alrededor del agua: anillos de pasto y matas, mas densos y mas anchos en los humedales
  for (const a of cuerposDeAgua(W, lw)) {
    const hum = /humedal|laguna|lago/.test(a.tipo), radios = hum ? [0.8, 1.6, 2.4, 3.3, 4.4, 5.8, 7.4, 9.4, 11.8, 14.6, 18, 22, 27, 33] : [0.8, 1.8, 3, 4.6, 6.6, 9, 12, 16];
    for (let i = 0; i < a.pts.length; i += hum ? 1 : 2) {
      const p = a.pts[i]; let dx, dz;
      if (a.cerrado) { dx = p[0] - a.cx; dz = p[1] - a.cz; } else { const q = a.pts[Math.min(i + 1, a.pts.length - 1)]; dx = -(q[1] - p[1]); dz = q[0] - p[0]; if ((i % 4) >= 2) { dx = -dx; dz = -dz; } }
      const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      for (const r of (hum ? [-1.8, -1.0, -0.3, 0.4, 1.1, 1.9, 2.7] : [-0.8, 0.2, 1.2])) for (let k = 0; k < 2; k++) {
        const rr = r + (hash(i * 19 + k * 7 + r * 5) - 0.5) * 1.2, lat = (hash(i * 37 + k * 5 + r) - 0.5) * 2.4;
        if (hash(i * 41 + k * 3 + r * 7) < (hum ? 0.55 : 0.30)) poner(p[0] + dx * rr - dz * lat, p[1] + dz * rr + dx * lat, n++, 2);
      }
      for (const r of radios) for (let k = 0; k < (hum ? 4 : 3); k++) {
        const rr = r + (hash(i * 13 + k * 7 + r * 3) - 0.5) * 2.6, lat = (hash(i * 31 + k * 5 + r) - 0.5) * 3.4;
        poner(p[0] + dx * rr - dz * lat, p[1] + dz * rr + dx * lat, n++, r >= 2.4 && hash(i * 17 + k * 11 + r) < (hum ? 0.18 : 0.10) ? 1 : 0);
      }
    }
  }
  // zonas verdes (parques): pasto denso y matas
  for (const p of (Pq || [])) {
    const v = []; for (const q of p.pts) { const w = lw(q[0], q[1]); v.push([w[0], w[1]]); }
    if (v.length > 1 && Math.hypot(v[0][0] - v[v.length - 1][0], v[0][1] - v[v.length - 1][1]) < 0.01) v.pop();
    if (v.length < 3) continue;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, area = 0;
    for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); z0 = Math.min(z0, a[1]); z1 = Math.max(z1, a[1]); area += a[0] * b[1] - b[0] * a[1]; }
    area = Math.abs(area) / 2; const quiero = Math.min(3000, Math.floor(area / 9)); let puestos = 0, intentos = 0;
    while (puestos < quiero && intentos++ < quiero * 6) { const x = x0 + hash(n * 3 + intentos) * (x1 - x0), z = z0 + hash(n * 5 + intentos * 2 + 1) * (z1 - z0); if (estaDentro(x, z, v)) { poner(x, z, n++, hash(n * 9 + 1) < 0.07 ? 1 : 0); puestos++; } }
  }
  const M = sx.length, SX = Float32Array.from(sx), SZ = Float32Array.from(sz), TP = Uint8Array.from(tp), ES = Float32Array.from(esc), RO = Float32Array.from(rot);
  const CELDA = 64, clave = (cx, cz) => (cx + 512) * 1024 + (cz + 512), grid = new Map();
  for (let i = 0; i < M; i++) { const k = clave(Math.floor(SX[i] / CELDA), Math.floor(SZ[i] / CELDA)); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i); }
  const CAPG = 4200, CAPJ = 3200, CAPV = 380, RG = 75, RV = 100, d = new THREE.Object3D(), col = new THREE.Color();
  const meshes = [];
  [...pastos, ...juncos].forEach((g, gi) => { const m = new THREE.InstancedMesh(g, pastoMat, gi < NP ? CAPG : CAPJ); m.count = 0; m.frustumCulled = false; m.receiveShadow = false; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array((gi < NP ? CAPG : CAPJ) * 3), 3); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T3.scene.add(m); meshes.push(m); });
  variantes.forEach(v => { const m = new THREE.InstancedMesh(v.geo, v.mat, CAPV); m.count = 0; m.frustumCulled = false; m.receiveShadow = true; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAPV * 3), 3); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T3.scene.add(m); meshes.push(m); });
  const ult = { x: 1e9, z: 1e9, t: 0 }, api = { puntos: M, pastos: NP, juncos: NJ, variantes: NV };
  api.update = (cam, force) => {
    const now = performance.now(), ddx = cam.position.x - ult.x, ddz = cam.position.z - ult.z;
    if (!force && ddx * ddx + ddz * ddz < 16 && now - ult.t < 1500) return;
    ult.x = cam.position.x; ult.z = cam.position.z; ult.t = now;
    const cnt = new Int32Array(TIPOS), cap = (t) => (t < NP ? CAPG : t < NP + NJ ? CAPJ : CAPV), R = Math.max(RG, RV), c0x = Math.floor((ult.x - R) / CELDA), c1x = Math.floor((ult.x + R) / CELDA), c0z = Math.floor((ult.z - R) / CELDA), c1z = Math.floor((ult.z + R) / CELDA);
    let total = 0;
    for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) {
      const a = grid.get(clave(cx, cz)); if (!a) continue;
      for (let q = 0; q < a.length; q++) {
        const i = a[q], t = TP[i], ex = SX[i] - ult.x, ez = SZ[i] - ult.z, d2 = ex * ex + ez * ez, lim = t < NP + NJ ? RG + (t >= NP ? 25 : 0) : RV;
        if (d2 > lim * lim || cnt[t] >= cap(t)) continue;
        const k = cnt[t]++; d.position.set(SX[i], 0.15, SZ[i]); d.rotation.set(0, RO[i], 0); d.scale.setScalar(ES[i]); d.updateMatrix();
        meshes[t].setMatrixAt(k, d.matrix); const tv = 0.95 + hash(i * 5) * 0.32; col.setRGB(tv, tv, tv * 0.92); meshes[t].setColorAt(k, col); total++;
      }
    }
    meshes.forEach((m, t) => { m.count = cnt[t]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
    api.cerca = total;
  };
  api.update({ position: new THREE.Vector3(1e8, 0, 1e8) }, true);
  return api;
}

/* ------------------------------------------------------------------ agua real: ondas con mapa de normales y reflejo del cielo ------------------------------------------------------------------ */
export function upgradeWater(T3, env) {
  const mesh = T3.waterMesh; if (!mesh) return false;
  const nrm = new THREE.TextureLoader().load('data3d/waternormals.jpg'); nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.94, depthWrite: false, side: THREE.DoubleSide,
    envMap: env, envMapIntensity: 1.5, normalMap: nrm, normalScale: new THREE.Vector2(0.75, 0.75), clearcoat: 0.4, clearcoatRoughness: 0.05, specularIntensity: 1.0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = T3.waterU;
    sh.fragmentShader = 'uniform float uTime;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', `
      #ifdef USE_NORMALMAP_TANGENTSPACE
        vec2 wuvA = vNormalMapUv * 1.0 + vec2(uTime * 0.020, uTime * 0.011);
        vec2 wuvB = vNormalMapUv * 2.7 + vec2(-uTime * 0.014, uTime * 0.023);
        vec3 nA = texture2D( normalMap, wuvA ).xyz * 2.0 - 1.0;
        vec3 nB = texture2D( normalMap, wuvB ).xyz * 2.0 - 1.0;
        vec3 mapN = normalize( vec3( ( nA.xy + nB.xy * 0.7 ) * normalScale, nA.z * nB.z ) );
        normal = normalize( tbn * mapN );
      #endif`);
  };
  // agua apagada, no chillona: un solo color oscuro verdoso para todo el cuerpo de agua y casi sin reflejo del cielo
  const cv = mesh.geometry.attributes.color;
  if (cv && !mesh.geometry.userData.oscura) { for (let i = 0; i < cv.array.length; i += 3) { cv.array[i] = 0.040; cv.array[i + 1] = 0.060; cv.array[i + 2] = 0.056; } cv.needsUpdate = true; mesh.geometry.userData.oscura = true; }
  mat.envMapIntensity = 0.30; mat.roughness = 0.16; mat.clearcoat = 0; mat.specularIntensity = 0.5; mat.normalScale.set(0.55, 0.55); mat.opacity = 0.99;
  mesh.material = mat; T3.waterMat = mat; return true;
}

/* ------------------------------------------------------------------ aves de los humedales: patos, tinguas y garzas ------------------------------------------------------------------ */
export async function buildWaterBirds(T3, W, lw) {
  const tl = new THREE.TextureLoader(), cargar = (u) => new Promise(r => tl.load(u, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; r(t); }, undefined, () => r(null)));
  const esp = [{ n: 'pato', url: 'data3d/aves/pato.png', alto: 0.62, asp: 1.335, vis: 2.0, vel: 1.1, borde: [3, 99] }, { n: 'tingua', url: 'data3d/aves/tingua.png', alto: 0.40, asp: 0.83, vis: 2.2, vel: 0.9, borde: [1.5, 7] }, { n: 'garza', url: 'data3d/aves/garza.png', alto: 1.0, asp: 0.395, vis: 1.9, vel: 0.35, borde: [1.5, 6] }];
  for (const e of esp) e.tex = await cargar(e.url);
  const humedales = cuerposDeAgua(W, lw).filter(a => a.cerrado && a.area > 2500 && /humedal|laguna|lago/.test(a.tipo));
  const aves = [];
  const rnd = (i) => hash(i * 97 + 13);
  humedales.forEach((a, hi) => {
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; a.pts.forEach(p => { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); });
    const cuantas = [Math.max(3, Math.min(42, Math.round(a.area / 1600))), Math.max(2, Math.min(18, Math.round(a.area / 3200))), Math.max(1, Math.min(10, Math.round(a.area / 4500)))];
    esp.forEach((e, ei) => {
      for (let k = 0; k < cuantas[ei]; k++) {
        let mejor = null;
        for (let t = 0; t < 80; t++) { const x = x0 + rnd(hi * 1000 + ei * 300 + k * 7 + t) * (x1 - x0), z = z0 + rnd(hi * 1000 + ei * 300 + k * 11 + t + 500) * (z1 - z0); if (!estaDentro(x, z, a.pts)) continue; const dd = distBorde(x, z, a.pts); if (dd < e.borde[0] || dd > e.borde[1]) continue; mejor = { x, z }; break; }
        if (mejor) aves.push({ e, ei, a, x: mejor.x, z: mejor.z, th: rnd(k + hi * 31) * 6.283, v: e.vel * (0.7 + rnd(k * 3 + hi) * 0.6), pausa: 0, flip: 1, fase: rnd(k * 5) * 6.28 });
      }
    });
  });
  const meshes = esp.map(e => {
    const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0);
    const m = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ map: e.tex, alphaTest: 0.4, side: THREE.DoubleSide }), Math.max(1, aves.filter(b => b.e === e).length));
    m.frustumCulled = false; m.castShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T3.scene.add(m); return m;
  });
  const d = new THREE.Object3D(), YA = 0.42;
  const api = { total: aves.length, humedales: humedales.length, porTipo: esp.map(e => e.n + ':' + aves.filter(b => b.e === e).length).join(' ') };
  api.update = (dt, cam) => {
    const cnt = esp.map(() => 0), me = cam.matrixWorld.elements;
    for (const b of aves) {
      const e = b.e;
      if (b.pausa > 0) b.pausa -= dt;
      else {
        b.th += (Math.random() - 0.5) * 2.2 * dt;
        const nx = b.x + Math.cos(b.th) * b.v * dt, nz = b.z + Math.sin(b.th) * b.v * dt, dd = estaDentro(nx, nz, b.a.pts) ? distBorde(nx, nz, b.a.pts) : -1;
        if (dd >= e.borde[0] && dd <= e.borde[1]) { b.x = nx; b.z = nz; } else b.th += Math.PI * (0.6 + Math.random() * 0.8);
        if (Math.random() < (b.ei === 0 ? 0.04 : b.ei === 1 ? 0.25 : 0.5) * dt) b.pausa = 1 + Math.random() * 4;
      }
      const yaw = Math.atan2(cam.position.x - b.x, cam.position.z - b.z), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const s = (Math.cos(b.th) * rx + Math.sin(b.th) * rz) >= 0 ? 1 : -1; if (b.pausa <= 0) b.flip = s;
      const h = e.alto * e.vis, bob = b.ei === 0 ? Math.sin(performance.now() / 700 + b.fase) * 0.04 : 0;
      d.position.set(b.x, YA + bob, b.z); d.rotation.set(0, yaw, 0); d.scale.set(h * e.asp * b.flip, h, 1); d.updateMatrix();
      meshes[b.ei].setMatrixAt(cnt[b.ei]++, d.matrix);
    }
    meshes.forEach((m, i) => { m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; });
  };
  return api;
}
