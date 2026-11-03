// Fotwa El Alam — the places, times of day and weather.
// Every arena is built here from code (no downloads): buildings with painted facades, stalls, microbuses,
// rooftops, the Alexandria corniche and the old Fatimid gate. Units: 1 = 10 cm, a man is about 18 tall.
// Each arena is a street-shaped space along Z (like the alley) so the side-on fight camera always has room.

// ------------------------------------------------------------------ times of day and weather
// sun: elevation / azimuth in degrees; at night the directional "sun" is the warm lamp key and the moon is a separate light
export const TIMES = {
  fajr:    { name: 'الفجر',    top: '#1c2a52', hor: '#d49a8a', bot: '#2e2c38', sun: '#ffc09a', sunI: 1.4, el: 5,  az: -75, hemiS: '#9cacd8', hemiG: '#4c4040', hemiI: 1.3, env: 0.95, exp: 1.12, fog: '#8e8494', fogD: 0.0030, lamps: 0.55, stars: 0.2,  moon: 0,   cloud: '#e0aaa4', camFill: 0.55 },
  sobh:    { name: 'الصبح',    top: '#3f7fc8', hor: '#cfe0ec', bot: '#8c8a80', sun: '#fff0d8', sunI: 2.7, el: 32, az: -22, hemiS: '#bdd4ec', hemiG: '#6c5c4a', hemiI: 1.45, env: 1.25, exp: 0.88, fog: '#c4d4e2', fogD: 0.0016, lamps: 0.0,  stars: 0,    moon: 0,   cloud: '#ffffff', camFill: 0.18 },
  dohr:    { name: 'الضهر',    top: '#2a69c0', hor: '#d6e6f0', bot: '#9c9688', sun: '#fffaf0', sunI: 3.3, el: 66, az: -25, hemiS: '#c8dcf2', hemiG: '#7c6c56', hemiI: 1.65, env: 1.45, exp: 0.8,  fog: '#cfdeea', fogD: 0.0014, lamps: 0.0,  stars: 0,    moon: 0,   cloud: '#ffffff', camFill: 0.14 },
  asr:     { name: 'العصر',    top: '#3a74b6', hor: '#ead8b6', bot: '#8c7c66', sun: '#ffd49a', sunI: 2.6, el: 24, az: 22,  hemiS: '#b4c8e0', hemiG: '#74604a', hemiI: 1.35, env: 1.15, exp: 0.9,  fog: '#d8ccb4', fogD: 0.0018, lamps: 0.05, stars: 0,    moon: 0,   cloud: '#fff2dc', camFill: 0.2 },
  maghrib: { name: 'المغربية', top: '#26386a', hor: '#ff9656', bot: '#3c2a2a', sun: '#ff8a3c', sunI: 1.9, el: 3,  az: 80,  hemiS: '#a88cc4', hemiG: '#4c3228', hemiI: 1.0,  env: 0.85, exp: 1.0,  fog: '#b8786a', fogD: 0.0026, lamps: 0.7,  stars: 0.05, moon: 0,   cloud: '#ff9a6a', camFill: 0.6 },
  leil:    { name: 'بالليل',   top: '#070a18', hor: '#262848', bot: '#120f18', sun: '#ffe2b8', sunI: 1.5, el: 70, az: 30,  hemiS: '#4a4a70', hemiG: '#2a1a10', hemiI: 0.61, env: 0.32, exp: 1.0,  fog: '#18141f', fogD: 0.0055, lamps: 1.0,  stars: 1,    moon: 1,   cloud: '#2a2c40', camFill: 1, night: true },
};
export const WEATHERS = {
  clear:  { name: 'صافي',   clouds: 0.12, sunK: 1,    hemiK: 1,    envK: 1,    fogK: 1,   fogCol: null,      fogMix: 0,    lamps: 0 },
  cloudy: { name: 'غيم',    clouds: 0.72, sunK: 0.45, hemiK: 1.15, envK: 0.9,  fogK: 1.5, fogCol: '#a6aab0', fogMix: 0.3,  lamps: 0.1 },
  rain:   { name: 'مطر',    clouds: 0.95, sunK: 0.28, hemiK: 0.95, envK: 0.85, fogK: 2.2, fogCol: '#56606e', fogMix: 0.5,  lamps: 0.45, rain: true, wet: true },
  fog:    { name: 'شبورة',  clouds: 0.5,  sunK: 0.35, hemiK: 1.2,  envK: 0.95, fogK: 5.5, fogCol: '#c6cace', fogMix: 0.75, lamps: 0.2 },
  dust:   { name: 'خماسين', clouds: 0.3,  sunK: 0.5,  hemiK: 1.1,  envK: 0.85, fogK: 4.5, fogCol: '#c8985a', fogMix: 0.85, lamps: 0.15, dust: true },
};

