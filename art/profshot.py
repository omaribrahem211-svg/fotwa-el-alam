import subprocess, sys, time
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8823'], cwd='/home/claude/fotwa-app/www', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
SHOT = r"""(o) => { const F = window.__fetwa, cam = F.camera, h = F.hero, f = F.foe, V = h.pos.constructor;
  document.querySelectorAll('.hud,.pad,.joy,.topbtns,#banner,#shout,.pops,.weapon,.itemTag').forEach(e => e.style.display = 'none');
  F.flags.noRender = true; F.sim(3.2); F.flags.noAI = true;
  h.reset(); f.reset(); h.pos.set(-7, 0, 0); f.pos.set(5, 0, 0); h.g.rotation.y = Math.PI / 2; f.g.rotation.y = -Math.PI / 2;
  for (const c of F.crowd) { const a = Math.atan2(c.position.z, c.position.x); }
  F.sim(o.t);
  if (f.mark) f.mark.visible = false;
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
    for lvl in (10, 41):
      pg.evaluate(f"window.__fetwaMeta.fight({lvl})"); pg.wait_for_function("window.__fetwaApi && window.__fetwaApi.state === 'intro'", timeout=600000)
      for name, o in (('solo', {'who': 'foe', 't': 0.9, 'd': 15, 'a': 0.35, 'cy': 9.5, 'ly': 12.5, 'fov': 38}), ('duel', {'who': 'foe', 't': 0.9, 'd': 34, 'a': 1.45, 'cy': 8, 'ly': 11, 'lx': -6, 'fov': 36})):
        d = pg.evaluate(SHOT, o); open(f'/home/claude/fotwa-app/art/prof_{lvl}_{name}.png', 'wb').write(base64.b64decode(d.split(',')[1])); print('ok', lvl, name, flush=True)
    b.close()
finally: srv.kill()
