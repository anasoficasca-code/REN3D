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
    uniforms: { top: { value: new THREE.Color(0x2f6cb0) }, mid: { value: new THREE.Color(0x9fc3e0) }, bot: { value: new THREE.Color(0xdfe9ee) } },
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
export async function buildTrees(T3, T, W, lw, env) {
  const stride = Math.max(1, Math.ceil(T.t.length / 18000));
  const X = [], Z = [], Hh = [], SP = [];
  for (let i = 0; i < T.t.length; i += stride) { const t = T.t[i], w = lw(t[0], t[1]); X.push(w[0]); Z.push(w[1]); Hh.push(Math.max(4, Math.min(16, t[2] || 6))); SP.push(hash(i * 3 + 1) < 0.45 ? 0 : 1); }
  // arboles de ribera: alrededor de los cuerpos de agua
  const aguas = cuerposDeAgua(W, lw); let ribera = 0;
  for (const a of aguas) {
    for (let i = 0; i < a.pts.length && ribera < 3200; i += 5) {
      const p = a.pts[i]; let dx, dz;
      if (a.cerrado) { dx = p[0] - a.cx; dz = p[1] - a.cz; } else { const q = a.pts[Math.min(i + 1, a.pts.length - 1)]; dx = -(q[1] - p[1]); dz = q[0] - p[0]; if ((i % 10) >= 5) { dx = -dx; dz = -dz; } }
      const L = Math.hypot(dx, dz) || 1, r = 7 + hash(i * 17 + 3) * 16;
      if (hash(i * 29 + 7) < 0.7) { X.push(p[0] + dx / L * r + (hash(i * 5 + 1) - 0.5) * 6); Z.push(p[1] + dz / L * r + (hash(i * 11 + 9) - 0.5) * 6); Hh.push(5 + hash(i) * 6); SP.push(hash(i * 7) < 0.5 ? 0 : 1); ribera++; }
    }
  }
  const N = X.length, ROT = new Float32Array(N); for (let i = 0; i < N; i++) ROT[i] = hash(i * 41 + 11) * Math.PI * 2;
  // modelos: se normalizan a base en el suelo, centrados, altura 1 = altura del modelo original
  const especies = [];
  for (const base of ['jacaranda', 'arbolpeq']) {
    const niveles = {};
    for (const nv of ['L0', 'L1']) {
      const partes = [];
      for (const parte of ['madera', 'hojas']) { const g = await gltfLoader.loadAsync(`data3d/models/${base}_${nv}_${parte}.glb`); partes.push(...recolectar(g.scene).map(p => ({ ...p, hoja: parte === 'hojas' }))); }
      niveles[nv] = partes;
    }
    const b = cajaDe(niveles.L0), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, alto = b.max.y - b.min.y;
    for (const nv of ['L0', 'L1']) niveles[nv].forEach(p => { p.geo.translate(-cx, -b.min.y, -cz); ajustarMat(p.mat, env, { roughness: 0.9, tinte: p.hoja ? 1.35 : 1.0, env: 0.4 }); });
    especies.push({ base, niveles, alto });
  }
  const CAP0 = 90, CAP1 = 1500, R0 = 60, R1 = 240, d = new THREE.Object3D(), col = new THREE.Color();
  const lod = especies.map(e => ({ L0: e.niveles.L0.map(p => { const m = new THREE.InstancedMesh(p.geo, p.mat, CAP0); m.count = 0; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; T3.scene.add(m); return m; }),
    L1: e.niveles.L1.map(p => { const m = new THREE.InstancedMesh(p.geo, p.mat, CAP1); m.count = 0; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; T3.scene.add(m); return m; }) }));
  lod.forEach(l => [...l.L0, ...l.L1].forEach(m => { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(m.instanceMatrix.count * 3), 3); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }));
  // lejos: copas simples (siguen siendo volumenes, pero a esa distancia no se distinguen)
  const trunkG = new THREE.CylinderGeometry(0.10, 0.24, 3.0, 6); trunkG.translate(0, 1.5, 0);
  const crownG = new THREE.SphereGeometry(2.35, 9, 6), crownG2 = crownG.clone(); crownG2.scale(0.86, 0.76, 0.92);
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: 0.98 }), leafM = [0x1b4825, 0x2d6733].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88 }));
  const far = [new THREE.InstancedMesh(trunkG, trunkM, N), new THREE.InstancedMesh(crownG, leafM[0], N), new THREE.InstancedMesh(crownG2, leafM[1], N)];
  far.forEach(m => { m.frustumCulled = false; m.count = 0; m.castShadow = false; m.receiveShadow = true; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); T3.scene.add(m); });
  const fm = [new Float32Array(N * 16), new Float32Array(N * 16), new Float32Array(N * 16)], fc = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const sc = Math.max(0.40, Math.min(1.8, Hh[i] / 6)), r = ROT[i];
    d.position.set(X[i], 0, Z[i]); d.rotation.set(0, r, 0); d.scale.setScalar(sc); d.updateMatrix(); fm[0].set(d.matrix.elements, i * 16);
    d.position.set(X[i], 2.9 * sc, Z[i]); d.updateMatrix(); fm[1].set(d.matrix.elements, i * 16);
    d.position.set(X[i] + Math.sin(r) * 0.7 * sc, 4.4 * sc, Z[i] + Math.cos(r) * 0.6 * sc); d.scale.setScalar(sc * 0.78); d.updateMatrix(); fm[2].set(d.matrix.elements, i * 16);
    col.setHSL(0.27 + hash(i * 3) * 0.05, 0.4, 0.22 + hash(i * 5) * 0.12); fc[i * 3] = col.r; fc[i * 3 + 1] = col.g; fc[i * 3 + 2] = col.b;
  }
  const ult = { x: 1e9, z: 1e9, t: 0 }, cand = [];
  const api = { N, ribera, tris: especies.map(e => e.niveles.L0.reduce((a, p) => a + (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3, 0) + '/' + e.niveles.L1.reduce((a, p) => a + (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3, 0)) };
  api.update = (cam, force) => {
    const now = performance.now(), dx = cam.position.x - ult.x, dz = cam.position.z - ult.z;
    if (!force && dx * dx + dz * dz < 36 && now - ult.t < 1500) return;
    ult.x = cam.position.x; ult.z = cam.position.z; ult.t = now;
    cand.length = 0;
    for (let i = 0; i < N; i++) { const ex = X[i] - ult.x, ez = Z[i] - ult.z, d2 = ex * ex + ez * ez; if (d2 < R1 * R1) cand.push(i, d2); }
    const ord = []; for (let k = 0; k < cand.length; k += 2) ord.push([cand[k], cand[k + 1]]); ord.sort((a, b) => a[1] - b[1]);
    const n0 = lod.map(() => 0), n1 = lod.map(() => 0), tipo = new Uint8Array(N);
    for (const [i, d2] of ord) {
      const s = SP[i], e = especies[s], sc = Hh[i] / e.alto * (s === 0 ? 1.0 : 1.15), tv = 0.78 + hash(i * 19) * 0.40;
      d.position.set(X[i], 0, Z[i]); d.rotation.set(0, ROT[i], 0); d.scale.setScalar(sc); d.updateMatrix(); col.setRGB(tv, tv * (0.96 + hash(i) * 0.08), tv * 0.93);
      if (d2 < R0 * R0 && n0[s] < CAP0) { const k = n0[s]++; lod[s].L0.forEach(m => { m.setMatrixAt(k, d.matrix); m.setColorAt(k, col); }); tipo[i] = 1; }
      else if (n1[s] < CAP1) { const k = n1[s]++; lod[s].L1.forEach(m => { m.setMatrixAt(k, d.matrix); m.setColorAt(k, col); }); tipo[i] = 1; }
    }
    lod.forEach((l, s) => { l.L0.forEach(m => { m.count = n0[s]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }); l.L1.forEach(m => { m.count = n1[s]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }); });
    let nf = 0; for (let i = 0; i < N; i++) { if (tipo[i]) continue; far.forEach((m, k) => m.instanceMatrix.array.set(fm[k].subarray(i * 16, i * 16 + 16), nf * 16)); const cc = far[0].instanceColor.array; for (let q = 0; q < 3; q++) { far[0].instanceColor.array[nf * 3 + q] = 0.55; far[1].instanceColor.array[nf * 3 + q] = fc[i * 3 + q]; far[2].instanceColor.array[nf * 3 + q] = fc[i * 3 + q] * 1.15; } nf++; }
    far.forEach(m => { m.count = nf; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
    api.stats = { cerca: n0.join('+'), medio: n1.join('+'), lejos: nf };
  };
  api.update({ position: new THREE.Vector3(1e8, 0, 1e8) }, true); // arranca con todo lejos hasta que haya camara
  return api;
}

/* ------------------------------------------------------------------ pasto, arbustos y helechos reales cerca de la camara ------------------------------------------------------------------ */
export async function buildNearPlants(T3, W, lw, env) {
  const fuentes = [['grass_medium_01', 6, 1.5, 2.6, 1.0], ['grass_medium_02', 5, 1.5, 2.6, 1.0], ['shrub_03', 4, 2.2, 3.6, 0.3], ['fern_02', 4, 1.8, 3.0, 0.35], ['shrub_04', 1, 0.7, 1.3, 0.12]];
  const variantes = [];
  for (const [id, cuantas, s0, s1, peso] of fuentes) {
    const g = await gltfLoader.loadAsync(`data3d/models/${id}.glb`); const partes = recolectar(g.scene).slice(0, cuantas);
    partes.forEach(p => { p.geo.computeBoundingBox(); const b = p.geo.boundingBox; p.geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); ajustarMat(p.mat, env, { roughness: 0.9, alphaTest: 0.45, env: 0.25, tinte: 1.1 }); variantes.push({ geo: p.geo, mat: p.mat, s0, s1, peso: peso / partes.length, id }); });
  }
  const aguas = cuerposDeAgua(W, lw), spots = [];
  const base = T3.grassSpots || [];
  for (const s of base) spots.push(s[0], s[1]);
  for (const a of aguas) {
    for (let i = 0; i < a.pts.length; i += 2) {
      const p = a.pts[i]; let dx, dz;
      if (a.cerrado) { dx = p[0] - a.cx; dz = p[1] - a.cz; } else { const q = a.pts[Math.min(i + 1, a.pts.length - 1)]; dx = -(q[1] - p[1]); dz = q[0] - p[0]; if ((i % 4) >= 2) { dx = -dx; dz = -dz; } }
      const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      for (const r of [1.5, 3, 4.5, 6.5, 9, 12, 16]) for (let k = 0; k < 3; k++) {
        if (spots.length > 150000) break;
        spots.push(p[0] + dx * (r + (hash(i * 13 + k * 7 + r) - 0.5) * 2.4) + (hash(i * 31 + k) - 0.5) * 3.0, p[1] + dz * (r + (hash(i * 17 + k * 3 + r) - 0.5) * 2.4) + (hash(i * 43 + k) - 0.5) * 3.0);
      }
    }
  }
  const M = spots.length / 2, tot = variantes.reduce((a, v) => a + v.peso, 0), tipo = new Uint8Array(M), esc = new Float32Array(M), rot = new Float32Array(M);
  for (let i = 0; i < M; i++) { let r = hash(i * 23 + 5) * tot, v = 0; for (; v < variantes.length - 1; v++) { r -= variantes[v].peso; if (r < 0) break; } tipo[i] = v; esc[i] = variantes[v].s0 + hash(i * 3 + 2) * (variantes[v].s1 - variantes[v].s0); rot[i] = hash(i * 7 + 1) * Math.PI * 2; }
  const CAP = 700, R = 75, d = new THREE.Object3D(), col = new THREE.Color();
  const meshes = variantes.map(v => { const m = new THREE.InstancedMesh(v.geo, v.mat, CAP); m.count = 0; m.frustumCulled = false; m.receiveShadow = true; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T3.scene.add(m); return m; });
  const ult = { x: 1e9, z: 1e9, t: 0 }, api = { puntos: M, variantes: variantes.length };
  api.update = (cam, force) => {
    const now = performance.now(), dx = cam.position.x - ult.x, dz = cam.position.z - ult.z;
    if (!force && dx * dx + dz * dz < 16 && now - ult.t < 1500) return;
    ult.x = cam.position.x; ult.z = cam.position.z; ult.t = now;
    const cnt = variantes.map(() => 0); let tot2 = 0;
    for (let i = 0; i < M; i++) {
      const ex = spots[i * 2] - ult.x, ez = spots[i * 2 + 1] - ult.z; if (ex * ex + ez * ez > R * R) continue;
      const v = tipo[i]; if (cnt[v] >= CAP) continue;
      const k = cnt[v]++; d.position.set(spots[i * 2], 0.15, spots[i * 2 + 1]); d.rotation.set(0, rot[i], 0); d.scale.setScalar(esc[i]); d.updateMatrix();
      meshes[v].setMatrixAt(k, d.matrix); const t = 0.82 + hash(i * 5) * 0.3; col.setRGB(t * (0.92 + hash(i) * 0.14), t, t * 0.85); meshes[v].setColorAt(k, col); tot2++;
    }
    meshes.forEach((m, v) => { m.count = cnt[v]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
    api.cerca = tot2;
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