// ------------------------------------------------------------------ shared helpers
let SEED = 7;
const rnd = () => (SEED = (SEED * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const font = (px, w = 800) => `${w} ${px}px "Cairo","Noto Naskh Arabic",sans-serif`;
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function kit(THREE) {
  const matCache = new Map();
  const std = (c, r = 0.85, extra = {}) => { const k = c + '|' + r + '|' + JSON.stringify(extra); if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, extra))); return matCache.get(k); };
  const ctex = (cv, rep, srgb = true) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
  const tex = (w, h, draw, rep, srgb = true) => { const cv = canvas(w, h); draw(cv.getContext('2d'), w, h); return ctex(cv, rep, srgb); };
  const box = (parent, w, h, d, m, x, y, z, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.y = ry; parent.add(b); return b; };
  const cyl = (parent, rt, rb, h, m, x, y, z, seg = 10) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.position.set(x, y, z); parent.add(c); return c; };
  // glowing bulb: bright at night, a dull lamp by day (the game scales userData.lamp materials)
  const bulbMat = (c = '#ffd890', k = 3) => { const m = new THREE.MeshStandardMaterial({ color: '#4a4236', emissive: c, emissiveIntensity: k, roughness: 0.4 }); m.userData.lamp = k; return m; };
  const noise = (x, w, h, n, a, cols) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${pick(cols)},${rnd() * a})`; const s = 2 + rnd() * 6; x.fillRect(rnd() * w, rnd() * h, s, s * (0.5 + rnd())); } };
  return { std, ctex, tex, box, cyl, bulbMat, noise };
}

// ------------------------------------------------------------------ facades (painted, with a matching night-glow map)
// one texture covers a whole face: floors x bays, shopfronts on the ground floor
const signCols = [['#1d3a6a', '#ffe8a0'], ['#6a1d1d', '#fff2c8'], ['#1d5a3a', '#ffffff'], ['#e8c040', '#2a1a0a'], ['#f2eee4', '#8a1a1a'], ['#2a2a2a', '#ffd040'], ['#c8281e', '#ffffff']];
function paintFacade(K, o) {
  const W = 512, H = 512, c = canvas(W, H), e = canvas(256, 256), x = c.getContext('2d'), ex = e.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 256, 256); ex.scale(0.5, 0.5);
  const fl = o.floors, bays = o.bays, top = o.style === 'brick' ? 14 : 22, fh = (H - top) / fl, bw = W / bays;
  const yOf = (f) => H - (f + 1) * fh;   // top edge of floor f (0 = ground)
  // wall
  if (o.style === 'brick') {
    x.fillStyle = '#8a4a32'; x.fillRect(0, 0, W, H);
    for (let yy = 0; yy < H; yy += 6) for (let xx = -(yy / 6 % 2) * 7; xx < W; xx += 14) { const v = 110 + rnd() * 50; x.fillStyle = `rgb(${v + 30},${v * 0.52},${v * 0.36})`; x.fillRect(xx + 0.5, yy + 0.5, 13, 5); }
    x.fillStyle = '#9a968c'; for (let f = 0; f <= fl; f++) x.fillRect(0, yOf(f) + fh - 7, W, 8); for (let b = 0; b <= bays; b++) x.fillRect(b * bw - 5, 0, 10, H);
    x.fillStyle = '#6a6a66'; for (let b = 0; b <= bays; b++) for (let k = 0; k < 4; k++) x.fillRect(b * bw - 4 + k * 3, 0, 1.2, top + 4);   // rebar on the roof
  } else {
    x.fillStyle = o.base; x.fillRect(0, 0, W, H);
    K.noise(x, W, H, 2600, 0.07, ['40,25,10', '255,245,225']);
    for (let i = 0; i < 14; i++) { const gx = rnd() * W, gy = rnd() * H * 0.6, g = x.createLinearGradient(0, gy, 0, gy + 220); g.addColorStop(0, 'rgba(30,18,6,0.22)'); g.addColorStop(1, 'rgba(30,18,6,0)'); x.fillStyle = g; x.fillRect(gx, gy, 3 + rnd() * 12, 220); }
    if (o.style === 'mamluk') {   // striped ablaq stone on the lower part, carved stone courses
      const yb = yOf(Math.min(1, fl - 1)) + fh; for (let yy = yb; yy < H; yy += 16) { x.fillStyle = ((yy - yb) / 16) % 2 < 1 ? '#d8c4a0' : '#a8563c'; x.fillRect(0, yy, W, 16); }
      x.strokeStyle = 'rgba(60,40,20,0.35)'; x.lineWidth = 1; for (let yy = 0; yy < H; yy += 16) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); for (let xx = (yy / 16 % 2) * 20; xx < W; xx += 40) { x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + 16); x.stroke(); } }
    }
    x.fillStyle = 'rgba(0,0,0,0.18)'; for (let f = 1; f < fl; f++) x.fillRect(0, yOf(f) + fh - 5, W, 6);   // floor cornices
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, W, top * 0.6);
  }
  const lit = (rx, ry, rw, rh, col) => { ex.fillStyle = col; ex.fillRect(rx, ry, rw, rh); };
  const shutterCols = ['#3c5a4a', '#3a5a7a', '#5a3a22', '#6a6a3a', '#2a4a5a'];
  for (let f = 0; f < fl; f++) for (let b = 0; b < bays; b++) {
    const cx = b * bw + bw / 2, y0 = yOf(f);
    if (f === 0) {
      if (o.shop && (b % 2 === 0 || rnd() < 0.4)) {   // shopfront: lit inside, rolling shutter, sign
        const sw = bw * 0.82, sh = fh * 0.62, sx = cx - sw / 2, sy = y0 + fh - sh - 2, open = 0.35 + rnd() * 0.55;
        x.fillStyle = '#1a120c'; x.fillRect(sx, sy, sw, sh); const ins = pick(['#ffcf8a', '#ffe2b0', '#d8f0ff', '#ffb870']);
        x.fillStyle = ins; x.globalAlpha = 0.55; x.fillRect(sx + 2, sy + sh * (1 - open), sw - 4, sh * open); x.globalAlpha = 1; lit(sx, sy + sh * (1 - open), sw, sh * open, ins);
        x.fillStyle = 'rgba(60,40,25,0.8)'; for (let k = 0; k < 3; k++) x.fillRect(sx + 4, sy + sh * (1 - open) + 6 + k * 10, sw - 8, 3);
        for (let k = 0; k < sh * (1 - open); k += 4) { x.fillStyle = k % 8 ? '#8a8e92' : '#6a6e72'; x.fillRect(sx, sy + k, sw, 4); }
        const [bg, fg] = pick(signCols), sy2 = sy - fh * 0.24; x.fillStyle = bg; x.fillRect(sx - 2, sy2, sw + 4, fh * 0.2); x.strokeStyle = fg; x.lineWidth = 2; x.strokeRect(sx + 1, sy2 + 2, sw - 2, fh * 0.2 - 4);
        x.fillStyle = fg; x.font = font(Math.round(fh * 0.13)); x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText(pick(o.signs || SHOPS), cx, sy2 + fh * 0.105, sw - 8);
        if (rnd() < 0.5) lit(sx - 2, sy2, sw + 4, fh * 0.2, 'rgba(255,220,160,0.35)');
      } else {   // arched wooden door
        const dw = bw * 0.4, dh = fh * 0.7, dx = cx - dw / 2, dy = y0 + fh - dh;
        x.fillStyle = '#2a1a10'; x.beginPath(); x.moveTo(dx - 4, y0 + fh); x.lineTo(dx - 4, dy + dw / 2); x.arc(cx, dy + dw / 2, dw / 2 + 4, Math.PI, 0); x.lineTo(dx + dw + 4, y0 + fh); x.fill();
        x.fillStyle = pick(['#5a3a22', '#3c5a4a', '#4a2a1a']); x.fillRect(dx, dy + dw / 2, dw, dh - dw / 2); x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(cx - 1, dy + dw / 2, 2, dh - dw / 2);
        if (rnd() < 0.5) { x.fillStyle = '#ffd890'; x.beginPath(); x.arc(dx + dw + 10, dy + 6, 3, 0, 7); x.fill(); lit(dx + dw + 4, dy, 12, 12, '#ffd890'); }
      }
      continue;
    }
    const kind = o.style === 'mamluk' ? (rnd() < 0.5 ? 'mash' : 'arch') : o.style === 'brick' ? (rnd() < 0.3 ? 'hole' : 'win') : o.style === 'alex' ? (rnd() < 0.55 ? 'balc' : 'shut') : pick(['shut', 'shut', 'balc', 'win', o.style === 'old' ? 'mash' : 'balc']);
    const ww = bw * 0.36, wh = fh * 0.55, wx = cx - ww / 2, wy = y0 + fh * 0.22, isLit = rnd() < 0.42, warm = pick(['#ffcc88', '#ffd8a0', '#ffe6c0', '#c8e0ff']);
    if (kind === 'mash') {   // projecting wooden lattice bay
      const mw = bw * 0.55, mh = fh * 0.62, mx = cx - mw / 2, my = y0 + fh * 0.16;
      x.fillStyle = '#3a2414'; x.fillRect(mx - 3, my - 4, mw + 6, mh + 8); x.fillStyle = '#120a06';
      for (let yy = my + 2; yy < my + mh - 2; yy += 6) for (let xx = mx + 2; xx < mx + mw - 2; xx += 6) { x.beginPath(); x.arc(xx + 3, yy + 3, 2, 0, 7); x.fill(); if (isLit) lit(xx + 1, yy + 1, 4, 4, '#ffae55'); }
      x.fillStyle = '#2a1a0c'; x.fillRect(mx - 6, my + mh + 2, mw + 12, 5); x.fillRect(mx - 6, my - 8, mw + 12, 5);
    } else if (kind === 'arch') {   // tall pointed niche with a small grilled window
      const aw = bw * 0.5, ah = fh * 0.8, ax = cx - aw / 2, ay = y0 + fh * 0.12;
      x.fillStyle = 'rgba(40,24,12,0.35)'; x.beginPath(); x.moveTo(ax, ay + ah); x.lineTo(ax, ay + aw * 0.6); x.quadraticCurveTo(ax, ay, cx, ay - 6); x.quadraticCurveTo(ax + aw, ay, ax + aw, ay + aw * 0.6); x.lineTo(ax + aw, ay + ah); x.fill();
      for (let k = 0; k < 3; k++) { x.strokeStyle = 'rgba(80,50,26,0.5)'; x.beginPath(); x.arc(cx, ay + aw * 0.5 + k * 5, aw * 0.36 - k * 4, Math.PI, 0); x.stroke(); }
      x.fillStyle = '#120a06'; x.fillRect(cx - aw * 0.22, ay + ah * 0.45, aw * 0.44, ah * 0.4); x.fillStyle = '#5a4a3a'; for (let k = 0; k < 5; k++) x.fillRect(cx - aw * 0.22 + k * aw * 0.11, ay + ah * 0.45, 1.5, ah * 0.4);
      if (isLit) lit(cx - aw * 0.22, ay + ah * 0.45, aw * 0.44, ah * 0.4, '#ffb060');
    } else if (kind === 'hole') {   // unfinished: dark opening
      x.fillStyle = '#16100c'; x.fillRect(wx - 6, wy - 4, ww + 12, wh + 8);
    } else {
      x.fillStyle = '#4a3220'; x.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
      x.fillStyle = isLit ? warm : '#141820'; x.fillRect(wx, wy, ww, wh); if (isLit) { lit(wx, wy, ww, wh, warm); x.fillStyle = 'rgba(150,60,30,0.4)'; for (let k = 0; k < ww; k += 6) x.fillRect(wx + k, wy, 3, wh); }
      else { x.fillStyle = 'rgba(160,190,220,0.18)'; x.fillRect(wx + 2, wy + 2, ww * 0.4, wh * 0.5); }
      if (kind === 'shut' || kind === 'balc') {
        const sc = pick(shutterCols); x.fillStyle = sc;
        if (rnd() < 0.5) { x.fillRect(wx - ww * 0.5 - 2, wy, ww * 0.48, wh); x.fillRect(wx + ww + 2, wy, ww * 0.48, wh); }
        else { x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 3; k < wh; k += 4) x.fillRect(wx, wy + k, ww, 1.5); if (isLit) lit(wx, wy, ww, wh, 'rgba(255,190,110,0.25)'); }
      }
      if (kind === 'balc') {   // balcony slab + iron rail + laundry
        const by = wy + wh + 2, bl = bw * 0.84; x.fillStyle = '#6a6258'; x.fillRect(cx - bl / 2, by, bl, 5); x.fillStyle = 'rgba(30,26,22,0.95)'; x.fillRect(cx - bl / 2, by - fh * 0.2, bl, 2); for (let k = 0; k <= bl; k += 5) x.fillRect(cx - bl / 2 + k, by - fh * 0.2, 1.4, fh * 0.2);
        if (rnd() < 0.55) for (let k = 0; k < 4; k++) { x.fillStyle = pick(['#e8e4dc', '#7a9ab8', '#c84a3a', '#e8d8a8', '#5a7a5a', '#d88aa8']); x.fillRect(cx - bl / 2 + 6 + k * bl / 4.4, by - fh * 0.2 + 2, bl / 6, fh * 0.12 + rnd() * 6); }
        if (rnd() < 0.3) { x.fillStyle = '#ddd'; x.beginPath(); x.ellipse(cx + bl / 2 - 8, by - fh * 0.28, 7, 9, 0.4, 0, 7); x.fill(); }
      }
      if (rnd() < 0.3 && o.style !== 'alex') { x.fillStyle = '#e4e2dc'; x.fillRect(wx + ww + 4, wy + wh * 0.4, 16, 12); x.fillStyle = '#9a9a96'; for (let k = 0; k < 5; k++) x.fillRect(wx + ww + 6, wy + wh * 0.4 + 2 + k * 2, 12, 1); }
    }
  }
  // cables and pipes
  x.strokeStyle = 'rgba(10,10,10,0.6)'; x.lineWidth = 1.2; for (let i = 0; i < 3; i++) { x.beginPath(); const y1 = rnd() * H * 0.6 + 40; x.moveTo(0, y1); x.quadraticCurveTo(W / 2, y1 + 20 + rnd() * 30, W, y1 + (rnd() - 0.5) * 30); x.stroke(); }
  x.fillStyle = 'rgba(120,120,112,0.9)'; x.fillRect(W - 10, 0, 4, H);
  const map = K.ctex(c), emi = K.ctex(e);
  return { map, emi };
}
const SHOPS = ['بقالة الأمانة', 'مكوجي النور', 'حلاق الحارة', 'فول وطعمية', 'عطارة السلطان', 'ورشة أبو علي', 'لبن وزبادي', 'خردوات الصفا', 'ترزي الأمل', 'عصير قصب', 'كشري التحرير', 'أدوات منزلية', 'موبايلات الصفوة', 'صيدلية الشفاء', 'مخبز البركة'];

// a row of buildings along one side (s = -1 left, +1 right) whose faces sit at x = s*W, from z0 down to z1
function facadeRow(THREE, K, parent, s, W, z0, z1, o) {
  const pal = o.palette;   // shared facade textures: [{map, emi, floors, bays}]
  let hs = 0, ls = 0;
  const sideM = K.std(o.sideCol || '#6a5a48', 0.95), roofM = K.std(o.roofCol || '#8a847a', 0.95);
  let z = z0;
  while (z > z1) {
    const P = pick(pal), len = P.bays * (o.bayLen || 15) * (0.9 + rnd() * 0.2), H = P.floors * (o.floorH || 30) + 6;
    const m = new THREE.MeshStandardMaterial({ map: P.map, emissiveMap: P.emi, emissive: '#ffffff', emissiveIntensity: 1, roughness: 0.93, color: new THREE.Color(1, 1, 1).offsetHSL(0, 0, (rnd() - 0.5) * 0.1) });
    m.userData.lamp = 1;
    const mats = [sideM, sideM, roofM, sideM, sideM, sideM]; mats[s < 0 ? 0 : 1] = m;
    const b = new THREE.Mesh(new THREE.BoxGeometry(30, H, len), mats); b.position.set(s * (W + 15), H / 2, z - len / 2); parent.add(b);
    // cornice + parapet in 3D (catches light at the roof line)
    K.box(parent, 2.2, 2.4, len, K.std('#8a7a66', 0.95), s * (W + 0.6), H - 1.2, z - len / 2);
    if (o.balconies && P.floors > 1) for (let f = 1; f < P.floors; f++) if (rnd() < 0.5) { const bz = z - len * (0.25 + rnd() * 0.5), by = f * (o.floorH || 30) + 4; K.box(parent, 4.2, 0.9, 12, K.std('#7a7268', 0.9), s * (W - 2), by, bz); K.box(parent, 0.35, 5.5, 12, K.std('#1a1816', 0.5, { metalness: 0.6 }), s * (W - 4), by + 3, bz); }
    if (o.ac) for (let k = 0; k < 2; k++) if (rnd() < 0.5) { const f = 1 + Math.floor(rnd() * Math.max(1, P.floors - 1)); K.box(parent, 3.4, 4, 7, K.std('#e8e6e0', 0.6), s * (W - 1.7), f * (o.floorH || 30) + 6, z - len * rnd()); }
    if (o.roofClutter) { for (let k = 0; k < 2; k++) { const t = K.cyl(parent, 2.6, 2.6, 5.5, K.std(rnd() < 0.5 ? '#2a3a4a' : '#d8d4c8', 0.6), s * (W + 6 + rnd() * 18), H + 2.75, z - 4 - rnd() * (len - 8), 12); } }
    // shop signs sticking out of the wall over the pavement, readable from up and down the street
    if (o.signs3d !== false && K.__signs && rnd() < 0.65) { const st = pick(K.__signs), sz = z - len * (0.2 + rnd() * 0.6), sy = 24 + rnd() * 8;
      const sg = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 0.7), [K.__signEdge, K.__signEdge, K.__signEdge, K.__signEdge, st, st]); sg.position.set(s * (W - 5.4), sy, sz); parent.add(sg);
      K.box(parent, 1.4, 0.3, 0.3, K.std('#1a1816', 0.5, { metalness: 0.6 }), s * (W - 0.7), sy + 1.4, sz); K.box(parent, 1.4, 0.3, 0.3, K.std('#1a1816', 0.5, { metalness: 0.6 }), s * (W - 0.7), sy - 1.4, sz); }
    hs += H * len; ls += len;
    z -= len + 0.2;
  }
  // soot and damp where the walls meet the ground (a soft dark band on the wall and on the pavement)
  if (K.__grime && o.grime !== false) { const L = z0 - z1;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, 14), K.__grime); wall.position.set(s * (W - 0.08), 7, (z0 + z1) / 2); wall.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; wall.userData.keep = true; parent.add(wall);
    const flo = new THREE.Mesh(new THREE.PlaneGeometry(L, 9), K.__grimeG); flo.rotation.set(-Math.PI / 2, 0, s < 0 ? -Math.PI / 2 : Math.PI / 2); flo.position.set(s * (W - 4.5), 0.05, (z0 + z1) / 2); flo.userData.keep = true; parent.add(flo); }
  return ls ? hs / ls : 0;
}
// tangled overhead cables slung across the street (wires sag between the two building rows)
function cables(THREE, K, parent, W, z0, z1, n) {
  const m = K.std('#0c0c0c', 0.8);
  for (let i = 0; i < n; i++) { const za = z0 - rnd() * (z0 - z1), zb = za + (rnd() - 0.5) * 40, ya = 38 + rnd() * 50, yb = 38 + rnd() * 50;
    const a = new THREE.Vector3(-W + 0.5, ya, za), b = new THREE.Vector3(W - 0.5, yb, zb), mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 5 + rnd() * 9;
    parent.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.09 + rnd() * 0.06, 4), m)); }
}
// litter, manholes, drains: small things on the ground that make it a used street
function streetDetail(THREE, K, parent, x0, x1, z0, z1, n) {
  const paper = K.std('#e8e4d8', 0.9, { side: THREE.DoubleSide }), bag = K.std('#1a1a1a', 0.4), can = K.std('#b83a2a', 0.4, { metalness: 0.6 }), iron = K.std('#3a3632', 0.6, { metalness: 0.5 });
  for (let i = 0; i < n; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), r = rnd();
    if (r < 0.5) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + rnd(), 0.6 + rnd() * 0.8), paper); p.rotation.set(-Math.PI / 2, 0, rnd() * 6); p.position.set(x, 0.06, z); parent.add(p); }
    else if (r < 0.75) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.2, 8), can); c.rotation.set(Math.PI / 2, 0, rnd() * 6); c.position.set(x, 0.33, z); parent.add(c); }
    else { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rnd() * 0.6, 0), bag); b.scale.y = 0.55; b.position.set(x, 0.45, z); parent.add(b); } }
  for (let i = 0; i < 3; i++) { const mh = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.15, 20), iron); mh.position.set(x0 + rnd() * (x1 - x0), 0.06, z0 + rnd() * (z1 - z0)); parent.add(mh); }
}
// a row closing the street at z = zEnd (faces toward the street, along X)
function endRow(THREE, K, parent, zEnd, dir, W, o) {
  const g = new THREE.Group(); facadeRow(THREE, K, g, -1, 0, W, -W, Object.assign({}, o, { grime: false }));
  g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; g.position.z = zEnd; parent.add(g);
}

// ------------------------------------------------------------------ props
function crateTex(K) { return K.tex(128, 128, (x) => { x.fillStyle = '#a07a46'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#8a6436' : '#b48a52'; x.fillRect(0, i * 32 + 4, 128, 24); } x.fillStyle = '#5a3a1a'; x.fillRect(0, 0, 8, 128); x.fillRect(120, 0, 8, 128); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 4; i++) x.fillRect(0, i * 32 + 28, 128, 4); }); }
function stripeTex(K, a, b) { return K.tex(256, 64, (x) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * 16, 0, 16, 64); } x.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i < 300; i++) x.fillRect(rnd() * 256, rnd() * 64, 2, 2); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 56, 256, 8); }); }
// catenary string of bulbs across the street at z
function festoon(THREE, K, parent, z, W, y, sag, lamps, col = '#ffd890') {
  const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(-W + 2 * W * t, y - Math.sin(t * Math.PI) * sag, z)); }
  const curve = new THREE.CatmullRomCurve3(pts); parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.08, 4), K.std('#141414', 0.6)));
  const bm = K.bulbMat(col, 2.6);
  for (let i = 1; i < 18; i++) { const p = curve.getPoint(i / 18); const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), bm); b.position.copy(p).add(new THREE.Vector3(0, -0.8, 0)); parent.add(b); }
  if (lamps) { const pl = new THREE.PointLight(col, 260, 60, 1.6); pl.position.copy(curve.getPoint(0.5)).add(new THREE.Vector3(0, -3, 0)); parent.add(pl); }
}
function lantern(THREE, K, parent, x, y, z, col = '#ffb040') {
  const g = new THREE.Group(); const brass = K.std('#b08a3a', 0.3, { metalness: 0.9 }), glass = K.bulbMat(col, 2.2);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.8, 6), glass); g.add(body);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.3, 6), brass); top.position.y = 2; g.add(top);
  const bot = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.9, 6), brass); bot.position.y = -1.85; bot.rotation.x = Math.PI; g.add(bot);
  g.position.set(x, y, z); parent.add(g); return g;
}
function streetLamp(THREE, K, parent, x, z, side, h = 46, col = '#ffb860', lamps) {
  const pole = K.std('#2a2c2e', 0.5, { metalness: 0.6 });
  K.cyl(parent, 0.45, 0.7, h, pole, x, h / 2, z, 8);
  const arm = K.box(parent, 9, 0.5, 0.5, pole, x - side * 4.5, h - 0.5, z);
  const head = K.box(parent, 3.4, 1.2, 1.8, pole, x - side * 9, h - 1.2, z);
  const lens = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 1.4), K.bulbMat(col, 4)); lens.position.set(x - side * 9, h - 1.9, z); parent.add(lens);
  if (lamps) { const pl = new THREE.PointLight(col, 420, 75, 1.6); pl.position.set(x - side * 9, h - 4, z); parent.add(pl); }
}
function microbus(THREE, K, parent, x, z, ry, stripe = '#1d4a9a') {
  const g = new THREE.Group(); const body = K.std('#ecebe6', 0.35, { metalness: 0.25 }), dark = K.std('#151a20', 0.15, { metalness: 0.3 }), black = K.std('#121212', 0.7), chrome = K.std('#c8c8c8', 0.25, { metalness: 0.9 });
  K.box(g, 44, 17, 17, body, 0, 11.5, 0);                // body (length along x)
  K.box(g, 10, 9, 16.6, body, -24, 8, 0).rotation.z = 0.12;   // nose
  K.box(g, 44.2, 2.2, 17.2, K.std(stripe, 0.5), 0, 9.5, 0);   // stripe
  for (const s of [-1, 1]) { K.box(g, 36, 5.5, 0.3, dark, 2, 16.5, s * 8.6); }   // side windows
  K.box(g, 0.3, 6, 15, dark, -26.4, 15, 0).rotation.z = -0.35;  // windscreen
  K.box(g, 0.3, 7, 15, dark, 22.1, 15, 0);
  K.box(g, 44, 0.8, 16, K.std('#b8b6b0', 0.6), 0, 20.4, 0);    // roof rack
  for (const [wx, wz] of [[-16, 8.6], [-16, -8.6], [14, 8.6], [14, -8.6]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 2.2, 18), black); w.rotation.x = Math.PI / 2; w.position.set(wx, 3.2, wz); g.add(w); const h = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 10), chrome); h.rotation.x = Math.PI / 2; h.position.copy(w.position); g.add(h); }
  for (const s of [-1, 1]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 2.6), K.bulbMat('#fff2d0', 1.2)); hl.position.set(-28.6, 8.5, s * 5.5); g.add(hl); }
  g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); return g;
}
function tuktuk(THREE, K, parent, x, z, ry, col = '#c8281e') {
  const g = new THREE.Group(); const body = K.std(col, 0.35, { metalness: 0.3 }), black = K.std('#151515', 0.6);
  K.box(g, 14, 9, 9, body, 1, 7.5, 0); K.box(g, 15, 0.8, 10, black, 1, 15.6, 0); K.box(g, 5, 8, 7, body, -8.4, 7, 0).rotation.z = -0.25; K.box(g, 15.2, 0.6, 10.2, K.std('#e8c020', 0.6), 1, 15, 0);
  for (const [wx, wz] of [[-9, 0], [6, 4.4], [6, -4.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 1.4, 16), black); w.rotation.x = Math.PI / 2; w.position.set(wx, 1.9, wz); g.add(w); }
  g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); return g;
}
function cart(THREE, K, parent, x, z, ry, load = 'veg') {   // wooden hand/donkey cart with goods
  const g = new THREE.Group(); const wood = K.std('#7a5a34', 0.8);
  K.box(g, 14, 1, 7, wood, 0, 6.5, 0); for (const s of [-1, 1]) K.box(g, 14, 2.4, 0.4, K.std('#2a6aa8', 0.6), 0, 8, s * 3.5);
  K.box(g, 10, 0.5, 0.5, wood, -11, 6.6, 2.5); K.box(g, 10, 0.5, 0.5, wood, -11, 6.6, -2.5);
  for (const wz of [-4, 4]) { const w = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 6, 18), K.std('#2a1a10', 0.8)); w.position.set(1, 3.3, wz); g.add(w); }
  produce(THREE, K, g, 0, 7.2, 0, 12, 5.5, load);
  g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); return g;
}
const PRODUCE = { veg: ['#d8401e', '#3a7a2a', '#e8a020', '#5a2a5a', '#c8d040'], fruit: ['#f08a1a', '#e8c020', '#c82a2a', '#7ab030', '#f0a040'], spice: ['#c8761e', '#a8321e', '#e8b82a', '#6a4a2a', '#2a6a3a'], fish: ['#a8b0b8', '#8a96a0', '#c0c6cc'] };
function produce(THREE, K, parent, x, y, z, w, d, kind) {   // heaped goods: many small low-poly pieces (merged later into one draw call)
  const cols = PRODUCE[kind] || PRODUCE.veg, geo = new THREE.IcosahedronGeometry(0.7, 0);
  const rows = Math.floor(w / 1.3), cols2 = Math.floor(d / 1.3), col = pick(cols), col2 = pick(cols);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols2; j++) for (let l = 0; l < 2; l++) {
    if (l === 1 && (i === 0 || j === 0 || i === rows - 1 || j === cols2 - 1)) continue;
    const m = new THREE.Mesh(geo, K.std(i < rows / 2 ? col : col2, kind === 'fish' ? 0.3 : 0.6)); m.position.set(x - w / 2 + 0.65 + i * 1.3 + rnd() * 0.2, y + 0.6 + l * 0.9, z - d / 2 + 0.65 + j * 1.3); m.rotation.set(rnd() * 3, rnd() * 3, 0); if (kind === 'fish') m.scale.set(1.8, 0.4, 0.6); parent.add(m);
  }
}
function stall(THREE, K, parent, x, z, s, kind, awnT, lamps) {   // market stall facing the street (s: side)
  const g = new THREE.Group(); const wood = K.std('#6a4a2a', 0.8), crate = K.std('#ffffff', 0.85, { map: K.__crate });
  K.box(g, 8, 6, 13, wood, 0, 3, 0);
  if (kind === 'clothes') { for (let k = 0; k < 5; k++) { const cl = new THREE.Mesh(new THREE.PlaneGeometry(3, 5 + rnd() * 2), K.std(pick(['#c84a3a', '#2a4a8a', '#e8d8a8', '#3a6a4a', '#8a3a7a', '#e8e4dc']), 0.95, { side: THREE.DoubleSide })); cl.position.set(-s * 3.6, 13, -5 + k * 2.5); cl.rotation.y = Math.PI / 2; g.add(cl); } }
  else if (kind === 'brass') { for (let k = 0; k < 4; k++) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.2, 18), K.std('#c89a3a', 0.25, { metalness: 0.9 })); pl.rotation.z = Math.PI / 2; pl.position.set(-s * 3.9, 9 + (k % 2) * 4, -4 + k * 2.6); g.add(pl); } for (let k = 0; k < 3; k++) lantern(THREE, K, g, -s * 1, 15, -4 + k * 4, pick(['#ffb040', '#ff6a3a', '#7ad86a', '#5aa8ff'])); }
  else produce(THREE, K, g, 0, 6, 0, 7, 12, kind);
  for (let k = 0; k < 3; k++) { const c = K.box(g, 3, 2.4, 3.4, crate, -s * (5.6 + (k % 2) * 0.4), 1.2 + (k === 2 ? 2.4 : 0), -3.8 + (k % 2) * 4); c.rotation.y = rnd() * 0.3; }
  const pole = K.std('#3a2a1a', 0.8); for (const [px, pz] of [[-4, -6.5], [-4, 6.5], [4, -6.5], [4, 6.5]]) K.cyl(g, 0.22, 0.22, px * s < 0 ? 17 : 20, pole, px, (px * s < 0 ? 17 : 20) / 2, pz, 6);
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(10, 15), K.std('#ffffff', 0.9, { map: awnT, side: THREE.DoubleSide })); awn.rotation.set(-Math.PI / 2, 0, 0); awn.rotateY(s * 0.32); awn.position.set(0, 18.6, 0); g.add(awn);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), K.bulbMat('#ffe0a0', 3)); b.position.set(-s * 1, 15.5, 0); g.add(b);
  if (lamps) { const pl = new THREE.PointLight('#ffd090', 140, 34, 1.7); pl.position.set(-s * 3, 14, 0); g.add(pl); }
  g.position.set(x, 0, z); parent.add(g); return g;
}
function minaret(THREE, K, parent, x, z, h, m, accent) {   // slender Mamluk-style minaret: square base, octagonal shaft, two balconies, bulb top
  const g = new THREE.Group();
  K.box(g, 12, h * 0.38, 12, m, 0, h * 0.19, 0);
  K.cyl(g, 4.6, 5.4, h * 0.32, m, 0, h * 0.38 + h * 0.16, 0, 8);
  K.cyl(g, 7.4, 6.2, 2.6, accent || m, 0, h * 0.7 + 1.3, 0, 12);
  K.cyl(g, 3.4, 4.0, h * 0.18, m, 0, h * 0.7 + 2.6 + h * 0.09, 0, 12);
  K.cyl(g, 5.6, 4.6, 2, accent || m, 0, h * 0.88 + 3.6, 0, 12);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; K.cyl(g, 0.25, 0.25, 4, m, Math.cos(a) * 2.6, h * 0.88 + 6.6, Math.sin(a) * 2.6, 5); }
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 10), m); bulb.scale.y = 1.35; bulb.position.y = h * 0.88 + 11; g.add(bulb);
  K.cyl(g, 0.2, 0.2, 5, K.std('#c8a24a', 0.3, { metalness: 0.9 }), 0, h * 0.88 + 17, 0, 5);
  g.position.set(x, 0, z); parent.add(g); return g;
}
function dome(THREE, K, parent, x, y, z, r, m) { const d = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m); d.position.set(x, y, z); parent.add(d); K.cyl(parent, r * 1.02, r * 1.05, r * 0.5, m, x, y - r * 0.25, z, 20); return d; }
function palm(THREE, K, parent, x, z, h = 70) {
  const trunk = K.std('#6a5236', 0.95), leaf = K.std('#3a5a26', 0.85, { side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) K.cyl(parent, 1.3 - i * 0.06, 1.4 - i * 0.06, h / 6, trunk, x + Math.sin(i * 0.4) * 0.6, h / 12 + i * h / 6, z, 8);
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; const l = new THREE.Mesh(new THREE.PlaneGeometry(3, 22), leaf); l.position.set(x + Math.cos(a) * 9, h - 4, z + Math.sin(a) * 9); l.rotation.set(Math.PI / 2 - 0.5, 0, -a + Math.PI / 2, 'YXZ'); l.rotation.y = -a - Math.PI / 2; l.rotation.x = 1.1; parent.add(l); }
}
function laundryLine(THREE, K, parent, x1, z1, x2, z2, y) {
  const a = new THREE.Vector3(x1, y, z1), b = new THREE.Vector3(x2, y, z2), mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 2.5;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b); parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.07, 4), K.std('#d8d8d0', 0.8)));
  const n = Math.floor(a.distanceTo(b) / 4);
  for (let i = 1; i < n; i++) { if (rnd() < 0.25) continue; const p = curve.getPoint(i / n); const w = 2 + rnd() * 1.5, h = 3 + rnd() * 3; const cl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), K.std(pick(['#e8e4dc', '#7a9ab8', '#c84a3a', '#e8d8a8', '#5a7a5a', '#d88aa8', '#3a4a7a', '#ffffff']), 0.95, { side: THREE.DoubleSide })); cl.position.set(p.x, p.y - h / 2, p.z); cl.lookAt(p.x + (z2 - z1), p.y - h / 2, p.z - (x2 - x1)); parent.add(cl); }
}
function waterTank(THREE, K, parent, x, z, y0 = 0) {
  const steel = K.std('#3a3c3e', 0.6, { metalness: 0.5 });
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) K.cyl(parent, 0.3, 0.3, 10, steel, x + dx, y0 + 5, z + dz, 5);
  K.box(parent, 8, 0.6, 8, steel, x, y0 + 10, z);
  K.cyl(parent, 4, 4, 9, K.std(pick(['#2a3a4a', '#d8d4c8', '#1a1a1a']), 0.5), x, y0 + 14.8, z, 16);
}
function dish(THREE, K, parent, x, y, z, ry) { const d = new THREE.Mesh(new THREE.SphereGeometry(3, 14, 6, 0, Math.PI * 2, 0, Math.PI / 3.5), K.std('#e8e8e4', 0.4, { metalness: 0.3, side: THREE.DoubleSide })); d.rotation.set(-0.5, ry, 1.1); d.position.set(x, y, z); parent.add(d); K.cyl(parent, 0.15, 0.15, 3, K.std('#888', 0.5), x, y - 1.5, z, 5); }
function bench(THREE, K, parent, x, z, ry) { const g = new THREE.Group(); const w = K.std('#5a3a1e', 0.8), ir = K.std('#1e2a24', 0.5, { metalness: 0.6 }); K.box(g, 14, 0.6, 3.6, w, 0, 4.4, 0); K.box(g, 14, 3, 0.5, w, 0, 7, -1.7); for (const sx of [-6, 6]) K.box(g, 0.6, 4.4, 3.6, ir, sx, 2.2, 0); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); }

// ------------------------------------------------------------------ ground textures
function groundTex(K, kind) {
  if (kind === 'asphalt') return K.tex(1024, 1024, (x, w, h) => { x.fillStyle = '#3a3a3c'; x.fillRect(0, 0, w, h); K.noise(x, w, h, 16000, 0.18, ['0,0,0', '200,200,200', '120,110,100']); for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${rnd() < 0.5 ? '20,20,22' : '90,88,84'},${0.25 + rnd() * 0.3})`; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 30 + rnd() * 120, 20 + rnd() * 70, rnd() * 3, 0, 7); x.fill(); } x.strokeStyle = 'rgba(10,10,10,0.6)'; x.lineWidth = 2; for (let i = 0; i < 14; i++) { x.beginPath(); let px = rnd() * w, py = rnd() * h; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (rnd() - 0.5) * 80; py += (rnd() - 0.5) * 80; x.lineTo(px, py); } x.stroke(); } }, [6, 18]);
  if (kind === 'dirt') return K.tex(1024, 1024, (x, w, h) => { x.fillStyle = '#6a5a48'; x.fillRect(0, 0, w, h); K.noise(x, w, h, 14000, 0.2, ['30,20,10', '200,180,150', '90,70,50']); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${pick(['50,40,30', '120,100,70', '60,80,40', '140,60,30'])},${0.2 + rnd() * 0.3})`; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 8 + rnd() * 70, 5 + rnd() * 40, rnd() * 3, 0, 7); x.fill(); } for (let i = 0; i < 160; i++) { x.fillStyle = pick(['#3a6a2a', '#c8a030', '#8a2a1a', '#d8c8a0']); x.fillRect(rnd() * w, rnd() * h, 4 + rnd() * 6, 2 + rnd() * 3); } }, [6, 18]);
  if (kind === 'roof') return K.tex(1024, 1024, (x, w, h) => { x.fillStyle = '#9a948a'; x.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) { const v = 130 + rnd() * 40; x.fillStyle = `rgb(${v + 6},${v},${v - 8})`; x.fillRect(c * 64 + 1, r * 64 + 1, 62, 62); } K.noise(x, w, h, 9000, 0.14, ['0,0,0', '255,250,240']); for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(${pick(['20,20,20', '70,50,30', '40,40,48'])},${0.3 + rnd() * 0.4})`; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 90, 14 + rnd() * 50, rnd() * 3, 0, 7); x.fill(); } }, [8, 14]);
  if (kind === 'tiles') return K.tex(1024, 1024, (x, w, h) => { const cols = ['#c8bca4', '#a89c88', '#d8ccb4', '#8a8478']; for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) { x.fillStyle = (r + c) % 4 === 0 ? '#8a6a58' : pick(cols); x.fillRect(c * 64, r * 64, 64, 64); x.strokeStyle = 'rgba(40,30,20,0.4)'; x.lineWidth = 2; x.strokeRect(c * 64 + 1, r * 64 + 1, 62, 62); } K.noise(x, w, h, 8000, 0.12, ['0,0,0', '255,250,240']); }, [8, 20]);
}

