// Rocketbox characters (MIT, Microsoft) packed by pack_chars.py: rest-pose geometry + identity-rest skeleton.
// Bone names match the game's clip names (root, spine04, spine02, spine01, neck01, head, clavicle.L ... foot.R, finger*).

async function unpack(url) {
  const txt = await (await fetch(url)).text();
  // native base64 decode (the per-character JS loop took most of the load time on phones)
  // decode in JS: the published page blocks fetch() of data: URLs (that broke loading on phones)
  const ds = new Blob([decode64(txt.trim())]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(ds).text());
}
// table-driven base64 decoder (about 10x faster than Uint8Array.from(atob(...)) with a per-character callback)
const LUT = new Uint8Array(128); 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach((c, i) => (LUT[c.charCodeAt(0)] = i));
export function decode64(s) {
  const n = s.length, pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0, len = (n * 3 >> 2) - pad, out = new Uint8Array(len); let j = 0;
  for (let i = 0; i < n; i += 4) { const a = LUT[s.charCodeAt(i)], b = LUT[s.charCodeAt(i + 1)], c = LUT[s.charCodeAt(i + 2)], d = LUT[s.charCodeAt(i + 3)];
    out[j++] = (a << 2) | (b >> 4); if (j < len) out[j++] = ((b & 15) << 4) | (c >> 2); if (j < len) out[j++] = ((c & 3) << 6) | d; }
  return out;
}
const b64 = (s, T) => new T(decode64(s).buffer);

const texCache = new Map();
const pending = [];
export const texturesReady = () => Promise.all(pending);
function tex(THREE, url, srgb) {
  const k = url + srgb; if (texCache.has(k)) return texCache.get(k);
  let done; pending.push(new Promise(r => (done = r)));
  const t = new THREE.TextureLoader().load(url, done, undefined, done); t.flipY = true; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4;
  texCache.set(k, t); return t;
}

const packCache = new Map();
export async function loadCharPack(base, name) {
  if (!packCache.has(name)) packCache.set(name, unpack(`${base}chars/${name}.txt`));
  return packCache.get(name);
}

