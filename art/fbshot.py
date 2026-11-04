import subprocess, sys, time
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8822'], cwd='/home/claude/fotwa-app/www', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1640, 'height': 624}); pg.on('pageerror', lambda e: print('PAGEERR', e, flush=True))
    pg.add_init_script("try{localStorage.setItem('fetwa-quality','high');localStorage.setItem('fetwa-save-v1', JSON.stringify({name:'حسونة', level: 51}))}catch(e){}; window.__fetwaPaused = true;")
    pg.goto('http://localhost:8822/index.html'); pg.wait_for_function("document.getElementById('loader').hidden", timeout=900000)
    for n, secs in ((20, 6.4), (42, 5.6)):
      pg.evaluate(f"window.__fetwaMeta.fight({n})"); pg.wait_for_function("window.__fetwaApi && window.__fetwaApi.state === 'intro'", timeout=600000)
      pg.evaluate(f"(() => {{ document.querySelectorAll('.hud,.pad,.joy,.topbtns,#banner,#shout,.pops,.weapon,.itemTag').forEach(e => e.style.display = 'none'); const F = window.__fetwa; F.flags.noRender = true; F.sim({secs}); F.flags.noRender = false; F.sim(0.02); }})()")
      pg.wait_for_timeout(300); pg.screenshot(path=f'/home/claude/fotwa-app/art/fb_bg_{n}.png'); print('ok', n, flush=True)
    b.close()
finally: srv.kill()