// ------------------------------------------------------------------ sky dome (gradient, sun/moon disc, clouds, stars)
export function makeSky(THREE) {
  const U = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, disc: { value: 0.9995 },
    cloudCol: { value: new THREE.Color() }, clouds: { value: 0.1 }, stars: { value: 0 }, time: { value: 0 }, glow: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 top, hor, bot, sunDir, sunCol, cloudCol; uniform float disc, clouds, stars, time, glow; varying vec3 vD;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 col = h > 0.0 ? mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.5)) : mix(hor, bot, clamp(-h * 5.0, 0.0, 1.0));
        float sd = max(dot(d, sunDir), 0.0);
        col += sunCol * (pow(sd, 6.0) * 0.22 + pow(sd, 48.0) * 0.5) * glow;
        float c = 0.0;
        if (h > 0.0) { vec2 uv = d.xz / (h + 0.12) * 1.3 + vec2(time * 0.004, time * 0.002); float n = fbm(uv * 1.7);
          c = smoothstep(1.0 - clouds, 1.0 - clouds + 0.38, n) * smoothstep(0.0, 0.12, h);
          vec3 cc = cloudCol * (0.72 + 0.4 * n) + sunCol * pow(sd, 10.0) * 0.4 * glow; col = mix(col, cc, c * 0.92);
          float st = step(0.9965, h2(floor(d.xz / (h + 0.25) * 260.0))) * stars * (1.0 - c) * smoothstep(0.05, 0.3, h); col += vec3(st) * 0.9; }
        col += sunCol * smoothstep(disc, disc + 0.00025, sd) * 3.0 * (1.0 - c * 0.85);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), mat); mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.userData.noLamp = true;
  return { mesh, U };
}
// far city silhouette ring (minarets, domes, towers) + its night windows
export function makeSkyline(THREE) {
  const K = kit(THREE); SEED = 4242;
  const W = 2048, H = 256, c = canvas(W, H), e = canvas(W / 2, H / 2), x = c.getContext('2d'), ex = e.getContext('2d');
  x.clearRect(0, 0, W, H); ex.fillStyle = '#000'; ex.fillRect(0, 0, W / 2, H / 2); x.fillStyle = '#fff';
  let px = 0; while (px < W) { const bw = 20 + rnd() * 60, bh = 30 + rnd() * 70; x.fillRect(px, H - bh, bw, bh); for (let k = 0; k < bw * bh / 220; k++) if (rnd() < 0.35) { ex.fillStyle = pick(['#ffcf88', '#ffe0b0', '#c8dcff']); ex.fillRect((px + rnd() * bw) / 2, (H - rnd() * bh) / 2, 1, 1); } px += bw + rnd() * 6; }
  for (let i = 0; i < 18; i++) { const mx = rnd() * W, mh = 110 + rnd() * 100; x.fillRect(mx - 3, H - mh, 6, mh); x.fillRect(mx - 6, H - mh * 0.62, 12, 4); x.fillRect(mx - 5, H - mh * 0.86, 10, 3); x.beginPath(); x.ellipse(mx, H - mh - 4, 4, 7, 0, 0, 7); x.fill(); }
  for (let i = 0; i < 10; i++) { const dx = rnd() * W, r = 18 + rnd() * 26, by = H - 60 - rnd() * 20; x.fillRect(dx - r * 1.3, by, r * 2.6, H - by); x.beginPath(); x.arc(dx, by, r, Math.PI, 0); x.fill(); }
  for (let i = 0; i < 4; i++) { const tx = rnd() * W; x.fillRect(tx - 7, H - 170 - rnd() * 40, 14, 220); }
  const t = K.ctex(c), te = K.ctex(e); t.wrapS = te.wrapS = THREE.RepeatWrapping; t.repeat.x = te.repeat.x = 3;
  const geo = new THREE.CylinderGeometry(1300, 1300, 340, 48, 1, true);
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.BackSide, fog: false, depthWrite: false, color: '#202030' }); m.alphaMap = t;
  const mw = new THREE.MeshBasicMaterial({ map: te, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 1 });
  const g = new THREE.Group(); const a = new THREE.Mesh(geo, m), b = new THREE.Mesh(geo, mw); a.renderOrder = b.renderOrder = -9; g.add(a, b); g.position.y = 150; a.frustumCulled = b.frustumCulled = false; g.userData.noLamp = true;
  return { group: g, sil: m, win: mw };
}

