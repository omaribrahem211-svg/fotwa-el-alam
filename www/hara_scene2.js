// Detailed old-Cairo alley ("حارة") — shared by the offline renderer and the interactive artifact.
// Units: 1 unit = 10 cm. Alley runs along Z; fight happens around the origin.
export function buildHara(THREE, scene, M, opts = {}) {
  let seed = opts.seed || 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const HW = opts.HW || 26;      // half width of the street / square
  const wx = (x) => Math.sign(x) * (HW - (26 - Math.abs(x))); // keep a prop's distance from its wall
  const FLOOR = 30;              // 3 m floors
  const shadowsOn = opts.shadows !== false;
  const lights = [];

  // ---------- material helpers ----------
  const matCache = {};
  const std = (c, r = 0.85, extra = {}) => { const k = c + r + JSON.stringify(extra); if (!extra.map && matCache[k]) return matCache[k]; const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, extra)); if (!extra.map) matCache[k] = m; return m; };
  const basic = (c) => new THREE.MeshBasicMaterial({ color: c });
  const tex = (w, h, draw, rep) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
  const add = (o, cast = true, recv = true) => { o.traverse?.(c => { if (c.isMesh) { c.castShadow = cast && shadowsOn; c.receiveShadow = recv && shadowsOn; } }); scene.add(o); return o; };
  const mbox = (w, h, d, m, x, y, z, parent) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = shadowsOn; b.receiveShadow = shadowsOn; (parent || scene).add(b); return b; };
  const font = (px) => `bold ${px}px "Cairo","Noto Naskh Arabic","DejaVu Sans",sans-serif`;

  // ---------- shared textures ----------
  const plasterColors = ['#c9a77c', '#b98f68', '#d8c09a', '#a89880', '#c7a08a', '#d0b48c', '#9c8a76', '#bfa58c'];
  const plaster = (base, sd) => tex(512, 512, (x) => {
    let s2 = sd; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    x.fillStyle = base; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3500; i++) { const v = r2(); x.fillStyle = v < 0.55 ? `rgba(40,25,10,${r2() * 0.07})` : `rgba(255,245,225,${r2() * 0.06})`; const s = 3 + r2() * 26; x.fillRect(r2() * 512, r2() * 512, s, s * (0.4 + r2())); }
    for (let i = 0; i < 18; i++) { const gx = r2() * 512, gy = r2() * 300; const g = x.createLinearGradient(gx, gy, gx, gy + 260); g.addColorStop(0, 'rgba(30,18,6,0.22)'); g.addColorStop(1, 'rgba(30,18,6,0)'); x.fillStyle = g; x.fillRect(gx, gy, 3 + r2() * 14, 260); }
    for (let i = 0; i < 4; i++) { const bx = r2() * 440, by = r2() * 440, bw = 30 + r2() * 60, bh = 20 + r2() * 40; x.fillStyle = 'rgba(70,45,30,0.5)'; x.beginPath(); x.ellipse(bx, by, bw, bh, r2() * 3, 0, Math.PI * 2); x.fill(); for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { x.fillStyle = `rgba(${130 + r2() * 40},${62 + r2() * 20},${42 + r2() * 15},0.8)`; x.fillRect(bx - bw * 0.7 + c * 18 + (r % 2) * 9, by - bh * 0.6 + r * 9, 16, 7); } }
    const g2 = x.createLinearGradient(0, 380, 0, 512); g2.addColorStop(0, 'rgba(20,12,4,0)'); g2.addColorStop(1, 'rgba(20,12,4,0.35)'); x.fillStyle = g2; x.fillRect(0, 380, 512, 132);
  });
  const plasterTex = plasterColors.map((c, i) => plaster(c, 1000 + i * 77));
  const PLASTER_IDX = plasterTex.map((_, i) => i), facadeMats = new Map();
  if (opts.plasterNormal) { const pn = opts.plasterNormal; pn.wrapS = pn.wrapT = THREE.RepeatWrapping; pn.repeat.set(2, 2); }
  function facadeMat(i) {
    if (!facadeMats.has(i)) { const t = plasterTex[i]; t.wrapS = t.wrapT = THREE.RepeatWrapping;
      const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.93 }); if (opts.plasterNormal) { m.normalMap = opts.plasterNormal; m.normalScale.set(1.4, 1.4); } facadeMats.set(i, m); }
    return facadeMats.get(i);
  }
  const lattice = tex(256, 256, (x) => { x.fillStyle = '#3a2414'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#000'; for (let yy = 0; yy < 256; yy += 16) for (let xx = 0; xx < 256; xx += 16) { x.beginPath(); x.arc(xx + 8, yy + 8, 5.6, 0, Math.PI * 2); x.fill(); } }, [1, 1]);
  const latticeLit = tex(256, 256, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#ffae55'; for (let yy = 0; yy < 256; yy += 16) for (let xx = 0; xx < 256; xx += 16) { x.beginPath(); x.arc(xx + 8, yy + 8, 5.0, 0, Math.PI * 2); x.fill(); } });
  const corrugated = tex(256, 256, (x) => { for (let i = 0; i < 256; i += 8) { const g = x.createLinearGradient(0, i, 0, i + 8); g.addColorStop(0, '#7d8288'); g.addColorStop(0.5, '#b4b8bc'); g.addColorStop(1, '#5a5e64'); x.fillStyle = g; x.fillRect(0, i, 256, 8); } for (let k = 0; k < 400; k++) { x.fillStyle = `rgba(110,60,20,${Math.random() * 0.25})`; x.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 2 + Math.random() * 6); } x.fillStyle = 'rgba(20,40,120,0.08)'; x.fillRect(0, 0, 256, 256); }, [1, 3]);
  const grill = tex(128, 128, (x) => { x.fillStyle = '#d8d6d0'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#6a6a6a'; for (let i = 4; i < 124; i += 6) x.fillRect(8, i, 112, 3); x.fillStyle = 'rgba(80,60,40,0.3)'; x.fillRect(0, 100, 128, 28); });
  const curtain = (lit) => tex(128, 128, (x) => { x.fillStyle = lit ? '#ffcc88' : '#1a140e'; x.fillRect(0, 0, 128, 128); if (lit) { x.fillStyle = 'rgba(160,60,30,0.55)'; for (let i = 0; i < 128; i += 10) x.fillRect(i, 0, 5, 128); x.fillStyle = 'rgba(255,240,200,0.6)'; x.fillRect(40, 20, 48, 70); } });
  const curtainLit = curtain(true), curtainDark = curtain(false);

  // ---------- ground ----------
  const groundT = tex(1024, 1024, (x) => { x.fillStyle = '#4a4038'; x.fillRect(0, 0, 1024, 1024); let s2 = 99; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; for (let r = 0; r < 40; r++) for (let c = 0; c < 26; c++) { const v = 52 + r2() * 30; x.fillStyle = `rgb(${v + 12},${v + 6},${v})`; x.beginPath(); x.roundRect(c * 40 + (r % 2) * 20 + 2, r * 26 + 2, 36, 22, 5); x.fill(); } for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${r2() < 0.5 ? '0,0,0' : '210,180,140'},${r2() * 0.12})`; x.fillRect(r2() * 1024, r2() * 1024, 3, 3); } for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(140,110,70,${0.12 + r2() * 0.15})`; x.beginPath(); x.ellipse(r2() * 1024, r2() * 1024, 30 + r2() * 110, 10 + r2() * 40, r2() * 3, 0, Math.PI * 2); x.fill(); } }, [3, 18]);
  const GM = opts.groundMaps;  // generated PBR paving (color / normal / roughness), tiled every ~22 units
  const groundMat = GM ? new THREE.MeshStandardMaterial({ map: GM.map, normalMap: GM.normal, roughnessMap: GM.rough, roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2) }) : new THREE.MeshStandardMaterial({ map: groundT, roughness: 0.82 });
  if (GM) for (const t of [GM.map, GM.normal, GM.rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(HW * 2 / 22, 400 / 22); t.anisotropy = 8; }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 400), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.z = -110; ground.receiveShadow = shadowsOn; scene.add(ground);
  // sidewalks
  const swT = tex(256, 256, (x) => { x.fillStyle = '#8a8276'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#5a544c'; x.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); } for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.fillRect(Math.random() * 256, Math.random() * 256, 4, 4); } }, [1, 60]);
  for (const side of [-1, 1]) { const sw = mbox(5, 0.8, 400, new THREE.MeshStandardMaterial({ map: swT, roughness: 0.9 }), side * (HW - 2.5), 0.4, -110); sw.castShadow = false; const curb = mbox(0.6, 0.9, 400, std('#6a6258', 0.9), side * (HW - 5), 0.45, -110); curb.castShadow = false; }
  for (const [px, pz, s] of [[4, 14, 4], [-7, -12, 5], [9, -34, 3.5], [-3, -70, 4]]) { const pd = new THREE.Mesh(new THREE.CircleGeometry(s, 28), new THREE.MeshStandardMaterial({ color: '#3a332c', roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.45 })); pd.rotation.x = -Math.PI / 2; pd.position.set(px, 0.03, pz); pd.scale.y = 0.55; scene.add(pd); }

  // ---------- signs ----------
  const shopNames = ['بقالة الأمانة', 'مكوجي النور', 'حلاق الحارة', 'فول وطعمية', 'عطارة السلطان', 'ورشة أبو علي', 'لبن وزبادي', 'خردوات الصفا', 'ترزي الأمل', 'عصير قصب'];
  const signCols = [['#1d3a6a', '#ffe8a0'], ['#6a1d1d', '#fff2c8'], ['#1d5a3a', '#ffffff'], ['#e8c040', '#2a1a0a'], ['#f2eee4', '#8a1a1a'], ['#2a2a2a', '#ffd040']];
  const signTexFull = (txt, cols) => tex(1024, 220, (x, w, h) => { x.fillStyle = cols[0]; x.fillRect(0, 0, w, h); x.strokeStyle = cols[1]; x.lineWidth = 10; x.strokeRect(12, 12, w - 24, h - 24); x.font = font(118); x.fillStyle = cols[1]; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText(txt, w / 2, h / 2 + 6); for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, 6, 4); } });
  // signs are drawn at full size for crisp lettering, then stored at half size (a sign never covers more than ~300 px on a phone)
  const signTex = (txt, cols) => { const t = signTexFull(txt, cols); const c = document.createElement('canvas'); c.width = 512; c.height = 110; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(t.image, 0, 0, 512, 110); t.image = c; t.needsUpdate = true; return t; };

  // ---------- building generator ----------
  const winBack = std('#120e0a', 0.6), frameM = std('#4a3220', 0.8), shutterGreen = std('#3c5a4a', 0.75), shutterBlue = std('#3a5a7a', 0.7), shutterBrown = std('#5a3a22', 0.8);
  const railM = std('#1a1816', 0.5, { metalness: 0.6 }), slabM = std('#7a7268', 0.9), acM = new THREE.MeshStandardMaterial({ color: '#e8e6e0', roughness: 0.6 });
  const acFront = new THREE.MeshStandardMaterial({ map: grill, roughness: 0.7 });
  const dishM = std('#e8e8e4', 0.4, { metalness: 0.3, side: THREE.DoubleSide }), tankM = std('#2a3a4a', 0.5, { metalness: 0.2 }), tankM2 = std('#d8d4c8', 0.6);
  const laundryCols = ['#e8e4dc', '#7a9ab8', '#c84a3a', '#e8d8a8', '#5a7a5a', '#d88aa8', '#3a4a7a'];
  const flows = [];
  function building(side, z0, len, floors, shop) {
    const g = new THREE.Group();
    const H = floors * FLOOR + 6;
    // one shared material per plaster colour (was a cloned texture + material per building: one GPU texture and one draw call each)
    const facadeM = facadeMat(pick(PLASTER_IDX));
    const sideM = std('#6a5a48', 0.95);
    // block: face toward alley at x = side*HW
    const bg = new THREE.BoxGeometry(40, H, len); { const uv = bg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 60, uv.getY(i) * H / 60); }   // texture scale lives in the UVs
    const blk = new THREE.Mesh(bg, side < 0 ? [facadeM, sideM, sideM, sideM, sideM, sideM] : [sideM, facadeM, sideM, sideM, sideM, sideM]);
    blk.position.set(side * (HW + 20), H / 2, z0 - len / 2); g.add(blk);
    // floor cornices
    for (let f = 1; f <= floors; f++) mbox(1.2, 1.2, len, slabM, side * (HW + 0.3), f * FLOOR, z0 - len / 2, g);
    mbox(1.6, 4, len + 0.2, std('#8a7a66', 0.95), side * (HW + 0.2), H - 2, z0 - len / 2, g); // parapet
    const xf = side * HW; // facade plane x
    const inward = -side; // direction toward alley center
    const bays = Math.max(1, Math.floor(len / 15));
    const bw = len / bays;
    for (let f = 0; f < floors; f++) {
      for (let b = 0; b < bays; b++) {
        const zc = z0 - bw * (b + 0.5), yb = f * FLOOR;
        if (f === 0) {
          // ground floor: shop or door
          if (shop && b % 2 === 0) {
            const sw = bw * 0.8, sh = 20;
            const lit = rnd() < 0.75;
            const inner = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), lit ? basic(pick(['#ffcf8a', '#ffe2b0', '#d8f0ff'])) : winBack);
            inner.position.set(xf + inward * -0.6, sh / 2 + 0.8, zc); inner.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(inner);
            // shelves silhouettes
            if (lit) for (let k = 0; k < 3; k++) mbox(0.4, 0.4, sw * 0.9, std('#5a4030'), xf + inward * -0.3, 5 + k * 5, zc, g);
            const up = 0.45 + rnd() * 0.5; // rolling shutter open fraction
            const sp = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh * (1 - up)), new THREE.MeshStandardMaterial({ map: corrugated, roughness: 0.55, metalness: 0.5 }));
            sp.position.set(xf + inward * 0.25, sh - sh * (1 - up) / 2 + 0.8, zc); sp.rotation.y = inner.rotation.y; g.add(sp);
            const roll = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, sw, 16), std('#6a6e72', 0.5, { metalness: 0.6 })); roll.rotation.x = Math.PI / 2; roll.position.set(xf + inward * 1.0, sh + 1.6, zc); g.add(roll);
            const name = pick(shopNames), cols = pick(signCols);
            const st = signTex(name, cols);
            const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.95, sw * 0.95 * 220 / 1024), new THREE.MeshStandardMaterial({ map: st, emissiveMap: st, emissive: '#ffffff', emissiveIntensity: rnd() < 0.5 ? 0.55 : 0.15 }));
            sign.position.set(xf + inward * 0.7, sh + 5.4, zc); sign.rotation.y = inner.rotation.y; g.add(sign);
            if (lit) { const pl = new THREE.PointLight('#ffc888', 70, 26, 1.8); pl.position.set(xf + inward * 3, 10, zc); g.add(pl); lights.push(pl); }
            // goods outside
            if (rnd() < 0.7) for (let k = 0; k < 3; k++) mbox(2.4, 1.6, 2.2, std(pick(['#9a7a4a', '#2a6ac8', '#c84a2a', '#e8c040']), 0.9), xf + inward * (3 + rnd() * 2), 0.8 + 0.8 + (k === 2 ? 1.6 : 0), zc - 3 + (k % 2) * 3, g);
          } else {
            // arched wooden door
            const dw = 9, dh = 19;
            mbox(1, dh + 2, dw + 2, std('#2a1a10'), xf + inward * 0.2, dh / 2 + 0.8, zc, g);
            const leafM = rnd() < 0.5 ? shutterBrown : shutterGreen;
            mbox(0.8, dh, dw / 2 - 0.3, leafM, xf + inward * 0.45, dh / 2 + 0.8, zc - dw / 4, g);
            mbox(0.8, dh, dw / 2 - 0.3, leafM, xf + inward * 0.45, dh / 2 + 0.8, zc + dw / 4, g);
            const arch = new THREE.Mesh(new THREE.CylinderGeometry(dw / 2 + 1, dw / 2 + 1, 1.2, 24, 1, false, 0, Math.PI), std('#3a2a1a')); arch.rotation.set(0, 0, Math.PI / 2); arch.rotation.y = Math.PI / 2; arch.position.set(xf + inward * 0.3, dh + 0.8, zc); g.add(arch);
            const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), basic('#ffd890')); lamp.position.set(xf + inward * 1.6, dh + 6, zc + dw / 2 + 2); g.add(lamp);
          }
          continue;
        }
        const kind = rnd();
        const ww = 7.5, wh = 13, wy = yb + 8 + wh / 2;
        const rotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        if (kind < 0.25) {
          // mashrabiya bay window
          const d = 3.6, bwid = 10, bh = 17;
          const lit = rnd() < 0.45;
          const latM = new THREE.MeshStandardMaterial({ map: lattice, emissiveMap: latticeLit, emissive: '#ffffff', emissiveIntensity: lit ? 1.5 : 0, roughness: 0.85 });
          const bay = new THREE.Mesh(new THREE.BoxGeometry(d, bh, bwid), [side < 0 ? latM : frameM, side < 0 ? frameM : latM, frameM, frameM, latM, latM]);
          bay.position.set(xf + inward * d / 2, yb + 6 + bh / 2, zc); g.add(bay);
          mbox(d + 1.2, 1.2, bwid + 1.2, frameM, xf + inward * d / 2, yb + 6 + bh + 0.6, zc, g);
          mbox(d + 0.6, 2, bwid + 0.6, frameM, xf + inward * d / 2, yb + 5, zc, g);
          for (let k = 0; k < 3; k++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, d * 1.2, 6), frameM); br.rotation.z = Math.PI / 2 - 0.6 * side; br.position.set(xf + inward * d * 0.45, yb + 3, zc - bwid / 2 + 1 + k * (bwid - 2) / 2); g.add(br); }
        } else if (kind < 0.55) {
          // balcony with railing, door window, laundry, plants
          const bd = 4.5, blen = 13;
          mbox(bd, 1, blen, slabM, xf + inward * bd / 2, yb + 4, zc, g);
          mbox(0.4, 0.4, blen, railM, xf + inward * (bd - 0.2), yb + 10.5, zc, g);
          for (let k = 0; k <= 12; k++) mbox(0.18, 6, 0.18, railM, xf + inward * (bd - 0.2), yb + 7.5, zc - blen / 2 + k * blen / 12, g);
          for (const e of [-1, 1]) mbox(bd, 0.4, 0.4, railM, xf + inward * bd / 2, yb + 10.5, zc + e * blen / 2, g);
          const lit = rnd() < 0.5;
          const door = new THREE.Mesh(new THREE.PlaneGeometry(6, 15), new THREE.MeshStandardMaterial({ map: lit ? curtainLit : curtainDark, emissiveMap: lit ? curtainLit : null, emissive: lit ? '#ffffff' : '#000000', emissiveIntensity: lit ? 1.1 : 0 }));
          door.position.set(xf + inward * 0.12, yb + 4.5 + 7.5, zc); door.rotation.y = rotY; g.add(door);
          mbox(0.5, 16, 0.8, frameM, xf + inward * 0.3, yb + 12, zc - 3.4, g); mbox(0.5, 16, 0.8, frameM, xf + inward * 0.3, yb + 12, zc + 3.4, g); mbox(0.5, 0.8, 7.6, frameM, xf + inward * 0.3, yb + 20, zc, g);
          if (rnd() < 0.6) for (let k = 0; k < 4; k++) { const cl = new THREE.Mesh(new THREE.PlaneGeometry(1.8 + rnd(), 2.4 + rnd() * 2), new THREE.MeshStandardMaterial({ color: pick(laundryCols), side: THREE.DoubleSide, roughness: 0.95 })); cl.position.set(xf + inward * (bd - 0.3), yb + 10.5 - 1.5, zc - 5 + k * 3.2); cl.rotation.y = rotY; g.add(cl); }
          if (rnd() < 0.5) for (let k = 0; k < 3; k++) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 1.4, 10), std('#9a5a36')); pot.position.set(xf + inward * (bd - 1), yb + 5.2, zc - 4 + k * 4); g.add(pot); const pl = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), std('#3a6a2a')); pl.position.set(xf + inward * (bd - 1), yb + 6.6, zc - 4 + k * 4); g.add(pl); }
          if (rnd() < 0.35) { const dish = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.5), dishM); dish.rotation.z = side * 1.2; dish.position.set(xf + inward * (bd - 0.5), yb + 13, zc + 5); g.add(dish); }
        } else {
          // window with wooden shutters (open or closed), maybe AC unit
          const lit = rnd() < 0.4, open = rnd() < 0.55;
          mbox(1, wh + 1.6, ww + 1.6, frameM, xf + inward * 0.25, wy, zc, g);
          const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshStandardMaterial({ map: lit ? curtainLit : curtainDark, emissiveMap: lit ? curtainLit : null, emissive: lit ? '#ffffff' : '#000', emissiveIntensity: lit ? 1.2 : 0, roughness: 0.3 }));
          glass.position.set(xf + inward * 0.8, wy, zc); glass.rotation.y = rotY; g.add(glass);
          const sm = pick([shutterGreen, shutterBlue, shutterBrown]);
          if (open) {
            for (const e of [-1, 1]) { const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.4, wh, ww / 2), sm); leaf.position.set(xf + inward * (0.8 + ww / 4 * 0.7), wy, zc + e * (ww / 2 + ww / 4 * 0.7)); leaf.rotation.y = e * side * 0.8; g.add(leaf); }
          } else {
            for (const e of [-1, 1]) mbox(0.5, wh, ww / 2 - 0.1, sm, xf + inward * 1.0, wy, zc + e * ww / 4, g);
            for (let k = 0; k < 10; k++) mbox(0.6, 0.25, ww - 0.4, std('#1e2e26'), xf + inward * 1.1, wy - wh / 2 + 1 + k * 1.2, zc, g);
          }
          mbox(2, 0.8, ww + 3, slabM, xf + inward * 1, wy - wh / 2 - 0.8, zc, g); // sill
          if (rnd() < 0.45) { const ac = mbox(3.4, 4, 7, acM, xf + inward * 1.7, wy - wh / 2 - 3.6, zc + (rnd() < 0.5 ? 0 : 6), g); const fr = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.6), acFront); fr.position.set(ac.position.x + inward * 1.72, ac.position.y, ac.position.z); fr.rotation.y = rotY; g.add(fr); const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, wy - 4, 6), std('#e0e0e0')); drip.position.set(ac.position.x + inward * 1.2, (ac.position.y - 2) / 2, ac.position.z + 3); g.add(drip); }
        }
      }
    }
    // rooftop clutter
    const ry0 = H;
    for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 5.5, 16), rnd() < 0.5 ? tankM : tankM2); t.position.set(side * (HW + 6 + rnd() * 20), ry0 + 2.75, z0 - 3 - rnd() * (len - 6)); g.add(t); }
    for (let k = 0; k < 2; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.5), dishM); d.rotation.set(-0.3, rnd() * 6, side * 0.9); d.position.set(side * (HW + 3 + rnd() * 6), ry0 + 3, z0 - 4 - rnd() * (len - 8)); g.add(d); }
    if (rnd() < 0.5) { const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 12, 4), railM); ant.position.set(side * (HW + 8), ry0 + 6, z0 - len / 2); g.add(ant); for (let k = 0; k < 4; k++) mbox(0.12, 0.12, 5 - k, railM, side * (HW + 8), ry0 + 8 + k * 1.2, z0 - len / 2, g); }
    if (rnd() < 0.5) { const hut = mbox(10, 9, 9, std('#9a8a74', 0.95), side * (HW + 14), ry0 + 4.5, z0 - len * 0.6, g); }
    // wall cables/pipes
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, H, 8), std('#7a7a72', 0.6)); pipe.position.set(xf + inward * 0.6, H / 2, z0 - 0.8); g.add(pipe);
    g.traverse(c => { if (c.isMesh) { c.castShadow = shadowsOn; c.receiveShadow = shadowsOn; } });
    scene.add(g);
    flows.push({ side, z0, len, H });
    return H;
  }
  // lay out buildings on both sides; leave a side alley on the left at z ~ -46
  for (const side of [-1, 1]) {
    let z = opts.game ? 112 : 70;
    let idx = 0;
    while (z > (opts.game ? -162 : -300)) {
      const len = 22 + Math.floor(rnd() * 16);
      if (side < 0 && z < -34 && z > -70 && !flows.some(f => f.gap)) { flows.push({ gap: true }); // side alley gap
        const gz = z;
        const gl = 20;
        // dark side alley floor + lamp
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(60, gl), groundMat); sg.rotation.x = -Math.PI / 2; sg.position.set(-HW - 30, 0.02, gz - gl / 2); sg.receiveShadow = shadowsOn; scene.add(sg);
        const lampA = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), basic('#ffd08a')); lampA.position.set(-HW - 26, 18, gz - gl / 2); scene.add(lampA);
        const la = new THREE.PointLight('#ffb36b', 260, 50, 1.7); la.position.set(-HW - 26, 17, gz - gl / 2); scene.add(la); lights.push(la);
        mbox(40, 70, 2, std('#6a5a48', 0.95), -HW - 40, 35, gz - gl - 2);
        z -= gl; continue; }
      const floors = 3 + Math.floor(rnd() * 3);
      building(side, z, len, floors, idx % 2 === 0 || (side > 0 && z < 40 && z > 0));
      z -= len + 0.2; idx++;
    }
  }

  // ---------- café (right side, near camera) ----------
  const cafeZ = 30;
  {
    const awnT = tex(256, 64, (x) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#e8e0cc' : '#2f6a4a'; x.fillRect(i * 16, 0, 16, 64); } });
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(34, 8), new THREE.MeshStandardMaterial({ map: awnT, side: THREE.DoubleSide, roughness: 0.9 }));
    awn.position.set(HW - 3.4, 23, cafeZ - 2); awn.rotation.set(0, -Math.PI / 2, 0); awn.rotateX(-0.6); add(awn, true, true);
    const st = signTex('قهوة المعلم', ['#1d3a2a', '#f2d98a']);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(24, 24 * 220 / 1024), new THREE.MeshStandardMaterial({ map: st, emissiveMap: st, emissive: '#ffffff', emissiveIntensity: 0.6 }));
    sign.position.set(HW - 0.9, 29, cafeZ - 2); sign.rotation.y = -Math.PI / 2; scene.add(sign);
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), basic('#b8783a')); inside.position.set(HW - 0.2, 10.8, cafeZ - 2); inside.rotation.y = -Math.PI / 2; scene.add(inside);
    const tv = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.6), basic('#6ab8ff')); tv.position.set(HW - 0.4, 16, cafeZ - 8); tv.rotation.y = -Math.PI / 2; scene.add(tv);
    const cl = new THREE.PointLight('#ffa860', 520, 70, 1.6); cl.position.set(HW - 6, 12, cafeZ - 2); scene.add(cl); lights.push(cl);
  }
  function plasticChair(x, z, ry, col) {
    const g = new THREE.Group(); const m = std(col, 0.55);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 4.2), m); seat.position.y = 4.4; g.add(seat);
    for (const [lx, lz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 4.4, 8), m); l.position.set(lx, 2.2, lz); l.rotation.z = lx * 0.04; l.rotation.x = -lz * 0.04; g.add(l); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.6, 0.35), m); back.position.set(0, 7, -2); back.rotation.x = -0.12; g.add(back);
    for (const sx of [-2, 2]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 4), m); arm.position.set(sx, 6.4, 0); g.add(arm); }
    g.position.set(x, 0, z); g.rotation.y = ry; return add(g);
  }
  function woodChair(color = '#6b4528') {
    const g = new THREE.Group(), mt = std(color, 0.75);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 4.2), mt); seat.position.y = 4.4; g.add(seat);
    for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 4.4, 8), mt); l.position.set(x, 2.2, z); g.add(l); }
    for (const x of [-1.8, 1.8]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.6, 8), mt); p.position.set(x, 6.7, -1.8); g.add(p); }
    for (const y of [6.2, 7.6, 8.8]) { const r = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.35, 0.22), mt); r.position.set(0, y, -1.8); g.add(r); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = shadowsOn; o.receiveShadow = shadowsOn; } });
    return g;
  }
  function cafeTable(x, z) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.25, 28), std('#d8d2c4', 0.25, { metalness: 0.5 })); top.position.y = 6.6; g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6.5, 10), std('#2a2a2a', 0.4, { metalness: 0.8 })); leg.position.y = 3.3; g.add(leg);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.3, 16), std('#2a2a2a', 0.4, { metalness: 0.8 })); base.position.y = 0.15; g.add(base);
    const glassM = new THREE.MeshPhysicalMaterial({ color: '#8a2a0a', roughness: 0.05, transmission: 0.5, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 2; i++) { const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.95, 12), glassM); gl.position.set(-0.8 + i * 1.4, 7.2, 0.3 * i); g.add(gl); }
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.08, 24), std('#c0b8a8', 0.3, { metalness: 0.9 })); tray.position.set(0.6, 6.78, -0.9); g.add(tray);
    const tawla = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 1.6), std('#6a3a1a', 0.6)); tawla.position.set(-0.6, 6.85, -1.1); tawla.rotation.y = 0.3; g.add(tawla);
    g.position.set(x, 0.8, z); return add(g);
  }
  function shisha(x, z) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 16), new THREE.MeshPhysicalMaterial({ color: '#2f6a5a', roughness: 0.05, transmission: 0.35, transparent: true, opacity: 0.9 })); base.position.y = 1.1; g.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 4.5, 10), std('#b08a3a', 0.3, { metalness: 0.9 })); stem.position.y = 4.2; g.add(stem);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.7, 14), std('#7a3a1a', 0.6)); bowl.position.y = 6.7; g.add(bowl);
    const coal = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), basic('#ff6a1a')); coal.position.y = 7.1; g.add(coal);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, 3.5, 0), new THREE.Vector3(1.6, 1.2, 0.5), new THREE.Vector3(2.8, 2.6, 1.4), new THREE.Vector3(3.2, 5, 1.6)]), 20, 0.12, 6), std('#3a2a5a', 0.7)); g.add(hose);
    g.position.set(x, 0.8, z); return add(g);
  }
  for (const [tx, tz] of [[HW - 9, cafeZ + 8], [HW - 9, cafeZ - 6], [HW - 14, cafeZ + 2]]) { cafeTable(tx, tz); plasticChair(tx - 4.2, tz + 0.5, Math.PI / 2, '#e8e4dc'); plasticChair(tx + 0.5, tz + 4.4, Math.PI, '#d83a2a'); }
  shisha(HW - 7.5, cafeZ + 1); shisha(HW - 13, cafeZ + 10);
  if (!opts.game) {
  const fallen = woodChair('#6b4528'); fallen.position.set(4.5, 2.1, 9); fallen.rotation.set(Math.PI / 2, 0.6, 0); scene.add(fallen);
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.12, 30), std('#b5b0a5', 0.25, { metalness: 0.9 })); tray.position.set(-4.5, 0.08, 9.5); scene.add(tray);
  for (let i = 0; i < 3; i++) { const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.95, 12), new THREE.MeshPhysicalMaterial({ color: '#8a2a0a', roughness: 0.05, transmission: 0.5, transparent: true })); gl.position.set(-6 + i * 1.6, 0.3, 11 + (i % 2)); gl.rotation.z = Math.PI / 2; gl.rotation.y = i; scene.add(gl); }

  }
  // ---------- street props ----------
  function tuktuk(x, z, ry, col = '#c8281e') {
    const g = new THREE.Group(); const body = std(col, 0.35, { metalness: 0.3 }), black = std('#151515', 0.6), chrome = std('#c8c8c8', 0.2, { metalness: 1 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 9), body); cab.position.set(1, 7.5, 0); g.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(15, 0.8, 10), black); roof.position.set(1, 15.6, 0); g.add(roof);
    for (const [px, pz] of [[-6, 4.6], [-6, -4.6], [7.6, 4.6], [7.6, -4.6]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4, 6), chrome); p.position.set(px, 13.6, pz); g.add(p); }
    const nose = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 7), body); nose.position.set(-8.4, 7, 0); nose.rotation.z = -0.25; g.add(nose);
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.5), new THREE.MeshPhysicalMaterial({ color: '#203040', roughness: 0.05, transmission: 0.3, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); ws.position.set(-7.2, 13.2, 0); ws.rotation.y = Math.PI / 2; ws.rotation.x = 0.2; g.add(ws);
    const seatB = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 8), std('#2a2a2a', 0.8)); seatB.position.set(4, 4.8, 0); g.add(seatB);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.9, 12), basic('#fff6d8')); hl.position.set(-10.6, 8, 0); hl.rotation.y = -Math.PI / 2; g.add(hl);
    for (const [wx, wz] of [[-9, 0], [6, 4.4], [6, -4.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 1.4, 20), black); w.rotation.x = Math.PI / 2; w.position.set(wx, 1.9, wz); g.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.5, 12), chrome); hub.rotation.x = Math.PI / 2; hub.position.copy(w.position); g.add(hub); }
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.6, 10.2), std('#e8c020', 0.6)); fringe.position.set(1, 15, 0); g.add(fringe);
    g.position.set(x, 0, z); g.rotation.y = ry; return add(g);
  }
  function motorbike(x, z, ry) {
    const g = new THREE.Group(); const black = std('#141414', 0.5), red = std('#8a1a1a', 0.3, { metalness: 0.4 }), chrome = std('#c8c8c8', 0.2, { metalness: 1 });
    for (const wx of [-5.5, 5.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.7, 10, 24), black); w.position.set(wx, 3.1, 0); g.add(w); const r = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.3, 16), chrome); r.rotation.x = Math.PI / 2; r.position.set(wx, 3.1, 0); g.add(r); }
    const tank = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), red); tank.scale.set(1.5, 0.8, 0.8); tank.position.set(-1, 7.4, 0); g.add(tank);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.9, 2.2), black); seat.position.set(2.8, 7.3, 0); g.add(seat);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9, 1, 1), black); frame.position.set(0, 4.8, 0); frame.rotation.z = 0.15; g.add(frame);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6.5, 8), chrome); fork.position.set(-5, 6, 0); fork.rotation.z = 0.35; g.add(fork);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 8), chrome); bar.rotation.x = Math.PI / 2; bar.position.set(-4, 9.4, 0); g.add(bar);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), basic('#fff2c8')); lamp.position.set(-5.6, 8.6, 0); g.add(lamp);
    g.position.set(x, 0, z); g.rotation.y = ry; g.rotation.x = 0.05; return add(g);
  }
  function gasCylinder(x, z, col) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.2, 16), std(col, 0.45, { metalness: 0.3 })); b.position.y = 2.1; g.add(b); const top = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(col, 0.45, { metalness: 0.3 })); top.position.y = 4.2; g.add(top); const v = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8), std('#b08a3a', 0.3, { metalness: 0.9 })); v.position.y = 5.6; g.add(v); g.position.set(x, 0.8, z); return add(g); }
  function foulCart(x, z, ry) {
    const g = new THREE.Group(); const wood = std('#7a5a34', 0.8);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 6), wood); bed.position.y = 6; g.add(bed);
    const side1 = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 0.4), std('#2a6aa8', 0.6)); side1.position.set(0, 4, 3); g.add(side1);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 4, 18), std('#b8a888', 0.3, { metalness: 0.9 })); pot.position.set(-2.5, 8.5, 0); g.add(pot);
    const potTop = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#c8b898', 0.3, { metalness: 0.9 })); potTop.position.set(-2.5, 10.5, 0); g.add(potTop);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), std(['#d8c8a0', '#c83a2a', '#3a8a3a'][i % 3], 0.6)); b.position.set(1.5 + (i % 3) * 1.4, 7, -1 + Math.floor(i / 3) * 2); g.add(b); }
    for (const wz of [-3.4, 3.4]) { const w = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.3, 8, 20), std('#2a1a10', 0.8)); w.position.set(1, 3, wz); g.add(w); }
    const umb = new THREE.Mesh(new THREE.ConeGeometry(7, 2.5, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#e8d8a0', side: THREE.DoubleSide, roughness: 0.9 })); umb.position.set(0, 17, 0); g.add(umb);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 10, 6), std('#3a2a1a')); pole.position.set(0, 11, 0); g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), basic('#fff0c0')); bulb.position.set(0, 15.2, 0); g.add(bulb);
    const pl = new THREE.PointLight('#ffd8a0', 120, 24, 1.8); pl.position.set(0, 14.5, 0); g.add(pl); lights.push(pl);
    g.position.set(x, 0, z); g.rotation.y = ry; return add(g);
  }
  function cat(x, z, ry) { const g = new THREE.Group(); const m = std(pick(['#c8823a', '#2a2420', '#e8e0d0', '#8a7a68']), 0.9); const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), m); b.scale.set(1.6, 0.85, 0.8); b.position.y = 1.4; g.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), m); h.position.set(1.7, 2.1, 0); g.add(h); for (const e of [-0.3, 0.3]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4), m); ear.position.set(1.8, 2.75, e); g.add(ear); } const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 2.4, 6), m); t.position.set(-1.9, 2.2, 0); t.rotation.z = 0.9; g.add(t); for (const [lx, lz] of [[0.9, 0.35], [0.9, -0.35], [-0.9, 0.35], [-0.9, -0.35]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1, 6), m); l.position.set(lx, 0.5, lz); g.add(l); } g.position.set(x, 0, z); g.rotation.y = ry; return add(g); }
  function trashPile(x, z) { for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1.4 + rnd() * 0.6, 10, 8), std(pick(['#141414', '#1a2a4a', '#3a3a3a']), 0.35)); b.scale.y = 0.8; b.position.set(x + rnd() * 3, 1.2 + 0.8, z + rnd() * 3); add(b); } }
  tuktuk(wx(-15), -24, 0.4); tuktuk(wx(13), -92, -2.6, '#2a6ac8');
  motorbike(wx(-17.5), 6, 1.4); motorbike(wx(17), -50, -1.3);
  gasCylinder(wx(-21), -4, '#2a5aa8'); gasCylinder(wx(-22.4), -1.5, '#2a5aa8'); gasCylinder(wx(-20.6), 1, '#d86a1a');
  foulCart(wx(-18), 34, 1.3);
  cat(wx(19), 16, 2.2); cat(wx(-19), -14, 0.6); cat(wx(20), -30, -1);
  trashPile(wx(19), -62); trashPile(wx(-21), -84);
  const qulla = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), std('#9a5a36', 0.9)); qulla.position.set(wx(-17), 1.8, 14); qulla.scale.y = 1.3; add(qulla);
  for (let i = 0; i < 5; i++) { const cr = mbox(4, 3, 3, std('#8a6a3a', 0.9), wx(-21) + (i % 2) * 0.6, 2.3 + (i > 2 ? 3 : 0), -36 - (i % 3) * 3.4); cr.rotation.y = rnd() * 0.3; }

  // ---------- overhead: tangled electric cables, Ramadan decorations, laundry ----------
  const cableM = basic('#0e0e0e');
  for (let i = 0; i < 26; i++) {
    const z1 = 60 - rnd() * 280, z2 = z1 + (rnd() - 0.5) * 30, y1 = 45 + rnd() * 50, y2 = 45 + rnd() * 50;
    const a = new THREE.Vector3(-HW + 0.5, y1, z1), b = new THREE.Vector3(HW - 0.5, y2, z2);
    const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 4 + rnd() * 10;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.09 + rnd() * 0.06, 4), cableM));
  }
  for (const side of [-1, 1]) for (let i = 0; i < 10; i++) { const zz = 60 - i * 30 - rnd() * 10; const yy = 40 + rnd() * 30; const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(side * (HW - 0.4), yy, zz), new THREE.Vector3(side * (HW - 0.8), yy - 6, zz - 8), new THREE.Vector3(side * (HW - 0.4), yy - 2, zz - 18)); scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.08, 4), cableM)); }
  const flagCols = ['#d63a2a', '#2a8ad6', '#e8c22a', '#2aa65a', '#e86a2a', '#c23ad6'];
  const flagG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.55, 0, 0), new THREE.Vector3(0.55, 0, 0), new THREE.Vector3(0, -1.3, 0)]);
  const flagMats = flagCols.map(c => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9, emissive: c, emissiveIntensity: 0.15 }));
  for (const zz of [-6, -30, -58, 22, -90]) {
    const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector3(-HW + 2 * HW * t, 52 - Math.sin(t * Math.PI) * 9, zz)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.05, 4), cableM));
    for (let i = 1; i < 40; i++) { const f = new THREE.Mesh(flagG, flagMats[i % 6]); f.position.copy(curve.getPoint(i / 40)); f.rotation.y = (rnd() - 0.5) * 0.7; scene.add(f); }
    for (const t of [0.28, 0.5, 0.72]) {
      const p = curve.getPoint(t); const lan = new THREE.Group();
      const glassM = new THREE.MeshStandardMaterial({ color: '#ffcf5a', emissive: t === 0.5 ? '#ffb040' : '#ff7a2a', emissiveIntensity: 2.2 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 2.6, 6), glassM);
      const brass = std('#b08a3a', 0.3, { metalness: 0.9 });
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.2, 6), brass); top.position.y = 1.9;
      const bot = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.8, 6), brass); bot.position.y = -1.7; bot.rotation.x = Math.PI;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 6, 12), brass); ring.position.y = 2.7;
      lan.add(body, top, bot, ring); lan.position.copy(p).add(new THREE.Vector3(0, -2.8, 0)); scene.add(lan);
      if (t === 0.5 && zz > -40) { const ll = new THREE.PointLight('#ffb35a', 300, 50, 1.6); ll.position.copy(lan.position); scene.add(ll); lights.push(ll); }
    }
  }
  for (const zz of [-40, -74]) { const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3(-HW + 2 * HW * t, 40 - Math.sin(t * Math.PI) * 5, zz)); } const curve = new THREE.CatmullRomCurve3(pts); scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.05, 4), cableM)); for (let i = 2; i < 19; i += 1.5) { const p = curve.getPoint(i / 20); const cl = new THREE.Mesh(new THREE.PlaneGeometry(2.2 + rnd() * 1.5, 3 + rnd() * 2.5), new THREE.MeshStandardMaterial({ color: pick(laundryCols), side: THREE.DoubleSide, roughness: 0.95 })); cl.position.copy(p).add(new THREE.Vector3(0, -2, 0)); cl.rotation.y = (rnd() - 0.5) * 0.4; cl.castShadow = shadowsOn; scene.add(cl); } }

  // ---------- far end: mosque minaret + dome silhouette, sky ----------
  const sky = (() => { const t = tex(8, 256, (x) => { const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#070a18'); g.addColorStop(0.65, '#1e2240'); g.addColorStop(1, '#4a3848'); x.fillStyle = g; x.fillRect(0, 0, 8, 256); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(1400, 600), new THREE.MeshBasicMaterial({ map: t, fog: false })); m.position.set(0, 200, -420); scene.add(m); return m; })();
  const stars = new THREE.BufferGeometry(); const sp = []; for (let i = 0; i < 600; i++) sp.push(-600 + rnd() * 1200, 160 + rnd() * 300, -410); stars.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, fog: false })));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(10, 40), new THREE.MeshBasicMaterial({ color: '#f4ecd8', fog: false })); moon.position.set(60, 260, -400); scene.add(moon);
  const sil = new THREE.MeshStandardMaterial({ color: '#1c1a26', roughness: 1 });
  const mn = new THREE.Group();
  [[new THREE.BoxGeometry(14, 80, 14), 40], [new THREE.CylinderGeometry(6, 7, 60, 8), 110], [new THREE.CylinderGeometry(4, 4.6, 26, 12), 152]].forEach(([g, y]) => { const m = new THREE.Mesh(g, sil); m.position.y = y; mn.add(m); });
  for (const yy of [80, 140]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(10, 8, 3, 14), sil); b.position.y = yy; mn.add(b); }
  const capm = new THREE.Mesh(new THREE.SphereGeometry(5.4, 16, 12), sil); capm.scale.y = 1.5; capm.position.y = 170; mn.add(capm);
  const cres = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.35, 6, 16, Math.PI * 1.4), std('#c8a24a', 0.3, { metalness: 0.9 })); cres.position.y = 182; mn.add(cres);
  for (const yy of [118, 150]) { const l = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.3, 6, 24), basic('#7ad86a')); l.rotation.x = Math.PI / 2; l.position.y = yy + 2; mn.add(l); }
  mn.position.set(-10, 0, -330); scene.add(mn);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), sil); dome.position.set(40, 70, -350); scene.add(dome);
  const domeBase = new THREE.Mesh(new THREE.BoxGeometry(90, 70, 50), sil); domeBase.position.set(40, 35, -352); scene.add(domeBase);
  // end wall of alley (far buildings closing view)
  mbox(80, 90, 4, std('#3a3028', 0.95), 0, 45, -300);

  // ---------- lighting ----------
  scene.background = new THREE.Color('#0b0d16');
  scene.fog = new THREE.FogExp2('#18141f', 0.0055);
  scene.add(new THREE.HemisphereLight('#4a4a70', '#2a1a10', 0.38));
  const moonL = new THREE.DirectionalLight('#8ea2e0', 1.0); moonL.position.set(60, 160, -140); moonL.target.position.set(0, 0, -20); moonL.castShadow = shadowsOn;
  moonL.shadow.mapSize.set(2048, 2048); Object.assign(moonL.shadow.camera, { left: -90, right: 90, top: 120, bottom: -120, far: 500 }); moonL.shadow.bias = -0.0004;
  scene.add(moonL, moonL.target);
  // hanging bulb over the fight
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 20, 4), cableM); wire.position.set(0, 50, 0); scene.add(wire);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(2, 1.4, 20, 1, true), std('#3a4a3a', 0.4, { metalness: 0.7, side: THREE.DoubleSide })); shade.position.set(0, 39.6, 0); scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#fff0d0', emissiveIntensity: 4 })); bulb.position.set(0, 38.8, 0); scene.add(bulb);
  const key = new THREE.SpotLight('#ffe2b8', 2600, 120, Math.PI / 3.1, 0.75, 1.5);
  key.position.set(0, 38.6, 0); key.target.position.set(0, 0, 0); key.castShadow = shadowsOn; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; key.shadow.radius = 3;
  scene.add(key, key.target);
  const rim = new THREE.SpotLight('#7f9cff', 2200, 110, Math.PI / 6, 0.6, 1.5); rim.position.set(-10, 34, -50); rim.target.position.set(0, 9, 0); scene.add(rim, rim.target);
  for (const [lx, lz] of [[-HW + 1, -20], [HW - 1, -46], [-HW + 1, -78], [HW - 1, -110]]) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), basic('#ffd08a')); lamp.position.set(lx, 26, lz); scene.add(lamp); const arm = mbox(3, 0.3, 0.3, railM, lx + (lx < 0 ? -1 : 1) * -1.5 * -1, 27, lz); const pl = new THREE.PointLight('#ffb36b', 420, 60, 1.7); pl.position.set(lx * 0.94, 25, lz); scene.add(pl); lights.push(pl); }

  if (opts.game) {
    // close the square with rows of houses at both ends
    for (const [zEnd, rs] of [[-162, -1], [112, 1]]) {
      let zz = HW;
      while (zz > -HW) {
        const len = 22 + Math.floor(rnd() * 14);
        building(-1, zz, Math.min(len, zz + HW), 3 + Math.floor(rnd() * 3), true);
        const g = scene.children[scene.children.length - 1];
        g.rotation.y = rs * Math.PI / 2; g.position.z += zEnd - rs * HW;
        zz -= len + 0.2;
      }
    }
    for (const zz of [-32, 26]) {
      const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 20, 4), cableM); w2.position.set(0, 50, zz); scene.add(w2);
      const sh2 = new THREE.Mesh(new THREE.ConeGeometry(2, 1.4, 20, 1, true), std('#3a4a3a', 0.4, { metalness: 0.7, side: THREE.DoubleSide })); sh2.position.set(0, 39.6, zz); scene.add(sh2);
      const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#fff0d0', emissiveIntensity: 4 })); b2.position.set(0, 38.8, zz); scene.add(b2);
      const k2 = new THREE.SpotLight('#ffe2b8', 1800, 110, Math.PI / 3.1, 0.75, 1.5); k2.position.set(0, 38.6, zz); k2.target.position.set(0, 0, zz); scene.add(k2, k2.target); lights.push(k2);
    }
  }
  return { HW, lights, woodChair, key };
}
