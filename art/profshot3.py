import subprocess, sys, time
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8823'], cwd='/home/claude/fotwa-app/www', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
SHOT = r"""(o) => { const F = window.__fetwa, cam = F.camera, h = F.hero, f = F.foe, V = h.pos.constructor;
  document.querySelectorAll('.hud,.pad,.joy,.topbtns,#banner,#shout,.pops,.weapon,.itemTag').forEach(e => e.style.display = 'none');
  F.flags.noRender = true; F.sim(3.2); F.flags.noAI = true;
  h.reset(); f.reset(); h.pos.set(-7, 0, 0); f.pos.set(5, 0, 0); h.g.rotation.y = Math.PI / 2; f.g.rotation.y = -Math.PI / 2;
  for (const c of F.crowd) { const a = Math.atan2(c.position.z, c.position.x); }
  f.pos.set(60, 0, -60);
  const it = F.dbg.spawnItem('nabbootNahas', h.pos.x, h.pos.z, 0); F.dbg.grab(h, it);
  F.sim(0.3); h.set('win'); h.winClip = o.clip; h.anim.play(o.clip, { loop: true, fade: 0, restart: true, start: o.ct }); F.sim(o.t); h.anim.play(o.clip, { loop: true, fade: 0, restart: true, start: o.ct }); h.anim.update(0); if (f.mark) f.mark.visible = false;
  // photo staging: rest the stick on the shoulder (straight up and back from the fist)
  h.g.updateMatrixWorld(true); const hq = h.rig.hand.R.getWorldQuaternion(new h.g.quaternion.constructor()); const want = new V(o.wx, o.wy, o.wz).normalize();
  it.mesh.quaternion.copy(hq).invert().multiply(new h.g.quaternion.constructor().setFromUnitVectors(new V(0, 1, 0), want)); it.mesh.position.copy(new V(0, 4.2, 0).applyQuaternion(it.mesh.quaternion));
  const tgt = o.who === 'foe' ? f : h, side = o.who === 'foe' ? -1 : 1;
  const p = tgt.pos.clone(); cam.position.set(p.x + side * o.d * Math.cos(o.a), o.cy, p.z + o.d * Math.sin(o.a)); cam.lookAt(p.x + (o.lx || 0), o.ly, p.z); cam.fov = o.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  F.renderer.render(F.scene, cam); return F.renderer.domElement.toDataURL('image/png'); }"""
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 720, 'height': 720}, device_scale_factor=2); pg.on('pageerror', lambda e: print('PAGEERR', e, flush=True))
    pg.add_init_script("try{localStorage.setItem('fetwa-quality','high');localStorage.setItem('fetwa-save-v1', JSON.stringify({name:'حسونة', level: 51}))}catch(e){}; window.__fetwaPaused = true;")
    pg.goto('http://localhost:8823/index.html'); pg.wait_for_function("document.getElementById('loader').hidden", timeout=900000)
    import base64
    for lvl in (3,):
      pg.evaluate(f"window.__fetwaMeta.fight({lvl})"); pg.wait_for_function("window.__fetwaApi && window.__fetwaApi.state === 'intro'", timeout=600000)
      for name, o in [(f'{c}_{t}', {'who': 'hero', 't': 0.05, 'clip': c, 'ct': t, 'd': 15, 'a': -0.5, 'cy': 9, 'ly': 14, 'fov': 46, 'wx': 0.1, 'wy': 1, 'wz': 0.25}) for c, t in (('cheer1', 0.8), ('cheer1', 1.6), ('cheer2', 1.0), ('cheer3', 1.2), ('angry1', 1.0), ('clap1', 0.5))]:
        d = pg.evaluate(SHOT, o); open(f'/home/claude/fotwa-app/art/prof_{lvl}_{name}.png', 'wb').write(base64.b64decode(d.split(',')[1])); print('ok', lvl, name, flush=True)
    b.close()
finally: srv.kill()