// ------------------------------------------------------------------ rain, dust
export function makeWeather(THREE, lowQ) {
  const N = lowQ ? 520 : 1100, pos = new Float32Array(N * 6), vel = new Float32Array(N);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#b8c4d4', transparent: true, opacity: 0.42, depthWrite: false })); rain.frustumCulled = false; rain.visible = false;
  const D = lowQ ? 160 : 280, dpos = new Float32Array(D * 3), dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const sprite = (() => { const cv = canvas(64, 64), x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ map: sprite, color: '#d8aa70', size: 7, transparent: true, opacity: 0.32, depthWrite: false })); dust.frustumCulled = false; dust.visible = false;
  const BX = 90, BY = 70, BZ = 90; let cx = 0, cz = 0, wind = 0;
  for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * BX * 2, y = Math.random() * BY, z = (Math.random() - 0.5) * BZ * 2; pos.set([x, y, z, x, y + 2.4, z], i * 6); vel[i] = 100 + Math.random() * 40; }
  for (let i = 0; i < D; i++) dpos.set([(Math.random() - 0.5) * BX * 2, Math.random() * 40, (Math.random() - 0.5) * BZ * 2], i * 3);
  return {
    objects: [rain, dust],
    set(w) { rain.visible = !!w.rain; dust.visible = !!w.dust; wind = w.dust ? 18 : w.rain ? 7 : 0; },
    update(dt, center) {
      if (rain.visible) {
        const dx = center.x - cx, dz = center.z - cz; cx = center.x; cz = center.z;
        for (let i = 0; i < N; i++) { const o = i * 6; let x = pos[o] - dx * 0, y = pos[o + 1] - vel[i] * dt, z = pos[o + 2];
          x += wind * dt; if (y < 0 || Math.abs(x - cx) > BX || Math.abs(z - cz) > BZ) { x = cx + (Math.random() - 0.5) * BX * 2; z = cz + (Math.random() - 0.5) * BZ * 2; y = BY * (0.6 + Math.random() * 0.4); }
          pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; pos[o + 3] = x - wind * 0.025; pos[o + 4] = y + 2.6; pos[o + 5] = z; }
        geo.attributes.position.needsUpdate = true;
      }
      if (dust.visible) {
        cx = center.x; cz = center.z;
        for (let i = 0; i < D; i++) { const o = i * 3; let x = dpos[o] + wind * dt, y = dpos[o + 1] + Math.sin((x + i) * 0.05) * dt * 3, z = dpos[o + 2] + Math.sin(i + x * 0.02) * dt * 4;
          if (Math.abs(x - cx) > BX || Math.abs(z - cz) > BZ || y < 0 || y > 45) { x = cx - BX * Math.sign(wind || 1) + Math.random() * 10; z = cz + (Math.random() - 0.5) * BZ * 2; y = Math.random() * 40; }
          dpos[o] = x; dpos[o + 1] = y; dpos[o + 2] = z; }
        dgeo.attributes.position.needsUpdate = true;
      }
    },
  };
}

