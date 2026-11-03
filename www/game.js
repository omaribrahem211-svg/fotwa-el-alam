import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildHara } from './hara_scene2.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { loadCharPack, buildChar, texturesReady, decode64 } from './rbrig.js';
import { loadClips, makeAnimator } from './anim.js';
import { TIMES, WEATHERS, makeSky, makeSkyline, makeWeather, buildArena } from './arenas.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

export async function startGame(ui) {
  const small = Math.min(innerWidth, innerHeight) < 600 || /Mobi|Android/i.test(navigator.userAgent);
  let quality = small ? 'low' : 'high';
  try { const s = localStorage.getItem('fetwa-quality'); if (s === 'high' || s === 'low') quality = s; } catch (e) {}

  ui.step('بنحمّل الخطوط…', 8);
  try { await Promise.race([document.fonts.load('800 80px Cairo'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}

  // ------------------------------------------------------------ renderer
  const stage = $('stage');
  const renderer = new THREE.WebGLRenderer({ antialias: quality === 'high', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.5 : 1));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.1;

  const LM = window.__loadMarks = [['start', performance.now()]];
  ui.step('بنبني الحارة…', 25);
  await new Promise(r => setTimeout(r, 20));
  const tl = new THREE.TextureLoader(); const ltex = (u, srgb) => { const t = tl.load(u); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const groundMaps = { map: ltex('env/ground_c.jpg', true), normal: ltex('env/ground_n.jpg'), rough: ltex('env/ground_r.jpg') };
  const hara = buildHara(THREE, scene, null, { shadows: true, game: true, HW: 72, groundMaps, plasterNormal: ltex('env/plaster_n.jpg') });
  const HW = hara.HW;
  const perf = { acc: 0, n: 0, scale: 1, base: 1 };
  // the alley's own painted sky / stars / moon are replaced by the shared sky dome (any time of day)
  const haraSky = []; scene.traverse(o => { if ((o.isMesh || o.isPoints) && o.material && o.material.fog === false) { o.userData.keep = true; haraSky.push(o); } });
  haraSky.forEach(o => (o.visible = false));
  // global lights shared by every place: hemisphere sky light and the moon
  let hemi = null, moonL = null; scene.traverse(o => { if (o.isHemisphereLight && !hemi) hemi = o; if (o.isDirectionalLight && !moonL) moonL = o; });
  const LITE = quality === 'low';
  // ---- performance pass: few lights, one moving shadow, merged static geometry
  const wp0 = new THREE.Vector3();
  function trimLamps(root, center, maxPoints) {   // keep the few lamp lights near the fight; on the fast setting turn them into painted light pools
    const pts = []; root.traverse(o => { if (o.isPointLight) pts.push(o); });
    pts.sort((a, b) => a.getWorldPosition(wp0).distanceTo(center) - b.getWorldPosition(wp0).distanceTo(center));
    const keepL = pts.slice(0, maxPoints); for (const l of pts) if (!keepL.includes(l)) l.removeFromParent();
    const pools = [];
    if (LITE) {
      for (const l of keepL) { const p = l.getWorldPosition(new THREE.Vector3()); const r = Math.min(30, (l.distance || 40) * 0.45); const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), poolMat.clone()); m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.06, p.z); m.userData.keep = true; m.userData.pool = true; m.material.userData.pool = true; root.add(m); pools.push(m); l.removeFromParent(); }
      return { points: [], pools };
    }
    return { points: keepL, pools };
  }
  const poolMat = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,190,120,0.55)'); g.addColorStop(0.5, 'rgba(255,170,90,0.18)'); g.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); })();
  // the alley keeps its lamp lights by the fight area (z ~ 28 cafe and the bulb at the origin)
  { const pts = []; scene.traverse(o => { if (o.isPointLight) pts.push(o); });
    const keepH = new Set(pts.filter(l => { const z = l.getWorldPosition(wp0).z; return Math.abs(z - 28) < 8 || Math.abs(z + 6) < 3; }).slice(0, 3));
    for (const l of pts) if (!keepH.has(l)) l.removeFromParent(); }
  const haraLamps = trimLamps(scene, new THREE.Vector3(0, 0, 10), 3);
  function prepMaterials(root) {
    root.traverse(o => {
      if (o.isLight) o.castShadow = false;
      if (o.isMesh) { o.castShadow = false; o.receiveShadow = true;
        const swap = (m) => (m && m.isMeshPhysicalMaterial && m.transmission > 0) ? new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }) : m;
        o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material); }
    });
  }
  prepMaterials(scene);
  hara.key.intensity *= 1.2;
  { const spots = []; scene.traverse(o => { if (o.isSpotLight && o !== hara.key) spots.push(o); }); spots.forEach(l => l.removeFromParent()); }
  if (hemi) hemi.intensity *= 1.6;
  const sun = new THREE.DirectionalLight('#ffe2b8', 1.5); sun.position.set(10, 60, 20); sun.castShadow = true; sun.shadow.mapSize.set(LITE ? 512 : 1024, LITE ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 220 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.4;
  scene.add(sun, sun.target);
  const camFill = new THREE.PointLight('#ffd8b0', 900, 140, 1.4); scene.add(camFill);
  function mergeStatic(root) {
    root.updateMatrixWorld(true);
    const buckets = new Map(), dead = [];
    const prep = (geo, m4) => { let g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m4); if (!g.attributes.normal) g.computeVertexNormals(); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); g.morphAttributes = {}; g.clearGroups(); return g; };
    const slice = (g, start, count) => { const out = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) { const a = g.attributes[k]; out.setAttribute(k, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize)); } return out; };
    // materials that render identically are unified first (the scene builder makes a new material per window/sign), so they merge into one draw call
    const canonMap = new Map(), tk = (t) => t ? (t.source ? t.source.uuid : t.uuid) + ':' + t.repeat.x.toFixed(3) + ',' + t.repeat.y.toFixed(3) + ',' + t.offset.x.toFixed(3) + ',' + t.offset.y.toFixed(3) + ',' + t.rotation.toFixed(3) + ',' + t.wrapS : '-';
    const canon = (m) => { if (!m) return m; const k = [m.type, m.color && m.color.getHexString(), m.emissive && m.emissive.getHexString(), m.emissiveIntensity, m.roughness, m.metalness, tk(m.map), tk(m.emissiveMap), tk(m.normalMap), tk(m.roughnessMap), tk(m.alphaMap), m.transparent, m.opacity, m.side, m.depthWrite, m.blending, m.vertexColors, m.alphaTest, m.toneMapped, m.fog, m.flatShading, m.normalScale && m.normalScale.x].join('|');
      if (!canonMap.has(k)) canonMap.set(k, m); return canonMap.get(k); };
    // plain coloured materials (no maps, opaque, not emissive): colour goes into the vertices, one shared material per roughness/metalness
    const plainMats = new Map();
    const isPlain = (m) => m && m.isMeshStandardMaterial && !m.map && !m.emissiveMap && !m.normalMap && !m.alphaMap && !m.roughnessMap && !m.transparent && !m.vertexColors && (!m.emissive || m.emissive.getHex() === 0 || m.emissiveIntensity === 0);
    const put = (mat, g) => {
      if (isPlain(mat)) {
        const c = mat.color, n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const k = mat.roughness.toFixed(2) + '|' + mat.metalness.toFixed(2) + '|' + mat.side + '|' + mat.flatShading;
        if (!plainMats.has(k)) plainMats.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mat.roughness, metalness: mat.metalness, side: mat.side, flatShading: mat.flatShading }));
        mat = plainMats.get(k);
      } else mat = canon(mat);
      if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(g); };
    root.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.userData.keep) return;
      if (o.geometry.attributes.position.count > 60000) return;
      try {
        if (Array.isArray(o.material)) {
          const g = prep(o.geometry, o.matrixWorld);
          const groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
          for (const gr of groups) { const cnt = Math.min(gr.count, g.attributes.position.count - gr.start); if (cnt > 0) put(o.material[gr.materialIndex], slice(g, gr.start, cnt)); }
        } else put(o.material, prep(o.geometry, o.matrixWorld));
        dead.push(o);
      } catch (e) { /* leave it as is */ }
    });
    for (const o of dead) { o.removeFromParent(); if (o.geometry) o.geometry.dispose(); }
    const made = [];
    for (const [mat, list] of buckets) {
      for (let i = 0; i < list.length; i += 400) { const merged = mergeGeometries(list.slice(i, i + 400), false); if (!merged) continue; const m = new THREE.Mesh(merged, mat); m.receiveShadow = true; m.matrixAutoUpdate = false; root.add(m); made.push(m); }
      for (const gg of list) gg.dispose();
    }
    return { buckets: buckets.size, uniqueMaterials: canonMap.size, meshes: made.length };
  }
  window.__mergeStats = mergeStatic(scene);
  // everything built so far is static: compute its matrices once, then skip it in the per-frame matrix update
  const GLOBAL = new Set([sun, sun.target, camFill, hemi, moonL, moonL && moonL.target].filter(Boolean));
  scene.updateMatrixWorld(true);
  for (const o of scene.children) { if (GLOBAL.has(o) || o.isLight) continue; o.traverse(c => { c.matrixAutoUpdate = false; }); o.matrixWorldAutoUpdate = false; }
  // the alley as a switchable place: everything in the scene now except the shared lights
  const haraSet = scene.children.filter(o => !GLOBAL.has(o));
  function lampRegistry(roots, lamps) {   // materials that glow (windows, bulbs, signs) and lights that are lamps: dimmed by day
    const mats = new Set(); for (const r of roots) r.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) { if (m.userData.noLamp) continue; if (m.emissive && m.emissive.getHex() !== 0 && m.emissiveIntensity > 0 && !m.userData.rage) { if (m.userData.lamp == null) m.userData.lamp = m.emissiveIntensity; mats.add(m); } else if (m.isMeshBasicMaterial && m.fog !== false && !m.userData.pool && m.toneMapped !== false && m.color && m.color.getHSL({ h: 0, s: 0, l: 0 }).l > 0.55) { if (!m.userData.bulb) m.userData.bulb = m.color.clone(); mats.add(m); } } });
    const lights = []; for (const r of roots) r.traverse(o => { if ((o.isPointLight || o.isSpotLight) && o !== camFill) { o.userData.base = o.userData.base ?? o.intensity; lights.push(o); } });
    return { mats: [...mats], lights, pools: lamps.pools };
  }
  const ARENA = { hara: { key: 'hara', set: haraSet, lamps: lampRegistry(haraSet, haraLamps), grounds: [], bounds: { x0: -(HW - 11), x1: HW - 11, z0: -146, z1: 96 }, cam: { x0: -HW + 6, x1: HW - 6, z0: -156, z1: 106 }, crowd: { x0: -HW + 5, x1: HW - 5 }, obst: null, wallX0: -HW + 2, wallX1: HW - 2, walls: [{ s: -1, x: -HW, h: 126 }, { s: 1, x: HW, h: 126 }] } };
  scene.traverse(o => { if (o.material && !Array.isArray(o.material) && o.material.map === groundMaps.map) ARENA.hara.grounds.push(o.material); });
  ARENA.hara.grounds = [...new Set(ARENA.hara.grounds)];
  // sky dome + far skyline + weather (shared by every place)
  const sky = makeSky(THREE); scene.add(sky.mesh);
  const skyline = makeSkyline(THREE); scene.add(skyline.group);
  const weather = makeWeather(THREE, LITE); weather.objects.forEach(o => scene.add(o));
  GLOBAL.add(sky.mesh); GLOBAL.add(skyline.group); weather.objects.forEach(o => GLOBAL.add(o));
  // building shade across the street by day: a soft-edged dark strip cast from each wall row away from the sun
  const shadeTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 4; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.12, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, 0, 128, 4); return new THREE.CanvasTexture(c); })();
  const shades = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#0a0c18', alphaMap: shadeTex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, fog: true })); m.rotation.x = -Math.PI / 2; m.position.y = 0.09; m.visible = false; m.renderOrder = 1; m.material.userData.noLamp = true; scene.add(m); GLOBAL.add(m); return m; });
  scene.background = null;
  function applyQuality() {
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.5 : 1));
    perf.base = renderer.getPixelRatio(); perf.scale = 1;
  }
  applyQuality();
  LM.push(['scene', performance.now()]);


  // ------------------------------------------------------------ characters, clips, lighting
  ui.step('بنجهز الفتوات…', 45);
  const lowQ = quality === 'low';
  const HERO = 'Male_Adult_15', FOE = 'Sports_Male_01';
  const CROWD_TYPES = lowQ ? ['Male_Adult_02', 'Male_Adult_20', 'Wood_Male_01', 'Male_Adult_14']
    : ['Male_Adult_02', 'Male_Adult_05', 'Male_Adult_10', 'Male_Adult_14', 'Male_Adult_17', 'Male_Adult_20', 'Wood_Male_01', 'Delivery_Male_01', 'Gardener_Male_01', 'Sports_Male_04'];
  const [CL, ...packList] = await Promise.all([loadClips('clips_rb.txt'), ...[HERO, FOE, ...CROWD_TYPES].map(n => loadCharPack('./', n))]);
  const packs = Object.fromEntries(packList.map(p => [p.name, p]));
  LM.push(['packs+clips', performance.now()]);
  try { // real night-street light (Poly Haven HDRI, CC0) for image based lighting
    const txt = await (await fetch('env_night.txt')).text();
    const buf = decode64(txt.replace(/\s/g, '')).buffer;
    const h = new HDRLoader().parse(buf);
    const dt = new THREE.DataTexture(h.data, h.width, h.height, THREE.RGBAFormat, h.type);
    dt.mapping = THREE.EquirectangularReflectionMapping; dt.colorSpace = THREE.LinearSRGBColorSpace; dt.minFilter = dt.magFilter = THREE.LinearFilter; dt.needsUpdate = true;
    scene.environment = pmrem.fromEquirectangular(dt).texture; scene.environmentIntensity = 0.32;
  } catch (e) { console.warn('env', e); }
  LM.push(['hdri', performance.now()]);
  ui.step('بنوقّف أهل الحارة…', 70);

  const wx = (x) => Math.sign(x) * (HW - (26 - Math.abs(x)));
  const HARA_OBST = [
    [HW - 9, 38, 4.5], [HW - 9, 24, 4.5], [HW - 14, 32, 4.5], [HW - 13.5, 38.5, 2.5], [HW - 8.5, 28.4, 2.5], [HW - 18.5, 32.5, 2.5], [HW - 9, 20, 2.5],
    [wx(-18), 34, 6.5], [wx(-15), -24, 8.5], [wx(-17.5), 6, 4.5], [wx(-21), -1.5, 3.5], [wx(-21), -40, 4.5], [wx(13), -92, 8.5], [wx(17), -50, 4.5],
  ];
  ARENA.hara.obst = HARA_OBST; let CUR = ARENA.hara, OBST = HARA_OBST;

  // ------------------------------------------------------------ crowd: real people (Rocketbox) cheering with mocap
  const crowd = [];
  const NC = lowQ ? 8 : 14;
  const CHEERS = ['cheer1', 'cheer2', 'cheer3', 'cheer4', 'clap1', 'clap2', 'excited'], CALM = ['idle', 'angry1', 'clap1', 'excited'];
  for (let i = 0; i < NC; i++) {
    const type = CROWD_TYPES[i % CROWD_TYPES.length];
    const c = buildChar(THREE, './', packs[type], 'low', null, mergeVertices);
    c.mesh.castShadow = false;
    const an = makeAnimator(THREE, c, CL);
    const a = (i / NC) * Math.PI * 2;
    const g = c.group; g.position.set(Math.cos(a) * 32, 0, Math.sin(a) * 32); scene.add(g);
    an.play(pickOne(CALM), { loop: true, start: Math.random() * 5, fade: 0, speed: 0.9 + Math.random() * 0.2 });
    g.userData = { type, a, r: 30 + Math.random() * 7, an, rig: c, mood: 'calm', moodT: Math.random() * 3, moving: false };
    crowd.push(g);
  }
  const ringC = new THREE.Vector3();
  crowd.forEach((c, i) => (c.userData.idx = i));
  let crowdTick = 0; const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _bs = new THREE.Sphere(new THREE.Vector3(), 11);
  function inView(c) { _bs.center.set(c.position.x, 9, c.position.z); return _fr.intersectsSphere(_bs); }

  // ------------------------------------------------------------ fighters
  // strikes: clip, playback speed, reach (centre to centre at impact), damage, zone, follow-up in the chain
  const ATT = {
    jab: { clip: 'jab', hitT: 0.233, speed: 1.0, cancel: 0.0, recover: 0.16, reach: 9.4, dmg: 5, stun: 0.32, knock: 5, zone: 'head', light: true, next: 'cross', snd: 'hit' },
    cross: { clip: 'cross', hitT: 0.267, speed: 1.0, cancel: 0.03, recover: 0.2, reach: 9.8, dmg: 7, stun: 0.38, knock: 7, zone: 'head', light: true, next: 'hookL', snd: 'hit' },
    hookL: { clip: 'hookL', hitT: 0.267, speed: 1.0, cancel: 0.05, recover: 0.22, reach: 8.8, dmg: 9, stun: 0.45, knock: 8, zone: 'head', next: 'body', snd: 'hit' },
    body: { clip: 'body', hitT: 0.225, speed: 1.0, cancel: 0.05, recover: 0.22, reach: 8.8, dmg: 10, stun: 0.5, knock: 8, zone: 'gut', next: 'upper', snd: 'heavy' },
    upper: { clip: 'upper', hitT: 0.283, speed: 1.0, cancel: 0.08, recover: 0.26, reach: 8.4, dmg: 13, stun: 0.6, knock: 14, zone: 'head', down: 0.45, snd: 'heavy' },
    hookR: { clip: 'hookR', hitT: 0.292, speed: 1.0, cancel: 0.1, recover: 0.24, reach: 8.8, dmg: 10, stun: 0.5, knock: 9, zone: 'head', snd: 'heavy' },
    kick: { clip: 'kick', hitT: 0.433, speed: 1.1, cancel: 0.14, recover: 0.3, reach: 11.2, dmg: 10, stun: 0.5, knock: 14, zone: 'chest', down: 0.25, snd: 'heavy' },
    swing: { clip: 'swing', speed: 1.5, cancel: 0.15, recover: 0.3, hitT: 0.958, reach: 12.5, dmg: 0, stun: 0.6, knock: 12, zone: 'head', snd: 'wood' },
    // weapon strikes (stick, chair, tray): overhead chop (breaks the guard), sideways swing, short thrust
    wOver: { clip: 'throw', start: 0.45, speed: 1.55, hitT: 1.12, cancel: 0.14, recover: 0.32, reach: 13, dmg: 0, stun: 0.62, knock: 16, zone: 'head', wv: 'over', wmul: 1.3 },
    wSide: { clip: 'hookR', hitT: 0.292, speed: 1.05, cancel: 0.1, recover: 0.26, reach: 13, dmg: 0, stun: 0.5, knock: 12, zone: 'head', wv: 'side', wmul: 1.0, root: true },
    wPoke: { clip: 'cross', hitT: 0.267, speed: 1.15, cancel: 0.06, recover: 0.2, reach: 14, dmg: 0, stun: 0.4, knock: 9, zone: 'chest', wv: 'poke', wmul: 0.7, root: true },
  };
  // measured from the clips (tools/reach.py): the limb that strikes, where it is at full extension in the attacker's own frame
  // (z forward, x to his left, from the strike's first frame, step included) and when (clip seconds)
  const STRIKE = {
    jab: { limb: 'wrist.L', z: 7.71, x: 2.69, t: 0.233, tgt: 'head', adj: -0.8 }, cross: { limb: 'wrist.R', z: 9.62, x: -1.16, t: 0.267 },
    hookL: { limb: 'wrist.L', z: 3.16, x: 8.55, t: 0.267, adj: -1.0 }, hookR: { limb: 'wrist.R', z: 7.83, x: -1.69, t: 0.292 },
    body: { limb: 'wrist.R', z: 7.98, x: -0.81, t: 0.225, adj: -1.7 }, upper: { limb: 'wrist.R', z: 5.07, x: -5.44, t: 0.283, tgt: 'head' },
    kick: { limb: 'foot.R', z: 7.72, x: 0.46, t: 0.433, tgt: 'spine02' },
    swing: { limb: 'wrist.R', z: 5.05, x: -1.0, t: 0.958 }, wOver: { limb: 'wrist.R', z: 6.9, x: 1.5, t: 1.12 },
    wSide: { limb: 'wrist.R', z: 7.83, x: -1.69, t: 0.292 }, wPoke: { limb: 'wrist.R', z: 9.62, x: -1.16, t: 0.267 },
  };
  for (const S of Object.values(STRIKE)) { S.yaw = -Math.atan2(S.x, S.z); S.r = Math.hypot(S.x, S.z); }
  const rootZ = (name, t) => { const c = CL[name], f = Math.max(0, Math.min(c.n - 1, t * c.fps)), i = Math.floor(f), j = Math.min(c.n - 1, i + 1), k = f - i; return c.root[i * 3 + 2] + (c.root[j * 3 + 2] - c.root[i * 3 + 2]) * k; };
  const WLEN = { chair: 3, tray: 2.5 };
  // the body part a strike is aimed at: head (its centre, above the neck joint), belly, or chest
  const headC = new WeakMap();
  function partOf(c, a) { const S = a.S || {}; if (S.tgt) return c.rig.B[S.tgt]; if (a.zone !== 'head') return c.rig.B.spine01;   // chest/stomach level where the body shots of these clips arrive
    let h = headC.get(c); if (!h) { h = new THREE.Object3D(); h.position.set(0, 0.8, 0.35); c.rig.B.head.add(h); headC.set(c, h); } return h; }     // how far past the hand a held item reaches (sticks: by length)
  const _lp = new THREE.Vector3(), _tp2 = new THREE.Vector3();
  const ITEMS = {
    chair: { name: 'كرسي قهوة', dmg: 17, dur: 2, hold: 'two', throwDmg: 14, down: 0.9 },
    nabboot: { name: 'نبوت', dmg: 11, dur: 6, hold: 'one', throwDmg: 9, down: 0.25 },
    tray: { name: 'صينية', dmg: 7, dur: 3, hold: 'one', throwDmg: 8, snd: 'clang', down: 0.1 },
    qulla: { name: 'قلة', dmg: 6, dur: 1, hold: 'one', throwDmg: 13, breaks: true, down: 0.4 },
    // shop weapons
    nabbootNahas: { name: 'نبوت مطعّم', dmg: 13, dur: 9, hold: 'one', throwDmg: 11, down: 0.3, stick: true },
    khayzaran: { name: 'خيزرانة', dmg: 8, dur: 14, hold: 'one', throwDmg: 6, down: 0.12, stick: true, swing: 1.85 },
    shoma: { name: 'شومة', dmg: 18, dur: 5, hold: 'one', throwDmg: 14, down: 0.55, stick: true, swing: 1.25 },
    // slingshot: the item button shoots a pebble at the target; 10 shots, then it is spent
    nabla: { name: 'نبلة', dmg: 0, dur: 10, hold: 'one', throwDmg: 5, down: 0, ranged: true },
  };
  ITEMS.nabboot.stick = true;
  const isStick = (k) => !!(ITEMS[k] && ITEMS[k].stick);
  const BODY_R = 3.4;
  const DOWNISH = ['fall', 'down', 'getup', 'ko', 'grabbed'];
  const qR = new THREE.Quaternion(), eR = new THREE.Euler(), wv = new THREE.Vector3();

  class Fighter {
    constructor(type, name, isAI) {
      this.type = type; this.name = name; this.isAI = isAI;
      this.rig = buildChar(THREE, './', packs[type], 'high', null, mergeVertices);
      this.g = this.rig.group; scene.add(this.g);
      if (type === HERO) this.rig.mesh.material[0].color.setScalar(0.8);   // white gallabiya: keep it from blowing out under the lamps
      this.anim = makeAnimator(THREE, this.rig, CL);
      this.react = new THREE.Vector3(); this.reactV = new THREE.Vector3(); this.headR = new THREE.Vector3(); this.headV = new THREE.Vector3();
      this.rage = 0; this.rageCD = 0; this.escape = 0;
      this.stepIx = 0;
      this.reset();
    }
    reset() {
      this.hp = this.hpMax || 100; this.haiba = 0; this.state = 'idle'; this.st = 0; this.att = null; this.hitDone = false;
      this.vel = new THREE.Vector3(); this.move = new THREE.Vector3(); this.queue = null; this.combo = 0; this.comboT = 0; this.recent = 0; this.recentT = 0;
      this.item = null; this.invuln = 0; this.blockHeld = false; this.react.set(0, 0, 0); this.reactV.set(0, 0, 0); this.headR.set(0, 0, 0); this.headV.set(0, 0, 0); this.recovered = 0; this.g.position.y = 0; this.rage = 0; this.rageCD = 0; this.escape = 0; this.setRageLook(0);
      this.anim.play('guard', { loop: true, fade: 0 });
    }
    get pos() { return this.g.position; }
    get face() { return (this._face || (this._face = new THREE.Vector3())).set(Math.sin(this.g.rotation.y), 0, Math.cos(this.g.rotation.y)); }
    busy() { return ['attack', 'hit', 'down', 'getup', 'grabbed', 'clinch', 'grabTry', 'recover', 'pickup', 'toss', 'shoot', 'ko', 'win', 'dodge', 'fall'].includes(this.state); }
    set(s) { this.state = s; this.st = 0; }
    attack(kind, finisher) {
      const a0 = this.att, cancelable = this.state === 'attack' && a0 && a0.reach && this.st >= a0.impact + (a0.cancel ?? 0.1);
      if (this.state === 'attack' && !cancelable) { this.queue = kind; return; }
      if (this.state !== 'attack' && (this.busy() || this.state === 'block')) return;
      let a = ATT[kind], wpn = false;
      if (this.item && kind !== 'kick' && !ITEMS[this.item.kind].ranged) {
        wpn = true; const ik = this.item.kind;
        // which weapon strike: the player cycles them by chaining presses; opponents mix them (more chops as they get better)
        const pool = ik === 'chair' ? ['wOver', 'swing'] : ik === 'tray' ? ['wSide', 'swing', 'wSide'] : ['wSide', 'wOver', 'wPoke'];
        let v; if (this.isAI) { const r = Math.random(), sk = (this.spec && this.spec.skill) || 0; v = ik === 'chair' || ik === 'tray' ? pool[Math.floor(r * pool.length)] : r < 0.25 + 0.2 * sk ? 'wOver' : r < 0.7 ? 'wSide' : 'wPoke'; }
        else { this.wIx = this.state === 'attack' ? (this.wIx || 0) + 1 : 0; v = pool[this.wIx % pool.length]; }
        if (ATT[kind] && ATT[kind].wv) v = kind;   // a named weapon strike (tests)
        a = ATT[v]; const sw = ITEMS[ik].swing; if (sw) a = Object.assign({}, a, { speed: a.speed * sw / 1.5 }); kind = v;
      }
      this.att = Object.assign({ kind: wpn ? 'swing' : kind, key: kind, finisher: !!finisher }, a);
      const c = CL[a.clip];
      // chained strike: the previous punch's retraction already did the set-up, so skip the 0.06 s stance lead baked before motion onset
      const lead = a.start != null ? a.start : (this.state === 'attack' && a.clip !== 'kick' && a.clip !== 'swing' && !wpn) ? 0.06 : 0;
      this.att.impact = ((a.hitT ?? c.hit ?? c.dur * 0.45) - lead) / a.speed; this.att.dur = (c.dur - lead) / a.speed;
      const rm = a.root ?? (a.clip !== 'kick' && a.clip !== 'swing' && a.clip !== 'throw');
      this.anim.play(a.clip, { speed: a.speed, start: lead, fade: lead && !wpn ? 0.06 : (a.light ? 0.05 : 0.08), restart: true, rootMotion: rm });
      // contact geometry: the distance (body to body) at which this limb meets the target, and how close it has to get
      const S = STRIKE[kind]; this.att.S = S; this.att.rm = rm; this.att.root0 = rm ? rootZ(a.clip, lead) : 0;
      if (S) { const ext = wpn ? (WLEN[this.item.kind] ?? (this.item.mesh ? 7 : 6)) : 0, off = a.zone === 'head' ? 1.1 : 1.3;
        this.att.D0 = S.r + off + (S.adj || 0) + ext * 0.85; this.att.contact = (a.zone === 'head' ? 3.1 : 3.4) + ext; }
      this.hitDone = false; this.missed = false; this.set('attack'); sfx('whoosh');
    }
    // where the blow lands decides what moves: head snaps (hooks turn it, uppercuts lift it), chest is driven back, a gut shot folds him forward
    hitReact(dir, power, zone = 'head', kind = '') {
      const inv = -this.g.rotation.y; const lx = dir.x * Math.cos(inv) + dir.z * Math.sin(inv), lz = -dir.x * Math.sin(inv) + dir.z * Math.cos(inv);
      if (zone === 'head') {
        const side = kind === 'hookL' ? -1 : kind === 'hookR' ? 1 : 0;
        this.headV.x += (kind === 'upper' ? -1.6 : lz) * power * 9; this.headV.y += side * power * 10; this.headV.z -= lx * power * 6;
        this.headR.x += (kind === 'upper' ? -0.25 : lz * 0.2) * power; this.headR.y += side * 0.22 * power;
        this.reactV.x += lz * power * 3;
      } else if (zone === 'gut') {
        this.reactV.x -= power * 9; this.react.x -= 0.22 * power; this.headV.x -= power * 4;          // doubles over
      } else {
        this.reactV.x += lz * power * 8; this.reactV.z -= lx * power * 6; this.react.x += lz * power * 0.2; this.react.z -= lx * power * 0.15;
      }
    }
    setRageLook(k) {   // body glow while in futuwwa mode
      for (const m of this.rig.mesh.material) { m.emissive.setRGB(0.55 * k, 0.18 * k, 0.02 * k); }
    }
  }
  const hero = new Fighter(HERO, 'المعلم حسونة', false);
  let foe = new Fighter(FOE, 'دهشان', true);
  let foes = [foe];                                       // one or two opponents; hero.foe is the one he is fighting right now
  const fighterPool = new Map();                          // built characters kept for reuse, by model
  const newAI = (sp = {}) => ({ q: [], counterT: 0, seen: null, defend: null, punished: null, cover: null, think: 0, goal: null, retreat: 0, circle: Math.random() < 0.5 ? 1 : -1, aggr: sp.aggr ?? 0.8, block: sp.block ?? 0.5, react: sp.react ?? 0.24, blockT: 0, shootCD: 1.2, acc: sp.acc ?? 0.6, rage: sp.rage ?? true, combo: sp.combo ?? 0.5, dodge: sp.dodge ?? 0.3 });
  foe.ai = newAI(); fighterPool.set(FOE, [foe]);
  let LV = { n: 8, name: 'دهشان', nick: '', place: 'قهوة المعلم', hp: 100, dmg: 1.1, aggr: 0.8, block: 0.5, react: 0.24, rage: true, crowd: NC, items: ['chair', 'nabboot', 'tray', 'qulla'], light: 'night', time_limit: 99 }, LO = {};
  const MS = { hits: 0, bestCombo: 0, rage: 0, grabs: 0, throwHits: 0, kos: 0 };   // this fight's stats for the player
  hero.foe = foe; foe.foe = hero;
  const alive = () => foes.filter(f => f.hp > 0);
  const oppsOf = (f) => f === hero ? foes.filter(o => o.hp > 0) : [hero];
  LM.push(['characters', performance.now()]);
  await texturesReady();
  LM.push(['textures', performance.now()]);

  // ------------------------------------------------------------ items
  const items = [];
  const woodM = new THREE.MeshStandardMaterial({ color: '#4a2c16', roughness: 0.6 });
  function makeItemMesh(kind) {
    if (kind === 'chair') return hara.woodChair('#7a5030');
    if (kind === 'nabboot') { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 12, 10), woodM); s.castShadow = true; return s; }
    if (kind === 'khayzaran') { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 11, 8), new THREE.MeshStandardMaterial({ color: '#c8a46a', roughness: 0.5 })); s.castShadow = true; return s; }
    if (kind === 'shoma') { const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 10, 10), new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: 0.75 })); g.add(sh); const k = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), sh.material); k.position.y = 5; g.add(k); return g; }
    if (kind === 'nabbootNahas') { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 12, 10), new THREE.MeshStandardMaterial({ color: '#5a3018', roughness: 0.5 }))); const brass = new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.9, roughness: 0.3 }); for (const y of [-4.5, -1.5, 1.5, 4.5, 5.8]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.35, 12), brass); r.position.y = y; g.add(r); } return g; }
    if (kind === 'tray') { const t = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.14, 28), new THREE.MeshStandardMaterial({ color: '#c0b8a8', metalness: 0.9, roughness: 0.25 })); t.castShadow = true; return t; }
    if (kind === 'nabla') { const g = new THREE.Group(); const w = new THREE.MeshStandardMaterial({ color: '#6a4224', roughness: 0.7 }); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.2, 6), w); h.position.y = -1.1; g.add(h);
      for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.8, 6), w); a.position.set(sx * 0.45, 0.75, 0); a.rotation.z = -sx * 0.5; g.add(a); }
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 4), new THREE.MeshStandardMaterial({ color: '#8a1a10', roughness: 0.6 })); band.rotation.z = Math.PI / 2; band.position.set(0, 1.55, -0.1); g.add(band); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(1.3); return g; }
    if (kind === 'qulla') { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: '#9a5a36', roughness: 0.9 })); b.scale.y = 1.25; g.add(b); const n = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 12), b.material); n.position.y = 1.4; g.add(n); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
  }
  function groundPose(it) {
    const m = it.mesh; m.position.set(it.x, 0.1, it.z); m.rotation.set(0, it.ry || 0, 0); m.scale.setScalar(1);
    if (it.kind === 'chair') { m.position.y = 2.1; m.rotation.set(Math.PI / 2, it.ry || 0.6, 0, 'YXZ'); }
    if (isStick(it.kind)) { m.position.y = 0.3; m.rotation.set(0, it.ry || 0, Math.PI / 2, 'YXZ'); }
    if (it.kind === 'tray') m.position.y = 0.1;
    if (it.kind === 'qulla') m.position.y = 1.25;
    if (it.kind === 'nabla') { m.position.y = 0.4; m.rotation.set(Math.PI / 2, it.ry || 0, 0, 'YXZ'); }
  }
  // stick grip: the hand-space direction that keeps the stick up over the shoulder through guard, walk and footwork (tools/grip.py)
  const _yAx = new THREE.Vector3(0, 1, 0), GRIP = new THREE.Vector3(-0.348, 0.768, 0.537).normalize();
  function holdPose(it) {
    const m = it.mesh; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0);
    if (isStick(it.kind)) { m.quaternion.setFromUnitVectors(_yAx, GRIP); m.position.copy(GRIP).multiplyScalar(it.kind === 'shoma' ? 1.0 : 2.2); }
    if (it.kind === 'tray') { m.position.set(0, -0.6, 0.6); m.rotation.set(Math.PI / 2, 0, 0); }
    if (it.kind === 'qulla') m.position.set(0, -1.1, 0.4);
    if (it.kind === 'chair') { m.position.set(0, -6.0, 1.4); m.rotation.set(Math.PI, 0, 0); m.scale.setScalar(0.9); }
    if (it.kind === 'nabla') { m.position.set(0, 0.4, 0.3); m.rotation.set(0, 0, 0); m.scale.setScalar(1.3); }
  }
  function spawnItem(kind, x, z, ry) { const it = { kind, x, z, ry, mesh: makeItemMesh(kind), state: 'ground', dur: ITEMS[kind].dur, holder: null, vel: new THREE.Vector3() }; scene.add(it.mesh); groundPose(it); castOn(it, false); items.push(it); return it; }
  const ITEM_SPOTS = [[22, 18, 0.4], [-26, -30, 2.2], [-18, 12, 0.9], [12, -26, 0], [-34, 26, 0], [36, -44, 0], [30, -70, 2.4], [-40, -80, 1]];
  function resetItems() {
    for (const it of items) it.mesh.removeFromParent(); items.length = 0;
    if (LV.items) { ITEM_SPOTS.forEach(([x, z, r], i) => spawnItem(LV.items[i % LV.items.length], x, z, r)); return; }
    spawnItem('chair', 22, 18, 0.4); spawnItem('chair', -26, -30, 2.2); spawnItem('nabboot', -18, 12, 0.9); spawnItem('tray', 12, -26, 0); spawnItem('qulla', -34, 26, 0); spawnItem('qulla', 36, -44, 0); spawnItem('nabboot', 30, -70, 2.4); spawnItem('chair', -40, -80, 1);
  }
  const castOn = (it, on) => it.mesh.traverse(o => { if (o.isMesh) o.castShadow = on; });
  function grab(f, it) { it.state = 'held'; it.holder = f; f.item = it; f.rig.hand.R.add(it.mesh); holdPose(it); castOn(it, true); }
  function drop(f, keepFlying) { const it = f.item; if (!it) return null; f.item = null; it.holder = null; const wp = new THREE.Vector3(); it.mesh.getWorldPosition(wp); it.mesh.removeFromParent(); scene.add(it.mesh); it.x = clamp(wp.x, CUR.bounds.x0, CUR.bounds.x1); it.z = clamp(wp.z, CUR.bounds.z0, CUR.bounds.z1); if (!keepFlying) { it.state = 'ground'; groundPose(it); castOn(it, false); } else it.mesh.position.copy(wp); return it; }
  const debris = [];
  function breakItem(it, holder) {
    const wp = new THREE.Vector3(); it.mesh.getWorldPosition(wp);
    if (holder) holder.item = null;
    it.mesh.removeFromParent(); items.splice(items.indexOf(it), 1);
    for (let i = 0; i < (it.kind === 'chair' ? 7 : 5); i++) {
      const piece = it.kind === 'qulla' ? new THREE.Mesh(new THREE.TetrahedronGeometry(0.4 + Math.random() * 0.3), new THREE.MeshStandardMaterial({ color: '#9a5a36', roughness: 0.9 })) : new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2 + Math.random() * 2), woodM);
      piece.position.copy(wp); scene.add(piece);
      debris.push({ m: piece, v: new THREE.Vector3(rand(-8, 8), rand(6, 14), rand(-8, 8)), r: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)), life: 6 });
    }
    sfx(it.kind === 'qulla' ? 'shatter' : 'break');
    banner(it.kind === 'qulla' ? 'القلة اتكسرت!' : (it.kind === 'chair' ? 'الكرسي اتكسر!' : ITEMS[it.kind].name + ' اتكسر!'), 900);
  }

  // spent item (empty slingshot): leaves the hand and is gone, no debris
  function discardItem(it, holder) { if (holder) holder.item = null; it.mesh.removeFromParent(); const i = items.indexOf(it); if (i >= 0) items.splice(i, 1); if (holder && holder.weaponIt === it) holder.weaponIt = null; }
  // slingshot pebbles: a small fast stone, gravity, swept hit test against the body capsule; blocked by a guard facing it
  const pebbles = [], pebbleGeo = new THREE.IcosahedronGeometry(0.42, 0), pebbleMat = new THREE.MeshStandardMaterial({ color: '#8a8070', roughness: 0.8 });
  const pebblePool = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(pebbleGeo, pebbleMat); m.visible = false; scene.add(m); return m; });
  const PSTAT = { shots: 0, hits: 0, blocked: 0 };
  function firePebble(f, p0, vel) { PSTAT.shots++; const m = pebblePool.find(x => !x.visible) || pebblePool[0]; m.visible = true; m.position.copy(p0); pebbles.push({ m, vel, prev: p0.clone(), owner: f, life: 1.6 }); }
  function updatePebbles(dt) {
    for (const pb of pebbles.slice()) {
      const p = pb.m.position; pb.prev.copy(p); pb.vel.y -= 22 * dt; p.addScaledVector(pb.vel, dt); pb.life -= dt; let gone = pb.life <= 0;
      for (const tgt of oppsOf(pb.owner)) { if (gone || tgt.invuln > 0 || DOWNISH.includes(tgt.state)) continue;
        for (let k = 1; k <= 4; k++) { const x = pb.prev.x + (p.x - pb.prev.x) * k / 4, y = pb.prev.y + (p.y - pb.prev.y) * k / 4, z = pb.prev.z + (p.z - pb.prev.z) * k / 4;
          if (y > 1 && y < 17.5 && Math.hypot(x - tgt.pos.x, z - tgt.pos.z) < 2.6) { const dir = new THREE.Vector3(pb.vel.x, 0, pb.vel.z).normalize();
            PSTAT.hits++; if (!damage(pb.owner, tgt, ITEMS.nabla.throwDmg, dir, { kind: 'pebble', light: true, knock: 3, stun: 0.3, down: 0, zone: y > 13 ? 'head' : 'chest' })) PSTAT.blocked++; sfx('pebble'); gone = true; break; } } }
      if (!gone && p.y < 0.3) { dust(p, 2, false); gone = true; }
      if (gone) { pb.m.visible = false; pebbles.splice(pebbles.indexOf(pb), 1); }
    }
  }
  // ------------------------------------------------------------ audio
  let ac = null, muted = false;
  function sfx(type) {
    if (!ac || muted) return;
    const t = ac.currentTime;
    const noise = (dur, f0, f1, gain, q = 1) => { const n = ac.createBufferSource(); const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); n.buffer = b; const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = ac.createGain(); g.gain.value = gain; n.connect(fl).connect(g).connect(ac.destination); n.start(t); };
    const tone = (f, dur, gain, type2 = 'sine') => { const o = ac.createOscillator(); o.type = type2; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + dur); const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur); };
    if (type === 'whoosh') noise(0.16, 2400, 500, 0.1, 0.7);
    if (type === 'hit') { noise(0.1, 1800, 200, 0.6); tone(120, 0.1, 0.45); }
    if (type === 'heavy') { noise(0.2, 1400, 120, 0.8); tone(70, 0.22, 0.65); }
    if (type === 'wood') { noise(0.2, 3200, 300, 0.7, 4); tone(180, 0.15, 0.35, 'triangle'); }
    if (type === 'clang') { tone(820, 0.6, 0.25, 'triangle'); tone(1240, 0.5, 0.15); noise(0.1, 6000, 1500, 0.3); }
    if (type === 'block') noise(0.08, 3000, 800, 0.35, 2);
    if (type === 'break') noise(0.4, 4000, 200, 0.9, 3);
    if (type === 'shatter') { noise(0.5, 8000, 1200, 0.7, 5); tone(1500, 0.3, 0.1, 'square'); }
    if (type === 'fall') { noise(0.35, 600, 60, 1.0); tone(55, 0.4, 0.7); }
    if (type === 'crowd') noise(1.6, 900, 400, 0.35, 0.5);
    if (type === 'head') { noise(0.08, 2800, 300, 0.55, 1.5); tone(150, 0.08, 0.35); }
    if (type === 'headHeavy') { noise(0.14, 2200, 160, 0.85, 1.2); tone(95, 0.17, 0.6); }
    if (type === 'body') { noise(0.15, 900, 90, 0.8); tone(70, 0.2, 0.75); }
    if (type === 'rage') { tone(52, 1.0, 0.8, 'sawtooth'); tone(78, 0.8, 0.35, 'square'); noise(1.0, 700, 150, 0.45, 0.6); }
    if (type === 'miss') noise(0.22, 1600, 400, 0.18, 0.8);
    if (type === 'stretch') { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(160, t + 0.18); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.15); g.gain.linearRampToValueAtTime(0.0001, t + 0.2); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.22); }
    if (type === 'twang') { tone(260, 0.18, 0.3, 'triangle'); noise(0.08, 3000, 900, 0.25, 2); }
    if (type === 'pebble') { noise(0.06, 3600, 900, 0.5, 2.5); tone(420, 0.05, 0.2, 'square'); }
    if (type === 'thunder') { noise(2.4, 260, 40, 1.1, 0.4); tone(38, 1.8, 0.6); }
    if (type === 'escape') { noise(0.12, 2600, 600, 0.45, 2); tone(220, 0.08, 0.15, 'triangle'); }
  }
  ui.onMute = (m) => { muted = m; };

  // ------------------------------------------------------------ hud helpers
  const shouts = ['اديله يا معلم!', 'قوم يا دهشان، قوم!', 'هي دي الفتونة!', 'الحارة كلها بتتفرج!', 'حد يفصل بينهم يا جماعة!', 'خلّصه!', 'جدع يا حسونة!', 'يا ساتر!'];
  let shoutT = 0;
  function shout(txt) { ui.shout(txt || pickOne(shouts)); shoutT = 3 + Math.random() * 3; }
  function banner(txt, ms = 1100) { ui.banner(txt, ms); }

  // ------------------------------------------------------------ input
  const input = { jx: 0, jy: 0, blockTouch: false };
  const pressed = new Set(); const keys = {};
  addEventListener('keydown', (e) => {
    if (e.repeat) return; keys[e.code] = true;
    const map = { KeyJ: 'punch', KeyZ: 'punch', KeyK: 'kick', KeyX: 'kick', KeyL: 'grab', KeyC: 'grab', KeyE: 'item', KeyF: 'finisher', ShiftLeft: 'dodge', ShiftRight: 'dodge' };
    if (map[e.code]) { pressed.add(map[e.code]); e.preventDefault(); }
    if (e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  ui.bindButtons((act, down) => { if (act === 'block') input.blockTouch = down; else if (down) pressed.add(act); });
  ui.bindJoystick((x, y) => { input.jx = x; input.jy = y; });

  // ------------------------------------------------------------ camera + composer
  const camera = new THREE.PerspectiveCamera(46, stage.clientWidth / stage.clientHeight, 0.5, 2000);
  camera.position.set(0, 26, -60);
  const camT = new THREE.Vector3(0, 10, 0);
  let camShake = 0, slowmo = 0, finisherCam = 0, hitstop = 0, hitstopWho = null;
  let composer;
  function buildComposer() {
    const w = stage.clientWidth, h = stage.clientHeight;
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    if (quality === 'high') composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.2, 0.35, 2.2));
    composer.addPass(new OutputPass()); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h);
  }
  buildComposer();
  ui.onQuality = (q) => { quality = q; try { localStorage.setItem('fetwa-quality', q); } catch (e) {} if (match.state !== 'fight') location.reload(); else { applyQuality(); buildComposer(); } };
  ui.setQuality(quality);
  addEventListener('resize', () => { const w = stage.clientWidth, h = stage.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); composer.setSize(w, h); });

  // ------------------------------------------------------------ match
  let match = { state: 'menu', t: 99, introT: 0, endT: 0, winner: null, hype: 30 };
  function resetMatch(silent) {
    hero.reset(); for (const f of foes) f.reset(); for (const f of [hero, ...foes]) { f.ring.visible = false; }
    hero.pos.set(-9, 0, 4); hero.g.rotation.set(0, Math.PI / 2, 0);
    foes.forEach((f, i) => { f.pos.set(i ? 15 : 9, 0, i ? -13 : 0); f.g.rotation.set(0, -Math.PI / 2, 0); f.foe = hero; f.ai = newAI(f.spec); });
    hero.foe = foes[0];
    resetItems(); for (const d of debris) d.m.removeFromParent(); debris.length = 0; for (const pb of pebbles) pb.m.visible = false; pebbles.length = 0;
    match = { state: silent ? 'menu' : 'intro', t: LV.time_limit || 99, introT: 0, endT: 0, winner: null, hype: 30 };
    ringC.set(0, 0, 2);
    for (const k of Object.keys(MS)) MS[k] = 0;
    ui.showEnd(null); if (silent) return;
    if (LO.bakhour) hero.haiba = 50;
    if (LO.weapon && ITEMS[LO.weapon]) { const it = spawnItem(LO.weapon, hero.pos.x, hero.pos.z, 0); grab(hero, it); }
    for (const f of foes) { if (f.spec && f.spec.weapon && ITEMS[f.spec.weapon]) { const it = spawnItem(f.spec.weapon, f.pos.x, f.pos.z, 0); grab(f, it); f.weaponIt = it; } else f.weaponIt = null; }
    foes.forEach((f, i) => { f.anim.play(i ? 'angry1' : 'angryTalk', { loop: true, fade: 0.2, start: i * 0.7 }); f.set('taunt'); });
    banner(LV.place || 'الجولة الأولى', 1400); setTimeout(() => { if (match.state === 'intro') banner('ابدأ!', 800); }, 1450);
  }
  ui.onRestart = () => resetMatch();
  ui.onStart = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } resetMatch(); };

  // ------------------------------------------------------------ item marker (name tag + ring) and aim arrow
  const itemTag = document.createElement('div'); itemTag.className = 'itemTag'; itemTag.hidden = true; stage.appendChild(itemTag);
  // ground markers drawn with a dark outline so they read on bright stone at phone size
  const ringTex2 = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.lineWidth = 26; x.strokeStyle = 'rgba(20,10,0,0.7)'; x.beginPath(); x.arc(64, 64, 48, 0, 7); x.stroke(); x.lineWidth = 15; x.strokeStyle = '#ffcf5a'; x.beginPath(); x.arc(64, 64, 48, 0, 7); x.stroke(); return new THREE.CanvasTexture(c); })();
  const pickRing = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), new THREE.MeshBasicMaterial({ map: ringTex2, transparent: true, depthWrite: false, toneMapped: false }));
  pickRing.rotation.x = -Math.PI / 2; pickRing.visible = false; scene.add(pickRing);
  const arrowTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
    const path = () => { x.beginPath(); x.moveTo(32, 6); x.lineTo(60, 56); x.lineTo(42, 56); x.lineTo(42, 250); x.lineTo(22, 250); x.lineTo(22, 56); x.lineTo(4, 56); x.closePath(); };
    const g = x.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, 'rgba(255,190,70,0.15)'); g.addColorStop(0.5, 'rgba(255,190,70,0.85)'); g.addColorStop(1, 'rgba(255,215,110,1)');
    path(); x.lineWidth = 8; x.strokeStyle = 'rgba(25,12,0,0.7)'; x.stroke(); path(); x.fillStyle = g; x.fill(); return new THREE.CanvasTexture(c); })();
  const aimArrow = new THREE.Mesh(new THREE.PlaneGeometry(6, 20), new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true, depthWrite: false, toneMapped: false }));
  aimArrow.rotation.order = 'YXZ'; aimArrow.visible = false; scene.add(aimArrow);
  const _tp = new THREE.Vector3(); let tagFor = null;
  function updateItemUI() {
    const can = match.state === 'fight' && !hero.item && !hero.busy();
    const it = can ? nearestItem(hero) : null;
    pickRing.visible = !!it;
    if (it) {
      pickRing.position.set(it.mesh.position.x, 0.14, it.mesh.position.z); pickRing.material.opacity = 0.7 + 0.3 * Math.sin(time * 6);
      _tp.set(it.mesh.position.x, 4, it.mesh.position.z).project(camera);
      if (_tp.z < 1) { itemTag.hidden = false; if (tagFor !== it) { tagFor = it; itemTag.textContent = ITEMS[it.kind].name + ' · التقط'; } itemTag.style.left = ((_tp.x + 1) / 2 * stage.clientWidth).toFixed(0) + 'px'; itemTag.style.top = ((1 - _tp.y) / 2 * stage.clientHeight).toFixed(0) + 'px'; }
      else itemTag.hidden = true;
    } else if (!itemTag.hidden) { itemTag.hidden = true; tagFor = null; }
    const aiming = match.state === 'fight' && hero.item && !hero.busy();
    aimArrow.visible = !!aiming;
    if (aiming) { const d = hero.move.lengthSq() > 0.09 ? hero.move : hero.face; const yaw = Math.atan2(d.x, d.z); aimArrow.rotation.set(-Math.PI / 2, yaw + Math.PI, 0); aimArrow.position.set(hero.pos.x + Math.sin(yaw) * 13, 0.15, hero.pos.z + Math.cos(yaw) * 13); }
  }
  // ------------------------------------------------------------ helpers
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
  function yawTo(f, target, rate, dt) {
    const d = tmp.copy(target).sub(f.pos); if (d.lengthSq() < 0.01) return;
    const want = Math.atan2(d.x, d.z); const cur = f.g.rotation.y; const diff = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    f.g.rotation.y = cur + diff * Math.min(1, rate * dt);
  }
  function collide(f) {
    f.pos.x = clamp(f.pos.x, CUR.bounds.x0, CUR.bounds.x1); f.pos.z = clamp(f.pos.z, CUR.bounds.z0, CUR.bounds.z1);
    for (const [ox, oz, r] of OBST) { const dx = f.pos.x - ox, dz = f.pos.z - oz, d = Math.hypot(dx, dz), m = r + BODY_R; if (d < m && d > 0.001) { f.pos.x = ox + dx / d * m; f.pos.z = oz + dz / d * m; } }
  }
  const lying = (f) => ['down', 'ko', 'fall', 'getup'].includes(f.state);
  const held = (f) => f.state === 'clinch' || f.state === 'grabbed';
  function separate() {
    const all = [hero, ...foes];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const A = all[i], B = all[j]; if (held(A) && held(B) && (A.victim === B || B.victim === A)) continue;
      if (held(A) || held(B)) { if (A.victim === B || B.victim === A || A.grabber === B || B.grabber === A) continue; }
      const m = lying(A) || lying(B) ? 4 : BODY_R * 2;
      const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z, d = Math.hypot(dx, dz);
      if (d < m && d > 0.001) { const push = (m - d) / 2, ka = held(A) ? 0 : 1, kb = held(B) ? 0 : 1, k2 = 2 / Math.max(1, ka + kb); A.pos.x -= dx / d * push * ka * k2; A.pos.z -= dz / d * push * ka * k2; B.pos.x += dx / d * push * kb * k2; B.pos.z += dz / d * push * kb * k2; }
    }
  }
  // which opponent the player is fighting: the one he faces / pushes toward, sticky, never one lying down
  function pickTarget() {
    if (foes.length < 2) { hero.foe = foes[0]; return; }
    if (['attack', 'clinch', 'grabTry', 'toss', 'shoot', 'pickup'].includes(hero.state) && hero.foe.hp > 0) return;
    const al = alive(); if (!al.length) return;
    const mv = hero.move.lengthSq() > 0.05 ? tmp3.copy(hero.move).normalize() : hero.face;
    let best = null, bs = Infinity;
    for (const f of al) { const dx = f.pos.x - hero.pos.x, dz = f.pos.z - hero.pos.z, d = Math.max(0.01, Math.hypot(dx, dz)); let sc = d - 9 * ((dx * mv.x + dz * mv.z) / d); if (DOWNISH.includes(f.state)) sc += 30; if (f === hero.foe) sc -= 6; if (sc < bs) { bs = sc; best = f; } }
    hero.foe = best;
  }
  const PICK_R = 9.5;
  function nearestItem(f, maxD = PICK_R, anyDir = false) {
    let best = null, bs = Infinity; const fc = f.face;
    for (const it of items) { if (it.state !== 'ground') continue; const dx = it.mesh.position.x - f.pos.x, dz = it.mesh.position.z - f.pos.z, d = Math.hypot(dx, dz); if (d > maxD) continue;
      const dot = d > 0.01 ? (dx * fc.x + dz * fc.z) / d : 1; if (!anyDir && dot < -0.35 && d > 4.5) continue;   // behind him and not at his feet
      const sc = d - 4 * Math.max(0, dot); if (sc < bs) { bs = sc; best = it; } }
    return best;
  }
  const SPK = lowQ ? 110 : 180, sparkMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), SPK);
  sparkMesh.frustumCulled = false; sparkMesh.count = 0; scene.add(sparkMesh);
  const sparks = Array.from({ length: SPK }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, size: 1, grav: 0, drag: 0, grow: 0 })); let sparkNext = 0;
  const _sm = new THREE.Matrix4(), _sc = new THREE.Color(), _sp = new THREE.Vector3();
  function emit(p, n, o) {
    _sc.set(o.col);
    for (let i = 0; i < n; i++) { const s = sparks[sparkNext]; sparkNext = (sparkNext + 1) % SPK; s.p.copy(p); if (o.spread) { s.p.x += rand(-o.spread, o.spread); s.p.z += rand(-o.spread, o.spread); }
      s.v.set(rand(-1, 1), rand(o.upMin ?? -0.2, 1), rand(-1, 1)).normalize().multiplyScalar(o.speed * rand(0.5, 1)); if (o.dir) s.v.addScaledVector(o.dir, o.push || 0);
      s.life = s.max = o.life * rand(0.7, 1.15); s.size = o.size * rand(0.7, 1.3); s.grav = o.grav || 0; s.drag = o.drag || 0; s.grow = o.grow || 0; s.col = _sc.getHex(); }
  }
  // impact effects scale with the hit: light = a few sparks, heavy = sparks + sweat spray (head) or dust from the clothes (body)
  function fx(f, color, zone, strength = 1, dir = null) {
    f.rig.B[zone === 'head' ? 'head' : 'spine02'].getWorldPosition(_sp);
    emit(_sp, Math.round(4 + 5 * strength), { col: color, speed: 10 + 8 * strength, life: 0.22, size: 0.9, drag: 3, dir, push: 6 });
    if (zone === 'head' && strength >= 1) emit(_sp, Math.round(4 * strength), { col: '#e8eef2', speed: 7, life: 0.5, size: 0.7, grav: 30, dir, push: 9 });
    if (zone !== 'head' && strength >= 1) emit(_sp, Math.round(3 * strength), { col: '#b8a184', speed: 3, life: 0.6, size: 2.2, grow: 2.5, drag: 2, dir, push: 3 });
  }
  function dust(p, n, big) { emit(_sp.set(p.x, 0.6, p.z), n, { col: '#a08a6a', speed: big ? 7 : 4, upMin: 0, life: big ? 0.9 : 0.6, size: big ? 3.2 : 2.2, grow: 2.2, drag: 2.5, spread: big ? 3 : 1.5 }); }

  function knockDown(f, dir, power) {
    if (f.item) drop(f);
    const fromBehind = f.face.dot(dir) > 0.2;          // hit in the back -> falls on the face
    f.g.rotation.y = Math.atan2(-dir.x, -dir.z) + (fromBehind ? Math.PI : 0);
    f.fallKind = fromBehind ? 'face' : 'back';
    f.set('fall');
    if (fromBehind) f.anim.play('fallFace', { start: 0.25, speed: 1.15, fade: 0.08, restart: true });
    else f.anim.play('koBack', { start: 0.15, speed: 1.1, fade: 0.06, restart: true, rootMotion: true });
    f.vel.copy(dir).multiplyScalar(power * 0.6); f.invuln = 3; camShake = Math.max(camShake, 0.3); match.hype = Math.min(100, match.hype + 12);
    setTimeout(() => { sfx('fall'); dust(f.pos, lowQ ? 8 : 14, true); camShake = Math.max(camShake, 0.28); }, fromBehind ? 650 : 900);
  }
  function damage(att, f, dmg, dir, a) {
    const facingAtt = f.face.dot(tmp.copy(dir).negate()) > 0.2;
    const zone = a.zone || 'head';
    const wpn = a.kind === 'swing' && att.item && !ITEMS[att.item.kind].ranged;
    const guardBreak = wpn && (att.item.kind === 'chair' || a.wv === 'over');   // a chair or an overhead stick chop goes through the guard
    if (f.state === 'block' && facingAtt && !guardBreak) {
      const chip = (att.rage > 0 ? 0.25 : 0.12) + (wpn ? 0.18 : 0);
      f.hp = Math.max(0, f.hp - dmg * chip); if (f.hp <= 0) { knockDown(f, dir, 12); return true; }
      f.haiba = Math.min(100, f.haiba + 6); sfx(wpn ? 'wood' : 'block'); fx(f, '#9fd0ff', 'chest', wpn ? 1 : 0.6, dir); f.hitReact(dir, wpn ? 0.7 : 0.35, 'chest');
      // the guard is driven back: a heavy blow (weapon, kick, rage) costs a short block-stun and a slide
      const heavyB = wpn || a.kind === 'kick' || att.rage > 0;
      f.vel.add(tmp2.copy(dir).multiplyScalar(heavyB ? 16 : 7));
      if (heavyB) { f.set('hit'); f.hitStun = 0.3; f.blockStun = true; f.anim.play('block', { hold: 0.36, fade: 0.04 }); }
      if (f.isAI) f.ai.counterT = 0.35;                 // a blocked blow is the opening for a counter
      hitstop = wpn ? 0.06 : 0.045; hitstopWho = att; camShake = Math.max(camShake, wpn ? 0.12 : 0.06); ui.pop(f === hero ? 'صدّ!' : 'صدّها!', f === hero ? 'r' : 'l'); return false;
    }
    const rageOut = att.rage > 0 ? 1.45 : 1, rageIn = f.rage > 0 ? 0.7 : 1;
    // combos lose force hit by hit (a man being hit rides the blows), opponents get tougher with level
    const comboK = att.comboT > 0 && att.combo > 0 ? Math.max(0.55, Math.pow(0.88, att.combo)) : 1;
    const tough = f.isAI ? (f.spec && f.spec.tough) || 1 : 1;
    const mult = (1 + match.hype / 400) * (att.isAI ? (att.dmgK ?? LV.dmg) : 0.88 * (LO.halawa ? 1.12 : 1)) * rageOut * rageIn * comboK * tough * (a.wmul || 1) * (wpn && att.isAI ? 0.8 : 1) * (guardBreak && f.state === 'block' ? 0.6 : 1);
    const total = dmg * mult;
    f.recent = (f.recentT > 0 ? f.recent : 0) + 1; f.recentT = 1.4;
    f.hp = Math.max(0, f.hp - total); if (att.rage <= 0) att.haiba = Math.min(100, att.haiba + dmg * (att.isAI ? 0.9 : 0.7)); f.haiba = Math.min(100, f.haiba + dmg * 0.35);
    match.hype = Math.min(100, match.hype + dmg * 0.8);
    att.combo = (att.comboT > 0 ? att.combo : 0) + 1; att.comboT = 1.2;
    if (att === hero) { MS.hits++; MS.bestCombo = Math.max(MS.bestCombo, att.combo); }
    if (att === hero && att.combo > 1) ui.pop(att.combo + ' ضربات', 'l');
    // strength tier drives everything the player feels: sparks, sound, freeze, camera
    const tier = total < 7 ? 0.6 : total < 11.5 ? 1 : 1.6;
    fx(f, att.rage > 0 ? '#ffb070' : '#ffd890', zone, wpn ? Math.max(1, tier) : tier, dir);
    if (!(a.kind === 'swing' || a.kind === 'throw')) sfx(zone === 'head' ? (tier > 1 ? 'headHeavy' : 'head') : 'body');
    camShake = Math.max(camShake, 0.05 + 0.13 * tier * tier); hitstop = tier < 1 ? 0.045 : tier < 1.5 ? 0.07 : 0.1; hitstopWho = att;
    let downChance = wpn ? ITEMS[att.item.kind].down * (a.wv === 'over' ? 1.4 : a.wv === 'poke' ? 0.4 : 1) : (a.down || 0);
    if (f.rage > 0) downChance *= 0.35;
    if (att.rage > 0) downChance = Math.min(1, downChance * 1.5);
    const skill = f.isAI && f.spec ? f.spec.skill || 0 : 0;
    if (f.hp <= 0 || Math.random() < downChance || f.recent >= (f.rage > 0 ? 7 : 5)) { f.recent = 0; if (att === hero) MS.kos++; knockDown(f, dir, ((a.knock || 14) + 6) * rageOut); if (f.hp <= 0) slowmo = Math.max(slowmo, 0.7); }
    else if (f.rage > 0 && tier < 1.5) {
      // futuwwa armour: light and medium blows do not interrupt him, the body still takes the hit
      f.hitReact(dir, 0.6 * tier, zone, a.kind); f.vel.add(tmp2.copy(dir).multiplyScalar((a.knock || 8) * 0.3));
    } else {
      if (f.item && Math.random() < (f.isAI && isStick(f.item.kind) ? 0.05 : 0.2)) drop(f);
      const heavy = wpn || (!a.light && (total >= 10 || f.recent >= 3));
      // stun = how long he cannot act (the reaction clip keeps playing and blends out after); it shrinks with the opponent's skill
      const stunK = (f.isAI ? 1 - 0.4 * skill : 1) * (att.rage > 0 ? 1.25 : 1);
      if (heavy && f.hp < (f.hpMax || 100) * 0.28 && Math.random() < 0.45) {   // hurt and hit hard: dazed, wobbling on his feet
        f.anim.play('bruised', { loop: true, speed: 0.8, fade: 0.08, restart: true }); f.hitStun = 0.75 * stunK; f.dazed = true; ui.pop(f === hero ? 'دايخ!' : 'داخ!', f === hero ? 'r' : 'l');
      } else if (heavy && Math.random() < (wpn ? 0.7 : 0.5)) {      // stagger: real stumble, travels with the body
        f.g.rotation.y = Math.atan2(-dir.x, -dir.z);
        f.anim.play('stumble', { speed: 1.35, fade: 0.06, restart: true, rootMotion: true }); f.hitStun = 0.8 * stunK;
      } else {
        const clip = zone === 'head' ? 'hitHead' : 'hitBody';
        f.anim.play(clip, { speed: a.light ? 1.45 : 1.1, fade: 0.03, restart: true });
        f.hitStun = (a.stun || 0.35) * (a.light ? 0.85 : 1) * stunK;
      }
      f.set('hit'); f.vel.add(tmp2.copy(dir).multiplyScalar((a.knock || 8) * rageOut * (wpn ? 1.3 : 1))); f.hitReact(dir, wpn ? 1.8 : a.light ? 0.8 : 1.4, zone, a.kind === 'swing' ? (a.wv === 'side' ? 'hookR' : a.wv === 'over' ? 'upper' : '') : a.kind);
      // a beaten man covers up: after a few clean hits in a row he gets his guard up (or slips out) instead of eating the whole combo
      if (f.isAI && f.recent >= (skill > 0.5 ? 2 : 3) && Math.random() < 0.3 + 0.6 * skill) { f.hitStun = Math.min(f.hitStun, 0.2); f.ai.cover = Math.random() < 0.3 + 0.3 * skill ? 'dodge' : 'block'; }
    }
    if (Math.random() < 0.35) shout();
    return true;
  }

  // ------------------------------------------------------------ grappling
  // reach (mocap lean-in) -> contact check when the hands arrive -> success: paired clinch captured from two people, then a throw
  // resisted: short struggle and they break apart; missed: he grabs air and catches his balance (never falls)
  const PAIR = (() => { const r = CL.pullB.root; return new THREE.Vector3(r[0], 0, r[2]); })();   // B relative to A at clinch start
  const GRAB = { reachT: 0.2, range: 10.5, cos: 0.55, t0: 0.15, struggle: 0.55, hold: 1.05, escape: 4 };
  const _up = new THREE.Vector3(0, 1, 0);
  function rootOf(name, t) { const c = CL[name], i = Math.min(c.n - 1, Math.round(t * c.fps)); return new THREE.Vector3(c.root[i * 3], 0, c.root[i * 3 + 2]); }
  function grabTry(f) {
    if (f.item) drop(f);
    f.set('grabTry'); f.grabChecked = false;
    f.anim.play('grabReach', { start: 0.25, speed: 1.5, fade: 0.08, restart: true, rootMotion: true });
    sfx('whoosh');
  }
  function grabCheck(f) {
    const o = f.foe, to = tmp.copy(o.pos).sub(f.pos).setY(0), d = to.length(); to.normalize();
    const ok = d <= GRAB.range && f.face.dot(to) >= GRAB.cos && !DOWNISH.includes(o.state) && !['clinch', 'grabbed', 'grabTry', 'dodge'].includes(o.state) && o.invuln <= 0;
    f.lastGrab = ok ? 'contact' : 'miss';
    if (!ok) {
      f.set('recover'); f.recoverT = 0.42; f.anim.play('hitBody', { speed: 0.75, fade: 0.12, restart: true }); sfx('miss');
      ui.pop(f === hero ? 'مسكة فاضية' : 'فلتّ منه!', f === hero ? 'l' : 'r'); return;
    }
    let resist = o.state === 'block' ? 0.6 : 0.2; if (o.rage > 0) resist += 0.3; if (f.rage > 0) resist -= 0.25;
    const mode = o === hero ? 'hold' : (Math.random() < resist ? 'resist' : 'hold');   // the player escapes by tapping instead
    startClinch(f, o, mode);
  }
  function startClinch(a, v, mode) {
    const toV = tmp.copy(v.pos).sub(a.pos).setY(0); const d = Math.max(0.01, toV.length()); toV.divideScalar(d);
    const yaw = Math.atan2(toV.x, toV.z) - Math.atan2(PAIR.x, PAIR.z);
    const off = PAIR.clone().applyAxisAngle(_up, yaw);
    const rA = rootOf('pullA', GRAB.t0).applyAxisAngle(_up, yaw), rB = rootOf('pullB', GRAB.t0).applyAxisAngle(_up, yaw);
    // both bodies slide half of the distance error along the line between them (no teleport), then follow the captured pair
    const half = (PAIR.length() - d) / 2;
    // group origins such that each body appears exactly where it stands now, then both converge on the captured spacing
    a.clinchTo = a.pos.clone().addScaledVector(toV, -half).sub(rA);
    a.clinchFrom = a.pos.clone().sub(rA); v.clinchFrom = v.pos.clone().sub(rB); v.clinchTo = a.clinchTo;
    a.g.rotation.y = yaw; v.g.rotation.y = yaw; v.pos.copy(v.clinchFrom);
    if (v.item) drop(v); if (a.item) drop(a);
    a.set('clinch'); v.set('grabbed'); v.grabber = a; a.victim = v; a.clinchMode = mode; v.escape = 0;
    a.anim.play('pullA', { start: GRAB.t0, speed: 1.25, fade: 0.1, restart: true, snapRoot: true });
    v.anim.play('pullB', { start: GRAB.t0, speed: 1.25, fade: 0.1, restart: true, snapRoot: true });
    v.anim.update(0, true); a.anim.update(0, true);
    sfx('body'); camShake = Math.max(camShake, 0.15); banner(a === hero ? 'مسكة!' : 'مسكك!', 600);
    if (v === hero) ui.pop('دوس بسرعة عشان تفلت!', 'r');
  }
  function bakeBoth(a, v) {
    a.pos.add(a.anim.bakeRoot().applyAxisAngle(_up, a.g.rotation.y));
    v.pos.add(v.anim.bakeRoot().applyAxisAngle(_up, v.g.rotation.y));
  }
  function breakClinch(a, why) {
    const v = a.victim; if (!v) return; a.victim = null; v.grabber = null;
    bakeBoth(a, v);
    const dir = tmp2.copy(v.pos).sub(a.pos).setY(0).normalize();
    a.vel.addScaledVector(dir, -11); v.vel.addScaledVector(dir, 11);
    a.set('recover'); a.recoverT = 0.45; a.anim.play('hitBody', { speed: 0.8, fade: 0.12, restart: true });
    v.set('idle'); v.invuln = 0.4; v.anim.play('guard', { loop: true, fade: 0.2 });
    sfx('escape'); ui.pop(v === hero ? 'فلتّ!' : 'فلت منك!', v === hero ? 'r' : 'l'); a.lastGrab = why;
  }
  function endClinch(a) {
    const v = a.victim; if (!v) return; a.victim = null; v.grabber = null;
    bakeBoth(a, v);
    const dir = tmp2.copy(v.pos).sub(a.pos).setY(0).normalize();
    const mul = a.rage > 0 ? 1.45 : 1;
    v.hp = Math.max(0, v.hp - 14 * mul * (1 + match.hype / 400)); if (a.rage <= 0) a.haiba = Math.min(100, a.haiba + 18); match.hype = Math.min(100, match.hype + 15);
    v.set('idle'); knockDown(v, dir.clone(), 22); hitstop = 0.1; hitstopWho = a; fx(v, '#ffd08a', 'chest', 1.6, dir); sfx('body'); shout();
    a.set('idle'); a.anim.play('guard', { loop: true, fade: 0.3 }); a.lastGrab = 'throw'; if (a === hero) { MS.grabs++; MS.kos++; }
  }
  function updateClinch(a) {
    const v = a.victim; if (!v) { a.set('idle'); return; }
    const k = Math.min(1, a.st / 0.15), e = k * k * (3 - 2 * k);
    a.pos.lerpVectors(a.clinchFrom, a.clinchTo, e); v.pos.lerpVectors(v.clinchFrom, v.clinchTo, e);
    if (v.escape >= GRAB.escape) breakClinch(a, 'escaped');
    else if (a.clinchMode === 'resist' && a.st >= GRAB.struggle) breakClinch(a, 'resisted');
    else if (a.st >= GRAB.hold) endClinch(a);
  }

  // ------------------------------------------------------------ futuwwa mode (the F button)
  // full haiba -> 7 s of power: x1.45 damage and knockback, longer stun on the opponent, armour against light/medium blows,
  // x0.7 damage taken, knockdowns 1/3 as likely; no haiba gain while active; 10 s cooldown afterwards
  const RAGE = { dur: 7, cd: 10 };
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 20, 64, 64, 64); g.addColorStop(0, 'rgba(255,120,30,0)'); g.addColorStop(0.55, 'rgba(255,140,40,0.75)'); g.addColorStop(0.75, 'rgba(255,200,90,0.9)'); g.addColorStop(1, 'rgba(255,120,30,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  function attachRing(f) { const r = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), ringMat); r.rotation.x = -Math.PI / 2; r.position.y = 0.08; r.visible = false; f.g.add(r); f.ring = r;
    if (f.isAI) { const mk = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 8.4), new THREE.MeshBasicMaterial({ map: markTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.6 })); mk.rotation.x = -Math.PI / 2; mk.position.y = 0.07; mk.renderOrder = 2; f.g.add(mk); f.mark = mk; } }
  // opponents are marked so they never get lost in the crowd: a red ring on the ground and a futuwwa head wrap (no spectator wears one)
  const markTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.lineWidth = 9; x.strokeStyle = 'rgba(40,0,0,0.55)'; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.stroke(); x.lineWidth = 5; x.strokeStyle = '#ff3b2a'; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; x.fillStyle = '#ff3b2a'; x.beginPath(); x.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); x.lineTo(64 + Math.cos(a + 0.12) * 58, 64 + Math.sin(a + 0.12) * 58); x.lineTo(64 + Math.cos(a - 0.12) * 58, 64 + Math.sin(a - 0.12) * 58); x.fill(); } return new THREE.CanvasTexture(c); })();
  const wrapTex = {}; const wrapT = (a, b) => { const k = a + b; if (wrapTex[k]) return wrapTex[k]; const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'); x.fillStyle = a; x.fillRect(0, 0, 128, 32); x.fillStyle = b; for (let i = 0; i < 128; i += 16) { x.save(); x.translate(i, 0); x.rotate(0.5); x.fillRect(0, -10, 3, 60); x.restore(); } x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, 26, 128, 6); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 3; return (wrapTex[k] = t); };
  function dressFoe(f, idx, boss) {
    if (f.wrap) f.wrap.removeFromParent();
    const [a, b] = boss ? ['#1c1a18', '#8a1a14'] : idx ? ['#7a1e1a', '#e8d8b0'] : ['#ece6d8', '#a8987a'];
    const m = new THREE.MeshStandardMaterial({ map: wrapT(a, b), roughness: 0.92 }), g = new THREE.Group();
    const t1 = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.34, 8, 24), m); t1.rotation.x = Math.PI / 2; t1.scale.set(1, 1.1, 1); g.add(t1);
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.3, 8, 22), m); t2.rotation.set(Math.PI / 2 + 0.18, 0, 0.1); t2.position.set(0, 0.34, -0.05); g.add(t2);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.92, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m); cap.scale.set(1, 0.62, 1.05); cap.position.y = 0.26; g.add(cap);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.12), m); tail.position.set(0.5, -0.45, -0.95); tail.rotation.set(0.25, 0, -0.2); g.add(tail);   // loose end hanging at the back
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.position.set(0, 1.72, 0.08); f.rig.B.head.add(g); f.wrap = g;
  }
  attachRing(hero); attachRing(foe);
  function rageState(f) { return f.rage > 0 ? 'active' : f.rageCD > 0 ? 'cool' : f.haiba >= 100 ? 'ready' : 'charging'; }
  function activateRage(f) {
    if (rageState(f) !== 'ready' || DOWNISH.includes(f.state) || f.state === 'clinch') return false;
    f.rage = RAGE.dur + (f === hero && LO.sebha ? 3 : 0); f.haiba = 0; f.ring.visible = true; if (f === hero) MS.rage++;
    slowmo = Math.max(slowmo, 0.35); camShake = Math.max(camShake, 0.35); sfx('rage'); sfx('crowd'); match.hype = Math.min(100, match.hype + 20);
    f.g.getWorldPosition(_sp); dust(f.pos, 10, true); emit(_sp.set(f.pos.x, 9, f.pos.z), 14, { col: '#ffb050', speed: 12, life: 0.5, size: 1.1, drag: 2 });
    banner(f === hero ? 'وضع الفتوة!' : f.name + ' قلب!', 1100);
    return true;
  }
  function updateRage(f, dt) {
    if (f.rage > 0) {
      f.rage -= dt;
      const pulse = 0.75 + 0.25 * Math.sin(time * 10);
      f.setRageLook(0.55 * pulse); f.ring.scale.setScalar(0.9 + 0.12 * Math.sin(time * 8));
      f.emberT = (f.emberT || 0) - dt; if (f.emberT <= 0) { f.emberT = lowQ ? 0.12 : 0.06; f.rig.B.spine02.getWorldPosition(_sp); _sp.x += rand(-2, 2); _sp.z += rand(-2, 2); _sp.y += rand(-4, 5); emit(_sp, 1, { col: '#ff9a3c', speed: 2, upMin: 0.8, life: 0.8, size: 0.6, grav: -6, drag: 1 }); }
      if (f.rage <= 0) { f.rage = 0; f.rageCD = RAGE.cd; f.setRageLook(0); f.ring.visible = false; if (f === hero) ui.pop('الفتوة خلصت', 'l'); }
    } else if (f.rageCD > 0) f.rageCD = Math.max(0, f.rageCD - dt);
  }
  // ------------------------------------------------------------ actions
  function canAct(f, act) {
    if (act === 'punch' || act === 'kick') return !f.busy() || f.state === 'attack';
    return !f.busy();
  }
  function doAction(f, act) {
    if (match.state !== 'fight') return;
    if (act === 'punch') { const nk = f.state === 'attack' && f.att && f.att.next ? f.att.next : 'jab'; f.attack(nk); }
    if (act === 'kick') f.attack('kick');
    if (act === 'grab' && !f.busy() && f.state !== 'block') grabTry(f);
    if (act === 'dodge' && !f.busy()) {
      f.set('dodge'); f.invuln = 0.55; f.anim.play('duck', { speed: 1.8, fade: 0.06, restart: true });
      const side = new THREE.Vector3(-f.face.z, 0, f.face.x);
      const d = f.move.lengthSq() > 0.01 ? f.move.clone().normalize() : side.multiplyScalar(Math.random() < 0.5 ? 1 : -1);
      f.vel.copy(d.multiplyScalar(26));
    }
    if (act === 'item' && !f.busy()) {
      if (f.item && ITEMS[f.item.kind].ranged && f.item.dur > 0) {
        // slingshot: aim like a throw (assist inside 20 degrees), then a quick draw-and-release
        const aim = (f === hero && hero.move.lengthSq() > 0.09) ? hero.move.clone().setY(0).normalize() : f.face.clone();
        const to = tmp.copy(f.foe.pos).sub(f.pos).setY(0); const dist = to.length(); to.normalize();
        f.aimAssist = f.isAI || (aim.dot(to) > Math.cos(20 * Math.PI / 180) && dist < 80);
        f.aimDir = f.aimAssist ? to.clone() : aim; f.g.rotation.y = Math.atan2(f.aimDir.x, f.aimDir.z);
        f.set('shoot'); f.shot = false; f.anim.play('throw', { speed: 2.3, start: 0.38, fade: 0.06, restart: true }); sfx('stretch');
      } else if (f.item) {
        // aim: the stick direction (or where he faces); a gentle assist only when the opponent is within 20 degrees of it
        const aim = (f === hero && hero.move.lengthSq() > 0.09) ? hero.move.clone().setY(0).normalize() : f.face.clone();
        const to = tmp.copy(f.foe.pos).sub(f.pos).setY(0); const dist = to.length(); to.normalize();
        f.aimAssist = f.isAI || (aim.dot(to) > Math.cos(20 * Math.PI / 180) && dist < 70);
        f.aimDir = f.aimAssist ? to.clone() : aim; f.g.rotation.y = Math.atan2(f.aimDir.x, f.aimDir.z);
        f.set('toss'); f.tossed = false; f.anim.play('throw', { speed: 1.4, fade: 0.08, restart: true });
      }
      else { const it = nearestItem(f); if (it) { f.set('pickup'); f.pickTarget = it; f.anim.play('pickup', { speed: 2.1, fade: 0.08, restart: true }); } }
    }
    if (act === 'finisher') activateRage(f);
  }

  // ------------------------------------------------------------ AI
  // duel: the classic loop. two opponents: one holds the "turn" and engages, the other circles to the player's other side,
  // throws or shoots from range and only fights at close quarters, so the player is surrounded but never hit by two combos at once
  let turnT = 0, attacker = null;
  function updateDuo(dt) {
    const al = alive(); if (al.length < 2) { attacker = al[0] || null; return; }
    turnT -= dt;
    const unable = !attacker || attacker.hp <= 0 || DOWNISH.includes(attacker.state);
    if (unable || turnT <= 0) { const other = al.find(f => f !== attacker) || al[0]; attacker = unable || Math.random() < 0.7 ? other : attacker; turnT = 3.5 + Math.random() * 3.5; }
  }
  // what a fighter sees: the player's blow starting (once per blow) -> block or slip after his reaction time, if that is before impact;
  // the player's blow missing at close range -> punish it
  function perceive(f, dt) {
    const ai = f.ai, o = f.foe, sk = (f.spec && f.spec.skill) || 0, d = f.pos.distanceTo(o.pos);
    if (o.state === 'attack' && o.att && o.att !== ai.seen && (o.foe === f || foes.length === 1)) {
      ai.seen = o.att;
      if (d < (o.att.reach || 10) + 3 && Math.random() < ai.block) ai.defend = { t: ai.react * 0.55 + Math.random() * 0.06, kind: Math.random() < ai.dodge * 0.55 ? 'dodge' : 'block', att: o.att };
    }
    if (ai.defend) { ai.defend.t -= dt; if (ai.defend.t <= 0) { const df = ai.defend; ai.defend = null;
      if (o.state === 'attack' && o.att === df.att && o.st < o.att.impact && (!f.busy() || f.state === 'block')) { if (df.kind === 'dodge' && f.state !== 'block') doAction(f, 'dodge'); else { f.set('block'); ai.blockT = 0.4 + 0.2 * Math.random(); } } } }
    if (o.state === 'attack' && o.att && o.att.reach && !o.hitDone && o.st > o.att.impact + 0.06 && ai.punished !== o.att && d < 12 && !f.busy() && f.state !== 'block') {
      ai.punished = o.att; if (Math.random() < 0.25 + 0.6 * sk) { f.attack(Math.random() < 0.55 ? 'jab' : 'hookR'); ai.q = [{ t: 0.3, act: 'punch' }]; } }
  }
  function updateAI(f, dt) {
    const o = f.foe, ai = f.ai; f.move.set(0, 0, 0);
    if (match.state !== 'fight' || f.hp <= 0) return;
    // queued follow-up presses (combos) run in game time
    if (ai.q && ai.q.length) { for (const q of ai.q) q.t -= dt; while (ai.q.length && ai.q[0].t <= 0) { const q = ai.q.shift(); if (canAct(f, q.act)) doAction(f, q.act); } }
    if (ai.counterT > 0) ai.counterT -= dt;
    if (!DOWNISH.includes(o.state)) perceive(f, dt);
    if (f.busy() && f.state !== 'block') return;
    ai.think -= dt; ai.retreat -= dt; ai.shootCD -= dt; f.recovered = Math.max(0, (f.recovered || 0) - dt);
    const d = f.pos.distanceTo(o.pos);
    const toO = tmp.copy(o.pos).sub(f.pos).setY(0).normalize();
    const side = new THREE.Vector3(-toO.z, 0, toO.x);
    if (f.state === 'block') {
      // counter off the block: the moment the player's blow is spent, fire back
      if (ai.counterT > 0 && o.state !== 'attack' && d < 11.5 && Math.random() < 0.4 + 0.5 * ((f.spec && f.spec.skill) || 0)) { ai.counterT = 0; f.set('idle'); f.attack('jab'); ai.q = [{ t: 0.26, act: 'punch' }, { t: 0.56, act: 'punch' }]; return; }
      if (ai.blockT > 0) { ai.blockT -= dt; return; } f.set('idle'); }
    const oAttacking = o.state === 'attack' && o.att && o.st < o.att.impact && o.foe === f;
    if (DOWNISH.includes(o.state) && o.grabber !== f) { if (d < 16) f.move.copy(toO).negate().addScaledVector(side, 0.5).normalize().multiplyScalar(0.6); else if (Math.random() < 0.01 && f.state !== 'taunt') { f.set('taunt'); f.anim.play('angry1', { loop: true, fade: 0.3 }); } return; }
    if (f.state === 'taunt') f.set('idle');
    const ranged = f.item && ITEMS[f.item.kind].ranged;
    const flank = foes.length > 1 && alive().length > 1 && attacker !== f;
    // slingshot: keep range and shoot; fists when the player gets close
    if (ranged && d > 15 && d < 62 && ai.shootCD <= 0 && !flank || ranged && flank && d > 15 && d < 62 && ai.shootCD <= 0) { ai.shootCD = 2.6 - 1.2 * ai.aggr + Math.random() * 1.0; f.g.rotation.y = Math.atan2(toO.x, toO.z); doAction(f, 'item'); return; }
    if (flank && d <= 13 && o.foe !== f && attacker && attacker.pos.distanceTo(o.pos) < 14 && ai.retreat <= 0) { ai.retreat = 0.7 + Math.random() * 0.5; }
    if (flank && ai.retreat > 0 && o.foe !== f) { const away = tmp2.copy(f.pos).sub(o.pos).setY(0).normalize(); f.move.copy(away).addScaledVector(side, ai.circle * 0.6).normalize(); return; }
    if (flank && d > 12) {
      // circle to the far side of the player from his partner, ~22 away; pick up something to throw now and then
      if (o.state === 'grabbed') { f.move.set(0, 0, 0); return; }
      const mate = attacker, away = tmp2.copy(o.pos).sub(mate ? mate.pos : f.pos).setY(0); if (away.lengthSq() < 0.01) away.copy(side); away.normalize();
      const ang = ai.circle * 0.9, ca = Math.cos(ang), sa = Math.sin(ang);
      const want = new THREE.Vector3(o.pos.x + (away.x * ca - away.z * sa) * 22, 0, o.pos.z + (away.x * sa + away.z * ca) * 22);
      if (ai.goal && ai.goal.state !== 'ground') ai.goal = null;
      if (ai.goal) { const gp = ai.goal.mesh.position; const gd = Math.hypot(gp.x - f.pos.x, gp.z - f.pos.z); f.move.set(gp.x - f.pos.x, 0, gp.z - f.pos.z).normalize(); if (gd < 6) { doAction(f, 'item'); ai.goal = null; } return; }
      const wd = Math.hypot(want.x - f.pos.x, want.z - f.pos.z); if (wd > 4) f.move.set(want.x - f.pos.x, 0, want.z - f.pos.z).normalize().multiplyScalar(wd > 14 ? 1 : 0.5);
      if (ai.think > 0) return; ai.think = 0.5 + Math.random() * 0.6;
      if (f.item && !ranged && ITEMS[f.item.kind].throwDmg && !isStick(f.item.kind) && d > 14 && d < 40 && Math.random() < 0.5) { doAction(f, 'item'); return; }
      if (!f.item && Math.random() < 0.25) { const it = nearestItem(f, 34, true); if (it && it.mesh.position.distanceTo(f.pos) < it.mesh.position.distanceTo(o.pos)) ai.goal = it; }
      if (Math.random() < 0.08 && f.state !== 'taunt') { f.set('taunt'); f.anim.play(pickOne(['angry1', 'angryTalk']), { loop: true, fade: 0.3 }); }
      return;
    }
    if (f.recovered > 0 && ranged) { f.recovered = 0; if (Math.random() < 0.6) { doAction(f, 'dodge'); ai.retreat = 0.8; return; } }
    if (f.recovered > 0) { f.recovered = 0; const r0 = Math.random(); if (oAttacking && r0 < 0.5) { f.set('block'); ai.blockT = 0.55; return; } if (d < 11 && r0 < 0.8) { f.attack(Math.random() < 0.6 ? 'jab' : 'hookR'); return; } doAction(f, 'dodge'); return; }
    if (ai.goal && ai.goal.state !== 'ground') ai.goal = null;
    if (ai.goal) { const gp = ai.goal.mesh.position; const gd = Math.hypot(gp.x - f.pos.x, gp.z - f.pos.z); f.move.set(gp.x - f.pos.x, 0, gp.z - f.pos.z).normalize(); if (gd < 6) { doAction(f, 'item'); ai.goal = null; } return; }
    if (ai.retreat > 0) { f.move.copy(toO).negate().addScaledVector(side, ai.circle * 0.8).normalize(); return; }
    const ideal = ranged ? 26 : f.item ? 11 : 9.5;
    if (ranged && d < 15 && ai.think <= 0 && Math.random() < 0.55) { ai.think = ai.react; if (Math.random() < ai.dodge) doAction(f, 'dodge'); else ai.retreat = 0.8 + Math.random() * 0.4; return; }
    if (ai.think > 0) { if (d > ideal + 1.5) f.move.copy(toO).addScaledVector(side, ai.circle * 0.3).normalize(); else if (d < BODY_R * 2 + 0.6) f.move.copy(toO).negate(); else if (Math.random() < 0.5) f.move.copy(side).multiplyScalar(ai.circle * 0.6); return; }
    const sk = (f.spec && f.spec.skill) || 0;
    ai.think = ai.react + Math.random() * (0.3 - 0.2 * sk);
    // a player hiding behind his guard gets grabbed (a grab beats a block)
    if (o.state === 'block' && d < 10.5 && !f.item && Math.random() < 0.2 + 0.5 * sk) { doAction(f, 'grab'); return; }
    if (Math.random() < 0.08) ai.circle *= -1;
    if (f.item && f.item.kind === 'qulla' && d > 14 && d < 40) { doAction(f, 'item'); return; }
    // armed opponents go back for their own weapon when they lose it
    if (!f.item && f.weaponIt && f.weaponIt.state === 'ground' && items.includes(f.weaponIt) && f.weaponIt.mesh.position.distanceTo(f.pos) < 40 && Math.random() < 0.45) { ai.goal = f.weaponIt; return; }
    if (!f.item && Math.random() < 0.1 + 0.15 * sk) { const it = nearestItem(f, 30, true); if (it && it.mesh.position.distanceTo(f.pos) < it.mesh.position.distanceTo(o.pos)) { ai.goal = it; return; } }
    if (ai.rage && rageState(f) === 'ready' && d < 16) { activateRage(f); return; }
    if (f.recent >= 2 && oAttacking && Math.random() < 0.6) { if (Math.random() < 0.5) { f.set('block'); ai.blockT = 0.6; } else doAction(f, 'dodge'); return; }
    if (o.state === 'attack' && o.att && o.st > o.att.impact && d < 13 && Math.random() < 0.3 + 0.5 * sk) { f.attack(Math.random() < 0.5 ? 'jab' : 'cross'); ai.q = [{ t: 0.28, act: 'punch' }]; return; }
    if (oAttacking && d < 13 && Math.random() < ai.block) { if (Math.random() < ai.dodge * 0.5) doAction(f, 'dodge'); else { f.set('block'); ai.blockT = 0.5; } return; }
    if (f.hp < f.hpMax * 0.3 && Math.random() < 0.12) { ai.retreat = 0.9; return; }
    if (d < (ranged ? 10.5 : ideal + 1.2)) {
      if (Math.random() < ai.aggr) {
        const r = Math.random();
        if (f.item && !ranged) { doAction(f, 'punch'); if (Math.random() < ai.combo * 0.5) ai.q = [{ t: 0.55 + Math.random() * 0.2, act: 'punch' }]; }
        else if (r < 0.42) { doAction(f, 'punch'); ai.q = []; if (Math.random() < 0.3 + ai.combo * 0.5) ai.q.push({ t: 0.3, act: 'punch' }); if (Math.random() < ai.combo * 0.45) ai.q.push({ t: 0.62, act: 'punch' }); if (Math.random() < ai.combo * 0.3) ai.q.push({ t: 0.95, act: Math.random() < 0.5 ? 'punch' : 'kick' }); }
        else if (r < 0.62) doAction(f, 'kick');
        else if (r < 0.76) doAction(f, 'grab');
        else if (r < 0.88) f.attack('hookR');
        else f.attack('body');
      } else if (Math.random() < 0.3 * (1 - sk)) ai.retreat = 0.45; else ai.think *= 0.5;
    } else if (!ranged || d > ideal + 6) f.move.copy(toO).addScaledVector(side, ai.circle * 0.3).normalize();
    else if (d < ideal - 6) f.move.copy(toO).negate().addScaledVector(side, ai.circle * 0.5).normalize();
    else f.move.copy(side).multiplyScalar(ai.circle * 0.7);
  }

  // ------------------------------------------------------------ fighter update
  const camDir = new THREE.Vector3(), camRight = new THREE.Vector3(), _ax = new THREE.Vector3(), _n = new THREE.Vector3(), _want = new THREE.Vector3(), _pv = new THREE.Vector3();
  const STEP = { F: ['stepF0', 'stepF1'], B: ['stepB0', 'stepB1'], L: ['stepL0'], R: ['stepR0', 'stepR1'] };
  function stepDir(f, mv) { const face = f.face, fw = mv.dot(face), lt = mv.x * face.z - mv.z * face.x; return Math.abs(fw) >= Math.abs(lt) * 0.9 ? (fw > 0 ? 'F' : 'B') : (lt > 0 ? 'L' : 'R'); }
  // movement: inside fighting range -> real boxing footwork (root motion); outside -> walk (light push) or run (full push)
  // with acceleration, turning that sheds speed, and the cycle rate locked to the ground speed (no sliding / running on the spot)
  const MOVE = { walk: 10, run: 34, runAI: 27, hurt: 12, two: 18, acc: 140, dec: 180, turn: 16, fightRange: 10, stopTravel: 8.5 };
  function locomote(f, dt, frozen) {
    const mv = f.move, o = f.foe; const d = f.pos.distanceTo(o.pos);
    const has = mv.lengthSq() > 0.02, mag = Math.min(1, mv.length());
    const close = !DOWNISH.includes(o.state) && (f.state === 'walk' ? d < MOVE.stopTravel : d < MOVE.fightRange);
    if (f.state === 'step') {
      // a step can be redirected or stopped once the weight has moved, and chains into the next at 70 %
      const k = has ? stepDir(f, mv) : null, p = f.anim.time / f.anim.dur;
      if (!has && p < 0.4) return;
      if (!has) { f.set('idle'); return; }
      if (k === f.stepK ? p < 0.7 : p < 0.5) return;
    }
    if (!has && f.state !== 'walk') return;
    if (has && close && !(f.item && ITEMS[f.item.kind].hold === 'two')) {
      const k = stepDir(f, mv); const list = STEP[k]; const name = list[(f.stepIx++) % list.length];
      f.set('step'); f.stepK = k; f.spd = 0; f.anim.play(name, { speed: 1.6, fade: 0.08, restart: true, rootMotion: true });
      return;
    }
    const hurt = f.hp < 25, two = f.item && ITEMS[f.item.kind].hold === 'two';
    const runSpd = f.isAI ? MOVE.runAI : MOVE.run;
    let target = !has ? 0 : hurt ? MOVE.hurt * mag : two ? MOVE.two * mag : mag >= 0.55 ? runSpd : MOVE.walk * Math.max(0.5, mag / 0.55);
    // turning sheds speed: a sharp reversal brakes first, then accelerates the new way
    if (has) { const want = Math.atan2(mv.x, mv.z), diff = Math.abs(((want - f.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI); target *= Math.max(0.15, Math.cos(Math.min(diff, Math.PI / 2))); }
    f.spd = f.spd || 0;
    f.spd += clamp(target - f.spd, -MOVE.dec * dt, MOVE.acc * dt);
    if (has) yawTo(f, tmp2.copy(f.pos).add(mv), MOVE.turn, dt);
    if (f.spd < 0.8 && !has) { f.spd = 0; f.set('idle'); return; }
    f.pos.addScaledVector(f.face, f.spd * dt);          // travel along the body's heading, so the feet and the path agree
    const clip = hurt ? 'bruised' : f.spd <= 11 ? 'walk' : f.spd <= 24 ? 'jog' : 'sprint';
    const rate = clamp(f.spd / CL[clip].speed, clip === 'walk' ? 0.55 : 0.6, clip === 'walk' ? 1.6 : 1.5);
    if (f.state !== 'walk') f.set('walk');
    f.anim.play(clip, { loop: true, speed: rate, fade: 0.16, upper: f.item ? { name: 'guard' } : undefined });
  }
  function updateFighter(f, dt, time, frozen) {
    const o = f.foe;
    if (!frozen) updateRage(f, dt);
    if (!frozen) { f.st += dt; f.invuln = Math.max(0, f.invuln - dt); f.comboT = Math.max(0, f.comboT - dt); f.recentT = Math.max(0, f.recentT - dt); }
    const d = f.pos.distanceTo(o.pos);
    if (!frozen && !f.busy() && f.state !== 'block' && f.state !== 'taunt' && match.state === 'fight') locomote(f, dt, frozen);
    if (f.state === 'idle' && f.anim.name !== 'guard') f.anim.play('guard', { loop: true, fade: 0.2 });
    // face the opponent while fighting
    if (!frozen && ['idle', 'step', 'block', 'dodge', 'taunt'].includes(f.state) || (f.state === 'attack' && !(f.att && f.att.S && f.st < f.att.impact + 0.1))) { if (!DOWNISH.includes(o.state)) yawTo(f, o.pos, f.state === 'attack' ? 6 : 9, dt); }
    if (!frozen) { f.pos.addScaledVector(f.vel, dt); f.vel.multiplyScalar(Math.pow(0.004, dt)); }
    switch (f.state) {
      case 'block': if (f.anim.name !== 'block') f.anim.play('block', { hold: 0.36, fade: 0.08 }); if (!f.isAI && !f.blockHeld) f.set('idle'); break;
      case 'dodge': if (f.st > CL.duck.dur / 1.8 * 0.85) f.set('idle'); break;
      case 'step': if (f.anim.done()) f.set('idle'); break;
      case 'attack': {
        const a = f.att, S = a.S;
        // set-up: turn so the striking fist/foot lines up with the target and take the distance this strike is built for
        // (the step already done by the clip's own footwork is counted, so the body never overshoots into the other man)
        if (S && a.reach && f.st < a.impact && match.state === 'fight' && !frozen) {
          const tg = f.foe;
          if (tg && !DOWNISH.includes(tg.state) && tg.hp > 0) {
            // aim at the target part itself (a weaving head can be a forearm's length from the body's centre), led by its motion
            partOf(tg, a).getWorldPosition(_tp2); if (a.prevP && f.st > 0) { const left = Math.max(0, a.impact - f.st), k = left / Math.max(1e-3, dt); _lp.copy(_tp2).sub(a.prevP); a.prevP.copy(_tp2); _tp2.addScaledVector(_lp, Math.min(k, 12)); } else a.prevP = _tp2.clone();
            const to = tmp.set(_tp2.x - f.pos.x, 0, _tp2.z - f.pos.z), dist = to.length();
            if (dist < a.D0 + 8 && dist > 0.01) {
              const want = Math.atan2(to.x, to.z) + S.yaw, dy = ((want - f.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI; f.g.rotation.y += dy * Math.min(1, dt * 24);
              const done = a.rm ? rootZ(a.clip, f.anim.t) - a.root0 : 0, wantD = a.D0 - done, tooClose = BODY_R * 2 + 0.2 - tg.pos.distanceTo(f.pos); let err = dist - wantD; if (tooClose > 0) err = Math.min(err, -tooClose);
              if (Math.abs(err) > 0.15) f.pos.addScaledVector(to.normalize(), clamp(err * Math.min(1, dt * 14), -1.1, 1.1));
            }
          }
        }
        if (!f.hitDone && a.reach && f.st >= a.impact - (a.S && !a.wv ? 0.12 : 0.06) && f.st <= a.impact + 0.07 && match.state === 'fight') {
          // contact: the strike lands only where the limb (or the weapon in it) actually reaches the head or body
          let o = null, toT = null, best = 0;
          if (S) { f.rig.B[S.limb].getWorldPosition(_lp);
            for (const c of oppsOf(f)) { if (c.invuln > 0 || DOWNISH.includes(c.state)) continue;
              partOf(c, a).getWorldPosition(_tp2);
              const dd = _lp.distanceTo(_tp2) - a.contact; if (dd < best) { best = dd; o = c; } } }
          if (o) toT = new THREE.Vector3(o.pos.x - f.pos.x, 0, o.pos.z - f.pos.z).normalize();
          if (o) {
            f.hitDone = true; if (f === hero) hero.foe = o;
            const dmg = f.item && a.kind === 'swing' ? ITEMS[f.item.kind].dmg : a.dmg;
            damage(f, o, dmg, toT.clone(), a);
            if (f.item && a.kind === 'swing') sfx(ITEMS[f.item.kind].snd || 'wood');
            if (f.item && a.kind === 'swing') { f.item.dur -= 1; if (f.item.dur <= 0 || ITEMS[f.item.kind].breaks) breakItem(f.item, f); }
          }
        }
        if (!f.hitDone && !f.missed && a.reach && f.st > a.impact + 0.07) { f.missed = true; if (f === hero) MS.misses = (MS.misses || 0) + 1; }
        if (f.state === 'attack') {
          const cancelAt = a.reach ? a.impact + (a.cancel ?? 0.1) : a.dur * 0.8, freeAt = a.reach ? Math.min(a.dur, a.impact + (a.recover ?? 0.22)) : a.dur * 0.9;
          if (f.queue && f.st >= cancelAt) { const q = f.queue; f.queue = null; f.attack(q); }
          else if (f.st >= freeAt) f.set('idle');          // the clip keeps playing its recovery and blends into the guard
          else if (f.st >= cancelAt && (f.blockHeld && !f.isAI)) f.set('block');
        }
        break;
      }
      case 'hit': if (f.st > f.hitStun) {
          const cov = f.ai && f.ai.cover; if (f.ai) f.ai.cover = null; f.dazed = false;
          if (f.blockStun) { f.blockStun = false; f.set(f.isAI || f.blockHeld ? 'block' : 'idle'); if (f.isAI) f.ai.blockT = 0.25; }
          else if (cov === 'block') { f.set('block'); f.ai.blockT = 0.55; f.recent = 0; }
          else if (cov === 'dodge') { f.set('idle'); f.recent = 0; doAction(f, 'dodge'); }
          else { f.set('idle'); f.recovered = 0.25; } } break;
      case 'fall': {
        const c = f.fallKind === 'face' ? 'fallFace' : 'koBack';
        if (f.anim.done() || f.st > CL[c].dur / 1.1) { f.set(f.hp > 0 ? 'down' : 'ko'); f.anim.play(c, { hold: 1, fade: 0.15, restart: true }); }
        break;
      }
      case 'down': if (f.st > 0.8) { f.set('getup'); f.anim.play(f.fallKind === 'face' ? 'getupFace' : 'getupBack', { speed: f.fallKind === 'face' ? 1.6 : 1.35, start: f.fallKind === 'face' ? 0.4 : 0.6, fade: 0.25, restart: true }); } break;
      case 'getup': f.invuln = 0.6; if (f.anim.done()) { f.set('idle'); f.recovered = 0.3; f.invuln = 0.5; } break;
      case 'grabTry': if (!f.grabChecked && f.st >= GRAB.reachT) { f.grabChecked = true; grabCheck(f); } else if (f.st > 0.6) f.set('idle'); break;
      case 'recover': if (f.st > f.recoverT) f.set('idle'); break;
      case 'clinch': updateClinch(f); break;
      case 'grabbed': if (!f.grabber || f.grabber.state !== 'clinch') { f.grabber = null; f.set('idle'); } break;
      case 'pickup': {
        if (f.pickTarget) { const ip = f.pickTarget.mesh.position, to = tmp.set(ip.x - f.pos.x, 0, ip.z - f.pos.z), dd = to.length(); if (dd > 3.2 && !frozen) f.pos.addScaledVector(to.normalize(), Math.min(dd - 3.2, 34 * dt)); if (!frozen) yawTo(f, ip, 16, dt); }
        if (f.st > 0.3 && f.pickTarget) { if (f.pickTarget.state === 'ground' && !f.item && Math.hypot(f.pickTarget.mesh.position.x - f.pos.x, f.pickTarget.mesh.position.z - f.pos.z) < 11) { grab(f, f.pickTarget); ui.pop(ITEMS[f.item.kind].name, f === hero ? 'l' : 'r'); sfx('wood'); } f.pickTarget = null; }
        if (f.st > 0.62) f.set('idle'); break;
      }
      case 'shoot': {
        if (!f.shot && f.st > 0.24 && f.item) {
          f.shot = true; const it = f.item; it.dur -= 1;
          const p0 = new THREE.Vector3(); f.rig.hand.R.getWorldPosition(p0); p0.y = Math.max(p0.y, 11);
          let dir = f.aimDir.clone(); const sp = 120;
          if (f.aimAssist) { const tgt = f.foe; const aimY = 10 + Math.random() * 5; dir.set(tgt.pos.x - p0.x, 0, tgt.pos.z - p0.z); const dist = dir.length(); dir.normalize();
            const err = f.isAI ? (1 - f.ai.acc) * 0.16 : 0.02; const ang = (Math.random() - 0.5) * 2 * err; dir.applyAxisAngle(_up, ang);
            const tFly = dist / sp; firePebble(f, p0, new THREE.Vector3(dir.x * sp, (aimY - p0.y) / tFly + 0.5 * 22 * tFly, dir.z * sp)); }
          else firePebble(f, p0, new THREE.Vector3(dir.x * sp, 3, dir.z * sp));
          sfx('twang');
          if (it.dur <= 0) { ui.pop(f === hero ? 'النبلة خلصت' : 'نبلته خلصت', f === hero ? 'l' : 'r'); discardItem(it, f); }
        }
        if (f.st > 0.55) f.set('idle'); break;
      }
      case 'toss': {
        if (!f.tossed && f.st > 0.68 && f.item) {
          f.tossed = true; const it = drop(f, true); it.state = 'flying'; it.thrower = f; it.hitDone = false; it.prev = it.mesh.position.clone();
          let dir = f.aimDir; const sp = 58, y0 = it.mesh.position.y;
          if (f.aimAssist) {   // lob from the hand that actually releases it to the opponent's chest
            dir = tmp3.set(o.pos.x - it.mesh.position.x, 0, o.pos.z - it.mesh.position.z); const dist = dir.length(); dir.divideScalar(Math.max(0.01, dist));
            const tFly = clamp(dist / sp, 0.15, 1.1);
            it.vel.set(dir.x * dist / tFly, (11 - y0) / tFly + 0.5 * 40 * tFly, dir.z * dist / tFly);
          } else it.vel.set(dir.x * sp, 8, dir.z * sp);    // straight where he aimed: it flies past and lands
          it.spin = new THREE.Vector3(rand(4, 9), rand(-3, 3), 0); sfx('whoosh');
        }
        if (f.st > 1.0) f.set('idle'); break;
      }
      case 'win': if (f.anim.name !== f.winClip) f.anim.play(f.winClip, { loop: true, fade: 0.4 }); break;
    }
    // animation + root motion
    f.anim.update(dt, frozen);
    if (f.anim.rootMotion && f.state !== 'grabbed') {
      wv.copy(f.anim.delta).applyAxisAngle(tmp3.set(0, 1, 0), f.g.rotation.y);
      // never walk through the other body
      if (!DOWNISH.includes(o.state) && !DOWNISH.includes(f.state)) { const toO = tmp.copy(o.pos).sub(f.pos).setY(0); const dd = toO.length(); if (dd > 0.01) { toO.divideScalar(dd); const into = wv.dot(toO); if (into > 0 && dd - into < BODY_R * 2) wv.addScaledVector(toO, -(into - Math.max(0, dd - BODY_R * 2))); } }
      f.pos.add(wv);
    }
    if (!['fall', 'down', 'ko', 'getup', 'clinch', 'grabbed', 'win'].includes(f.state) || f.state === 'win') f.rig.applyFist(f.state === 'win' ? 0.3 : 1);
    // additive hit reaction on spine and neck (a damped spring)
    if (!frozen) {
      f.reactV.addScaledVector(f.react, -150 * dt); f.reactV.multiplyScalar(Math.pow(0.0008, dt)); f.react.addScaledVector(f.reactV, dt);
      f.headV.addScaledVector(f.headR, -260 * dt); f.headV.multiplyScalar(Math.pow(0.0004, dt)); f.headR.addScaledVector(f.headV, dt);
    }
    if (f.react.lengthSq() > 1e-5) { eR.set(f.react.x * 0.5, f.react.y * 0.4, f.react.z * 0.5); qR.setFromEuler(eR); f.rig.B.spine02.quaternion.multiply(qR); f.rig.B.spine01.quaternion.multiply(qR); }
    if (f.headR.lengthSq() > 1e-5) { eR.set(f.headR.x * 0.7, f.headR.y * 0.9, f.headR.z * 0.6); qR.setFromEuler(eR); f.rig.B.neck01.quaternion.multiply(qR); f.rig.B.head.quaternion.multiply(qR); }
    if (f.state !== 'grabbed') collide(f);
  }

  // ------------------------------------------------------------ profiling (off unless benchmarking)
  const PF = { on: false, t: 0, acc: {}, begin() { if (this.on) this.t = performance.now(); }, mark(n) { if (!this.on) return; const t = performance.now(); this.acc[n] = (this.acc[n] || 0) + t - this.t; this.t = t; } };
  const BENCH = { noAI: false, noCrowd: false, orbit: 0 };
  // ------------------------------------------------------------ main loop
  let last = performance.now(), time = 0;
  perf.base = renderer.getPixelRatio(); perf.good = 0;
  // on-screen frame counter (real device measurement): frames per second and current render resolution
  const fpsEl = document.createElement('div'); fpsEl.style.cssText = 'position:absolute;left:8px;bottom:6px;z-index:9;font:600 11px/1 system-ui,sans-serif;color:#ffe9b8;background:rgba(0,0,0,.45);padding:3px 6px;border-radius:6px;pointer-events:none;direction:ltr';
  (document.getElementById('app') || document.body).appendChild(fpsEl); if (!/[?&]fps/.test(location.search)) fpsEl.style.display = 'none';
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (window.__fetwaPaused) return;
    // adaptive resolution aimed at 60 fps: measured fill-rate is the main GPU cost (75 % resolution = -34 % raster time)
    perf.acc += dt; perf.n++;
    if (perf.acc > 1.0) { const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0; perf.avg = avg;
      let ns = perf.scale;
      if (avg > 0.020 && perf.scale > 0.6) ns = Math.max(0.6, perf.scale - (avg > 0.03 ? 0.15 : 0.08));
      else if (avg < 0.0175 && perf.scale < 1 && ++perf.good >= 3) { ns = Math.min(1, perf.scale + 0.05); perf.good = 0; }
      if (avg >= 0.0175) perf.good = 0;
      fpsEl.textContent = Math.round(1 / avg) + ' fps · ' + Math.round(perf.scale * 100) + '%';
      if (ns !== perf.scale) { perf.scale = ns; renderer.setPixelRatio(perf.base * ns); if (composer) { composer.setPixelRatio(perf.base * ns); composer.setSize(stage.clientWidth, stage.clientHeight); } } }
    update(dt);
    if (quality === 'high') composer.render(); else renderer.render(scene, camera);
  }
  window.__fetwa = {
    sim(sec, script) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { if (script) script(i / 60, { keys, pressed, input }); update(1 / 60); } if (!BENCH.noRender) { if (quality === 'high') composer.render(); else renderer.render(scene, camera); } return this.state(); },
    state() { const s = (f) => ({ s: f.state, a: f.anim.name, hp: +f.hp.toFixed(1), haiba: Math.round(f.haiba), pos: f.pos.toArray().map(v => +v.toFixed(1)), item: f.item && f.item.kind }); return { match: match.state, t: +match.t.toFixed(1), hero: s(hero), foe: s(foes[0]), foes: foes.map(s), target: foes.indexOf(hero.foe), dist: +hero.pos.distanceTo(hero.foe.pos).toFixed(1), arena: CUR.key, env: [ENV.tKey, ENV.wKey] }; },
    info() { let lights = 0; scene.traverse(o => { if (o.isLight && o.visible) lights++; }); return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, lights }; },
    start() { ui.onStart(); }, setTime(v) { match.t = v; }, hero, get foe() { return foes[0]; }, get foes() { return foes; }, items, camera, crowd, CL, flags: BENCH, scene, renderer, get arena() { return CUR; }, applyEnv: (t, w) => applyEnv(t, w), useArena: (k) => useArena(k),
    dbg: { get camShake() { return camShake; }, sparksAlive: () => sparks.filter(x => x.life > 0).length, spawnItem, rageState: (f) => rageState(f), get hitstop() { return hitstop; }, MOVE, GRAB, aimArrow, pickRing, itemTag, PSTAT, grab: (f, it) => grab(f, it), get attacker() { return attacker; } },
    bench(o) {
      Object.assign(BENCH, { noAI: !!o.noAI, noCrowd: !!o.noCrowd, orbit: o.orbit ? 0.01 : 0 });
      for (const c of crowd) c.visible = !o.noCrowd;
      const pts = []; scene.traverse(x => { if (x.isPointLight || x.isSpotLight) pts.push(x); });
      if (o.noPoints) pts.forEach(l => (l.visible = false));
      if (o.noShadows) { renderer.shadowMap.enabled = false; scene.traverse(x => { if (x.material) [].concat(x.material).forEach(m => (m.needsUpdate = true)); }); }
      const gl = renderer.getContext(), px = new Uint8Array(4);
      const scripts = {
        idle: () => {},
        combat: (i) => { const foe = hero.foe; const dx = foe.pos.x - hero.pos.x, dz = foe.pos.z - hero.pos.z, d = Math.hypot(dx, dz); camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize(); const rx = -camDir.z, rz = camDir.x; let mx = 0, mz = 0; if (d > 10) { mx = dx / d; mz = dz / d; } input.jx = mx * rx + mz * rz; input.jy = mx * camDir.x + mz * camDir.z; if (d < 11 && i % 14 === 0) pressed.add(['punch', 'punch', 'punch', 'kick', 'grab'][(i / 14 | 0) % 5]); },
        combo: (i) => { const foe = hero.foe; input.jx = input.jy = 0; if (i % 10 === 0) pressed.add(i % 50 === 40 ? 'kick' : 'punch'); if (foe.pos.distanceTo(hero.pos) > 11) { foe.pos.copy(hero.pos).add(tmp.set(9, 0, 0)); } },
      };
      const sc = scripts[o.script || 'idle']; const rows = [];
      PF.on = true; const heap0 = performance.memory ? performance.memory.usedJSHeapSize : 0; let heapMax = heap0;
      for (let i = 0; i < o.frames; i++) {
        sc(i); PF.acc = {};
        const t0 = performance.now(); update(1 / 60); const t1 = performance.now();
        if (quality === 'high') composer.render(); else renderer.render(scene, camera);
        const t2 = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t3 = performance.now();
        if (performance.memory) heapMax = Math.max(heapMax, performance.memory.usedJSHeapSize);
        rows.push(Object.assign({}, PF.acc, { update: t1 - t0, submit: t2 - t1, gpu: t3 - t2, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }));
      }
      PF.on = false; BENCH.noAI = BENCH.noCrowd = false; BENCH.orbit = 0; input.jx = input.jy = 0;
      if (o.noPoints) pts.forEach(l => (l.visible = true));
      if (o.noShadows) { renderer.shadowMap.enabled = true; scene.traverse(x => { if (x.material) [].concat(x.material).forEach(m => (m.needsUpdate = true)); }); }
      return { rows, heap0, heapMax, heapEnd: performance.memory ? performance.memory.usedJSHeapSize : 0 };
    },
    renderAttr(K = 12) {
      const gl = renderer.getContext(), px = new Uint8Array(4);
      const statics = [], chars = [hero.g, ...foes.map(f => f.g)], crowdG = crowd.slice(); scene.children.forEach(o => { if (!chars.includes(o) && !crowdG.includes(o) && !o.isLight && !o.isCamera) statics.push(o); });
      const pts = []; scene.traverse(x => { if ((x.isPointLight || x.isSpotLight) && x.visible) pts.push(x); });
      const run = () => { for (let i = 0; i < 3; i++) { (quality === 'high' ? composer : renderer).render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
        let sub = 0, gpu = 0, calls = 0, tris = 0; for (let i = 0; i < K; i++) { const t0 = performance.now(); if (quality === 'high') composer.render(); else renderer.render(scene, camera); const t1 = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t2 = performance.now(); sub += t1 - t0; gpu += t2 - t1; calls = renderer.info.render.calls; tris = renderer.info.render.triangles; }
        return { submit: +(sub / K).toFixed(2), gpu: +(gpu / K).toFixed(1), calls, tris }; };
      const vis = (arr, v) => arr.forEach(o => (o.visible = v));
      const crowdVis = crowd.map(c => c.visible);
      const out = {};
      out.base = run();
      vis(crowdG, false); out.noCrowd = run(); crowdG.forEach((c, i) => (c.visible = crowdVis[i]));
      vis(chars, false); out.noFighters = run(); vis(chars, true);
      vis(statics, false); out.noEnvironment = run(); vis(statics, true);
      vis(pts, false); out.noPointLights = run(); vis(pts, true);
      renderer.shadowMap.enabled = false; scene.traverse(x => { if (x.material) [].concat(x.material).forEach(m => (m.needsUpdate = true)); }); out.noShadows = run();
      renderer.shadowMap.enabled = true; scene.traverse(x => { if (x.material) [].concat(x.material).forEach(m => (m.needsUpdate = true)); });
      const pr = renderer.getPixelRatio(); renderer.setPixelRatio(pr * 0.75); out.res75 = run(); renderer.setPixelRatio(pr);
      return out;
    },
    resources() {
      const tex = new Map(); scene.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'alphaMap', 'emissiveMap', 'aoMap']) { const t = m[k]; if (t && t.image) tex.set(t.source ? t.source.uuid : t.uuid, t); } });
      let bytes = 0; const list = []; for (const t of tex.values()) { const w = t.image.width || 0, h = t.image.height || 0; const b = w * h * 4 * (t.generateMipmaps !== false ? 1.33 : 1); bytes += b; list.push([t.name || (t.image.src || 'canvas').split('/').pop(), w, h]); }
      const byKind = {}; for (const [n, w, h] of list) { const k = n.endsWith('.jpg') ? (n.startsWith('ground') || n.startsWith('plaster') ? 'environment jpg' : 'characters') : 'canvas (procedural)'; byKind[k] = +((byKind[k] || 0) + w * h * 4 * 1.33 / 1048576).toFixed(1); }
      let skinned = 0, meshes = 0, bones = 0, lights = 0, casters = 0; scene.traverse(o => { if (o.isSkinnedMesh) { skinned++; bones += o.skeleton.bones.length; } if (o.isMesh) meshes++; if (o.isLight && o.visible) lights++; if (o.isMesh && o.castShadow) casters++; });
      return { byKind, textures: tex.size, texMB: +(bytes / 1048576).toFixed(1), programs: renderer.info.programs.length, geometries: renderer.info.memory.geometries, gpuTextures: renderer.info.memory.textures, skinned, bones, meshes, lights, casters, pixelRatio: renderer.getPixelRatio(), size: [renderer.domElement.width, renderer.domElement.height], list: list.sort((a, b) => b[1] * b[2] - a[1] * a[2]).slice(0, 40) };
    },
  };
  function update(dtIn) {
    PF.begin();
    let dt = dtIn;
    if (slowmo > 0) { slowmo -= dt; dt *= 0.45; }
    const frozen = hitstop > 0; if (frozen) hitstop -= dtIn;
    time += dt;
    camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize(); camRight.set(-camDir.z, 0, camDir.x);
    let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + (input.jx || 0);
    let iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + (input.jy || 0);
    const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
    hero.move.set(0, 0, 0).addScaledVector(camRight, ix).addScaledVector(camDir, iy);
    hero.blockHeld = !!(keys.Space || input.blockTouch);
    if (hero.state === 'grabbed' && pressed.size) { hero.escape += pressed.size; camShake = Math.max(camShake, 0.05); pressed.clear(); }
    if (match.state === 'fight') {
      if (hero.blockHeld && (!hero.busy() || hero.state === 'step') && hero.state !== 'block') hero.set('block');
      for (const a of pressed) { if (canAct(hero, a)) doAction(hero, a); else hero.buffer = { a, t: 0.25 }; }
      if (hero.buffer) { hero.buffer.t -= dtIn; if (hero.buffer.t <= 0) hero.buffer = null; else if (canAct(hero, hero.buffer.a)) { const a = hero.buffer.a; hero.buffer = null; doAction(hero, a); } }
    }
    pressed.clear();
    if (match.state !== 'fight') hero.move.set(0, 0, 0);
    PF.mark('input');
    if (BENCH.forceFoe && match.state === 'fight') doAction(foes[0], BENCH.forceFoe);
    pickTarget();
    if (!frozen && !BENCH.noAI) { updateDuo(dt); for (const f of foes) updateAI(f, dt); }
    PF.mark('ai');
    // hit-stop freezes the striker (and everyone else) for a few frames; the one being hit keeps reacting
    const victimOf = hitstopWho ? (hitstopWho === hero ? hero.foe : hero) : null;
    updateFighter(hero, dt, time, frozen && hero !== victimOf); for (const f of foes) updateFighter(f, dt, time, frozen && f !== victimOf); separate();
    updatePebbles(frozen ? 0 : dt);
    PF.mark('fighters');
    // flying items
    for (const it of items.slice()) {
      if (it.state !== 'flying') continue;
      const p = it.mesh.position; it.prev.copy(p);
      it.vel.y -= 40 * dt; p.addScaledVector(it.vel, dt); it.mesh.rotation.x += it.spin.x * dt; it.mesh.rotation.y += it.spin.y * dt;
      // body hit: test the swept segment against the opponent's body (vertical capsule)
      for (const tgt of oppsOf(it.thrower)) if (!it.hitDone && tgt.invuln <= 0 && !DOWNISH.includes(tgt.state)) {
        for (let k = 1; k <= 3; k++) { const x = it.prev.x + (p.x - it.prev.x) * k / 3, y = it.prev.y + (p.y - it.prev.y) * k / 3, z = it.prev.z + (p.z - it.prev.z) * k / 3;
          if (y > 1 && y < 17.5 && Math.hypot(x - tgt.pos.x, z - tgt.pos.z) < 3.2) {
            it.hitDone = true; const dir = new THREE.Vector3(it.vel.x, 0, it.vel.z).normalize();
            damage(it.thrower, tgt, ITEMS[it.kind].throwDmg, dir.clone(), { kind: 'throw', knock: 12, stun: 0.6, down: ITEMS[it.kind].down, zone: y > 13 ? 'head' : 'chest' });
            sfx(ITEMS[it.kind].snd || 'wood'); it.dur -= 1; if (it.thrower === hero) MS.throwHits++;
            it.vel.x *= -0.25; it.vel.z *= -0.25; it.vel.y = 7; p.x = x - dir.x * 3; p.z = z - dir.z * 3;
            break; } }
      }
      if (it.hitDone && it.state === 'flying' && items.includes(it) && (it.dur <= 0 || ITEMS[it.kind].breaks)) { breakItem(it, null); continue; }
      // walls of the square and obstacles: bounce
      { const wx0 = CUR.wallX0 ?? CUR.bounds.x0 - 8, wx1 = CUR.wallX1 ?? CUR.bounds.x1 + 8; if (p.x < wx0 || p.x > wx1) { p.x = clamp(p.x, wx0, wx1); it.vel.x *= -0.4; sfx('wood'); } }
      if (p.z < CUR.bounds.z0 - 6 || p.z > CUR.bounds.z1 + 6) { p.z = clamp(p.z, CUR.bounds.z0 - 6, CUR.bounds.z1 + 6); it.vel.z *= -0.4; }
      for (const [ox, oz, r] of OBST) { const dx = p.x - ox, dz = p.z - oz, d = Math.hypot(dx, dz); if (d < r && d > 0.01 && p.y < 9) { p.x = ox + dx / d * r; p.z = oz + dz / d * r; const nx = dx / d, nz = dz / d, vn = it.vel.x * nx + it.vel.z * nz; if (vn < 0) { it.vel.x -= 1.6 * vn * nx; it.vel.z -= 1.6 * vn * nz; } } }
      // ground: bounce, then settle where it actually stops
      if (p.y <= 0.5) {
        if (ITEMS[it.kind].breaks) { breakItem(it, null); continue; }
        if (Math.abs(it.vel.y) > 7) { p.y = 0.5; it.vel.y = -it.vel.y * 0.32; it.vel.x *= 0.55; it.vel.z *= 0.55; it.spin.multiplyScalar(0.5); sfx('wood'); dust(p, 3, false); }
        else { it.state = 'ground'; it.x = clamp(p.x, CUR.bounds.x0, CUR.bounds.x1); it.z = clamp(p.z, CUR.bounds.z0, CUR.bounds.z1); it.ry = it.mesh.rotation.y; groundPose(it); }
      }
    }
    for (const dbr of debris.slice()) { dbr.v.y -= 40 * dt; dbr.m.position.addScaledVector(dbr.v, dt); dbr.m.rotation.x += dbr.r.x * dt; dbr.m.rotation.y += dbr.r.y * dt; if (dbr.m.position.y < 0.2) { dbr.m.position.y = 0.2; dbr.v.multiplyScalar(0.3); dbr.r.multiplyScalar(0.5); } dbr.life -= dt; if (dbr.life < 0) { dbr.m.removeFromParent(); debris.splice(debris.indexOf(dbr), 1); } }
    { let n = 0; for (const s of sparks) { if (s.life <= 0) continue; s.life -= dt; s.v.y -= s.grav * dt; s.v.multiplyScalar(Math.exp(-s.drag * dt)); s.p.addScaledVector(s.v, dt); if (s.p.y < 0.1) { s.p.y = 0.1; s.v.y *= -0.2; }
        const a = Math.max(0.01, s.life / s.max), k = s.size * (s.grow ? (1 + s.grow * (1 - a)) * Math.min(1, a * 3) : a); _sm.makeScale(k, k, k).setPosition(s.p); sparkMesh.setMatrixAt(n, _sm); sparkMesh.setColorAt(n, _sc.setHex(s.col)); n++; }
      sparkMesh.count = n; if (n) { sparkMesh.instanceMatrix.needsUpdate = true; if (sparkMesh.instanceColor) sparkMesh.instanceColor.needsUpdate = true; } }
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
    // crowd ring: follows the fight, leaves a gap toward the camera, people walk (real walk cycle) to their spot and cheer
    // the framed group: the player, the one he fights, and (lighter weight) any other opponent still standing
    const tgt0 = hero.foe, others = foes.filter(f => f !== tgt0 && f.hp > 0);
    const mid = tmp3.copy(hero.pos).add(tgt0.pos); let wsum = 2; for (const f of others) { mid.addScaledVector(f.pos, 0.6); wsum += 0.6; } mid.multiplyScalar(1 / wsum); mid.y = 0;
    ringC.lerp(mid, 1 - Math.exp(-dt * 0.8));
    const camA = Math.atan2(camera.position.z - ringC.z, camera.position.x - ringC.x);
    let sep = hero.pos.distanceTo(tgt0.pos); for (const f of others) sep = Math.max(sep, Math.min(70, 2 * Math.hypot(f.pos.x - mid.x, f.pos.z - mid.z)), 2 * Math.hypot(hero.pos.x - mid.x, hero.pos.z - mid.z));
    PF.mark('items');
    if (!BENCH.noCrowd) {
    const ringR = Math.max(30, sep * 0.5 + 24);
    for (const c of crowd) {
      const u = c.userData; if (u.off) continue;
      let a = u.a; const da = ((a - camA + Math.PI * 3) % (Math.PI * 2)) - Math.PI; const gap = 1.4;
      if (Math.abs(da) < gap) a = camA + Math.sign(da || 1) * gap;
      const r = ringR + (u.r - 30);
      const tx = clamp(ringC.x + Math.cos(a) * r, CUR.crowd.x0, CUR.crowd.x1), tz = clamp(ringC.z + Math.sin(a) * r, CUR.crowd.z0 ?? CUR.bounds.z0 - 6, CUR.crowd.z1 ?? CUR.bounds.z1 + 6);
      const dx = tx - c.position.x, dz = tz - c.position.z, dd = Math.hypot(dx, dz);
      const moving = dd > 2.5 || (u.moving && dd > 0.6);
      if (moving) { const sp = Math.min(dd, (Math.abs(da) < gap + 0.2 ? 15 : 9) * dt); c.position.x += dx / dd * sp; c.position.z += dz / dd * sp; }
      // keep the lane between the camera and the fight clear: anyone inside it steps sideways out of it (walking, never popping)
      { const cx = camera.position.x, cz = camera.position.z, lx = mid.x - cx, lz = mid.z - cz, L = Math.hypot(lx, lz) || 1, ux = lx / L, uz = lz / L;
        const px = c.position.x - cx, pz = c.position.z - cz, along = px * ux + pz * uz, side = px * -uz + pz * ux;
        const W = 12 + 6 * clamp(along / L, 0, 1);
        if (along > 2 && along < L + 6 && Math.abs(side) < W) { const s2 = Math.sign(side || (u.a - camA)) || 1, push = Math.min(W - Math.abs(side), 24 * dt); c.position.x += -uz * s2 * push; c.position.z += ux * s2 * push; } }
      for (const f of [hero, ...foes]) { const ex = c.position.x - f.pos.x, ez = c.position.z - f.pos.z, e = Math.hypot(ex, ez), m = 13; if (e < m && e > 0.01) { c.position.x = f.pos.x + ex / e * m; c.position.z = f.pos.z + ez / e * m; } }
      c.position.x = clamp(c.position.x, CUR.crowd.x0, CUR.crowd.x1); if (CUR.crowd.z0 != null) c.position.z = clamp(c.position.z, CUR.crowd.z0, CUR.crowd.z1);
      const look = moving ? Math.atan2(dx, dz) : Math.atan2(mid.x - c.position.x, mid.z - c.position.z);
      const diff = ((look - c.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI; c.rotation.y += diff * Math.min(1, dt * 4);
      // animation choice
      u.moodT -= dt;
      if (moving !== u.moving) { u.moving = moving; if (moving) u.an.play('walk', { loop: true, speed: 9 / CL.walk.speed, fade: 0.3 }); else u.moodT = 0; }
      if (!moving && u.moodT <= 0) { const hot = match.hype > 45 || Math.random() < 0.25; u.an.play(pickOne(hot ? CHEERS : CALM), { loop: true, start: Math.random() * 4, fade: 0.5, speed: 0.9 + Math.random() * 0.25 }); u.moodT = 3 + Math.random() * 4; }
      u.acc = (u.acc || 0) + dt;
      if (((crowdTick + u.idx) & 1) === 0) { if (c.visible && inView(c)) u.an.update(u.acc, false); u.acc = 0; }
    }
    crowdTick++;
    for (let i = 0; i < crowd.length; i++) for (let j = i + 1; j < crowd.length; j++) { const A2 = crowd[i], B2 = crowd[j]; const dx = B2.position.x - A2.position.x, dz = B2.position.z - A2.position.z, d2 = Math.hypot(dx, dz); if (d2 < 4.4 && d2 > 0.01) { const p = (4.4 - d2) / 2; A2.position.x -= dx / d2 * p; A2.position.z -= dz / d2 * p; B2.position.x += dx / d2 * p; B2.position.z += dz / d2 * p; } }
    }
    PF.mark('crowd');
    // match flow
    if (match.state === 'intro') { match.introT += dt; if (match.introT > 2.2) { match.state = 'fight'; for (const f of foes) if (f.state === 'taunt') f.set('idle'); } }
    else if (match.state === 'fight') {
      match.t -= dt; match.hype = Math.max(15, match.hype - dt * 2.5);
      shoutT -= dt; if (shoutT <= 0) shout();
      const heroDead = hero.hp <= 0, foeDead = foes.every(f => f.hp <= 0);
      if (foes.length > 1 && !foeDead) for (const f of foes) if (f.hp <= 0 && !f.koShown) { f.koShown = true; banner(f.name + ' وقع!', 1200); sfx('crowd'); }
      if (heroDead || foeDead || match.t <= 0) {
        const foePct = foes.reduce((a, f) => a + Math.max(0, f.hp), 0) / foes.reduce((a, f) => a + (f.hpMax || 100), 0), heroPct = hero.hp / (hero.hpMax || 100);
        match.state = 'end'; match.endT = 0; match.heroWon = foeDead || (!heroDead && match.t <= 0 && heroPct >= foePct);
        match.winner = match.heroWon ? hero : (foes.find(f => f.hp > 0) || foes[0]);
        banner((match.heroWon ? foeDead : heroDead) ? 'ضربة قاضية!' : 'الوقت خلص!', 1800); slowmo = 1.2; sfx('crowd'); match.hype = 100;
      }
    } else if (match.state === 'end') {
      match.endT += dt;
      const winners = match.heroWon ? [hero] : foes.filter(f => f.hp > 0);
      for (const w of winners) if (match.endT > 1.4 && w.state !== 'win' && !w.busy()) { w.set('win'); w.winClip = pickOne(['cheer1', 'cheer2', 'cheer3']); }
      if (match.endT > 2.8 && !match.shown) { match.shown = true; const r = Object.assign({}, MS, { win: match.heroWon, ko: match.heroWon ? foes.every(f => f.hp <= 0) : hero.hp <= 0, hpPct: Math.round(100 * hero.hp / (hero.hpMax || 100)), time: Math.round((LV.time_limit || 99) - match.t) });
        if (ui.onMatchEnd) ui.onMatchEnd(r); else ui.showEnd(r.win ? 'win' : 'lose', { hp: Math.round(hero.hp), time: r.time }); }
    }
    if (match.state !== 'end') match.shown = false;
    PF.mark('match');
    // camera: side-on to the fighters' line, pulled back with their separation
    const axis = tmp2.copy(hero.foe.pos).sub(hero.pos).setY(0);
    const portrait = camera.aspect < 0.9, k2 = portrait ? 1.45 : 1;
    const ax = axis.lengthSq() > 0.01 ? _ax.copy(axis).normalize() : _ax.set(1, 0, 0);
    const n = _n.set(-ax.z, 0, ax.x); if (n.dot(tmp.copy(camera.position).sub(mid).setY(0)) < 0) n.negate();
    const dist = (50 + sep * 0.9) * k2;
    const want = _want.copy(mid).addScaledVector(n, dist);
    want.x = clamp(want.x, CUR.cam.x0, CUR.cam.x1); want.z = clamp(want.z, CUR.cam.z0, CUR.cam.z1);
    want.y = Math.max(CUR.camMinY || 0, (19 + sep * 0.22) * (portrait ? 1.25 : 1));
    if (finisherCam > 0) { finisherCam -= dt; want.copy(mid).addScaledVector(n, 28); want.y = 13; }
    camera.position.lerp(want, 1 - Math.exp(-dtIn * 3.2));
    camT.lerp(tmp.set(mid.x, 10.5, mid.z), 1 - Math.exp(-dtIn * 6));
    camera.lookAt(camT);
    if (BENCH.orbit) { BENCH.orbit += dt * 0.6; camera.position.set(mid.x + Math.cos(BENCH.orbit) * 55, 22 + Math.sin(BENCH.orbit * 0.7) * 6, mid.z + Math.sin(BENCH.orbit) * 55); camera.lookAt(mid.x, 10, mid.z); }
    if (camShake > 0.005) { const t = performance.now() / 1000, a = camShake * 1.4; camera.position.x += Math.sin(t * 47) * a; camera.position.y += Math.sin(t * 61 + 1.3) * a * 0.8; camera.position.z += Math.sin(t * 53 + 2.1) * a * 0.5; camShake *= Math.exp(-dtIn * 9); } else camShake = 0;
    for (const c of crowd) c.visible = !c.userData.off;     // no visibility popping: spacing keeps the view clear
    camFill.position.copy(camera.position); camFill.position.y += 6; { const cd = camera.position.distanceTo(mid); camFill.intensity = clamp(Math.pow(cd / 60, 2) * 900, 120, 900) * ENV.camFill; }
    sun.target.position.set(mid.x, 0, mid.z); sun.position.set(mid.x + ENV.sunOff.x, ENV.sunOff.y, mid.z + ENV.sunOff.z);
    updateEnv(dtIn);
    for (const f of foes) if (f.mark) { f.mark.visible = f.hp > 0 && match.state !== 'menu'; f.mark.material.opacity = (f === hero.foe && foes.length > 1 ? 0.85 : 0.6) + 0.12 * Math.sin(time * 5); }
    updateItemUI();
    PF.mark('camera');
    const f0 = foes[0], f1 = foes[1];
    ui.hud({ hp1: 100 * hero.hp / (hero.hpMax || 100), hp2: 100 * f0.hp / (f0.hpMax || 100), h1: hero.haiba, h2: f0.haiba, hp3: f1 ? 100 * f1.hp / (f1.hpMax || 100) : null, tgt: foes.length > 1 ? foes.indexOf(hero.foe) : -1, ranged: !!(hero.item && ITEMS[hero.item.kind].ranged), t: Math.max(0, Math.ceil(match.t)), hype: match.hype, item: hero.item ? ITEMS[hero.item.kind].name : null, dur: hero.item ? hero.item.dur : 0, maxDur: hero.item ? ITEMS[hero.item.kind].dur : 0, canPick: !hero.item && pickRing.visible, fin: rageState(hero), finT: Math.ceil(hero.rage > 0 ? hero.rage : hero.rageCD) });
    PF.mark('hud');
  }
  // ------------------------------------------------------------ places (arenas): built on first use, the alley is always there
  const arenaCache = new Map();
  function disposeArena(A) {
    const shared = new Set([groundMaps.map, groundMaps.normal, groundMaps.rough]);
    A.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) for (const m of [].concat(o.material)) { for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'alphaMap']) if (m[k] && !shared.has(m[k])) m[k].dispose(); m.dispose(); } });
    A.group.removeFromParent();
  }
  async function useArena(key) {
    key = key || 'hara'; if (CUR.key === key) return;
    let A = ARENA[key] || arenaCache.get(key);
    if (!A) {
      const t0 = performance.now();
      const built = buildArena(THREE, key, { groundMaps, lamps: true });
      const grp = built.group; scene.add(grp);
      prepMaterials(grp);
      const lampInfo = trimLamps(grp, new THREE.Vector3(0, 0, 0), 3);
      const ms = mergeStatic(grp);
      grp.updateMatrixWorld(true); grp.traverse(c => { c.matrixAutoUpdate = false; });
      A = Object.assign({ key, set: [grp], group: grp, lamps: lampRegistry([grp], lampInfo) }, built);
      A.buildMs = Math.round(performance.now() - t0); A.merge = ms;
      arenaCache.set(key, A);
      if (arenaCache.size > 2) for (const [k2, old] of arenaCache) { if (k2 !== key && arenaCache.size > 2) { disposeArena(old); arenaCache.delete(k2); } }
    }
    for (const o of CUR.set) o.visible = false;
    for (const o of A.set) o.visible = true;
    CUR = A; OBST = A.obst || [];
    try { await renderer.compileAsync(scene, camera); } catch (e) {}
  }
  // ------------------------------------------------------------ time of day + weather
  const ENV = { t: TIMES.leil, w: WEATHERS.clear, tKey: 'leil', wKey: 'clear', sunOff: new THREE.Vector3(12, 60, 22), lampK: 1, flash: 0, nextFlash: 6, camFill: 1, hemiBase: hemi ? hemi.intensity : 1 };
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();
  function applyLamps(A, k) {
    for (const m of A.lamps.mats) { if (m.userData.bulb) m.color.copy(m.userData.bulb).multiplyScalar(0.4 + 0.6 * k); else m.emissiveIntensity = m.userData.lamp * k; }
    for (const l of A.lamps.lights) { l.intensity = l.userData.base * k; l.visible = k > 0.04; }
    for (const p of A.lamps.pools) { p.material.opacity = k; p.visible = k > 0.04; }
  }
  function applyEnv(tKey, wKey) {
    const T = TIMES[tKey] || TIMES.leil, W = WEATHERS[wKey] || WEATHERS.clear; Object.assign(ENV, { t: T, w: W, tKey: TIMES[tKey] ? tKey : 'leil', wKey: WEATHERS[wKey] ? wKey : 'clear' });
    const fogCol = new THREE.Color(T.fog); if (W.fogCol) fogCol.lerp(_c1.set(W.fogCol), W.fogMix);
    const U = sky.U; U.top.value.set(T.top); U.hor.value.set(T.hor); U.bot.value.set(T.bot);
    if (W.fogCol) { const k = W.fogMix * 0.85; U.top.value.lerp(_c1.set(W.fogCol), k * 0.6); U.hor.value.lerp(fogCol, k); U.bot.value.lerp(fogCol, k); }
    U.cloudCol.value.set(T.cloud); if (W.rain) U.cloudCol.value.lerp(_c1.set(T.night ? '#16181e' : '#4a505a'), 0.65); if (W.dust) U.cloudCol.value.lerp(_c1.set('#c8985a'), 0.6);
    U.clouds.value = W.clouds; U.stars.value = T.stars * Math.max(0, 1 - W.clouds * 1.1);
    const el = T.el * Math.PI / 180, az = T.az * Math.PI / 180, dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
    if (T.night) {   // disc = the moon; the directional light stays the warm key from the lamps overhead
      U.sunDir.value.set(0.35, 0.5, -0.79).normalize(); U.sunCol.value.set('#d8dcf0').multiplyScalar(0.5 * (1 - W.clouds * 0.9)); U.disc.value = 0.99975; U.glow.value = 0.5;
      ENV.sunOff.set(12, 60, 22);
    } else {
      U.sunDir.value.copy(dir); U.sunCol.value.set(T.sun).multiplyScalar(Math.max(0.15, W.sunK)); U.disc.value = 0.99962; U.glow.value = W.sunK;
      ENV.sunOff.copy(dir).multiplyScalar(70); ENV.sunOff.y = Math.max(ENV.sunOff.y, 20);   // the light keeps some height so faces stay readable at sunrise/sunset
    }
    sun.color.set(T.sun); sun.intensity = T.sunI * W.sunK; ENV.sunBase = sun.intensity;
    // street shade from the wall rows (day only)
    ENV.shade = []; shades.forEach(m => (m.visible = false));
    if (!T.night && T.lamps < 0.5 && CUR.walls) { const op = 0.5 * Math.min(1, W.sunK * 1.25) * (tKey === 'fajr' ? 0.6 : 1);
      CUR.walls.forEach((w, i) => { if (i > 1 || !w.h || Math.sign(dir.x) !== w.s || dir.y <= 0.05) return; const L = Math.min(150, w.h * Math.abs(dir.x) / dir.y); if (L < 3) return;
        const m = shades[i], zc = (CUR.bounds.z0 + CUR.bounds.z1) / 2, zl = CUR.bounds.z1 - CUR.bounds.z0 + 120;
        m.scale.set(L * w.s, zl, 1); m.position.set(w.x - w.s * L / 2, 0.09, zc); m.material.opacity = op; m.visible = op > 0.05; ENV.shade.push({ s: w.s, x: w.x, L, op, m }); }); }
    ENV.shadeK = 0;
    if (moonL) { moonL.visible = !!T.night; moonL.intensity = W.rain ? 0.4 : 1.0; }
    if (hemi) { hemi.color.set(T.hemiS); hemi.groundColor.set(T.hemiG); hemi.intensity = T.hemiI * W.hemiK; ENV.hemiBase = hemi.intensity; }
    scene.environmentIntensity = T.env * W.envK; renderer.toneMappingExposure = T.exp;
    scene.fog.color.copy(fogCol); scene.fog.density = T.fogD * W.fogK;
    const lk = Math.min(1, T.lamps + (T.night ? 0 : W.lamps)); ENV.lampK = lk; applyLamps(CUR, lk);
    ENV.camFill = T.camFill;
    skyline.group.visible = !CUR.noSkyline; skyline.sil.color.copy(U.hor.value).lerp(U.bot.value, 0.45).multiplyScalar(T.night ? 0.55 : 0.7); skyline.win.opacity = lk;
    weather.set(W);
    for (const m of CUR.grounds || []) { if (m.userData.r0 == null) { m.userData.r0 = m.roughness; m.userData.c0 = m.color.clone(); } m.roughness = W.wet ? m.userData.r0 * 0.28 : m.userData.r0; m.color.copy(m.userData.c0).multiplyScalar(W.wet ? 0.6 : 1); }
    if (CUR.seaM) { CUR.seaM.color.set(T.night ? '#06121c' : tKey === 'maghrib' ? '#22324a' : W.fogCol ? '#2e4652' : '#0b3f5c'); }
    ENV.nextFlash = 3 + Math.random() * 5;
  }
  function updateEnv(dt) {
    // fighters standing in the shade: less direct sun on them (and the strip lightens so the ground there is not doubly dark)
    if (ENV.shade && ENV.shade.length) { let k = 0, n = 0; for (const f of [hero, hero.foe]) { n++; for (const sh of ENV.shade) if (sh.s > 0 ? f.pos.x > sh.x - sh.L : f.pos.x < sh.x + sh.L) { k++; break; } }
      ENV.shadeK += (k / n - ENV.shadeK) * Math.min(1, dt * 3); sun.intensity = ENV.sunBase * (1 - 0.68 * ENV.shadeK); if (hemi && !(ENV.flash > 0)) hemi.intensity = ENV.hemiBase * (1 + 0.3 * ENV.shadeK); for (const sh of ENV.shade) sh.m.material.opacity = sh.op * (1 - 0.45 * ENV.shadeK); }
    sky.mesh.position.copy(camera.position); skyline.group.position.set(camera.position.x, 150, camera.position.z); sky.U.time.value += dt;
    weather.update(dt, camT);
    if (CUR.water) { CUR.water.offset.x += dt * 0.012; CUR.water.offset.y += dt * 0.007; }
    // lightning in a dark rainstorm: a white flash on sky and street, thunder a moment later
    if (ENV.w.rain && ENV.lampK > 0.3) {
      ENV.nextFlash -= dt;
      if (ENV.nextFlash <= 0) { ENV.flash = 0.22; ENV.nextFlash = 7 + Math.random() * 9; setTimeout(() => sfx('thunder'), 500 + Math.random() * 1200); }
      if (ENV.flash > 0) { ENV.flash -= dt; const k = ENV.flash > 0.16 || (ENV.flash > 0.04 && ENV.flash < 0.09) ? 1 : 0.15; if (hemi) hemi.intensity = ENV.hemiBase * (1 + 9 * k); sky.U.glow.value = 0.5 + 4 * k; if (ENV.flash <= 0 && hemi) { hemi.intensity = ENV.hemiBase; sky.U.glow.value = 0.5; } }
    }
  }
  // ------------------------------------------------------------ levels: arena, time, weather, opponents, loadout
  function getFighter(model, name, slot) {
    const cur = foes[slot];
    if (cur && cur.type === model && !foes.some((f, i) => i !== slot && f === cur)) return cur;
    const pool = fighterPool.get(model) || []; let f = pool.find(x => !foes.includes(x) || foes[slot] === x);
    if (!f) { f = new Fighter(model, name, true); attachRing(f); pool.push(f); fighterPool.set(model, pool); }
    scene.add(f.g); return f;
  }
  async function setupLevel(lv, lo) {
    LV = Object.assign({}, lv); LO = Object.assign({}, lo || {});
    const specs = lv.foes && lv.foes.length ? lv.foes : [{ model: lv.model || FOE, name: lv.name, hp: lv.hp, dmg: lv.dmg, aggr: lv.aggr, block: lv.block, react: lv.react, rage: lv.rage }];
    for (const sp of specs) if (!packs[sp.model]) packs[sp.model] = await loadCharPack('./', sp.model);
    for (const f of foes) { if (f.item) drop(f); }
    const next = []; specs.forEach((sp, i) => { const f = getFighter(sp.model, sp.name, i); next.push(f); });
    for (const f of foes) if (!next.includes(f)) { f.g.removeFromParent(); }
    foes = next;
    foes.forEach((f, i) => { const sp = specs[i]; dressFoe(f, i, !!sp.boss); f.spec = sp; f.name = sp.name; f.hpMax = sp.hp || 100; f.dmgK = sp.dmg ?? 1; f.ai = newAI(sp); f.koShown = false; f.g.visible = true; });
    foe = foes[0]; hero.foe = foe; for (const f of foes) f.foe = hero;
    hero.hpMax = LO.shai ? 120 : 100;
    await texturesReady();
    await useArena(lv.arena || 'hara');
    applyEnv(lv.time || 'leil', lv.weather || 'clear');
    const fm = new Set(foes.map(f => f.type).concat([HERO]));
    for (const c of crowd) { for (const m of [].concat(c.userData.rig.mesh.material)) { if (!m.userData.c0) m.userData.c0 = m.color.clone(); m.color.copy(m.userData.c0).multiplyScalar(0.82);
      if (fm.has(c.userData.type) && m.userData.part === 'body') m.color.setHSL(Math.random(), 0.35 + Math.random() * 0.3, 0.32 + Math.random() * 0.2); } }
    const n = Math.min(crowd.length, lv.crowd || crowd.length); crowd.forEach((c, i) => { c.userData.off = i >= n; c.visible = i < n; c.position.set(clamp(Math.cos(c.userData.a) * 34, CUR.crowd.x0, CUR.crowd.x1), 0, clamp(Math.sin(c.userData.a) * 34, CUR.crowd.z0 ?? -999, CUR.crowd.z1 ?? 999)); });
    shouts.length = 0; shouts.push('اديله يا معلم!', 'قوم يا ' + foes[0].name.replace('المعلم ', '') + '، قوم!', 'هي دي الفتونة!', 'الكل بيتفرج!', 'حد يفصل بينهم يا جماعة!', 'خلّصه!', 'جدع يا معلم!', 'يا ساتر!');
    if (foes.length > 1) shouts.push('اتنين على واحد؟ عيب!', 'خد بالك من اللي وراك!');
    ui.names && ui.names(foes.map(f => f.name));
  }
  async function play(lv, lo) { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } await setupLevel(lv, lo); resetMatch(); }
  function toMenu() { resetMatch(true); }
  applyEnv('leil', 'clear');
  resetMatch(true);
  LM.push(['ready', performance.now()]);
  requestAnimationFrame(frame);
  return { renderer, play, toMenu, setupLevel, get state() { return match.state; } };
}
