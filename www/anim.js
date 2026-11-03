import { decode64 } from './rbrig.js';
// Clip player for the Rocketbox skeleton: crossfades, upper-body layering and root motion extraction.
export async function loadClips(url) {
  const txt = await (await fetch(url)).text();
  const raw = JSON.parse(await new Response(new Blob([decode64(txt.trim())]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  const C = {};
  for (const [name, c] of Object.entries(raw)) {
    const bones = {}; for (const [bn, arr] of Object.entries(c.bones)) bones[bn] = new Float32Array(arr);
    C[name] = { name, fps: c.fps, n: c.n, dur: (c.n - 1) / c.fps, bones, root: new Float32Array(c.root), hit: c.hit, loop: !!c.loop, speed: c.speed || 0 };
  }
  return C;
}

const LOWER = new Set(['root', 'upperleg01.L', 'lowerleg01.L', 'foot.L', 'upperleg01.R', 'lowerleg01.R', 'foot.R']);

export function makeAnimator(THREE, rig, clips) {
  const Q = THREE.Quaternion, V = THREE.Vector3;
  const restRoot = rig.B.root.position.clone();
  const boneNames = Object.keys(clips.guard.bones).filter(n => rig.B[n]);
  const tA = new Q(), tB = new Q();
  const pose = () => ({ q: Object.fromEntries(boneNames.map(n => [n, new Q()])), root: new V() });
  const cur = pose(), prev = pose(), work = pose(), upper = pose();
  function rootAt(c, t, loop, out) {
    let f = t * c.fps; const last = c.n - 1;
    if (loop) { f = f % last; if (f < 0) f += last; } else f = Math.max(0, Math.min(last, f));
    const i0 = Math.floor(f), i1 = Math.min(last, i0 + 1), a = f - i0, r = c.root;
    return out.set(r[i0 * 3] + (r[i1 * 3] - r[i0 * 3]) * a, r[i0 * 3 + 1] + (r[i1 * 3 + 1] - r[i0 * 3 + 1]) * a, r[i0 * 3 + 2] + (r[i1 * 3 + 2] - r[i0 * 3 + 2]) * a);
  }
  function sample(c, t, out, loop) {
    let f = t * c.fps; const last = c.n - 1;
    if (loop) { f = f % last; if (f < 0) f += last; } else f = Math.max(0, Math.min(last, f));
    const i0 = Math.floor(f), i1 = Math.min(last, i0 + 1), a = f - i0;
    for (const n of boneNames) {
      const arr = c.bones[n]; if (!arr) continue;
      tA.set(arr[i0 * 4], arr[i0 * 4 + 1], arr[i0 * 4 + 2], arr[i0 * 4 + 3]);
      tB.set(arr[i1 * 4], arr[i1 * 4 + 1], arr[i1 * 4 + 2], arr[i1 * 4 + 3]);
      out.q[n].copy(tA).slerp(tB, a);
    }
    rootAt(c, t, loop, out.root);
    return out;
  }
  const rA = new V(), rB = new V(), rC = new V(), rD = new V();
  const A = {
    name: null, t: 0, speed: 1, loop: false, fade: 1, fadeDur: 0.15, hold: null, layerUpper: null, upperT: 0, rootMotion: false,
    delta: new V(),             // root motion of the last update, character space (x,z)
    play(name, o = {}) {
      if (!clips[name]) { console.warn('missing clip', name); return; }
      if (this.name === name && !o.restart) { if (o.speed !== undefined) this.speed = o.speed; if (o.upper !== undefined) this.layerUpper = o.upper; return; }
      for (const n of boneNames) prev.q[n].copy(cur.q[n]); prev.root.copy(cur.root);
      this.name = name; this.t = o.start || 0; this.speed = o.speed ?? 1; this.loop = o.loop ?? clips[name].loop; this.hold = o.hold ?? null;
      this.fadeDur = o.fade ?? 0.14; this.fade = this.fadeDur > 0 ? 0 : 1; this.layerUpper = o.upper || null; this.upperT = 0;
      this.rootMotion = o.rootMotion ?? false;
      if (this.rootMotion) prev.root.x = prev.root.z = 0;
      if (o.snapRoot) rootAt(clips[name], this.t, this.loop, prev.root);   // start from the clip's own root offset (paired clips), no positional blend
    },
    get clip() { return clips[this.name]; },
    get dur() { return clips[this.name].dur / Math.abs(this.speed || 1); },
    get time() { return this.t / Math.abs(this.speed || 1); },          // seconds of real time since start
    done() { return !this.loop && this.t >= clips[this.name].dur; },
    update(dt, frozen) {
      const c = clips[this.name];
      const t0 = this.t;
      if (!frozen) { this.t += dt * this.speed; this.upperT += dt; if (this.fade < 1) this.fade = Math.min(1, this.fade + dt / Math.max(0.01, this.fadeDur)); }
      const tt = this.hold != null ? this.hold * c.dur : this.t;
      sample(c, tt, work, this.loop);
      // root motion: horizontal travel of the hips since the last update
      this.delta.set(0, 0, 0);
      if (this.rootMotion && this.hold == null && !frozen) {
        if (this.loop) {
          const L = c.dur; const w0 = Math.floor(t0 / L), w1 = Math.floor(this.t / L);
          rootAt(c, t0, true, rA); rootAt(c, this.t, true, rB);
          if (w1 !== w0) { rootAt(c, w1 > w0 ? L - 1e-4 : 0, false, rC); const s0 = rootAt(c, w1 > w0 ? 0 : L - 1e-4, false, rD); this.delta.copy(rC).sub(rA).add(rB).sub(s0); }
          else this.delta.copy(rB).sub(rA);
        } else { rootAt(c, Math.min(c.dur, t0), false, rA); rootAt(c, Math.min(c.dur, this.t), false, rB); this.delta.copy(rB).sub(rA); }
        this.delta.y = 0;
      }
      if (this.rootMotion) { work.root.x = 0; work.root.z = 0; }
      if (this.layerUpper) { const u = clips[this.layerUpper.name]; sample(u, this.layerUpper.hold != null ? this.layerUpper.hold * u.dur : this.upperT, upper, true); for (const n of boneNames) if (!LOWER.has(n)) work.q[n].copy(upper.q[n]); }
      const w = this.fade * this.fade * (3 - 2 * this.fade);
      for (const n of boneNames) cur.q[n].copy(prev.q[n]).slerp(work.q[n], w);
      cur.root.lerpVectors(prev.root, work.root, w);
      for (const n of boneNames) rig.B[n].quaternion.copy(cur.q[n]);
      rig.B.root.position.copy(restRoot).add(cur.root);
    },
    // move any horizontal root offset (paired clips) into the character's position: returns it and zeroes the bone offset
    bakeRoot() { const o = new V(cur.root.x, 0, cur.root.z); cur.root.x = cur.root.z = 0; prev.root.x = prev.root.z = 0; work.root.x = work.root.z = 0; rig.B.root.position.copy(restRoot).add(cur.root); return o; },
  };
  return A;
}