// ------------------------------------------------------------------ the arenas
// returns { group, bounds:{x0,x1,z0,z1}, cam:{x0,x1,z0,z1}, obst:[[x,z,r]], grounds:[materials], label }
export function buildArena(THREE, key, opts = {}) {
  const [kind, variant] = key.split(':');
  const K = kit(THREE); K.__crate = crateTex(K);
  { const grad = (cols) => K.tex(8, 128, (x) => { const gr = x.createLinearGradient(0, 0, 0, 128); cols.forEach(([t, c]) => gr.addColorStop(t, c)); x.fillStyle = gr; x.fillRect(0, 0, 8, 128); });
    K.__grime = new THREE.MeshBasicMaterial({ map: grad([[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(10,6,2,0.25)'], [1, 'rgba(10,6,2,0.6)']]), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    K.__grimeG = new THREE.MeshBasicMaterial({ map: grad([[0, 'rgba(8,5,2,0.55)'], [1, 'rgba(8,5,2,0)']]), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    K.__grime.userData.noLamp = K.__grimeG.userData.noLamp = true;
    K.__signEdge = K.std('#2a2420', 0.6);
    K.__signs = ['كشري', 'حلاق', 'صيدلية', 'بقالة', 'ترزي', 'فول وطعمية', 'موبايلات', 'عصير'].slice(0, 6).map((t, i) => { const [bg, fg] = signCols[i % signCols.length]; const tx = K.tex(256, 96, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 5; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = fg; x.font = font(52, 900); x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText(t, w / 2, h / 2 + 3); });
      const m = new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: 0.5, roughness: 0.6 }); m.userData.lamp = 0.5; return m; }); }
  const g = new THREE.Group(); g.name = 'arena:' + key;
  SEED = opts.seed || (key.length * 977 + 13);
  const lamps = !!opts.lamps;
  const out = { group: g, grounds: [], obst: [], label: key };
  const ground = (mat, w, len, zc, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat); m.rotation.x = -Math.PI / 2; m.position.set(0, y, zc); g.add(m); out.grounds.push(mat); return m; };
  const palette = (n, styleList, baseList, floorsRange, bays, signs) => Array.from({ length: n }, (_, i) => { const floors = floorsRange[0] + Math.floor(rnd() * (floorsRange[1] - floorsRange[0] + 1)), b = pick(bays); return Object.assign(paintFacade(K, { floors, bays: b, base: pick(baseList), style: pick(styleList), shop: true, signs }), { floors, bays: b }); });
  const sidewalk = (W, z0, z1, col = '#8a8276') => { const len = z0 - z1; for (const s of [-1, 1]) { K.box(g, 8, 0.8, len, K.std(col, 0.9), s * (W - 4), 0.4, (z0 + z1) / 2); K.box(g, 0.6, 0.9, len, K.std('#6a6258', 0.9), s * (W - 8), 0.45, (z0 + z1) / 2); } };

  if (kind === 'souq' || kind === 'khan') {
    const W = 64, Z0 = 120, Z1 = -175;
    const khan = kind === 'khan';
    const gm = khan && opts.groundMaps ? new THREE.MeshStandardMaterial({ map: opts.groundMaps.map, normalMap: opts.groundMaps.normal, roughnessMap: opts.groundMaps.rough, roughness: 1, color: '#d8c8b0' }) : new THREE.MeshStandardMaterial({ map: groundTex(K, 'dirt'), roughness: 0.95 });
    ground(gm, W * 2 + 40, Z0 - Z1 + 60, (Z0 + Z1) / 2);
    const pal = palette(5, khan ? ['mamluk', 'old', 'old'] : ['old', 'apt', 'old'], ['#c9a77c', '#b98f68', '#d8c09a', '#a89880', '#c7a08a', '#bfa58c'], [2, 4], [2, 3], khan ? ['خان الخليلي', 'نحاسيات الحسين', 'عطارة الأزهر', 'فضيات النور', 'بازار السلطان', 'قهوة الفيشاوي'] : ['خضار وفاكهة', 'جزارة الحاج', 'أسماك البحر', 'عطارة السلطان', 'منظفات الأمانة', 'لحوم بلدي', 'فرارجي الحرية']);
    const hL = facadeRow(THREE, K, g, -1, W, Z0, Z1, { palette: pal, balconies: true, ac: !khan, roofClutter: true });
    const hR = facadeRow(THREE, K, g, 1, W, Z0, Z1, { palette: pal, balconies: true, ac: !khan, roofClutter: true });
    out.walls = [{ s: -1, x: -W, h: hL }, { s: 1, x: W, h: hR }]; cables(THREE, K, g, W, Z0, Z1, khan ? 6 : 12); streetDetail(THREE, K, g, -46, 46, -140, 90, 50);
    endRow(THREE, K, g, Z1, -1, W, { palette: pal }); endRow(THREE, K, g, Z0, 1, W, { palette: pal });
    const awns = [stripeTex(K, '#e8e0cc', '#2f6a4a'), stripeTex(K, '#e8e0cc', '#a8321e'), stripeTex(K, '#f0d890', '#2a4a8a'), stripeTex(K, '#ffffff', '#c86a1a')];
    const goods = khan ? ['brass', 'brass', 'spice', 'clothes'] : variant === 'fish' ? ['fish', 'fish', 'veg'] : variant === 'clothes' ? ['clothes', 'clothes', 'veg'] : ['veg', 'fruit', 'veg', 'spice', 'fruit'];
    let li = 0;
    for (const s of [-1, 1]) for (let z = Z0 - 18; z > Z1 + 18; z -= 17 + rnd() * 4) { if (Math.abs(z + 46) < 10 && s < 0) continue; stall(THREE, K, g, s * (W - 6), z, s, pick(goods), pick(awns), lamps && (li++ % 5 === 0) && Math.abs(z) < 70); }
    for (const z of [70, 30, -10, -50, -90, -130]) festoon(THREE, K, g, z, W, 48 + rnd() * 6, 7, lamps && Math.abs(z) < 40, khan ? '#ffb050' : '#ffe0a0');
    if (khan) for (let z = Z0 - 30; z > Z1 + 20; z -= 26) for (const s of [-1, 1]) lantern(THREE, K, g, s * (W - 2), 30, z, pick(['#ffb040', '#ff6a3a', '#7ad86a', '#5aa8ff']));
    cart(THREE, K, g, -36, -44, 0.5, khan ? 'spice' : 'fruit'); out.obst.push([-36, -44, 8]);
    cart(THREE, K, g, 34, 44, -2.4, 'veg'); out.obst.push([34, 44, 8]);
    for (let k = 0; k < 6; k++) { const c = K.box(g, 3, 2.4, 3.4, K.std('#ffffff', 0.85, { map: K.__crate }), 40 + (k % 2) * 3.4, 1.2 + (k > 3 ? 2.4 : 0), -18 - Math.floor(k / 2) * 3.6); c.rotation.y = rnd() * 0.4; } out.obst.push([42, -22, 6]);
    out.bounds = { x0: -50, x1: 50, z0: -150, z1: 100 }; out.cam = { x0: -W + 6, x1: W - 6, z0: Z1 + 10, z1: Z0 - 10 }; out.crowd = { x0: -W + 14, x1: W - 14 };
  }

  else if (kind === 'mawqaf') {
    const W = 68, Z0 = 160, Z1 = -240;
    const asphalt = new THREE.MeshStandardMaterial({ map: groundTex(K, 'asphalt'), roughness: 0.9 }); ground(asphalt, W * 2 + 40, Z0 - Z1 + 60, (Z0 + Z1) / 2);
    sidewalk(W, Z0, Z1);
    const lineM = K.std('#e8e4d8', 0.7), yel = K.std('#e8c030', 0.7);
    for (let z = Z0; z > Z1; z -= 24) { K.box(g, 0.9, 0.06, 12, lineM, -18, 0.04, z); K.box(g, 0.9, 0.06, 12, lineM, 18, 0.04, z); }
    for (const s of [-1, 1]) K.box(g, 0.8, 0.06, Z0 - Z1, yel, s * 50, 0.04, (Z0 + Z1) / 2);
    for (let k = 0; k < 8; k++) K.box(g, 5, 0.06, 26, lineM, -38 + k * 11, 0.05, 76);   // zebra crossing
    const pal = palette(6, ['brick', 'brick', 'apt', 'apt'], ['#c8b098', '#b8a088', '#d0b8a8', '#a8a8a0', '#c8a890'], [5, 8], [3, 4], ['كبدة وسجق', 'موبايلات الصفوة', 'كشري التحرير', 'قطع غيار', 'كاوتش وجنوط', 'عصير قصب', 'بنزينة']);
    const hL = facadeRow(THREE, K, g, -1, W, Z0, Z1, { palette: pal, ac: true, balconies: true, roofClutter: true, floorH: 28 });
    const hR = facadeRow(THREE, K, g, 1, W, Z0, Z1, { palette: pal, ac: true, balconies: true, roofClutter: true, floorH: 28 });
    out.walls = [{ s: -1, x: -W, h: hL }, { s: 1, x: W, h: hR }]; cables(THREE, K, g, W, Z0, Z1, 10); streetDetail(THREE, K, g, -46, 46, -150, 110, 70);
    // kerbs painted black and white, as on every Cairo street
    { const kw = K.std('#e8e4dc', 0.8), kb = K.std('#1a1a1a', 0.8); for (const s2 of [-1, 1]) for (let z = Z0; z > Z1; z -= 6) K.box(g, 0.7, 0.95, 3, ((Z0 - z) / 6) % 2 ? kw : kb, s2 * (W - 8), 0.48, z - 1.5); }
    endRow(THREE, K, g, Z1, -1, W, { palette: pal, floorH: 28 }); endRow(THREE, K, g, Z0, 1, W, { palette: pal, floorH: 28 });
    // flyover crossing the road (concrete deck on pillars, graffiti, ad board)
    const conc = K.std('#8e8a84', 0.95), concD = K.std('#6e6a64', 0.95);
    const zb = -78; K.box(g, W * 2 + 60, 7, 34, conc, 0, 76, zb); K.box(g, W * 2 + 60, 6, 2, concD, 0, 83, zb - 16); K.box(g, W * 2 + 60, 6, 2, concD, 0, 83, zb + 16);
    for (const px of [-54, 54]) for (const pz of [zb - 10, zb + 10]) K.box(g, 7, 73, 7, conc, px, 36.5, pz);
    out.obst.push([-54, zb - 10, 5], [-54, zb + 10, 5], [54, zb - 10, 5], [54, zb + 10, 5]);
    const adT = K.tex(512, 128, (x, w, h) => { x.fillStyle = '#c8281e'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = font(64, 900); x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText('ممنوع الوقوف والانتظار', w / 2, h / 2); });
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(60, 15), K.std('#ffffff', 0.7, { map: adT })); ad.position.set(0, 88, zb + 17.2); g.add(ad);
    const graf = K.tex(256, 512, (x, w, h) => { x.fillStyle = '#8e8a84'; x.fillRect(0, 0, w, h); K.noise(x, w, h, 2000, 0.15, ['0,0,0', '255,255,255']); x.font = font(54, 900); x.textAlign = 'center'; x.direction = 'rtl'; for (let i = 0; i < 4; i++) { x.fillStyle = pick(['#c8281e', '#1d4a9a', '#1d6a3a', '#e8c030']); x.save(); x.translate(w / 2, 120 + i * 110); x.rotate(-0.15); x.fillText(pick(['الأهلي', 'الزمالك', 'حمادة كان هنا', 'السيدة', 'يا رب', 'الكبير كبير']), 0, 0); x.restore(); } });
    for (const px of [-54, 54]) { const gp = new THREE.Mesh(new THREE.PlaneGeometry(7, 60), K.std('#ffffff', 0.95, { map: graf })); gp.position.set(px - Math.sign(px) * 3.6, 32, zb + 10); gp.rotation.y = -Math.sign(px) * Math.PI / 2; g.add(gp); }
    // parked microbuses along the curbs, one in the street, tuk-tuks, a kiosk, street lamps
    const cols = ['#1d4a9a', '#c8281e', '#1d6a3a', '#e8a020'];
    for (const [x, z, r] of [[-58, 110, 0.06], [-58, 52, -0.04], [-58, -14, 0.05], [58, 92, Math.PI + 0.05], [58, 20, Math.PI - 0.04], [58, -140, Math.PI], [-58, -150, 0.04]]) microbus(THREE, K, g, x, z, r + Math.PI / 2, pick(cols));
    microbus(THREE, K, g, -26, -122, Math.PI / 2 + 0.3, '#1d4a9a'); out.obst.push([-26, -110, 9], [-26, -122, 9], [-26, -134, 9]);
    tuktuk(THREE, K, g, 38, 62, 2.2); out.obst.push([38, 62, 6]);
    tuktuk(THREE, K, g, -44, 36, 0.6, '#2a6ac8'); out.obst.push([-44, 36, 6]);
    const kiosk = new THREE.Group(); K.box(kiosk, 12, 16, 10, K.std('#2a5a3a', 0.6), 0, 8, 0); K.box(kiosk, 14, 1, 12, K.std('#c8281e', 0.6), 0, 16.5, 0);
    const kin = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), K.bulbMat('#ffe0a0', 1.2)); kin.position.set(6.05, 9, 0); kin.rotation.y = Math.PI / 2; kiosk.add(kin);
    for (let k = 0; k < 8; k++) K.box(kiosk, 0.6, 1.2 + rnd(), 0.8, K.std(pick(['#c8281e', '#1d4a9a', '#e8e4dc', '#e8a020']), 0.5), 6.4, 6 + (k % 2) * 2.4, -3.5 + k);
    kiosk.position.set(-62, 0.8, -40); g.add(kiosk);
    for (let z = Z0 - 20, i = 0; z > Z1 + 20; z -= 44, i++) for (const s of [-1, 1]) streetLamp(THREE, K, g, s * (W - 9), z + (s > 0 ? 22 : 0), s, 50, '#ffa64a', lamps && Math.abs(z) < 60 && i % 2 === 0);
    for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(2.6, 1.1, 8, 16), K.std('#141414', 0.9)); t.rotation.x = Math.PI / 2; t.position.set(60 + (k % 2) * 2, 1.1 + Math.floor(k / 2) * 2.2, -60 + k); g.add(t); }
    out.bounds = { x0: -48, x1: 48, z0: -150, z1: 120 }; out.cam = { x0: -W + 8, x1: W - 8, z0: Z1 + 10, z1: Z0 - 10 }; out.crowd = { x0: -W + 14, x1: W - 14 };
  }

  else if (kind === 'sath') {   // rooftop of a six-storey block; the city below and around
    const RX = 62, RZ0 = 92, RZ1 = -112;
    const roofM = new THREE.MeshStandardMaterial({ map: groundTex(K, 'roof'), roughness: 0.92 }); ground(roofM, RX * 2 + 6, RZ0 - RZ1 + 6, (RZ0 + RZ1) / 2);
    const par = K.std('#a8a094', 0.95);
    for (const s of [-1, 1]) { K.box(g, 3, 10, RZ0 - RZ1 + 6, par, s * (RX + 1.5), 5, (RZ0 + RZ1) / 2); }
    for (const z of [RZ0 + 1.5, RZ1 - 1.5]) K.box(g, RX * 2 + 6, 10, 3, par, 0, 5, z);
    // our building's walls below the roof line (seen when the camera is outside the parapet)
    const pal = palette(6, ['apt', 'brick', 'old', 'apt'], ['#c8b098', '#d8c0a0', '#b8a088', '#c7a08a', '#d0c8b8', '#a89c90'], [4, 7], [3, 4], SHOPS);
    const wallM = new THREE.MeshStandardMaterial({ map: pal[0].map, emissiveMap: pal[0].emi, emissive: '#ffffff', emissiveIntensity: 1, roughness: 0.93 }); wallM.userData.lamp = 1;
    const below = new THREE.Mesh(new THREE.BoxGeometry(RX * 2 + 6, 180, RZ0 - RZ1 + 6), [wallM, wallM, K.std('#9a948a', 0.95), K.std('#333', 1), wallM, wallM]); below.position.set(0, -90.1, (RZ0 + RZ1) / 2); g.add(below);
    // stairwell hut, water tanks, pigeon tower, laundry, dishes, clutter
    const hut = new THREE.Group(); K.box(hut, 22, 26, 18, K.std('#b0a898', 0.95), 0, 13, 0); K.box(hut, 24, 1.2, 20, K.std('#8a847a', 0.95), 0, 26.6, 0);
    K.box(hut, 0.4, 19, 8, K.std('#3c5a4a', 0.7), 11.2, 9.5, 2); const hb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), K.bulbMat('#ffe0a0', 3)); hb.position.set(11.8, 21, 2); hut.add(hb);
    hut.position.set(-50, 0, -96); g.add(hut); out.obst.push([-50, -96, 13]);
    if (lamps) { const pl = new THREE.PointLight('#ffd090', 260, 70, 1.6); pl.position.set(-38, 20, -94); g.add(pl); }
    waterTank(THREE, K, g, 52, 80); waterTank(THREE, K, g, 44, 80); waterTank(THREE, K, g, 54, -100); out.obst.push([50, 80, 9], [54, -100, 6]);
    const pig = new THREE.Group(), pw = K.std('#6a4a2a', 0.85);   // ghiyya: pigeon tower of wooden laths
    for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) K.cyl(pig, 0.35, 0.35, 34, pw, dx, 17, dz, 5);
    for (let y = 4; y < 34; y += 3) { K.box(pig, 9, 0.3, 0.3, pw, 0, y, -4); K.box(pig, 9, 0.3, 0.3, pw, 0, y, 4); K.box(pig, 0.3, 0.3, 9, pw, -4, y, 0); K.box(pig, 0.3, 0.3, 9, pw, 4, y, 0); }
    K.box(pig, 12, 6, 12, K.std('#7a5a34', 0.85), 0, 37, 0); K.cyl(pig, 0.12, 0.12, 14, pw, 4, 47, 4, 4);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), K.std('#c8281e', 0.9, { side: THREE.DoubleSide })); flag.position.set(6.5, 52, 4); pig.add(flag);
    pig.position.set(-52, 0, 62); g.add(pig); out.obst.push([-52, 62, 8]);
    for (let k = 0; k < 4; k++) laundryLine(THREE, K, g, -58, 30 - k * 9, -24, 30 - k * 9, 15);
    laundryLine(THREE, K, g, 20, 86, 58, 86, 15); laundryLine(THREE, K, g, 20, 80, 58, 80, 15);
    for (const pz of [33, 6]) for (const px of [-58, -24]) K.cyl(g, 0.25, 0.25, 16, K.std('#5a5a5a', 0.6, { metalness: 0.5 }), px, 8, pz, 5);
    for (let k = 0; k < 5; k++) dish(THREE, K, g, RX - 2, 12, -60 + k * 9, Math.PI / 2);
    const couch = new THREE.Group(); K.box(couch, 18, 4, 7, K.std('#7a2a2a', 0.9), 0, 3, 0); K.box(couch, 18, 7, 2, K.std('#7a2a2a', 0.9), 0, 6.5, -3); couch.position.set(30, 0, -100); couch.rotation.y = 0.2; g.add(couch); out.obst.push([30, -100, 9]);
    for (let k = 0; k < 6; k++) { const pot = K.cyl(g, 1.2, 0.9, 2.2, K.std('#9a5a36', 0.9), -RX + 4, 1.1, -40 - k * 5, 10); const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 0), K.std('#3a6a2a', 0.85)); pl.position.set(-RX + 4, 4, -40 - k * 5); g.add(pl); }
    for (const [x, z] of [[-58, -20], [58, 0], [58, 40], [0, 90]]) { K.cyl(g, 0.2, 0.2, 22, K.std('#3a3a3a', 0.6), x, 11, z, 5); const b = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), K.bulbMat('#ffe0a0', 3)); b.position.set(x, 22.4, z); g.add(b); if (lamps && Math.abs(z) < 30) { const pl = new THREE.PointLight('#ffd090', 220, 60, 1.6); pl.position.set(x, 21, z); g.add(pl); } }
    // the neighbourhood: blocks around at varied heights, roofs full of tanks and dishes; minarets and domes further out
    const roofTop = K.std('#8a847a', 0.95);
    const nbr = (x, z, w, d, top) => { const P = pick(pal); const m = new THREE.MeshStandardMaterial({ map: P.map, emissiveMap: P.emi, emissive: '#ffffff', emissiveIntensity: 1, roughness: 0.93 }); m.userData.lamp = 1; const H = top + 240; const b = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), [m, m, roofTop, roofTop, m, m]); b.position.set(x, top - H / 2, z); g.add(b);
      if (rnd() < 0.8) waterTank(THREE, K, g, x + (rnd() - 0.5) * w * 0.6, z + (rnd() - 0.5) * d * 0.6, top); if (rnd() < 0.6) dish(THREE, K, g, x + (rnd() - 0.5) * w * 0.7, top + 3, z + (rnd() - 0.5) * d * 0.7, rnd() * 6); if (rnd() < 0.4) K.box(g, 10, 9, 9, K.std('#9a8a74', 0.95), x + (rnd() - 0.5) * w * 0.5, top + 4.5, z + (rnd() - 0.5) * d * 0.5); };
    for (let gx = -4; gx <= 4; gx++) for (let gz = -4; gz <= 4; gz++) { const cx = gx * 75 + (rnd() - 0.5) * 20, cz = -10 + gz * 75 + (rnd() - 0.5) * 20; if (Math.abs(cx) < RX + 30 && cz < RZ0 + 30 && cz > RZ1 - 30) continue; const dist = Math.hypot(cx, cz); const top = dist < 150 ? -50 + rnd() * 40 : -30 + rnd() * 90; nbr(cx, cz, 44 + rnd() * 24, 44 + rnd() * 24, top); }
    const stone = K.std('#b8a888', 0.9), acc = K.std('#9a8a6a', 0.9);
    minaret(THREE, K, g, -160, -260, 210, stone, acc); minaret(THREE, K, g, 240, -150, 190, stone, acc); minaret(THREE, K, g, 120, 300, 200, stone, acc);
    dome(THREE, K, g, -110, 60, -250, 34, stone); dome(THREE, K, g, 200, 40, 260, 26, K.std('#8aa0a8', 0.6, { metalness: 0.3 }));
    out.bounds = { x0: -54, x1: 54, z0: -100, z1: 80 }; out.cam = { x0: -170, x1: 170, z0: -200, z1: 180 }; out.crowd = { x0: -RX + 6, x1: RX - 6, z0: RZ1 + 8, z1: RZ0 - 6 };
    out.camMinY = 18;
  }

  else if (kind === 'bahr') {   // Alexandria corniche: promenade, sea wall, the Mediterranean, Qaitbay on the horizon
    const Z0 = 160, Z1 = -240, SEA = 46;
    const tiles = new THREE.MeshStandardMaterial({ map: groundTex(K, 'tiles'), roughness: 0.8 }); const prom = new THREE.Mesh(new THREE.PlaneGeometry(SEA + 44, Z0 - Z1), tiles); prom.rotation.x = -Math.PI / 2; prom.position.set((SEA - 44) / 2, 0, (Z0 + Z1) / 2); g.add(prom); out.grounds.push(tiles);
    const road = new THREE.MeshStandardMaterial({ map: groundTex(K, 'asphalt'), roughness: 0.9 }); const rd = new THREE.Mesh(new THREE.PlaneGeometry(36, Z0 - Z1), road); rd.rotation.x = -Math.PI / 2; rd.position.set(-62, -0.6, (Z0 + Z1) / 2); g.add(rd); out.grounds.push(road);
    K.box(g, 1, 1.4, Z0 - Z1, K.std('#d8d4c8', 0.8), -44.5, 0.1, (Z0 + Z1) / 2);
    for (let z = Z0; z > Z1; z -= 20) K.box(g, 0.8, 0.06, 10, K.std('#e8e4d8', 0.7), -62, -0.55, z);
    // sea wall + iron railing
    K.box(g, 4, 7, Z0 - Z1, K.std('#c8bca4', 0.9), SEA, 1.5, (Z0 + Z1) / 2);
    const iron = K.std('#1e3a34', 0.5, { metalness: 0.6 });
    K.box(g, 0.5, 0.5, Z0 - Z1, iron, SEA, 11, (Z0 + Z1) / 2); K.box(g, 0.4, 0.4, Z0 - Z1, iron, SEA, 8, (Z0 + Z1) / 2);
    for (let z = Z0; z > Z1; z -= 4) K.box(g, 0.3, 6, 0.3, iron, SEA, 8, z);
    // breakwater blocks below the wall
    const rock = K.std('#8a8478', 0.95); for (let z = Z0; z > Z1; z -= 7) for (let k = 0; k < 2; k++) { const r = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + rnd() * 2, 0), rock); r.position.set(SEA + 6 + k * 7 + rnd() * 3, -5 + rnd() * 2, z + rnd() * 4); r.rotation.set(rnd() * 3, rnd() * 3, 0); g.add(r); }
    // the sea: a big plane with moving ripples (normal map scrolled by the game)
    const nrm = K.tex(256, 256, (x, w, h) => { const img = x.createImageData(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const a = Math.sin(i * 0.15 + Math.sin(j * 0.08) * 2) + Math.sin(j * 0.21 + i * 0.05) * 0.6 + Math.sin((i + j) * 0.31) * 0.3; const b = Math.cos(j * 0.17 + Math.sin(i * 0.06) * 2) + Math.cos(i * 0.23 - j * 0.07) * 0.5; const o = (j * w + i) * 4; img.data[o] = 128 + a * 34; img.data[o + 1] = 128 + b * 34; img.data[o + 2] = 255; img.data[o + 3] = 255; } x.putImageData(img, 0, 0); }, [60, 60], false);
    const seaM = new THREE.MeshStandardMaterial({ color: '#0b3f5c', roughness: 0.62, metalness: 0.0, normalMap: nrm, normalScale: new THREE.Vector2(0.28, 0.28), envMapIntensity: 0.15 });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), seaM); sea.rotation.x = -Math.PI / 2; sea.position.set(SEA + 1500, -6, 0); sea.userData.keep = true; g.add(sea); out.water = nrm; out.seaM = seaM;
    // Alexandria buildings across the road
    const pal = palette(5, ['alex', 'alex', 'apt'], ['#e8d8a8', '#d8c8a0', '#e0c890', '#f0e4c8', '#d0c0a8'], [7, 9], [3, 4], ['كازينو الشاطبي', 'آيس كريم عزة', 'أسماك قدورة', 'فندق السلاملك', 'صيدلية الشفاء', 'حلواني البحر']);
    const hL = facadeRow(THREE, K, g, -1, 80, Z0, Z1, { palette: pal, balconies: true, roofClutter: true, floorH: 28, signs3d: false });
    out.walls = [{ s: -1, x: -80, h: hL }]; streetDetail(THREE, K, g, -36, 36, -150, 110, 30);
    // lamp posts, benches, palms
    for (let z = Z0 - 20, i = 0; z > Z1; z -= 32, i++) { const p = new THREE.Group(); K.cyl(p, 0.5, 0.9, 36, iron, 0, 18, 0, 8); K.box(p, 0.4, 0.4, 10, iron, 0, 34, 0); for (const s of [-1, 1]) { lantern(THREE, K, p, 0, 31.6, s * 4.8, '#ffe2a0'); } p.position.set(SEA - 3, 0, z); g.add(p); if (lamps && i % 2 === 0 && Math.abs(z) < 70) { const pl = new THREE.PointLight('#ffd8a0', 360, 70, 1.6); pl.position.set(SEA - 6, 30, z); g.add(pl); } }
    for (let z = Z0 - 36; z > Z1; z -= 64) bench(THREE, K, g, SEA - 7, z, -Math.PI / 2);
    for (let z = Z0 - 10; z > Z1; z -= 48) palm(THREE, K, g, -40, z, 64 + rnd() * 16);
    // fishing boats out on the water + Qaitbay citadel on the horizon
    const hullCols = ['#1d4a9a', '#e8c030', '#c8281e', '#1d6a3a', '#e8e4dc'];
    for (let k = 0; k < 9; k++) { const b = new THREE.Group(); const hc = pick(hullCols); const hull = new THREE.Mesh(new THREE.CylinderGeometry(4, 1.6, 26, 10, 1, false, 0, Math.PI), K.std(hc, 0.6)); hull.rotation.set(0, 0, Math.PI / 2); hull.rotation.x = Math.PI; hull.position.y = 3; b.add(hull); K.box(b, 22, 0.6, 7, K.std('#8a6a44', 0.8), 0, 3.2, 0); K.cyl(b, 0.3, 0.3, 18, K.std('#6a4a2a', 0.8), 2, 12, 0, 5); K.box(b, 6, 4, 5, K.std('#e8e4dc', 0.7), -6, 5.2, 0); b.position.set(SEA + 80 + rnd() * 260, -6, Z0 - rnd() * (Z0 - Z1 + 300)); b.rotation.y = rnd() * 6; g.add(b); }
    const fort = new THREE.Group(), sand = K.std('#c8a878', 0.95);
    K.box(fort, 160, 40, 90, sand, 0, 20, 0); K.box(fort, 70, 50, 50, sand, 0, 65, 0); for (const [dx, dz] of [[-80, -45], [80, -45], [-80, 45], [80, 45]]) K.cyl(fort, 14, 15, 52, sand, dx, 26, dz, 14);
    for (let k = -3; k <= 3; k++) K.box(fort, 8, 6, 92, sand, k * 22, 43, 0);
    minaret(THREE, K, fort, 0, 0, 70, sand); fort.position.set(560, -6, -900); fort.rotation.y = 0.4; g.add(fort);
    out.bounds = { x0: -36, x1: 38, z0: -150, z1: 110 }; out.cam = { x0: -38, x1: 260, z0: Z1 + 10, z1: Z0 - 10 }; out.crowd = { x0: -40, x1: SEA - 6 };
    out.wallX1 = SEA - 2; out.noSkyline = true;
  }

  else if (kind === 'qadima') {   // al-Mu'izz street at Bab Zuweila: Mamluk stone facades, twin-minaret gate, lanterns
    const W = 62, Z0 = 130, Z1 = -170;
    const gm = opts.groundMaps ? new THREE.MeshStandardMaterial({ map: opts.groundMaps.map, normalMap: opts.groundMaps.normal, roughnessMap: opts.groundMaps.rough, roughness: 1, color: '#e0d0b8' }) : new THREE.MeshStandardMaterial({ map: groundTex(K, 'tiles'), roughness: 0.85 });
    ground(gm, W * 2 + 40, Z0 - Z1 + 60, (Z0 + Z1) / 2);
    const pal = palette(5, ['mamluk', 'mamluk', 'old'], ['#d8c4a0', '#c8b08a', '#d0bc98', '#bfa88a'], [2, 3], [2, 3], ['عطارة المعز', 'نحاسيات الغورية', 'سبيل وكتّاب', 'قهوة الفيشاوي', 'خيامية']);
    const hL = facadeRow(THREE, K, g, -1, W, Z0, Z1 + 20, { palette: pal, roofClutter: false, floorH: 34, bayLen: 17, signs3d: false });
    const hR = facadeRow(THREE, K, g, 1, W, Z0, Z1 + 20, { palette: pal, roofClutter: false, floorH: 34, bayLen: 17, signs3d: false });
    out.walls = [{ s: -1, x: -W, h: hL }, { s: 1, x: W, h: hR }]; streetDetail(THREE, K, g, -46, 46, -130, 100, 25);
    endRow(THREE, K, g, Z0, 1, W, { palette: pal, floorH: 34 });
    const stone = K.std('#d8c4a0', 0.9), stoneD = K.std('#b8a07c', 0.9), dark = K.std('#120c08', 1);
    // Bab Zuweila: two half-round towers, arch, minarets on top
    const gate = new THREE.Group();
    for (const s of [-1, 1]) { K.box(gate, 38, 96, 36, stone, s * 34, 48, 0); const t = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 96, 20, 1, false, 0, Math.PI), stone); t.rotation.y = Math.PI / 2 * (s < 0 ? 1 : 1) - Math.PI / 2; t.position.set(s * 34, 48, 18); gate.add(t); for (let y = 12; y < 96; y += 12) K.box(gate, 38.4, 1.2, 36.4, stoneD, s * 34, y, 0); minaret(THREE, K, gate, s * 34, 0, 84, stone, stoneD).position.set(s * 34, 96, 0); }
    K.box(gate, 30, 96, 30, stone, 0, 48, -4); const arch = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 31, 20, 1, false, 0, Math.PI), dark); arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); arch.position.set(0, 34, -4); gate.add(arch); K.box(gate, 20, 34, 31, dark, 0, 17, -4);
    K.box(gate, 9.6, 30, 0.6, K.std('#4a2a14', 0.8), -5, 15, 11.6); K.box(gate, 9.6, 30, 0.6, K.std('#4a2a14', 0.8), 5, 15, 11.6);
    for (let k = -6; k <= 6; k++) K.box(gate, 5, 6, 37, stone, k * 9, 99, 0);
    gate.position.set(0, 0, Z1 + 4); g.add(gate);
    for (const s of [-1, 1]) { K.box(g, 60, 96, 36, stone, s * (W + 30), 48, Z1 + 4); }
    // a mosque facade with its minaret and dome rising behind the right-hand row
    minaret(THREE, K, g, W + 10, -30, 190, stone, stoneD); dome(THREE, K, g, W + 50, 70, 10, 30, stoneD); dome(THREE, K, g, -W - 46, 64, -80, 24, stoneD); minaret(THREE, K, g, -W - 12, 60, 170, stone, stoneD);
    // brackets with lanterns along the walls, wooden benches, a few carpets hanging
    for (let z = Z0 - 20; z > Z1 + 30; z -= 28) for (const s of [-1, 1]) { K.box(g, 5, 0.6, 0.6, K.std('#2a1a10', 0.7), s * (W - 2.5), 28, z); lantern(THREE, K, g, s * (W - 5), 25, z, '#ffb040'); }
    if (lamps) for (const z of [24, -24]) for (const s of [-1, 1]) { const pl = new THREE.PointLight('#ffb050', 240, 60, 1.6); pl.position.set(s * (W - 6), 23, z + s * 6); g.add(pl); }
    const carpetT = (seed) => K.tex(128, 256, (x, w, h) => { SEED = seed; x.fillStyle = pick(['#8a1a1a', '#1a2a5a', '#6a2a1a']); x.fillRect(0, 0, w, h); x.strokeStyle = '#e8c870'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16); for (let k = 0; k < 6; k++) { x.fillStyle = pick(['#e8c870', '#2a6a5a', '#e8e0d0', '#c84a2a']); x.beginPath(); x.moveTo(w / 2, 30 + k * 36); x.lineTo(w / 2 + 30, 48 + k * 36); x.lineTo(w / 2, 66 + k * 36); x.lineTo(w / 2 - 30, 48 + k * 36); x.fill(); } });
    for (let k = 0; k < 5; k++) { const s = k % 2 ? 1 : -1; const cp = new THREE.Mesh(new THREE.PlaneGeometry(9, 18), K.std('#ffffff', 0.95, { map: carpetT(100 + k) })); cp.position.set(s * (W - 0.6), 14, 70 - k * 40); cp.rotation.y = -s * Math.PI / 2; g.add(cp); }
    for (const [x, z, r] of [[-W + 8, 40, Math.PI / 2], [W - 8, -10, -Math.PI / 2], [-W + 8, -60, Math.PI / 2]]) bench(THREE, K, g, x, z, r);
    cart(THREE, K, g, 30, 50, 2.6, 'fruit'); out.obst.push([30, 50, 8]);
    out.bounds = { x0: -50, x1: 50, z0: -132, z1: 110 }; out.cam = { x0: -W + 6, x1: W - 6, z0: Z1 + 30, z1: Z0 - 10 }; out.crowd = { x0: -W + 14, x1: W - 14 };
  }
  return out;
}
export const ARENA_NAMES = { hara: 'الحارة', souq: 'السوق', khan: 'خان الخليلي', mawqaf: 'الموقف', sath: 'السطوح', bahr: 'كورنيش إسكندرية', qadima: 'شارع المعز' };