// detail: 'high' uses normal + roughness maps (fighters), 'low' colour only (crowd / low quality)
const geoCache = new Map();
export function buildChar(THREE, base, p, detail = 'high', tint = null, mergeVertices = null) {
  let g = geoCache.get(p.name);
  if (!g) { g = makeGeo(THREE, p, mergeVertices); geoCache.set(p.name, g); }
  return finishChar(THREE, base, p, g, detail, tint);
}
function makeGeo(THREE, p, mergeVertices) {
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(b64(p.pos, Float32Array), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(b64(p.nor, Float32Array), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(b64(p.uv, Float32Array), 2));
  const si = b64(p.si, Uint8Array), sw = b64(p.sw, Uint8Array);
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(si), 4));
  const swf = new Float32Array(sw.length); for (let i = 0; i < sw.length; i++) swf[i] = sw[i] / 255;
  g.setAttribute('skinWeight', new THREE.BufferAttribute(swf, 4));
  for (const [s, c, mi] of p.groups) g.addGroup(s, c, mi);
  if (mergeVertices) { const m = mergeVertices(g, 1e-4); if (m) { m.clearGroups(); for (const gr of g.groups) m.addGroup(gr.start, gr.count, gr.materialIndex); g = m; } }
  return g;
}
function finishChar(THREE, base, p, g, detail, tint) {
  const hi = detail === 'high';
  const mats = p.mats.map(mn => {
    const part = mn.split('_').slice(1).join('_');
    const t = p.tex[part] || {};
    const m = new THREE.MeshStandardMaterial({ roughness: part === 'head' ? 0.55 : 0.75, metalness: 0 });
    if (t.map) m.map = tex(THREE, base + 'chars/' + t.map, true);
    if (hi && t.normal) { m.normalMap = tex(THREE, base + 'chars/' + t.normal, false); m.normalScale.set(1, 1); }
    if (hi && t.rough) { m.roughnessMap = tex(THREE, base + 'chars/' + t.rough, false); m.roughness = 1; }
    if (t.alpha) { m.alphaMap = tex(THREE, base + 'chars/' + t.alpha, false); m.alphaTest = 0.45; m.side = THREE.DoubleSide; }
    if (tint && part === 'body') m.color.set(tint);
    m.userData.part = part;
    return m;
  });
  // skeleton with identity rest rotations at the joint heads
  const B = {}, order = [], rest = {};
  const bones = p.bones.map(([name, pi, head, tail]) => { const b = new THREE.Bone(); b.name = name; B[name] = b; order.push(name); rest[name] = { head: new THREE.Vector3(...head), tail: new THREE.Vector3(...tail), parent: pi >= 0 ? p.bones[pi][0] : null }; return b; });
  p.bones.forEach(([name, pi, head], i) => {
    const b = bones[i];
    if (pi >= 0) { const ph = p.bones[pi][2]; b.position.set(head[0] - ph[0], head[1] - ph[1], head[2] - ph[2]); bones[pi].add(b); }
    else b.position.set(...head);
  });
  const mesh = new THREE.SkinnedMesh(g, mats);
  mesh.add(bones[0]); mesh.updateMatrixWorld(true);
  const inv = p.bones.map(([, , h]) => new THREE.Matrix4().makeTranslation(-h[0], -h[1], -h[2]));
  mesh.bind(new THREE.Skeleton(bones, inv), new THREE.Matrix4());
  mesh.castShadow = true; mesh.frustumCulled = false;
  const group = new THREE.Group(); group.add(mesh);
  // hand anchors (for held items): grip point between palm and fingers
  const hand = {};
  for (const sd of ['L', 'R']) {
    const w = rest['wrist.' + sd], f = rest['finger2-1.' + sd];
    const a = new THREE.Object3D(); a.position.copy(f.head).sub(w.head).multiplyScalar(0.85); B['wrist.' + sd].add(a); hand[sd] = a;
  }
  // fist: curl fingers about the palm axis
  const fist = {};
  for (const sd of ['L', 'R']) {
    const w = rest['wrist.' + sd], i1 = rest['finger1-1.' + sd], l1 = rest['finger4-1.' + sd];
    const across = i1.head.clone().sub(l1.head).normalize();       // index -> little
    for (const d of [1, 2, 3, 4]) for (const seg of [1, 2, 3]) {
      const n = `finger${d}-${seg}.${sd}`; const r = rest[n]; if (!r) continue;
      const dir = r.tail.clone().sub(r.head).normalize();
      const ax = new THREE.Vector3().crossVectors(across, dir).normalize();
      const ang = (seg === 1 ? 85 : seg === 2 ? 100 : 75) * Math.PI / 180 * (sd === 'L' ? 1 : 1);
      fist[n] = new THREE.Quaternion().setFromAxisAngle(ax, ang);
    }
    for (const seg of [2, 3]) { const n = `finger0-${seg}.${sd}`; const r = rest[n]; if (!r) continue; const dir = r.tail.clone().sub(r.head).normalize(); const ax = new THREE.Vector3().crossVectors(across, dir).normalize(); fist[n] = new THREE.Quaternion().setFromAxisAngle(ax, 0.6); }
  }
  for (const k of Object.keys(fist)) if (k.endsWith('.L')) fist[k].invert();  // mirrored side: same angle about a mirrored axis bends the other way
  function applyFist(amount = 1) { for (const [n, q] of Object.entries(fist)) { const b = B[n]; if (amount >= 1) b.quaternion.copy(q); else b.quaternion.identity().slerp(q, amount); } }
  return { group, mesh, B, rest, order, hand, applyFist, height: Math.max(...p.bones.map(b => b[3][1])) };
}
